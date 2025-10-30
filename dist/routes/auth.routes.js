"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const register_controller_1 = require("../controllers/register.controller");
const oauth_controller_1 = require("../controllers/oauth.controller");
const verify_controller_1 = require("../controllers/verify.controller");
const verifypassword_controller_1 = require("../controllers/verifypassword.controller");
const login_controller_1 = require("../controllers/login.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const forgotpassword_controller_1 = require("../controllers/forgotpassword.controller");
const router = express_1.default.Router();
// ============================
// EMAIL REGISTER & VERIFY
// ============================
router.get("/check-email", register_controller_1.checkEmailAvailability);
router.post("/register", register_controller_1.register);
router.get("/verify", verify_controller_1.verifyEmail);
router.post("/verify-password", verifypassword_controller_1.verifyPassword);
router.post("/login", login_controller_1.login);
router.post("/check-email", login_controller_1.checkEmailStatus);
router.get("/check-token", verifypassword_controller_1.checkToken);
router.get("/verify-password", verifypassword_controller_1.verifyPasswordGet);
// kirim email verifikasi pertama kali (setelah akun aktif atau dari login form)
router.post("/send-verification", verify_controller_1.sendEmailVerification);
// kirim ulang verifikasi email (setelah update email)
router.post("/resend-verification", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER, client_1.Role.TENANT]), verify_controller_1.resendEmailVerification);
// ============================
// FORGOT PASSWORD
// ============================
router.post("/forgot-password", forgotpassword_controller_1.forgotPassword);
router.post("/reset-password", forgotpassword_controller_1.resetPassword);
router.get("/check-reset-token", forgotpassword_controller_1.checkResetToken);
// ============================
// GOOGLE OAUTH
// ============================
router.get("/google", (req, res, next) => {
    req.session.role = req.query.role || "USER";
    next();
}, passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: "/login",
}), oauth_controller_1.googleCallback);
// ============================
// FACEBOOK OAUTH
// ============================
router.get("/facebook", (req, res, next) => {
    req.session.role = req.query.role || "USER";
    next();
}, passport_1.default.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport_1.default.authenticate("facebook", {
    session: false,
    failureRedirect: "/login",
}), oauth_controller_1.facebookCallback);
exports.default = router;
