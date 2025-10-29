import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { JWT_SECRET } from "../config/config";
import {
  sendFirstEmailVerification,
  sendResendEmailVerification,
  sendVerificationEmail,
} from "../utils/mailer";
import { Role } from "@prisma/client";

// =====================================================
// Kirim verifikasi email pertama kali (setelah akun aktif atau dari login form)
// =====================================================
export const sendEmailVerification = async (req: Request, res: Response) => {
  try {
    let user;

    // If authenticated (from profile), use req.user
    if (req.user) {
      user = await prisma.user.findUnique({
        where: { email: (req.user as any)?.email },
      });
    } else {
      // If from login form, use request body
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: "Email dan role wajib diisi" });
      }

      if (!["USER", "TENANT"].includes(role)) {
        return res.status(400).json({ message: "Role tidak valid" });
      }

      user = await prisma.user.findFirst({
        where: { email, role: role as Role },
      });
    }

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email sudah terverifikasi" });

    const token = crypto.randomBytes(32).toString("hex");
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: token,
        verifyTokenExpireAt: expireAt,
      },
    });

    await sendVerificationEmail(user.email, token, user.role);

    return res.status(200).json({
      message: `Email verifikasi telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
    });
  } catch (error) {
    console.error("❌ Send email verification error:", error);
    return res
      .status(500)
      .json({ message: "Gagal mengirim email verifikasi." });
  }
};

// =====================================================
// Kirim ulang verifikasi email (resend / setelah update email / dari login form)
// =====================================================
export const resendEmailVerification = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: "Email dan role wajib diisi" });
    }

    if (!["USER", "TENANT"].includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    const user = await prisma.user.findFirst({
      where: { email, role: role as Role },
    });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email sudah terverifikasi" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: token,
        verifyTokenExpireAt: new Date(Date.now() + 3600000),
      },
    });

    await sendResendEmailVerification(user.email, token);

    return res.status(200).json({
      message: `Link verifikasi ulang telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
    });
  } catch (error) {
    console.error("❌ Resend email verification error:", error);
    return res
      .status(500)
      .json({ message: "Gagal mengirim ulang email verifikasi." });
  }
};

// =====================================================
// Verifikasi email dari link token
// =====================================================
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(
        `${process.env.FRONTEND_URL}/user/profile?verified=false`
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: Role;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      console.error("❌ User tidak ditemukan untuk token:", decoded.id);
      return res.redirect(
        `${process.env.FRONTEND_URL}/user/profile?verified=false`
      );
    }

    if (user.isEmailVerified) {
      const redirectUrl = decoded.role === Role.TENANT
        ? `${process.env.FRONTEND_URL}/tenant/dashboard/settings/profile?verified=true`
        : `${process.env.FRONTEND_URL}/user/profile?verified=true`;
      return res.redirect(redirectUrl);
    }

    if (
      user.verifyToken !== token ||
      !user.verifyTokenExpireAt ||
      user.verifyTokenExpireAt < new Date()
    ) {
      console.warn(
        "⚠️ Token tidak valid atau kadaluarsa untuk user:",
        user.email
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/user/profile?verified=false`
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verifyToken: null,
        verifyTokenExpireAt: null,
      },
    });

    // Redirect based on user role
    const redirectUrl = decoded.role === Role.TENANT
      ? `${process.env.FRONTEND_URL}/tenant/dashboard/settings/profile?verified=true`
      : `${process.env.FRONTEND_URL}/user/profile?verified=true`;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ Verify email error:", error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/user/profile?verified=false`
    );
  }
};
