"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.checkResetToken = exports.resetPasswordGet = void 0;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const mailer_1 = require("../utils/mailer");
// ==================================================
// Handle GET /reset-password (klik dari email)
// ==================================================
const resetPasswordGet = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.redirect(`${process.env.FRONTEND_URL}/404`);
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpireAt: { gt: new Date() },
            },
        });
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/reset-password?verified=false`);
        }
        return res.redirect(`${process.env.FRONTEND_URL}/reset-password?token=${token}`);
    }
    catch (error) {
        console.error("GET reset-password error:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/reset-password?verified=false`);
    }
};
exports.resetPasswordGet = resetPasswordGet;
// ==================================================
// Handle GET /check-reset-token (check token validity)
// ==================================================
const checkResetToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res
                .status(400)
                .json({ valid: false, message: "Token tidak ditemukan" });
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                resetToken: token,
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
    }
    catch (error) {
        console.error("Check reset token error:", error);
        return res.status(500).json({ valid: false, message: "Server error" });
    }
};
exports.checkResetToken = checkResetToken;
// ==================================================
// Handle POST /forgot-password (request reset)
// ==================================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email wajib diisi" });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(400).json({ error: "Email tidak terdaftar" });
        }
        const existingToken = user.resetToken &&
            user.resetTokenExpireAt &&
            user.resetTokenExpireAt > new Date()
            ? user.resetToken
            : null;
        let resetToken;
        let resetTokenExpireAt;
        if (existingToken) {
            resetToken = existingToken;
            resetTokenExpireAt = user.resetTokenExpireAt;
        }
        else {
            resetToken = crypto_1.default.randomBytes(32).toString("hex");
            resetTokenExpireAt = new Date(Date.now() + 60 * 60 * 1000);
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetTokenExpireAt,
                },
            });
        }
        await (0, mailer_1.sendForgotPasswordEmail)(user.email, resetToken);
        return res.status(200).json({
            message: "Instruksi reset password telah dikirim ke email Anda.",
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ error: "Terjadi kesalahan server" });
    }
};
exports.forgotPassword = forgotPassword;
// ==================================================
// Handle POST /reset-password (reset password)
// ==================================================
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: "Token dan password wajib diisi" });
        }
        const user = await prisma_1.prisma.user.findFirst({
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
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpireAt: null,
            },
        });
        const redirect = updatedUser.role === "TENANT" ? "/login/tenant" : "/login/user";
        return res.status(200).json({
            message: "Password berhasil direset! Silakan login dengan password baru.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
            },
            redirect,
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ error: "Terjadi kesalahan server" });
    }
};
exports.resetPassword = resetPassword;
