"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectPayment = exports.confirmPayment = void 0;
const prisma_1 = require("../config/prisma");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mailer_1 = require("../utils/mailer");
const confirmPayment = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID Transaksi tidak valid" });
        }
        const transasction = await prisma_1.prisma.transaction.findUnique({
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
        if ((transasction.payment.paymentStatus ?? "") === "SETTLEMENT" ||
            transasction.status === "ACCEPTED") {
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
        await prisma_1.prisma.$transaction(async (prisma) => {
            await prisma.payment.update({
                where: { id: transasction.payment.id },
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
        const userData = await prisma_1.prisma.user.findUnique({
            where: { id: transasction.userId },
            select: { email: true, username: true },
        });
        if (userData?.email) {
            await (0, mailer_1.sendPaymentConfirmedEmail)(userData.email, userData.username, transasction.roomType.property.name, transasction.checkInDate, transasction.checkOutDate);
        }
        return res.json({
            message: "Pembayaran dikonfirmasi",
            transactionId: transasction.id,
            status: "ACCEPTED",
            paidAt: now,
        });
    }
    catch (error) {
        console.error("confirmManualPayment error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.confirmPayment = confirmPayment;
const rejectPayment = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "id transaksi tidak valid" });
        }
        const transaction = await prisma_1.prisma.transaction.findUnique({
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
        if ((transaction.payment.paymentStatus ?? "") === "SETTLEMENT" ||
            transaction.status === "ACCEPTED") {
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
        const oldProofAbs = oldProofRel ? path_1.default.join("public", oldProofRel) : null;
        await prisma_1.prisma.$transaction(async (prisma) => {
            await prisma.payment.update({
                where: { id: transaction.payment.id },
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
            await promises_1.default.unlink(oldProofAbs).catch(() => { });
        }
        return res.json({
            message: "Pembayaran dibatalkan",
            transactionId: transaction.id,
            status: "CANCELLED",
        });
    }
    catch (error) {
        console.error("rejectManualPayment error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.rejectPayment = rejectPayment;
