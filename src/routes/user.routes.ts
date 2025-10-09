import express from "express";
import multer from "multer";
import {
  updateProfile,
  updatePassword,
  uploadAvatar,
  getProfile,
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";


const router = express.Router();


// Konfigurasi upload avatar
const upload = multer({ dest: "uploads/" });


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
  upload.single("avatar"),
  uploadAvatar
);

// ==========================
// Public routes (tidak perlu login)
// ==========================
router.get("/me", authenticate, getProfile);

export default router;
