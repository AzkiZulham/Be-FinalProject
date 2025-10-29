import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { JWT_SECRET } from "../config/config";
import { Role } from "@prisma/client";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ error: "Email, password, dan role wajib diisi" });

    if (!["USER", "TENANT"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    const user = await prisma.user.findFirst({ where: { email, role: role as Role } });
    if (!user) return res.status(401).json({ error: "Email atau password salah" });

    if (!user.password)
      return res.status(400).json({ error: "Password belum diatur, silakan verifikasi akun terlebih dahulu" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Email atau password salah" });

    if (!user.isVerified) return res.status(403).json({ error: "Akun belum diverifikasi" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      redirect: user.role === "USER" ? "/" : "/tenant/dashboard",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Check email status for login form
export const checkEmailStatus = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email dan role wajib diisi" });
    }

    if (!["USER", "TENANT"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    const user = await prisma.user.findFirst({
      where: { email, role: role as Role },
      select: {
        id: true,
        email: true,
        isVerified: true,
        isEmailVerified: true,
        verifyTokenExpireAt: true,
      },
    });

    if (!user) {
      return res.json({ exists: false });
    }

    // Check if token is expired
    const tokenExpired = user.verifyTokenExpireAt
      ? user.verifyTokenExpireAt < new Date()
      : false;

    return res.json({
      exists: true,
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      tokenExpired,
    });
  } catch (err) {
    console.error("Check email status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
