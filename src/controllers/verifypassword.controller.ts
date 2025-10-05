import { Request, Response } from "express";
import { prisma } from "../config/prisma"; 
import bcrypt from "bcryptjs";

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token dan password wajib diisi" });
    }

    // Cari user berdasarkan verifyToken
    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: "Password sudah digunakan" });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user: hapus verifyToken + set verified
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

    // Kirim respons dengan user + redirect
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
