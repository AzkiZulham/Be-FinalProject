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

    const relativePath = file.path;
    const baseDir = process.env.NODE_ENV === "production" ? "/tmp" : "public";
    fileToCleanup = path.join(baseDir, relativePath);

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
      // upsert payment untuk transaksi ini
      const updated = await prisma.payment.upsert({
        where: { transactionId: transaction.id }, // UNIQUE
        update: {
          method: "TRANSFER",
          paymentProof: relativePath,
          paymentStatus: "PENDING",
          fraudStatus: "ACCEPT",
          paymentType: null,
          paymentUrl: null,
          midtransId: null,
          paidAt: null,
        },
        create: {
          transactionId: transaction.id,
          method: "TRANSFER",
          paymentProof: relativePath,
          paymentStatus: "PENDING",
          fraudStatus: "ACCEPT",
          paymentType: null,
          paymentUrl: null,
          midtransId: null,
          paidAt: null,
        },
        select: { id: true, paymentProof: true },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "WAITING_FOR_CONFIRMATION" },
      });

      // setelah DB sukses, baru hapus file lama (kalau ada dan berbeda)
      if (existing?.paymentProof && existing.paymentProof !== relativePath) {
        const oldPath = path.join("public", existing.paymentProof);
        fs.unlink(oldPath).catch(() => {});
      }
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
