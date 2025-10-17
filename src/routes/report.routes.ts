import { getSalesReport } from "../controllers/report.controller";
import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.get("/sales", authenticate, authorize([Role.TENANT]), getSalesReport);

export default router;
