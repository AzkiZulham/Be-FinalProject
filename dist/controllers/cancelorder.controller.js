"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrderTenant = exports.cancelOrderUser = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const midtransExpire_1 = require("../utils/midtransExpire");
const cancelOrderUser = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(430).json({ error: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "Invalid transaction Id" });
        }
        const transaction = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: {
                payment: true,
            },
        });
        if (!transaction)
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        if (transaction.userId !== authUser.id)
            return res
                .status(403)
                .json({ error: "Tidak berhak membatalkan transaksi ini" });
        if (transaction.status !== "WAITING_FOR_PAYMENT") {
            return res.status(409).json({
                error: "Transaksi tidak dapat dibatalkan pada status saat ini",
            });
        }
        if (transaction.payment &&
            (transaction.payment.paymentStatus ?? "") === "SETTLEMENT") {
            return res
                .status(409)
                .json({ error: "Transaksi sudah dibayar, tidak bisa dibatalkan" });
        }
        await prisma_1.prisma.$transaction(async (prisma) => {
            if (transaction.payment &&
                (transaction.payment.paymentStatus ?? "") === "PENDING") {
                await prisma.payment.update({
                    where: { id: transaction.payment.id },
                    data: { paymentStatus: "CANCEL" },
                });
            }
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: client_1.TransactionStatus.CANCELLED,
                },
            });
        });
        if (transaction.payment?.method === "MIDTRANS" &&
            (transaction.payment?.paymentStatus ?? "") === "PENDING" &&
            transaction.payment?.midtransId) {
            (0, midtransExpire_1.expireMidtrans)(transaction.payment.midtransId).catch((err) => console.warn("Gagal expire Midtrans:", err.message));
        }
        return res.json({
            message: "Transaksi dibatalkan",
            transactionId: transaction.id,
            status: "CANCELLED",
        });
    }
    catch (error) {
        console.error("cancelUserOrder error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.cancelOrderUser = cancelOrderUser;
const cancelOrderTenant = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "Invalid transaction Id" });
        }
        const transaction = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: {
                roomType: { include: { property: true } },
                payment: true,
            },
        });
        if (!transaction)
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        if (transaction.roomType.property.userId !== authUser.id) {
            return res
                .status(403)
                .json({ error: "Bukan transaksi di property anda" });
        }
        if (transaction.status !== "WAITING_FOR_PAYMENT") {
            return res.status(409).json({
                error: "Transaksi tidak dapat dibatalkan pada status saat ini",
            });
        }
        if (transaction.payment &&
            (transaction.payment.paymentStatus ?? "") === "SETTLEMENT") {
            return res
                .status(409)
                .json({ error: "Transaksi sudah dibayar, tidak bisa dibatalkan" });
        }
        await prisma_1.prisma.$transaction(async (prisma) => {
            if (transaction.payment &&
                (transaction.payment.paymentStatus ?? "") === "PENDING") {
                await prisma.payment.update({
                    where: { id: transaction.payment.id },
                    data: { paymentStatus: "CANCEL" },
                });
            }
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: client_1.TransactionStatus.CANCELLED,
                },
            });
        });
        if (transaction.payment?.method === "MIDTRANS" &&
            (transaction.payment?.paymentStatus ?? "") === "PENDING" &&
            transaction.payment?.midtransId) {
            (0, midtransExpire_1.expireMidtrans)(transaction.payment.midtransId).catch((err) => console.warn("Gagal expire Midtrans:", err.message));
        }
        return res.json({
            message: "Transaksi dibatalkan",
            transactionId: transaction.id,
            status: "CANCELLED",
        });
    }
    catch (error) {
        console.error("cancelUserOrder error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.cancelOrderTenant = cancelOrderTenant;
