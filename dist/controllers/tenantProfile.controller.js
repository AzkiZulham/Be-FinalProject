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
exports.updatePassword = exports.updateProfileImage = exports.updateTenantProfile = exports.getTenantProfile = void 0;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// GET tenant profile
const getTenantProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal mengambil profil" });
    }
};
exports.getTenantProfile = getTenantProfile;
// UPDATE tenant profile
const updateTenantProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, phoneNumber, birthDate, gender } = req.body;
        const currentUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, isEmailVerified: true },
        });
        if (!currentUser) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        const data = {};
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
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data,
        });
        if (emailChanged) {
            const { sendResendEmailVerification } = await Promise.resolve().then(() => __importStar(require("../utils/mailer")));
            const jwt = await Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
            const { JWT_SECRET } = await Promise.resolve().then(() => __importStar(require("../config/config")));
            const token = jwt.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
            await prisma_1.prisma.user.update({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal memperbarui profil" });
    }
};
exports.updateTenantProfile = updateTenantProfile;
// UPDATE profile picture
const updateProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) {
            return res.status(400).json({ message: "File gambar tidak ditemukan" });
        }
        // Handle path based on environment
        const isProduction = process.env.NODE_ENV === "production";
        const imagePath = isProduction
            ? `/tmp/profile/${req.file.filename}` // Temporary path for Vercel
            : `/uploads/profile/${req.file.filename}`; // Local path for development
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { profileImg: imagePath },
        });
        return res.status(200).json({
            message: "Foto profil berhasil diperbarui",
            profileImg: imagePath,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal memperbarui foto profil" });
    }
};
exports.updateProfileImage = updateProfileImage;
// UPDATE Password
const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
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
