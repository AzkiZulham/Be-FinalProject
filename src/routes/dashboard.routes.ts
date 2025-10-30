import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = express.Router();

router.get("/stats", authenticate, authorize([Role.TENANT]), getDashboardStats);

export default router;
