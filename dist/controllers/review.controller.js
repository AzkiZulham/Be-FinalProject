"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsByProperty = exports.getTenantReview = exports.getUserReview = exports.tenantReply = exports.createReview = void 0;
const prisma_1 = require("../config/prisma");
const pagination_1 = require("../utils/pagination");
const createReview = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const { transactionId, comment } = req.body;
        const tranasaction = await prisma_1.prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
            include: {
                roomType: { include: { property: true } },
            },
        });
        if (!tranasaction)
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        if (tranasaction.userId !== authUser.id) {
            return res.status(403).json({ error: "Transaksi bukan milik Anda" });
        }
        if (tranasaction.status !== "ACCEPTED") {
            return res
                .status(409)
                .json({ error: "Transaksi belum diterima / dibayar" });
        }
        if (tranasaction.checkOutDate > new Date()) {
            return res
                .status(409)
                .json({ error: "Review hanya bisa setelah check-out" });
        }
        const existing = await prisma_1.prisma.review.findUnique({
            where: { transactionId: tranasaction.id },
            select: { id: true },
        });
        if (existing) {
            return res
                .status(409)
                .json({ error: "Review untuk transaksi ini sudah ada" });
        }
        const newReview = await prisma_1.prisma.review.create({
            data: {
                userId: authUser.id,
                propertyId: tranasaction.roomType.propertyId,
                transactionId: tranasaction.id,
                comment: comment?.trim() || "",
            },
            select: {
                id: true,
                comment: true,
                tenantReply: true,
                createdAt: true,
            },
        });
        return res.status(201).json({
            message: "Review tersimpan",
            data: newReview,
        });
    }
    catch (error) {
        console.error("createReview error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createReview = createReview;
const tenantReply = async (req, res) => {
    try {
        const tenant = req.user;
        if (!tenant)
            return res.status(401).json({ error: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID review tidak valid" });
        }
        const { reply } = req.body;
        const review = await prisma_1.prisma.review.findUnique({
            where: { id },
            include: { property: { select: { userId: true } } },
        });
        if (!review)
            return res.status(404).json({ error: "Review tidak ditemukan" });
        if (review.property.userId !== tenant.id) {
            return res
                .status(403)
                .json({ error: "Anda tidak berhak membalas review ini" });
        }
        const updated = await prisma_1.prisma.review.update({
            where: { id: review.id },
            data: { tenantReply: (reply || "").trim() },
            select: {
                id: true,
                comment: true,
                tenantReply: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.json({
            message: "Balasan terkirim",
            data: updated,
        });
    }
    catch (error) {
        console.error("replyReview error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.tenantReply = tenantReply;
const getUserReview = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser)
            return res.status(401).json({ error: "Unauthorized" });
        const transactionId = Number(req.params.transactionId);
        if (!Number.isInteger(transactionId) || transactionId <= 0) {
            return res.status(400).json({ error: "transactionId tidak valid" });
        }
        const review = await prisma_1.prisma.review.findUnique({
            where: { transactionId },
            select: { id: true, comment: true, tenantReply: true, createdAt: true },
        });
        if (review) {
            const trx = await prisma_1.prisma.transaction.findUnique({
                where: { id: transactionId },
                select: { userId: true },
            });
            if (!trx || trx.userId !== authUser.id)
                return res.status(403).json({ error: "Forbidden" });
        }
        return res.json({ message: "OK", data: review });
    }
    catch (error) {
        console.error("Get User Review error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUserReview = getUserReview;
const getTenantReview = async (req, res) => {
    try {
        const tenant = req.user;
        if (!tenant)
            return res.status(401).json({ error: "Unauthorized" });
        const transactionId = Number(req.params.transactionId);
        if (!Number.isInteger(transactionId) || transactionId <= 0) {
            return res.status(400).json({ error: "transactionId tidak valid" });
        }
        const review = await prisma_1.prisma.review.findUnique({
            where: { transactionId: transactionId },
            include: { property: { select: { userId: true } } },
        });
        if (!review)
            return res.status(404).json({ error: "Review tidak ditemukan" });
        if (review.property.userId !== tenant.id) {
            return res
                .status(403)
                .json({ error: "Anda tidak berhak membalas review ini" });
        }
        return res.json({ message: "OK", data: review });
    }
    catch (error) {
        console.error("Get User Review for tenant error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getTenantReview = getTenantReview;
const getReviewsByProperty = async (req, res) => {
    try {
        const propertyId = Number(req.params.propertyId);
        if (!Number.isInteger(propertyId) || propertyId <= 0) {
            return res.status(400).json({ error: "propertyId tidak valid" });
        }
        const { page, limit, skip } = (0, pagination_1.getPagination)(req.query);
        const sort = String(req.query.sort || "newest");
        const includeReply = String(req.query.includeReply ?? "true").toLowerCase() === "true";
        const orderBy = sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };
        const where = { propertyId };
        if (!includeReply) {
            where.tenantReply = null;
        }
        const [total, items] = await Promise.all([
            await prisma_1.prisma.review.count({ where }),
            await prisma_1.prisma.review.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    comment: true,
                    tenantReply: true,
                    createdAt: true,
                    user: { select: { username: true } },
                },
            }),
        ]);
        const data = items.map((r) => ({
            id: r.id,
            comment: r.comment,
            tenantReply: r.tenantReply,
            username: r.user.username || "User",
            createdAt: r.createdAt,
        }));
        return res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: data,
        });
    }
    catch (error) {
        console.error("getReviewsByProperty error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getReviewsByProperty = getReviewsByProperty;
