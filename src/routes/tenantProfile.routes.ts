import express from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import {
  getTenantProfile,
  updateTenantProfile,
  updateProfileImage,
  updatePassword,
} from "../controllers/tenantProfile.controller";
import { profileUpload } from "../middleware/upload";

const router = express.Router();

// GET /api/tenant/profile
router.get(
  "/profile",
  authenticate,
  authorize([Role.TENANT]),
  getTenantProfile
);

// PUT /api/tenant/update-profile
router.put(
  "/update-profile",
  authenticate,
  authorize([Role.TENANT]),
  updateTenantProfile
);

// PUT /api/tenant/uplaod
router.put(
  "/upload",
  authenticate,
  authorize([Role.TENANT]),
  profileUpload.single("profileImg"),
  updateProfileImage
);

// PUT /api/tenant/update-password
router.put(
  "/update-password",
  authenticate,
  authorize([Role.TENANT]),
  updatePassword
);

export default router;
