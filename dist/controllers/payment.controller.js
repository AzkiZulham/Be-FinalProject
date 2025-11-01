"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPaymentProof = void 0;
const uploader_1 = require("../utils/uploader");
const prisma_1 = require("../config/prisma");
const uploadPaymentProof = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const transactionId = Number(req.body.transactionId);
        if (!Number.isInteger(transactionId) || transactionId <= 0) {
            return res.status(400).json({ error: "transactionId harus positif" });
        }
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: "File bukti bayar harus diunggah" });
        const allowed = ["image/jpeg", "image/png"];
        if (!allowed.includes(file.mimetype)) {
            return res.status(400).json({ error: "File harus jpg atau png" });
        }
        if (file.size > 1000000) {
            return res.status(400).json({ error: "Ukuran file maksimal 1 MB" });
        }
        const transaction = await prisma_1.prisma.transaction.findUnique({
            where: { id: transactionId },
            select: { id: true, userId: true, status: true },
        });
        if (!transaction) {
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        if (transaction.userId !== authUser.id) {
            return res.status(403).json({
                error: "Anda tidak berhak mengunggah bukti untuk transaksi ini",
            });
        }
        if (transaction.status !== "WAITING_FOR_PAYMENT") {
            return res.status(409).json({
                error: "Status transaksi tidak valid untuk upload bukti bayar",
            });
        }
        // Upload to Vercel Blob
        const blobUrl = await (0, uploader_1.uploadToBlob)(file, "payments");
        const existing = await prisma_1.prisma.payment.findFirst({
            where: {
                transactionId: transaction.id,
                method: "TRANSFER",
                paymentStatus: "PENDING",
            },
            select: { id: true, paymentProof: true },
        });
        await prisma_1.prisma.$transaction(async (prisma) => {
            // upsert payment untuk transaksi ini
            const updated = await prisma.payment.upsert({
                where: { transactionId: transaction.id }, // UNIQUE
                update: {
                    method: "TRANSFER",
                    paymentProof: blobUrl,
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
                    paymentProof: blobUrl,
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
        });
        return res.json({
            message: "Bukti bayat terunggah. Menunggu konfirmasi",
            payment: {
                method: "TRANSFER",
                status: "PENDING",
                proofPath: blobUrl,
            },
            transaction: {
                id: transaction.id,
                status: "WAITING_FOR_CONFIRMATION",
            },
        });
    }
    catch (error) {
        console.error("Upload Manual Error: ", error);
        console.error("Error stack: ", error.stack);
        console.error("Request body: ", req.body);
        console.error("File info: ", req.file);
        return res.status(500).json({
            error: "Gagal Menggunggah bukti bayar",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
exports.uploadPaymentProof = uploadPaymentProof;
