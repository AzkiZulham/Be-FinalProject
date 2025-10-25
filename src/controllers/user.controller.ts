import { Response, Request } from "express";
import { prisma } from "../config/prisma";
import bcrypt from "bcryptjs";
import { AuthenticatedUser } from "../types/express";
import { sendResendEmailVerification } from "../utils/mailer";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";

// ===========================
// Update profil user (Full Sync)
// ===========================
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { userName, email, phoneNumber, gender, birthDate, avatar } =
      req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    let updateData: any = {
      username: userName,
      profileImg: avatar,
      phoneNumber,
      birthDate: birthDate ? new Date(birthDate) : null,
    };

    if (gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      updateData.gender = gender;
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing)
        return res
          .status(400)
          .json({ message: "Email sudah digunakan oleh akun lain" });

      const token = jwt.sign(
        { id: user.id, email, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      updateData.email = email;
      updateData.isVerified = false;
      updateData.verifyToken = token;
      updateData.verifyTokenExpireAt = new Date(Date.now() + 3600000);

      await sendResendEmailVerification(email, token);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
        profileImg: true,
        phoneNumber: true,
        gender: true,
        birthDate: true,
      },
    });

    return res.status(200).json({
      message:
        email && email !== user.email
          ? "Profil diperbarui. Silakan verifikasi email baru Anda."
          : "Profil berhasil diperbarui.",
      user: updated,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return res.status(500).json({ message: "Gagal memperbarui profil" });
  }
};

// ==========================
// Update Password
// ==========================
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser)?.id;
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

// ==========================
// Upload Avatar
// ==========================
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as AuthenticatedUser)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const imagePath = `/uploads/user-profile/${req.file.filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { profileImg: imagePath },
    });

    return res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar: imagePath,
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload avatar" });
  }
};

/// ==========================
// Get Profile
// ==========================

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "User belum login" });

  const user = await prisma.user.findUnique({
    where: { id: (req.user as AuthenticatedUser).id },
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

  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

  return res.json({
    user: {
      userName: user.username,
      email: user.email,
      avatar: user.profileImg || "/default-avatar.png",
      verified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: user.phoneNumber || "",
      birthDate: user.birthDate
        ? user.birthDate.toISOString().split("T")[0]
        : "",
      gender: user.gender || "",
    },
  });
};
