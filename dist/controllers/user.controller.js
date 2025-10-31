"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.uploadAvatar = exports.updatePassword = exports.updateProfile = void 0;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mailer_1 = require("../utils/mailer");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
// ===========================
// Update profil user (Full Sync)
// ===========================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { userName, email, phoneNumber, gender, birthDate, avatar } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ message: "User tidak ditemukan" });
        let updateData = {
            username: userName,
            profileImg: avatar,
            phoneNumber,
            birthDate: birthDate ? new Date(birthDate) : null,
        };
        if (gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
            updateData.gender = gender;
        }
        if (email && email !== user.email) {
            const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (existing)
                return res
                    .status(400)
                    .json({ message: "Email sudah digunakan oleh akun lain" });
            const token = jsonwebtoken_1.default.sign({ id: user.id, email, role: user.role }, config_1.JWT_SECRET, { expiresIn: "1h" });
            updateData.email = email;
            updateData.isEmailVerified = false;
            updateData.verifyToken = token;
            updateData.verifyTokenExpireAt = new Date(Date.now() + 3600000);
            await (0, mailer_1.sendResendEmailVerification)(email, token);
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                isVerified: true,
                isEmailVerified: true,
                profileImg: true,
                phoneNumber: true,
                gender: true,
                birthDate: true,
            },
        });
        return res.status(200).json({
            message: email && email !== user.email
                ? "Profil diperbarui. Silakan verifikasi email baru Anda."
                : "Profil berhasil diperbarui.",
            user: updated,
        });
    }
    catch (error) {
        console.error("❌ Update profile error:", error);
        return res.status(500).json({ message: "Gagal memperbarui profil" });
    }
};
exports.updateProfile = updateProfile;
// ==========================
// Update Password
// ==========================
const updatePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!password) {
            return res
                .status(400)
                .json({ success: false, message: "Password required" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return res.json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (err) {
        console.error("Update password error:", err);
        return res
            .status(500)
            .json({ success: false, message: "Failed to update password" });
    }
};
exports.updatePassword = updatePassword;
// ==========================
// Upload Avatar
// ==========================
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, message: "No file uploaded" });
        }
        // Upload to Vercel Blob in production, use local path in development
        let imagePath;
        if (process.env.NODE_ENV === "production") {
            const { uploadToBlob } = await Promise.resolve().then(() => __importStar(require("../utils/uploader")));
            imagePath = await uploadToBlob(req.file, "user-profile");
        }
        else {
            imagePath = `/uploads/user-profile/${req.file.filename}`;
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { profileImg: imagePath },
        });
        return res.json({
            success: true,
            message: "Avatar uploaded successfully",
            avatar: imagePath,
        });
    }
    catch (err) {
        console.error("Upload avatar error:", err);
        return res
            .status(500)
            .json({ success: false, message: "Failed to upload avatar" });
    }
};
exports.uploadAvatar = uploadAvatar;
/// ==========================
// Get Profile
// ==========================
const getProfile = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "User belum login" });
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
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
    if (!user)
        return res.status(404).json({ message: "User tidak ditemukan" });
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
exports.getProfile = getProfile;
