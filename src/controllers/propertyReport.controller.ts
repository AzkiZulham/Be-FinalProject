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

    const propertyId = req.query.propertyId
      ? Number(req.query.propertyId)
      : undefined;
    const roomTypeId = req.query.roomTypeId
      ? Number(req.query.roomTypeId)
      : undefined;
    const start = new Date(String(req.query.start));
    const end = new Date(String(req.query.end));

    if (!propertyId && !roomTypeId) {
      return res
        .status(400)
        .json({ error: "propertyId dan roomTypeId wajib diisi" });
    }
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "start/end invalid (YYYY-MM-DD)" });
    }

    const roomType = await prisma.roomType.findMany({
      where: {
        ...(roomTypeId ? { id: roomTypeId } : {}),
        ...(propertyId ? { property: { id: propertyId } } : {}),
        property: { userId: tenant.id },
      },
      select: {
        id: true,
        roomName: true,
        quota: true,
        price: true,
        property: { select: { id: true, name: true, city: true } },
        peakSeasons: {
          where: {
            startDate: { lt: end },
            endDate: { gt: start },
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

    if (!roomType) return res.json({ items: [] });

    const roomTypeIds = roomType.map((row) => row.id);

    const transaction = await prisma.transaction.findMany({
      where: {
        roomTypeId: { in: roomTypeIds },
        status: "ACCEPTED",
        checkInDate: { lt: end },
        checkOutDate: { gt: start },
      },
      select: {
        roomTypeId: true,
        checkInDate: true,
        checkOutDate: true,
        qty: true,
      },
    });

    const bookedMap = new Map<number, Record<string, number>>();
    for (const r of roomType) bookedMap.set(r.id, {});
    for (const t of transaction) {
      const s = new Date(Math.max(start.getTime(), t.checkInDate.getTime()));
      const e = new Date(Math.min(end.getTime(), t.checkOutDate.getTime()));
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
        const rt = bookedMap.get(t.roomTypeId)!;
        rt[key] = (rt[key] ?? 0) + t.qty;
      }
    }

    const allDays = enumerateDates(start, end);

    const items = roomType.map((row) => {
      const perDate = allDays.map((date) => {
        const [y, m, d] = date.split("-").map(Number);
        const day = new Date(y, m - 1, d);

        const reserved = bookedMap.get(row.id)![date] ?? 0; // jumlah kamar ter-booked di tanggal itu
        const quota = row.quota ?? 0;
        const remaining = Math.max(0, quota - reserved);
        const status: "AVAILABLE" | "FULL" =
          remaining > 0 ? "AVAILABLE" : "FULL";

        const isPeakSeason = row.peakSeasons.some((p) => {
          const hasChange =
            (p.percentage != null && p.percentage !== 0) ||
            (p.nominal != null && p.nominal !== 0);
          return hasChange && day >= p.startDate && day < p.endDate;
        });
        return {
          date,
          quota,
          reserved,
          remaining,
          status,
          isPeakSeason,
        };
      });
      return {
        roomTypeId: row.id,
        roomName: row.roomName,
        property: row.property,
        quota: row.quota,
        perDate,
      };
    });
    return res.json({ items });
  } catch (error) {
    console.error("getPropertyAvailability error:", error);
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
