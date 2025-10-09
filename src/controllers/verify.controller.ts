import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { JWT_SECRET } from "../config/config";
import { sendFirstEmailVerification, sendResendEmailVerification } from "../utils/mailer";
import { Role } from "@prisma/client";

// =====================================================
// Kirim verifikasi email pertama kali (setelah akun aktif)
// =====================================================
export const sendEmailVerification = async (req: Request, res: Response) => {
  console.log("[sendEmailVerification] called", req.method, req.path);

  try {
    console.log(req.user)
    const user = await prisma.user.findUnique({
      where: { email: (req.user as any)?.email },
    });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email sudah terverifikasi" });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Simpan token dan expiry di database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: token,
        verifyTokenExpireAt: new Date(Date.now() + 3600000), // 1 jam
      },
    });

    // Kirim email verifikasi pertama kali
    await sendFirstEmailVerification(user.email, token);

    return res.status(200).json({
      message: `Email verifikasi pertama telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
    });
  } catch (error) {
    console.error("❌ Send email verification error:", error);
    return res.status(500).json({ message: "Gagal mengirim email verifikasi." });
  }
};

// =====================================================
// Kirim ulang verifikasi email (resend / setelah update email)
// =====================================================
export const resendEmailVerification = async (req: Request, res: Response) => {
  console.log("[resendEmailVerification] called", req.method, req.path);

  try {
    const user = await prisma.user.findUnique({
      where: { email: (req.user as any)?.email },
    });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email sudah terverifikasi" });

    // Generate token baru
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Update token di database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: token,
        verifyTokenExpireAt: new Date(Date.now() + 3600000),
      },
    });

    // Kirim email verifikasi baru (resend)
    await sendResendEmailVerification(user.email, token);

    return res.status(200).json({
      message: `Link verifikasi ulang telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
    });
  } catch (error) {
    console.error("❌ Resend email verification error:", error);
    return res.status(500).json({ message: "Gagal mengirim ulang email verifikasi." });
  }
};

// =====================================================
// Verifikasi email dari link token
// =====================================================
export const verifyEmail = async (req: Request, res: Response) => {
  console.log("[verifyEmail] called");

  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
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
      return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
    }

    if (user.isEmailVerified) {
      return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=true`);
    }

    // Cek validitas token
    if (
      user.verifyToken !== token ||
      !user.verifyTokenExpireAt ||
      user.verifyTokenExpireAt < new Date()
    ) {
      console.warn("⚠️ Token tidak valid atau kadaluarsa untuk user:", user.email);
      return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
    }

    // Update status verifikasi email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verifyToken: null,
        verifyTokenExpireAt: null,
      },
    });

    console.log(`✅ Email ${user.email} berhasil diverifikasi.`);
    return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=true`);
  } catch (error) {
    console.error("❌ Verify email error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
  }
};
