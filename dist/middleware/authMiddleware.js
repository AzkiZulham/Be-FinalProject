"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ===========================
// Middleware: authenticate()
// ===========================
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token tidak ditemukan" });
        }
        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: "Token tidak valid" });
        }
        // Cek user di database
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        // Tempel data user ke req
        req.user = {
            id: user.id,
            role: user.role,
            email: user.email,
        };
        return next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ message: "Autentikasi gagal" });
    }
};
exports.authenticate = authenticate;
// ===========================
// Middleware: authorize()
// ===========================
// Bisa dipakai untuk role: USER, TENANT, ADMIN, dll.
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "User belum login." });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Akses ditolak." });
        }
        return next();
    };
};
exports.authorize = authorize;
