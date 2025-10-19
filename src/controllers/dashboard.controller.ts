import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const tenantId = user.id;

    const totalProperties = await prisma.property.count({
      where: { userId: tenantId },
    });

    const totalRooms = await prisma.roomType.count({
      where: {
        property: { userId: tenantId },
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const pendingPayments = await prisma.transaction.count({
      where: {
        roomType: { property: { userId: tenantId } },
        status: "WAITING_FOR_PAYMENT",
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const monthlyRevenueResult = await prisma.transaction.aggregate({
      where: {
        roomType: { property: { userId: tenantId } },
        status: "ACCEPTED",
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { totalPrice: true },
    });

    const monthlyRevenue = monthlyRevenueResult._sum.totalPrice || 0;

    const totalBookings = await prisma.transaction.count({
      where: {
        roomType: { property: { userId: tenantId } },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const pendingBookings = await prisma.transaction.count({
      where: {
        roomType: { property: { userId: tenantId } },
        status: "WAITING_FOR_CONFIRMATION",
      },
    });

    const stats = {
      totalProperties,
      totalRooms,
      pendingPayments,
      monthlyRevenue,
      totalBookings,
      pendingBookings,
    };

    return res.json(stats);
  } catch (err) {
    console.error("Error getDashboardStats:", err);
    return res.status(500).json({ error: "Gagal mengambil data dashboard" });
  }
};
