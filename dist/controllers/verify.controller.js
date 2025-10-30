"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmail = exports.resendEmailVerification = exports.sendEmailVerification = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const config_1 = require("../config/config");
const mailer_1 = require("../utils/mailer");
const client_1 = require("@prisma/client");
// =====================================================
// Kirim verifikasi email pertama kali (setelah akun aktif atau dari login form)
// =====================================================
const sendEmailVerification = async (req, res) => {
    try {
        let user;
        // If authenticated (from profile), use req.user
        if (req.user) {
            user = await prisma_1.prisma.user.findUnique({
                where: { email: req.user?.email },
            });
        }
        else {
            // If from login form, use request body
            const { email, role } = req.body;
            if (!email || !role) {
                return res.status(400).json({ message: "Email dan role wajib diisi" });
            }
            if (!["USER", "TENANT"].includes(role)) {
                return res.status(400).json({ message: "Role tidak valid" });
            }
            user = await prisma_1.prisma.user.findFirst({
                where: { email, role: role },
            });
        }
        if (!user)
            return res.status(404).json({ message: "User tidak ditemukan" });
        if (user.isEmailVerified)
            return res.status(400).json({ message: "Email sudah terverifikasi" });
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expireAt = new Date();
        expireAt.setHours(expireAt.getHours() + 1);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                verifyToken: token,
                verifyTokenExpireAt: expireAt,
            },
        });
        await (0, mailer_1.sendVerificationEmail)(user.email, token, user.role);
        return res.status(200).json({
            message: `Email verifikasi telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
        });
    }
    catch (error) {
        console.error("❌ Send email verification error:", error);
        return res
            .status(500)
            .json({ message: "Gagal mengirim email verifikasi." });
    }
};
exports.sendEmailVerification = sendEmailVerification;
// =====================================================
// Kirim ulang verifikasi email (resend / setelah update email / dari login form)
// =====================================================
const resendEmailVerification = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || !role) {
            return res.status(400).json({ message: "Email dan role wajib diisi" });
        }
        if (!["USER", "TENANT"].includes(role)) {
            return res.status(400).json({ message: "Role tidak valid" });
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: { email, role: role },
        });
        if (!user)
            return res.status(404).json({ message: "User tidak ditemukan" });
        if (user.isEmailVerified)
            return res.status(400).json({ message: "Email sudah terverifikasi" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.JWT_SECRET, { expiresIn: "1h" });
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                verifyToken: token,
                verifyTokenExpireAt: new Date(Date.now() + 3600000),
            },
        });
        await (0, mailer_1.sendResendEmailVerification)(user.email, token);
        return res.status(200).json({
            message: `Link verifikasi ulang telah dikirim ke ${user.email}. Silakan cek inbox Anda.`,
        });
    }
    catch (error) {
        console.error("❌ Resend email verification error:", error);
        return res
            .status(500)
            .json({ message: "Gagal mengirim ulang email verifikasi." });
    }
};
exports.resendEmailVerification = resendEmailVerification;
// =====================================================
// Verifikasi email dari link token
// =====================================================
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            console.error("❌ User tidak ditemukan untuk token:", decoded.id);
            return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
        }
        if (user.isEmailVerified) {
            const redirectUrl = decoded.role === client_1.Role.TENANT
                ? `${process.env.FRONTEND_URL}/tenant/dashboard/settings/profile?verified=true`
                : `${process.env.FRONTEND_URL}/user/profile?verified=true`;
            return res.redirect(redirectUrl);
        }
        if (user.verifyToken !== token ||
            !user.verifyTokenExpireAt ||
            user.verifyTokenExpireAt < new Date()) {
            console.warn("⚠️ Token tidak valid atau kadaluarsa untuk user:", user.email);
            return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verifyToken: null,
                verifyTokenExpireAt: null,
            },
        });
        // Redirect based on user role
        const redirectUrl = decoded.role === client_1.Role.TENANT
            ? `${process.env.FRONTEND_URL}/tenant/dashboard/settings/profile?verified=true`
            : `${process.env.FRONTEND_URL}/user/profile?verified=true`;
        return res.redirect(redirectUrl);
    }
    catch (error) {
        console.error("❌ Verify email error:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/user/profile?verified=false`);
    }
};
exports.verifyEmail = verifyEmail;
