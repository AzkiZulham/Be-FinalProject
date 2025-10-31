"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPaymentProof = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const prisma_1 = require("../config/prisma");
const uploadPaymentProof = async (req, res) => {
    let fileToCleanup = null;
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const transactionId = Number(req.body.transactionId);
        if (!Number.isInteger(transactionId) || transactionId <= 0) {
            // jika ada file, di hapus
            if (req.file?.path)
                fileToCleanup = path_1.default.join("public", req.file.path);
            return res.status(400).json({ error: "transactionId harus positif" });
        }
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: "File bukti bayar harus diunggah" });
        const relativePath = file.path;
        const baseDir = process.env.NODE_ENV === "production" ? "/tmp" : "public";
        fileToCleanup = path_1.default.join(baseDir, relativePath);
        const allowed = ["image/jpeg", "image/png"];
        if (!allowed.includes(file.mimetype)) {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
            return res.status(400).json({ error: "File harus jpg atau png" });
        }
        if (file.size > 1000000) {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
            return res.status(400).json({ error: "Ukuran file maksimal 1 MB" });
        }
        const transaction = await prisma_1.prisma.transaction.findUnique({
            where: { id: transactionId },
            select: { id: true, userId: true, status: true },
        });
        if (!transaction) {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        if (transaction.userId !== authUser.id) {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
            return res.status(403).json({
                error: "Anda tidak berhak mengunggah bukti untuk transaksi ini",
            });
        }
        if (transaction.status !== "WAITING_FOR_PAYMENT") {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
            return res.status(409).json({
                error: "Status transaksi tidak valid untuk upload bukti bayar",
            });
        }
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
                const oldBaseDir = process.env.NODE_ENV === "production" ? "/tmp" : "public";
                const oldPath = path_1.default.join(oldBaseDir, existing.paymentProof);
                promises_1.default.unlink(oldPath).catch(() => { });
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
    }
    catch (error) {
        if (fileToCleanup) {
            await promises_1.default.unlink(fileToCleanup).catch(() => { });
        }
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
