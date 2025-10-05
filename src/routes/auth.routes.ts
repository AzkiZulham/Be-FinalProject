import express from "express";
import passport from "passport";
import { register, verifyPassword, googleCallback, facebookCallback, verifyToken } from "../controllers/auth.controller";

const router = express.Router();

// ============================
// EMAIL REGISTER & VERIFY
// ============================
router.post("/register", register);
router.post("/verify-password", verifyPassword);

// ============================
// GOOGLE OAUTH
// ============================
router.get(
  "/google",
  (req, res, next) => {
    // simpan role dari query param → default USER
    (req.session as any).role = req.query.role || "USER";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
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
  passport.authenticate("facebook", { session: false, failureRedirect: "/login" }),
  facebookCallback
);

router.get("/verify", verifyToken);

export default router;
