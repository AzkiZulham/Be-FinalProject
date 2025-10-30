"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkToken = exports.verifyPassword = exports.verifyPasswordGet = void 0;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// ==================================================
// Handle GET /verify-password (klik dari email)
// ==================================================
const verifyPasswordGet = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.redirect(`${process.env.FRONTEND_URL}/404`);
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                verifyToken: token,
                verifyTokenExpireAt: { gt: new Date() },
            },
        });
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/verify-password?verified=false`);
        }
        return res.redirect(`${process.env.FRONTEND_URL}/verify-password?token=${token}`);
    }
    catch (error) {
        console.error("GET verify-password error:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/verify-password?verified=false`);
    }
};
exports.verifyPasswordGet = verifyPasswordGet;
// ==================================================
// Handle POST /verify-password (set password)
// ==================================================
const verifyPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res
                .status(400)
                .json({ message: "Token dan password wajib diisi" });
        }
        const user = await prisma_1.prisma.user.findFirst({ where: { verifyToken: token } });
        if (!user) {
            return res.status(400).json({ message: "Token tidak valid." });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                verifyToken: null,
                verifyTokenExpireAt: null,
                isVerified: true,
                isEmailVerified: true,
            },
        });
        const redirect = updatedUser.role === "TENANT" ? "/login/tenant" : "/login/user";
        return res.status(200).json({
            message: "Password berhasil dibuat! Silakan login untuk melanjutkan.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
            },
            redirect,
        });
    }
    catch (error) {
        console.error("Verify password error:", error);
        return res.status(500).json({ message: "Terjadi kesalahan server" });
    }
};
exports.verifyPassword = verifyPassword;
// ==================================================
// Handle check-token (optional via FE)
// ==================================================
const checkToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res
                .status(400)
                .json({ valid: false, message: "Token tidak ditemukan" });
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                verifyToken: token,
                verifyTokenExpireAt: { gt: new Date() },
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
        console.error("Check token error:", error);
        return res.status(500).json({ valid: false, message: "Server error" });
    }
};
exports.checkToken = checkToken;
