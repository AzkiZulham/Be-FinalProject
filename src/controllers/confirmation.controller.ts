import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import fs from "fs/promises";
import path from "path";
import { sendPaymentConfirmedEmail } from "../utils/mailer";

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID Transaksi tidak valid" });
    }

    const transasction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        roomType: {
          include: { property: true },
        },
        payment: true,
      },
    });

    if (!transasction)
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });

    if (transasction.roomType.property.userId !== authUser.id) {
      return res.status(403).json({ error: "Bukan transaksi di propery anda" });
    }
    if (!transasction.payment || transasction.payment.method !== "TRANSFER") {
      return res.status(409).json({
        error: "Transaksi ini belum di bayar atau bukan pembayaran manual",
      });
    }

    if (
      (transasction.payment.paymentStatus ?? "") === "SETTLEMENT" ||
      transasction.status === "ACCEPTED"
    ) {
      return res.json({
        message: "Pembayaran telah dikonfirmasi",
        transasctionId: transasction.id,
        status: "ACCEPTED",
      });
    }

    if (transasction.status !== "WAITING_FOR_CONFIRMATION") {
      return res.status(409).json({ error: "Status pembayaran tidak valid" });
    }

    if ((transasction.payment.paymentStatus ?? "") !== "PENDING") {
      return res.status(409).json({ error: "Status pembayaran tidak valid" });
    }

    const now = new Date();

    await prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: transasction.payment!.id },
        data: {
          paymentStatus: "SETTLEMENT",
          fraudStatus: "ACCEPT",
          paidAt: now,
        },
      });

      await prisma.transaction.update({
        where: { id: transasction.id },
        data: { status: "ACCEPTED" },
      });
    });

    const userData = await prisma.user.findUnique({
      where: { id: transasction.userId },
      select: { email: true, username: true },
    });

    if (userData?.email) {
      await sendPaymentConfirmedEmail(
        userData.email,
        userData.username,
        transasction.roomType.property.name,
        transasction.checkInDate,
        transasction.checkOutDate
      );
    }

    return res.json({
      message: "Pembayaran dikonfirmasi",
      transactionId: transasction.id,
      status: "ACCEPTED",
      paidAt: now,
    });
  } catch (error) {
    console.error("confirmManualPayment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const rejectPayment = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id transaksi tidak valid" });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        roomType: {
          include: { property: true },
        },
        payment: true,
      },
    });

    if (!transaction)
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });

    if (transaction.roomType.property.userId !== authUser.id) {
      return res.status(403).json({ error: "Bukan transaksi di propery anda" });
    }

    if (!transaction.payment || transaction.payment.method !== "TRANSFER") {
      return res.status(409).json({
        error: "Transaksi ini belum di bayar atau bukan pembayaran manual",
      });
    }

    if (
      (transaction.payment.paymentStatus ?? "") === "SETTLEMENT" ||
      transaction.status === "ACCEPTED"
    ) {
      return res.json({
        message: "Pembayaran telah dikonfirmasi",
        transasctionId: transaction.id,
        status: "ACCEPTED",
      });
    }

    if (transaction.status !== "WAITING_FOR_CONFIRMATION") {
      return res.status(409).json({ error: "Status pembayaran tidak valid" });
    }

    if ((transaction.payment.paymentStatus ?? "") !== "PENDING") {
      return res.status(409).json({ error: "Status pembayaran tidak valid" });
    }

    const oldProofRel = transaction.payment.paymentProof
      ? String(transaction.payment.paymentProof)
      : null;
    const oldProofAbs = oldProofRel ? path.join("public", oldProofRel) : null;

    await prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: transaction.payment!.id },
        data: {
          paymentStatus: "CANCEL",
          paymentProof: null,
        },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "WAITING_FOR_PAYMENT" },
      });
    });

    if (oldProofAbs) {
      await fs.unlink(oldProofAbs).catch(() => {});
    }

    return res.json({
      message: "Pembayaran dibatalkan",
      transactionId: transaction.id,
      status: "CANCELLED",
    });
  } catch (error) {
    console.error("rejectManualPayment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
