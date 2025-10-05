import express from "express";
import passport from "passport";
import { register } from "../controllers/register.controller";
import { googleCallback, facebookCallback} from "../controllers/oauth.controller";
import {  verifyToken } from "../controllers/verify.controller";
import { verifyPassword } from "../controllers/verifypassword.controller";
import { login } from "../controllers/login.controller";

const router = express.Router();

// ============================
// EMAIL REGISTER & VERIFY
// ============================
router.post("/register", register);
router.get("/verify", verifyToken);
router.post("/verify-password", verifyPassword);
router.post("/login", login);


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



export default router;
