import { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const uploadPaymentProof = async (req: Request, res: Response) => {
  let fileToCleanup: string | null = null;
  try {
    const authUser = (req as any).user;

    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const transactionId = Number(req.body.transactionId);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      // jika ada file, di hapus
      if (req.file?.path) fileToCleanup = path.join("public", req.file.path);
      return res.status(400).json({ error: "transactionId harus positif" });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file)
      return res.status(400).json({ error: "File bukti bayar harus diunggah" });

    const relativePath = file.path; // sudah di-set oleh middleware singleFile
    fileToCleanup = path.join("public", relativePath); // simpan untuk cleanup bila error

    const allowed = ["image/jpeg", "image/png"];

    if (!allowed.includes(file.mimetype)) {
      await fs.unlink(fileToCleanup).catch(() => {});
      return res.status(400).json({ error: "File harus jpg atau png" });
    }

    if (file.size > 1_000_000) {
      await fs.unlink(fileToCleanup).catch(() => {});
      return res.status(400).json({ error: "Ukuran file maksimal 1 MB" });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, userId: true, status: true },
    });

    if (!transaction) {
      await fs.unlink(fileToCleanup).catch(() => {});
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    }
    if (transaction.userId !== authUser.id) {
      await fs.unlink(fileToCleanup).catch(() => {});
      return res.status(403).json({
        error: "Anda tidak berhak mengunggah bukti untuk transaksi ini",
      });
    }
    if (transaction.status !== "WAITING_FOR_PAYMENT") {
      await fs.unlink(fileToCleanup).catch(() => {});
      return res.status(409).json({
        error: "Status transaksi tidak valid untuk upload bukti bayar",
      });
    }
    const existing = await prisma.payment.findFirst({
      where: {
        transactionId: transaction.id,
        method: "TRANSFER",
        paymentStatus: "PENDING",
      },
      select: { id: true, paymentProof: true },
    });

    await prisma.$transaction(async (prisma) => {
      if (existing) {
        if (existing.paymentProof) {
          const oldPath = path.join("public", existing.paymentProof);
          await fs.unlink(oldPath).catch(() => {});
        }

        await prisma.payment.update({
          where: { id: existing.id },
          data: {
            paymentProof: relativePath,
            paymentStatus: "PENDING",
            fraudStatus: "ACCEPT",
            paymentType: null,
            paidAt: null,
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            transactionId: transaction.id,
            method: "TRANSFER",
            paymentProof: relativePath,
            midtransId: null,
            paymentType: null,
            paymentStatus: "PENDING",
            fraudStatus: "ACCEPT",
            paymentUrl: null,
            paidAt: null,
          },
        });
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "WAITING_FOR_CONFIRMATION" },
      });
    });

    return res.json({
      message: "Bukti bayat terunggah. Menunggu konfirmasi",
      payment: {
        method: "TRANSFER",
        status: "PENDING",
        proofPath: relativePath,
      },
      transaction: {
        id: transaction.id,
        status: "WAITING_FOR_CONFIRMATION",
      },
    });
  } catch (error: any) {
    if (fileToCleanup) {
      await fs.unlink(fileToCleanup).catch(() => {});
    }
    console.error("Upload Manual Error: ", error);
    return res.status(500).json({ error: "Gagal Menggunggah bukti bayar" });
  }
};
