"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = require("../middleware/upload");
const user_controller_1 = require("../controllers/user.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Update profil user atau tenant
router.put("/update-profile", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER, client_1.Role.TENANT]), user_controller_1.updateProfile);
// Ubah password
router.put("/update-password", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER, client_1.Role.TENANT]), user_controller_1.updatePassword);
// Upload avatar (pakai multer)
router.post("/upload-avatar", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER, client_1.Role.TENANT]), upload_1.profileUploadUser.single("avatar"), user_controller_1.uploadAvatar);
// ==========================
// Public routes (tidak perlu login)
// ==========================
router.get("/me", authMiddleware_1.authenticate, user_controller_1.getProfile);
exports.default = router;
