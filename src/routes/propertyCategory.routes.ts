import { Router } from "express";
import {
  createPropertyCategory,
  updatePropertyCategory,
  deletePropertyCategory,
} from "../controllers/propertyCategory.controller";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.post("/add", authenticate, createPropertyCategory);
router.put("/:id", authenticate, updatePropertyCategory);
router.delete("/:id", authenticate, deletePropertyCategory);

export default router;
