"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservation = void 0;
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
function enumerateDates(start, end) {
    const dates = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const stop = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur < stop) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}
async function calcPriceAndValidateAvailability(prisma, roomTypeId, checkIn, checkOut, qty) {
    const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
        select: { id: true, price: true, quota: true, propertyId: true },
    });
    if (!roomType)
        throw new Error("Tipe kamar tidak ditemukan");
    const nights = enumerateDates(checkIn, checkOut);
    if (nights.length < 1)
        throw new Error("Durasi minimal 1 malam");
    const peakRules = await prisma.peakSeason.findMany({
        where: {
            roomTypeId,
            startDate: { lt: checkOut },
            endDate: { gt: checkIn },
        },
        select: {
            startDate: true,
            endDate: true,
            isAvailable: true,
            percentage: true,
            nominal: true,
        },
    });
    const overlapBookings = await prisma.transaction.findMany({
        where: {
            roomTypeId,
            status: { in: ["WAITING_FOR_CONFIRMATION", "ACCEPTED"] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
        },
        select: { qty: true, checkInDate: true, checkOutDate: true },
    });
    let totalPrice = 0;
    for (const night of nights) {
        const takenForThisNight = overlapBookings.reduce((sum, b) => {
            const bStart = new Date(b.checkInDate.getFullYear(), b.checkInDate.getMonth(), b.checkInDate.getDate());
            const bEnd = new Date(b.checkOutDate.getFullYear(), b.checkOutDate.getMonth(), b.checkOutDate.getDate());
            const inRange = night >= bStart && night < bEnd;
            return inRange ? sum + b.qty : sum;
        }, 0);
        const remaining = (roomType.quota ?? 0) - takenForThisNight;
        if (remaining < qty) {
            throw new Error("Kuota tidak mencukupi pada salah satu tanggal yang dipilih");
        }
        let nightly = roomType.price;
        const activeRules = peakRules.filter((r) => {
            const s = new Date(r.startDate.getFullYear(), r.startDate.getMonth(), r.startDate.getDate());
            const e = new Date(r.endDate.getFullYear(), r.endDate.getMonth(), r.endDate.getDate());
            return night >= s && night < e;
        });
        const blocked = activeRules.some((r) => r.isAvailable === false);
        if (blocked) {
            throw new Error("Tanggal yang dipilih tidak tersedia");
        }
        for (const rule of activeRules) {
            if (rule.nominal && Number(rule.nominal) !== 0) {
                nightly += Number(rule.nominal);
            }
            if (rule.percentage && Number(rule.percentage) !== 0) {
                nightly += Math.round((nightly * Number(rule.percentage)) / 100);
            }
        }
        totalPrice += nightly * qty;
    }
    return { totalPrice, nights: nights.length };
}
const createReservation = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Payload tidak valid",
                details: errors.array(),
            });
        }
        const authUser = req.user || req.authUser;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        if (authUser.role !== "USER")
            return res
                .status(403)
                .json({ error: "Hanya user yang dapat membuat pesanan" });
        const roomTypeId = Number(req.body.roomTypeId);
        const qty = Number(req.body.qty);
        const checkInDate = new Date(req.body.checkInDate);
        const checkOutDate = new Date(req.body.checkOutDate);
        if (Number.isNaN(roomTypeId) || roomTypeId <= 0) {
            return res.status(400).json({ error: "roomTypeId harus angka positif" });
        }
        if (!(checkInDate instanceof Date) || isNaN(checkInDate.getTime())) {
            return res.status(400).json({ error: "checkInDate tidak valid" });
        }
        if (!(checkOutDate instanceof Date) || isNaN(checkOutDate.getTime())) {
            return res.status(400).json({ error: "checkOutDate tidak valid" });
        }
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({
                error: "checkOutDate harus lebih besar dari checkInDate (min 1 malam)",
            });
        }
        if (!Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ error: "qty harus integer positif" });
        }
        const { totalPrice, nights } = await calcPriceAndValidateAvailability(prisma, roomTypeId, checkInDate, checkOutDate, qty);
        const created = await prisma.$transaction(async (prisma) => {
            const trx = await prisma.transaction.create({
                data: {
                    userId: authUser.id,
                    roomTypeId,
                    status: "WAITING_FOR_PAYMENT",
                    checkInDate,
                    checkOutDate,
                    qty,
                    totalPrice,
                },
                select: {
                    id: true,
                    userId: true,
                    roomTypeId: true,
                    status: true,
                    checkInDate: true,
                    checkOutDate: true,
                    qty: true,
                    totalPrice: true,
                    createdAt: true,
                },
            });
            return trx;
        });
        const paymentDeadline = new Date(created.createdAt);
        paymentDeadline.setHours(paymentDeadline.getHours() + 1);
        return res.status(201).json({
            message: "Pesanan dibuat. Segera lakukan pembayaran/upload bukti dalam 1 jam.",
            transaction: {
                ...created,
                nights,
                orderNumber: `ORD-${created.id}-${new Date(created.createdAt)
                    .toISOString()
                    .slice(0, 10)
                    .replace(/-/g, "")}`,
                paymentDeadline,
            },
        });
    }
    catch (err) {
        console.error("Create reservation error:", err);
        return res
            .status(400)
            .json({ error: err.message || "Gagal membuat pesanan" });
    }
};
exports.createReservation = createReservation;
