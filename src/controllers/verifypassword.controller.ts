import { Request, Response } from "express";
import { prisma } from "../config/prisma"; 
import bcrypt from "bcryptjs";

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token dan password wajib diisi" });
    }

    // Cari user berdasarkan verifyToken (token valid sudah dicek di frontend)
    const user = await prisma.user.findFirst({ where: { verifyToken: token } });

    // Kalau token sudah tidak cocok dengan siapa pun (misal sudah dipakai)
    if (!user) {
      return res.status(400).json({ message: "Token tidak valid." });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verifyToken: null,
        verifyTokenExpireAt: null,
        isVerified: true,
      },
    });

    // Tentukan redirect berdasarkan role
    const redirect = updatedUser.role === "TENANT" ? "/login/tenant" : "/login/user";

    return res.status(200).json({
      message: "Password berhasil dibuat! Silakan login untuk melanjutkan.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      redirect,
    });
  } catch (error) {
    console.error("Verify password error:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};


// Check token valid atau tidak 
export const checkToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Token tidak ditemukan" });
    }

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token as string,
        verifyTokenExpireAt: { gt: new Date() }, // masih berlaku
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ valid: false, message: "Token tidak valid atau sudah kadaluarsa" });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("Check token error:", error);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
};