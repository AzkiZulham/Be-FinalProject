import express from "express";
import passport from "passport";
import { register } from "../controllers/register.controller";
import {
  googleCallback,
  facebookCallback,
} from "../controllers/oauth.controller";
import {
  resendEmailVerification,
  verifyEmail,
  sendEmailVerification,
} from "../controllers/verify.controller";
import {
  verifyPassword,
  checkToken,
  verifyPasswordGet,
} from "../controllers/verifypassword.controller";
import { login } from "../controllers/login.controller";
import { authorize, authenticate } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import {
  forgotPassword,
  resetPassword,
  checkResetToken,
} from "../controllers/forgotpassword.controller";
const router = express.Router();

// ============================
// EMAIL REGISTER & VERIFY
// ============================
router.post("/register", register);
router.get("/verify", verifyEmail);
router.post("/verify-password", verifyPassword);
router.post("/login", login);
router.get("/check-token", checkToken);
router.get("/verify-password", verifyPasswordGet);

// kirim email verifikasi pertama kali (setelah akun aktif)
router.post(
  "/send-verification",
  authenticate,
  authorize([Role.USER, Role.TENANT]),
  sendEmailVerification
);

// kirim ulang verifikasi email (setelah update email)
router.post(
  "/resend-verification",
  authenticate,
  authorize([Role.USER, Role.TENANT]),
  resendEmailVerification
);

// ============================
// FORGOT PASSWORD
// ============================
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/check-reset-token", checkResetToken);

// ============================
// GOOGLE OAUTH
// ============================
router.get(
  "/google",
  (req, res, next) => {
    (req.session as any).role = req.query.role || "USER";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback
);

// ============================
// FACEBOOK OAUTH
// ============================
router.get(
  "/facebook",
  (req, res, next) => {
    (req.session as any).role = req.query.role || "USER";
    next();
  },
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/login",
  }),
  facebookCallback
);

export default router;
