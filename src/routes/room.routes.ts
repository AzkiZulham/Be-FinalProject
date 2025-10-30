import express from "express";
import {
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom, getAllRooms
} from "../controllers/room.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { roomUpload } from "../middleware/upload";

const router = express.Router();

router.get("/", authenticate, authorize(["TENANT"]), getAllRooms);
router.get("/:id", authenticate, authorize(["TENANT"]), getRoomById);
router.post("/", authenticate, authorize(["TENANT"]), roomUpload.array("roomImg", 10), createRoom);
router.put("/:id", authenticate, authorize(["TENANT"]), roomUpload.array("roomImg", 10), updateRoom);
router.delete("/:id", authenticate, authorize(["TENANT"]), deleteRoom);

export default router;
