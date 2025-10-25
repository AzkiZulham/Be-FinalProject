import { Router } from "express";
import {
  getTopProperties,
  getPropertyById,
  calculateBookingPrice,
  getNearbyProperties,
} from "../controllers/property.controller";
import { getPropertyCatalog } from "../controllers/propertySearch.controller";

const router = Router();

router.post("/calculate-price", calculateBookingPrice);
router.get("/top", getTopProperties);
router.get("/nearby", getNearbyProperties);
router.get("/:id", getPropertyById);
router.get("/", getPropertyCatalog);

export default router;
