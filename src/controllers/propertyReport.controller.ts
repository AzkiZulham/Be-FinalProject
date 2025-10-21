import { prisma } from "../config/prisma";
import { Request, Response } from "express";

const enumerateDates = (start: Date, end: Date) => {
  const out: string[] = [];
  for (
    let date = new Date(start);
    date < end;
    date.setDate(date.getDate() + 1)
  ) {
    const year = date.getFullYear(),
      month = date.getMonth() + 1,
      day = date.getDate();
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    out.push(iso);
  }
  return out;
};

export const getPropertyReport = async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).user;
    if (!tenant) return res.status(409).json({ error: "Unauthorized" });

    const roomTypeId = req.query.roomTypeId
      ? Number(req.query.roomTypeId)
      : undefined;
    const start = new Date(String(req.query.start));
    const end = new Date(String(req.query.end));

    if (!roomTypeId) {
      return res.status(400).json({ error: "roomTypeId wajib diisi" });
    }
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "start/end invalid (YYYY-MM-DD)" });
    }

    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        roomName: true,
        quota: true,
        price: true,
        property: { select: { id: true, name: true, city: true } },
        peakSeasons: {
          where: {
            OR: [{ startDate: { lt: end }, endDate: { gt: start } }],
          },
          select: {
            startDate: true,
            endDate: true,
            percentage: true,
            nominal: true,
          },
        },
      },
    });

    if (!roomType)
      return res.status(404).json({ error: "Room type tidak ditemukan" });

    const transactions = await prisma.transaction.findMany({
      where: {
        roomTypeId,
        status: "ACCEPTED",
        checkInDate: { lt: end },
        checkOutDate: { gt: start },
      },
      select: {
        checkInDate: true,
        checkOutDate: true,
        qty: true,
      },
    });

    const bookedMap: Record<string, number> = {};
    for (const t of transactions) {
      const s = new Date(Math.max(start.getTime(), t.checkInDate.getTime()));
      const e = new Date(Math.min(end.getTime(), t.checkOutDate.getTime()));
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        bookedMap[key] = (bookedMap[key] ?? 0) + t.qty;
      }
    }

    const allDays = enumerateDates(start, end);

    const perDate = allDays
      .map((date) => {
        const bookedQty = bookedMap[date] ?? 0;
        if (bookedQty === 0) return null;

        const remaining = Math.max(0, roomType.quota - bookedQty);
        const status: "AVAILABLE" | "FULL" =
          remaining > 0 ? "AVAILABLE" : "FULL";

        const isPeakSeason = roomType.peakSeasons.some((p) => {
          const day = new Date(date);
          const inRange =
            day >= p.startDate &&
            day <= p.endDate &&
            ((p.percentage ?? 0) !== 0 || (p.nominal ?? 0) !== 0);
          return inRange;
        });

        return {
          date,
          status,
          bookedQty,
          remaining,
          isPeakSeason,
        };
      })
      .filter(Boolean);

    return res.json({
      items: [
        {
          roomTypeId: roomType.id,
          roomName: roomType.roomName,
          property: roomType.property,
          quota: roomType.quota,
          perDate,
        },
      ],
    });
  } catch (error) {
    console.error("getPropertyReport error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getTenantProperties = async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).user;
    if (!tenant) return res.status(401).json({ error: "Unauthorized" });

    const properties = await prisma.property.findMany({
      where: { userId: tenant.id },
      select: { id: true, name: true, city: true },
    });

    return res.json({ items: properties });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getRoomTypesByProperty = async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).user;
    if (!tenant) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.query.propertyId);
    if (!propertyId)
      return res.status(400).json({ error: "propertyId wajib diisi" });

    const roomTypes = await prisma.roomType.findMany({
      where: { property: { userId: tenant.id, id: propertyId } },
      select: { id: true, roomName: true },
    });

    return res.json({ items: roomTypes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
