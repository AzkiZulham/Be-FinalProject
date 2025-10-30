import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import {
  getPeakSeasons,
  createPeakSeason,
  deletePeakSeason,
  getPeakSeasonHistory
} from "../controllers/peakSeason.controller";

const router = Router();

// All routes require authentication and tenant role
router.use(authenticate);
router.use(authorize(["TENANT"]));

// GET /api/peak-season/:roomTypeId - Get all peak seasons for a room type
router.get("/:roomTypeId", getPeakSeasons);

// POST /api/peak-season - Create a new peak season
router.post("/", createPeakSeason);

// DELETE /api/peak-season/:id - Delete a peak season
router.delete("/:id", deletePeakSeason);

// GET /api/peak-season/history/:roomTypeId - Get history of changes
router.get("/history/:roomTypeId", getPeakSeasonHistory);

export default router;
