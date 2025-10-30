"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const peakSeason_controller_1 = require("../controllers/peakSeason.controller");
const router = (0, express_1.Router)();
// All routes require authentication and tenant role
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorize)(["TENANT"]));
// GET /api/peak-season/:roomTypeId - Get all peak seasons for a room type
router.get("/:roomTypeId", peakSeason_controller_1.getPeakSeasons);
// POST /api/peak-season - Create a new peak season
router.post("/", peakSeason_controller_1.createPeakSeason);
// DELETE /api/peak-season/:id - Delete a peak season
router.delete("/:id", peakSeason_controller_1.deletePeakSeason);
// GET /api/peak-season/history/:roomTypeId - Get history of changes
router.get("/history/:roomTypeId", peakSeason_controller_1.getPeakSeasonHistory);
exports.default = router;
