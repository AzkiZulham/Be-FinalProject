import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { JWT_SECRET } from "../config/config";
import jwt from "jsonwebtoken";

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: Role;
    };

    // Ambil user terbaru dari DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Verify token error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
