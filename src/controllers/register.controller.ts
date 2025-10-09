import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";
import { sendVerificationEmail } from "../utils/mailer";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email dan role wajib diisi" });
    }

    if (!["USER", "TENANT"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email sudah terdaftar" });

    const generatedUsername = username || email.split("@")[0];

    const token = crypto.randomBytes(32).toString("hex");
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 1);

    await prisma.user.create({
      data: {
        email,
        username: generatedUsername,
        role: role as Role,
        verifyToken: token,
        verifyTokenExpireAt: expireAt,
        isVerified: false,
      },
    });

    await sendVerificationEmail(email, token, role);

    res.status(201).json({ message: "Registrasi berhasil, cek email untuk verifikasi." });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
    return;
  }
};
