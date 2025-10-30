"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEmailStatus = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const config_1 = require("../config/config");
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role)
            return res.status(400).json({ error: "Email, password, dan role wajib diisi" });
        if (!["USER", "TENANT"].includes(role)) {
            return res.status(400).json({ error: "Role tidak valid" });
        }
        const user = await prisma_1.prisma.user.findFirst({ where: { email, role: role } });
        if (!user)
            return res.status(401).json({ error: "Email atau password salah" });
        if (!user.password)
            return res.status(400).json({ error: "Password belum diatur, silakan verifikasi akun terlebih dahulu" });
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ error: "Email atau password salah" });
        if (!user.isVerified)
            return res.status(403).json({ error: "Akun belum diverifikasi" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Login berhasil",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
            redirect: user.role === "USER" ? "/" : "/tenant/dashboard",
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.login = login;
// Check email status for login form
const checkEmailStatus = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || !role) {
            return res.status(400).json({ error: "Email dan role wajib diisi" });
        }
        if (!["USER", "TENANT"].includes(role)) {
            return res.status(400).json({ error: "Role tidak valid" });
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: { email, role: role },
            select: {
                id: true,
                email: true,
                isVerified: true,
                isEmailVerified: true,
                verifyTokenExpireAt: true,
            },
        });
        if (!user) {
            return res.json({ exists: false });
        }
        // Check if token is expired
        const tokenExpired = user.verifyTokenExpireAt
            ? user.verifyTokenExpireAt < new Date()
            : false;
        return res.json({
            exists: true,
            isVerified: user.isVerified,
            isEmailVerified: user.isEmailVerified,
            tokenExpired,
        });
    }
    catch (err) {
        console.error("Check email status error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.checkEmailStatus = checkEmailStatus;
