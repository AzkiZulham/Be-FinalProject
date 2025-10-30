"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.facebookCallback = exports.googleCallback = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const config_1 = require("../config/config");
const googleCallback = async (req, res) => {
    try {
        const profile = req.user;
        const roleFromSession = req.session?.role || "USER";
        if (!profile || !profile.emails?.[0]) {
            return res.redirect("/login?error=no_email");
        }
        const email = profile.emails[0].value;
        const username = profile.displayName?.replace(/\s+/g, "_") || email.split("@")[0];
        let user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma_1.prisma.user.create({ data: { email, username, role: roleFromSession, isVerified: true, isEmailVerified: true } });
        }
        else if (user.role !== roleFromSession) {
            const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
            return res.redirect(`${config_1.FRONTEND_URL}${loginPath}?error=email_registered_with_different_role`);
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.JWT_SECRET, { expiresIn: "7d" });
        const redirectUrl = user.role === "TENANT" ? `${config_1.FRONTEND_URL}/tenant/dashboard?token=${token}` : `${config_1.FRONTEND_URL}/?token=${token}`;
        return res.redirect(redirectUrl);
    }
    catch (err) {
        console.error("Google callback error:", err);
        return res.redirect("/login?error=oauth_failed");
    }
};
exports.googleCallback = googleCallback;
const facebookCallback = async (req, res) => {
    try {
        const profile = req.user;
        const roleFromSession = req.session?.role || "USER";
        if (!profile || !profile.emails?.[0]) {
            return res.redirect("/login?error=no_email");
        }
        const email = profile.emails[0].value;
        const username = profile.displayName?.replace(/\s+/g, "_") || email.split("@")[0];
        let user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma_1.prisma.user.create({ data: { email, username, role: roleFromSession, isVerified: true, isEmailVerified: true } });
        }
        else if (user.role !== roleFromSession) {
            const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
            return res.redirect(`${config_1.FRONTEND_URL}${loginPath}?error=email_registered_with_different_role`);
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.JWT_SECRET, { expiresIn: "7d" });
        const redirectUrl = user.role === "TENANT" ? `${config_1.FRONTEND_URL}/tenant/dashboard?token=${token}` : `${config_1.FRONTEND_URL}/?token=${token}`;
        return res.redirect(redirectUrl);
    }
    catch (err) {
        console.error("Facebook callback error:", err);
        return res.redirect("/login?error=oauth_failed");
    }
};
exports.facebookCallback = facebookCallback;
