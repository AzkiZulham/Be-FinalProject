import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { midtransSnap } from "../config/midtrans";

export const createMidtransPayment = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const { transactionId } = req.body;
    if (!transactionId || isNaN(Number(transactionId))) {
      return res
        .status(400)
        .json({ error: "transactionId harus berupa angka" });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(transactionId) },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        roomType: {
          select: {
            roomName: true,
            property: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!transaction)
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    if (transaction.userId !== authUser.id)
      return res.status(403).json({ error: "Bukan pemilik transaksi" });

    if (transaction.status === "ACCEPTED") {
      return res.status(400).json({ error: "Transaksi sudah dibayar" });
    }

    const orderId = `trx-${transaction.id}-${Date.now()}`;
    const itemName = `${transaction.roomType.property.name || "Property"} - ${
      transaction.roomType.roomName || "Room"
    }`;

    const paramater: any = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(transaction.totalPrice),
      },
      customer_details: {
        email: transaction.user.email || "user@example.com",
        first_name: transaction.user.username || "User",
      },
      item_details: [
        {
          id: String(transaction.roomTypeId),
          price: Number(transaction.totalPrice),
          quantity: 1,
          name: itemName.substring(0, 50),
        },
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/finish`,
      },
      expiry: {
        start_time:
          transaction.createdAt.toISOString().slice(0, 19).replace("T", " ") +
          " +0700",
        unit: "minutes",
        duration: 60,
      },
      enabled_payments: ["qris", "gopay", "bank_transfer"],
    };

    const snapResp = await midtransSnap.createTransaction(paramater);
    const { token, redirect_url } = snapResp;

    await prisma.payment.upsert({
      where: { transactionId: transaction.id },
      update: {
        method: "MIDTRANS",
        paymentStatus: "PENDING",
        fraudStatus: "ACCEPT",
        midtransId: orderId, // timpa dengan order_id terbaru
        paymentType: null,
        paymentUrl: redirect_url,
        paidAt: null,
      },
      create: {
        transactionId: transaction.id,
        method: "MIDTRANS",
        paymentStatus: "PENDING",
        fraudStatus: "ACCEPT",
        midtransId: orderId,
        paymentType: null,
        paymentUrl: redirect_url,
        paidAt: null,
      },
    });

    return res.json({ token, redirect_url, orderId });
  } catch (error) {
    console.error("createMidtrans error: ", error);
    return res.status(500).json({ error: "Gagal membuat midtrans" });
  }
};
