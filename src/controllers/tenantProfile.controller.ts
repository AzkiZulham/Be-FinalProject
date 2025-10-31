import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// GET tenant profile
export const getTenantProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profileImg: true,
        isVerified: true,
        isEmailVerified: true,
        phoneNumber: true,
        birthDate: true,
        gender: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal mengambil profil" });
  }
};

// UPDATE tenant profile
export const updateTenantProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser).id;
    const { username, email, phoneNumber, birthDate, gender } = req.body;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isEmailVerified: true },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const data: any = {};

    if (username) {
      data.username = username;
    }
    let emailChanged = false;
    if (email && email !== currentUser.email) {
      data.email = email;
      data.isEmailVerified = false;
      emailChanged = true;
    }

    if (phoneNumber !== undefined) {
      data.phoneNumber = phoneNumber || null;
    }

    if (birthDate) {
      data.birthDate = new Date(birthDate);
    }

    if (gender && gender !== "") {
      data.gender = gender;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    if (emailChanged) {
      const { sendResendEmailVerification } = await import("../utils/mailer");
      const jwt = await import("jsonwebtoken");
      const { JWT_SECRET } = await import("../config/config");

      const token = jwt.default.sign(
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
    }

    return res.status(200).json({
      message: emailChanged
        ? "Profil berhasil diperbarui. Email verifikasi telah dikirim ke email baru."
        : "Profil berhasil diperbarui",
      user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal memperbarui profil" });
  }
};

// UPDATE profile picture
export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser).id;

    if (!req.file) {
      return res.status(400).json({ message: "File gambar tidak ditemukan" });
    }

    // Handle path based on environment
    const isProduction = process.env.NODE_ENV === "production";
    const imagePath = isProduction
      ? `/tmp/profile/${req.file.filename}` // Temporary path for Vercel
      : `/uploads/profile/${req.file.filename}`; // Local path for development

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profileImg: imagePath },
    });

    return res.status(200).json({
      message: "Foto profil berhasil diperbarui",
      profileImg: imagePath,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal memperbarui foto profil" });
  }
};

// UPDATE Password
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser).id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Update password error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update password" });
  }
};
