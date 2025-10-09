import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { error } from "console";
import { getPagination } from "../utils/pagination";
import { Prisma } from "@prisma/client";

export const createReview = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const { transactionId, comment } = req.body as {
      transactionId?: number;
      comment?: string;
    };

    const tranasaction = await prisma.transaction.findUnique({
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

    const existing = await prisma.review.findUnique({
      where: { transactionId: tranasaction.id },
      select: { id: true },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Review untuk transaksi ini sudah ada" });
    }

    const newReview = await prisma.review.create({
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
  } catch (error) {
    console.error("createReview error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const tenantReply = async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).user;
    if (!tenant) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID review tidak valid" });
    }

    const { reply } = req.body as { reply?: string };

    const review = await prisma.review.findUnique({
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

    const updated = await prisma.review.update({
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
  } catch (error) {
    console.error("replyReview error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getUserReview = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const transactionId = Number(req.params.transactionId);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return res.status(400).json({ error: "transactionId tidak valid" });
    }

    const review = await prisma.review.findUnique({
      where: { transactionId },
      select: { id: true, comment: true, tenantReply: true, createdAt: true },
    });

    if (review) {
      const trx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { userId: true },
      });
      if (!trx || trx.userId !== authUser.id)
        return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ message: "OK", data: review });
  } catch (error) {
    console.error("Get User Review error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getReviewsByProperty = async (req: Request, res: Response) => {
  try {
    const propertyId = Number(req.params.propertyId);
    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      return res.status(400).json({ error: "propertyId tidak valid" });
    }

    const { page, limit, skip } = getPagination(req.query);

    const sort = String(req.query.sort || "newest") as "newest" | "oldest";
    const includeReply =
      String(req.query.includeReply ?? "true").toLowerCase() === "true";

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" as const };

    const where: any = { propertyId };
    if (!includeReply) {
      where.tenantReply = null;
    }

    const [total, items] = await Promise.all([
      await prisma.review.count({ where }),
      await prisma.review.findMany({
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
  } catch (error) {
    console.error("getReviewsByProperty error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
