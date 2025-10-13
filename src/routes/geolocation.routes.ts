import { Router } from "express";
import { reverseGeocode, forwardGeocode } from "../controllers/geolocation.controller";

const router = Router();

router.get("/reverse", reverseGeocode);
router.get("/forward", forwardGeocode);

export default router;
