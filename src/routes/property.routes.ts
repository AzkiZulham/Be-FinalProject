import { Router } from "express";
import { getPropertyById, calculateBookingPrice } from "../controllers/property.controller";
import { getPropertyCatalog } from "../controllers/propertySearch.controller";

const router = Router();

router.post("/calculate-price", calculateBookingPrice);
router.get("/:id", getPropertyById);
router.get("/", getPropertyCatalog);

export default router;
