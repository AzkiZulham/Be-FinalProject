"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.checkEmailAvailability = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const mailer_1 = require("../utils/mailer");
const checkEmailAvailability = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email || typeof email !== "string") {
            return res.status(400).json({ error: "Email wajib diisi" });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(200).json({ available: false, message: "Email sudah terdaftar" });
        }
        return res.status(200).json({ available: true, message: "Email tersedia" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.checkEmailAvailability = checkEmailAvailability;
const register = async (req, res) => {
    try {
        const { email, username, role } = req.body;
        if (!email || !role) {
            return res.status(400).json({ error: "Email dan role wajib diisi" });
        }
        if (!["USER", "TENANT"].includes(role)) {
            return res.status(400).json({ error: "Role tidak valid" });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: "Email sudah terdaftar" });
        const generatedUsername = username || email.split("@")[0];
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expireAt = new Date();
        expireAt.setHours(expireAt.getHours() + 1);
        await prisma_1.prisma.user.create({
            data: {
                email,
                username: generatedUsername,
                role: role,
                verifyToken: token,
                verifyTokenExpireAt: expireAt,
                isVerified: false,
            },
        });
        await (0, mailer_1.sendVerificationEmail)(email, token, role);
        res.status(201).json({ message: "Registrasi berhasil, cek email untuk verifikasi." });
        return;
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
        return;
    }
};
exports.register = register;
