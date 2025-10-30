import express from "express";
import { profileUploadUser } from "../middleware/upload";
import {
  updateProfile,
  updatePassword,
  uploadAvatar,
  getProfile,
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = express.Router();

// Update profil user atau tenant
router.put(
  "/update-profile",
  authenticate,
  authorize([Role.USER, Role.TENANT]),
  updateProfile
);

// Ubah password
router.put(
  "/update-password",
  authenticate,
  authorize([Role.USER, Role.TENANT]),
  updatePassword
);

// Upload avatar (pakai multer)
router.post(
  "/upload-avatar",
  authenticate,
  authorize([Role.USER, Role.TENANT]),
  profileUploadUser.single("avatar"),
  uploadAvatar
);

// ==========================
// Public routes (tidak perlu login)
// ==========================
router.get("/me", authenticate, getProfile);

export default router;
