import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendForgotPasswordEmail } from "../utils/mailer";

// ==================================================
// Handle GET /reset-password (klik dari email)
// ==================================================
export const resetPasswordGet = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(`${process.env.FRONTEND_URL}/404`);
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpireAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/reset-password?verified=false`
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    );
  } catch (error) {
    console.error("GET reset-password error:", error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/reset-password?verified=false`
    );
  }
};

// ==================================================
// Handle GET /check-reset-token (check token validity)
// ==================================================
export const checkResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ valid: false, message: "Token tidak ditemukan" });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token as string,
        resetTokenExpireAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({
          valid: false,
          message: "Token tidak valid atau sudah kadaluarsa",
        });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("Check reset token error:", error);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
};

// ==================================================
// Handle POST /forgot-password (request reset)
// ==================================================
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi" });
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "Email tidak terdaftar" });
    }

    const existingToken =
      user.resetToken &&
      user.resetTokenExpireAt &&
      user.resetTokenExpireAt > new Date()
        ? user.resetToken
        : null;
    let resetToken: string;
    let resetTokenExpireAt: Date;
    if (existingToken) {
      resetToken = existingToken;
      resetTokenExpireAt = user.resetTokenExpireAt!;
    } else {
      resetToken = crypto.randomBytes(32).toString("hex");
      resetTokenExpireAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpireAt,
        },
      });
    }

    await sendForgotPasswordEmail(user.email, resetToken);

    return res.status(200).json({
      message: "Instruksi reset password telah dikirim ke email Anda.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};

// ==================================================
// Handle POST /reset-password (reset password)
// ==================================================
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token dan password wajib diisi" });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpireAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Token tidak valid atau sudah kadaluarsa." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpireAt: null,
      },
    });

    const redirect =
      updatedUser.role === "TENANT" ? "/login/tenant" : "/login/user";

    return res.status(200).json({
      message: "Password berhasil direset! Silakan login dengan password baru.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      redirect,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
