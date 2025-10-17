import express from "express";
import { getPropertyCategories, getMyProperties, deleteProperty, updateProperty, createProperty } from "../controllers/propertyDashboard.controller";
import { getPropertyById } from "../controllers/property.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/properties");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });
const uploadMultiple = multer({ storage }).fields([
  { name: 'picture', maxCount: 1 },
  { name: 'roomImg_0', maxCount: 1 },
  { name: 'roomImg_1', maxCount: 1 },
  { name: 'roomImg_2', maxCount: 1 },
  { name: 'roomImg_3', maxCount: 1 },
  { name: 'roomImg_4', maxCount: 1 },
  { name: 'roomImg_5', maxCount: 1 },
  { name: 'roomImg_6', maxCount: 1 },
  { name: 'roomImg_7', maxCount: 1 },
  { name: 'roomImg_8', maxCount: 1 },
  { name: 'roomImg_9', maxCount: 1 },
]);
const router = express.Router();

router.post("/add", authenticate, uploadMultiple, createProperty);
router.get("/categories", getPropertyCategories);
router.get("/my", authenticate, authorize([Role.TENANT]), getMyProperties);
router.get("/:id", authenticate, getPropertyById);
router.put("/:id", authenticate, upload.single("picture"), updateProperty);
router.delete("/:id", authenticate, authorize([Role.TENANT]), deleteProperty);

export default router;
