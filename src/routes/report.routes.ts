import { getSalesReport } from "../controllers/report.controller";
import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import {
  getPropertyReport,
  getRoomTypesByProperty,
  getTenantProperties,
} from "../controllers/propertyReport.controller";

const router = Router();

router.get("/sales", authenticate, authorize([Role.TENANT]), getSalesReport);

router.get(
  "/property-availability",
  authenticate,
  authorize([Role.TENANT]),
  getPropertyReport
);

router.get(
  "/tenant-property",
  authenticate,
  authorize([Role.TENANT]),
  getTenantProperties
);

router.get(
  "/tenant-roomtype",
  authenticate,
  authorize([Role.TENANT]),
  getRoomTypesByProperty
);
export default router;
