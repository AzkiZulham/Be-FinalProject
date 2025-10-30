"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const room_controller_1 = require("../controllers/room.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["TENANT"]), room_controller_1.getAllRooms);
router.get("/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["TENANT"]), room_controller_1.getRoomById);
router.post("/", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["TENANT"]), upload_1.roomUpload.array("roomImg", 10), room_controller_1.createRoom);
router.put("/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["TENANT"]), upload_1.roomUpload.array("roomImg", 10), room_controller_1.updateRoom);
router.delete("/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["TENANT"]), room_controller_1.deleteRoom);
exports.default = router;
