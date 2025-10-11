import { Router } from "express";
import { getPropertyById } from "../controllers/property.controller";

const router = Router();

router.get("/:id", getPropertyById);

export default router;
