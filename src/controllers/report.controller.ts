import { prisma } from "../config/prisma";
import { getPagination } from "../utils/pagination";
import { Request, Response } from "express";

type GroupBy = "property" | "transaction" | "user";
type SortBy = "revenue" | "date";
type Order = "asc" | "desc";

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).user;
    if (!tenant) return res.status(401).json({ error: "Unauthorizes" });

    const groupBy = String(req.query.groupBy ?? "property") as GroupBy;
    const sortBy = String(req.query.sortBy ?? "revenue") as SortBy;
    const order = String(req.query.order ?? "desc") as Order;
    const propertyId = req.query.propertyId
      ? Number(req.query.propertyId)
      : undefined;

    const dateFrom = req.query.dateFrom
      ? new Date(String(req.query.dateFrom))
      : undefined;

    const dateToRaw = req.query.dateTo
      ? new Date(String(req.query.dateTo))
      : undefined;

    const dateTo = dateToRaw
      ? new Date(new Date(dateToRaw).setHours(23, 59, 59, 999))
      : undefined;

    const { page, limit, skip } = getPagination(req.query);

    const rows = await prisma.transaction.findMany({
      where: {
        roomType: {
          property: {
            userId: tenant.id,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
        payment: {
          paymentStatus: "SETTLEMENT",
          ...(dateFrom || dateTo
            ? {
                paidAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
      },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        roomType: {
          select: {
            roomName: true,
            property: { select: { id: true, name: true, city: true } },
          },
        },
        payment: {
          select: { method: true, paymentStatus: true, paidAt: true },
        },
      },
    });

    const summary = {
      totalRevenue: 0,
      countTransaction: 0,
      byMethod: {
        TRANSFER: { revenue: 0, count: 0 },
        MIDTRANS: { revenue: 0, count: 0 },
      } as Record<"TRANSFER" | "MIDTRANS", { revenue: number; count: number }>,
    };

    type GroupRow = {
      revenue: number;
      countTransaction: number;
      byMethod: {
        TRANSFER: { revenue: number; count: number };
        MIDTRANS: { revenue: number; count: number };
      };
      key: any;
      latestPaidAt: Date | null;
    };

    const groupsMap = new Map<string, GroupRow>();
    const trxItems: Array<{
      transactionId: number;
      orderNumber: string;
      paidAt: Date | null;
      method: "TRANSFER" | "MIDTRANS";
      amount: number;
      property?: { id: number; name: string; city: string };
      roomName?: string | null;
      user?: { id: number; username: string | null; email: string | null };
    }> = [];

    if (groupBy === "property") {
      const props = await prisma.property.findMany({
        where: { userId: tenant.id, ...(propertyId ? { id: propertyId } : {}) },
        select: { id: true, name: true, city: true },
      });
      for (const p of props) {
        const k = `prop:${p.id}`;
        if (!groupsMap.has(k)) {
          groupsMap.set(k, {
            revenue: 0,
            countTransaction: 0,
            byMethod: {
              TRANSFER: { revenue: 0, count: 0 },
              MIDTRANS: { revenue: 0, count: 0 },
            },
            key: { propertyId: p.id, name: p.name, city: p.city },
            latestPaidAt: null,
          });
        }
      }
    }

    for (const row of rows) {
      const amount = row.totalPrice ?? 0;
      const method = (row.payment?.method || "TRANSFER") as
        | "TRANSFER"
        | "MIDTRANS";
      const paidAt = row.payment?.paidAt ?? null;

      //summary
      summary.totalRevenue += amount;
      summary.countTransaction += 1;
      summary.byMethod[method].revenue += amount;
      summary.byMethod[method].count += 1;

      if (groupBy === "transaction") {
        trxItems.push({
          transactionId: row.id,
          orderNumber: `ORD-${row.id}-${new Date(row.createdAt)
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}`,
          paidAt,
          method,
          amount,
          property: row.roomType?.property
            ? {
                id: row.roomType.property.id,
                name: row.roomType.property.name,
                city: row.roomType.property.city,
              }
            : undefined,
          roomName: row.roomType?.roomName ?? null,
          user: row.user
            ? {
                id: row.user.id,
                username: row.user.username,
                email: row.user.email,
              }
            : undefined,
        });
      } else if (groupBy === "property") {
        const k = `prop:${row.roomType?.property?.id ?? 0}`;
        if (!groupsMap.has(k)) {
          groupsMap.set(k, {
            revenue: 0,
            countTransaction: 0,
            byMethod: {
              TRANSFER: { revenue: 0, count: 0 },
              MIDTRANS: { revenue: 0, count: 0 },
            },
            key: row.roomType?.property
              ? {
                  propertyId: row.roomType.property.id,
                  name: row.roomType.property.name,
                  city: row.roomType.property.city,
                }
              : { propertyId: 0, name: "Unknown", city: "-" },
            latestPaidAt: paidAt,
          });
        }
        const group = groupsMap.get(k)!;
        group.revenue += amount;
        group.countTransaction += 1;
        group.byMethod[method].revenue += amount;
        group.byMethod[method].count += 1;
        if (!group.latestPaidAt || (paidAt && paidAt > group.latestPaidAt))
          group.latestPaidAt = paidAt;
      } else {
        const k = `user:${row.user?.id ?? 0}`;
        if (!groupsMap.has(k)) {
          groupsMap.set(k, {
            revenue: 0,
            countTransaction: 0,
            byMethod: {
              TRANSFER: { revenue: 0, count: 0 },
              MIDTRANS: { revenue: 0, count: 0 },
            },
            key: row.user
              ? {
                  userId: row.user.id,
                  username: row.user.username,
                  email: row.user.email,
                }
              : { userId: 0, username: "Unknown", email: "-" },
            latestPaidAt: paidAt,
          });
        }
        const group = groupsMap.get(k)!;
        group.revenue += amount;
        group.countTransaction += 1;
        group.byMethod[method].revenue += amount;
        group.byMethod[method].count += 1;
        if (!group.latestPaidAt || (paidAt && paidAt > group.latestPaidAt))
          group.latestPaidAt = paidAt;
      }
    }
    let items: any[] = [];
    let total = 0;

    if (groupBy === "transaction") {
      trxItems.sort((a, b) => {
        if (sortBy === "revenue")
          return order === "asc" ? a.amount - b.amount : b.amount - a.amount;
        const av = a.paidAt ? a.paidAt.getTime() : 0;
        const bv = b.paidAt ? b.paidAt.getTime() : 0;
        return order === "asc" ? av - bv : bv - av;
      });
      total = trxItems.length;
      items = trxItems.slice(skip, skip + limit);
    } else {
      const arr = Array.from(groupsMap.values());
      arr.sort((a, b) => {
        if (sortBy === "revenue")
          return order === "asc"
            ? a.revenue - b.revenue
            : b.revenue - a.revenue;
        const av = a.latestPaidAt ? a.latestPaidAt.getTime() : 0;
        const bv = b.latestPaidAt ? b.latestPaidAt.getTime() : 0;
        return order === "asc" ? av - bv : bv - av;
      });
      total = arr.length;
      items = arr.slice(skip, skip + limit);
    }

    return res.json({
      params: {
        dateFrom: dateFrom?.toISOString().slice(0, 10) ?? null,
        dateTo: dateTo?.toISOString().slice(0, 10) ?? null,
        groupBy,
        sortBy,
        order,
        page,
        limit,
        propertyId: propertyId ?? null,
      },
      summary,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items,
    });
  } catch (error) {
    console.error("Get Sales Report: ", error);
    return res.status(500).json({ error: "Server Error" });
  }
};
