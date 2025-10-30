import express from "express";
import { getPropertyCategories, getMyProperties, deleteProperty, updateProperty, createProperty } from "../controllers/propertyDashboard.controller";
import { getPropertyById } from "../controllers/property.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { mixedUpload } from "../middleware/upload";

const uploadMultiple = mixedUpload.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'roomImg_0', maxCount: 10 },
  { name: 'roomImg_1', maxCount: 10 },
  { name: 'roomImg_2', maxCount: 10 },
  { name: 'roomImg_3', maxCount: 10 },
  { name: 'roomImg_4', maxCount: 10 },
  { name: 'roomImg_5', maxCount: 10 },
  { name: 'roomImg_6', maxCount: 10 },
  { name: 'roomImg_7', maxCount: 10 },
  { name: 'roomImg_8', maxCount: 10 },
  { name: 'roomImg_9', maxCount: 10 },
  { name: 'roomImg_10', maxCount: 10 },
]);
const router = express.Router();

router.post("/add", authenticate, uploadMultiple, createProperty);
router.get("/categories", getPropertyCategories);
router.get("/my", authenticate, authorize([Role.TENANT]), getMyProperties);
router.get("/:id", authenticate, getPropertyById);
router.put("/:id", authenticate, uploadMultiple, updateProperty);
router.delete("/:id", authenticate, authorize([Role.TENANT]), deleteProperty);

export default router;
