import { Request, Response } from "express";
import { getPagination } from "../utils/pagination";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const { page, limit, skip } = getPagination(req.query);
    const status = req.query.status ? String(req.query.status) : undefined;
    const dateFrom = req.query.dateFrom
      ? new Date(String(req.query.dateFrom))
      : undefined;
    const dateTo = req.query.dateTo
      ? new Date(String(req.query.dateTo))
      : undefined;
    const q = req.query.q ? String(req.query.q).trim() : undefined;

    const where: any = { userId: authUser.id };

    if (status) {
      where.status = status as TransactionStatus;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && !isNaN(dateFrom.getTime()))
        where.createdAt.gte = dateFrom;
      if (dateTo && !isNaN(dateTo.getTime())) {
        dateTo.setHours(23, 59, 59, 999);
        where.createdAt.lte = dateTo;
      }
    }

    if (q) {
      const id = Number(q.replace(/\D/g, ""));
      if (!isNaN(id) && id > 0) {
        where.id = id;
      }
    }

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          qty: true,
          checkInDate: true,
          checkOutDate: true,
          createdAt: true,
          roomType: {
            select: {
              roomName: true,
              property: true,
            },
          },
          payment: {
            select: {
              id: true,
              method: true,
              paymentStatus: true,
              paymentUrl: true,
              paymentProof: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const data = items.map((trx) => ({
      id: trx.id,
      orderNumber: `ORD-${trx.id}-${new Date(trx.createdAt).getTime()}`,
      status: trx.status,
      totalPrice: trx.totalPrice,
      qty: trx.qty,
      checkInDate: trx.checkInDate,
      checkOutDate: trx.checkOutDate,
      createdAt: trx.createdAt,
      property: trx.roomType?.property
        ? {
            id: trx.roomType.property.id,
            name: trx.roomType.property.name,
            city: trx.roomType.property.city,
          }
        : null,
      roomName: trx.roomType?.roomName || null,
      payment: trx.payment
        ? {
            id: trx.payment.id,
            method: trx.payment.method,
            status: trx.payment.paymentStatus,
            paymentUrl: trx.payment.paymentUrl,
            paymentProof: trx.payment.paymentProof,
            createdAt: trx.payment.createdAt,
          }
        : null,
    }));

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: data,
    });
  } catch (error) {
    console.error("getUserOrders error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getDetailUserOrder = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id tidak valid" });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: authUser.id },
      select: {
        userId: true,
        id: true,
        status: true,
        qty: true,
        totalPrice: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
        roomType: {
          select: {
            roomName: true,
            property: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
                userId: true,
                noRekening: true,
                destinationBank: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            method: true,
            paymentStatus: true,
            paymentUrl: true,
            paymentProof: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!transaction)
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });

    return res
      .status(200)
      .json({ message: "Get detail order berhasil", data: transaction });
  } catch (error) {
    console.error("Get detail order error: ", error);
    return res.status(500).json({ error: "Server Error" });
  }
};
