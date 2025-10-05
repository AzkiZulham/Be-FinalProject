import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res.status(400).json({ message: "Token dan password wajib diisi" });

    // cari user berdasarkan verifyToken
    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user)
      return res.status(400).json({ message: "Token tidak valid atau sudah digunakan" });

    // hash password baru
    const hashedPassword = await bcrypt.hash(password, 10);

    // update user: hapus verifyToken + set verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verifyToken: null,
        isVerified: true,
      },
    });

    // tentukan redirect berdasarkan role
    const redirect =
      updatedUser.role === "TENANT"
        ? "/login/tenant"
        : "/login/user";

    // kirim respons tanpa token login
    return res.status(200).json({
      message: "Password berhasil dibuat! Silakan login untuk melanjutkan.",
      redirect,
    });
  } catch (error) {
    console.error("Verify password error:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
