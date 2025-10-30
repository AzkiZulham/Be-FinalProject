"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const tenantProfile_controller_1 = require("../controllers/tenantProfile.controller");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// GET /api/tenant/profile
router.get("/profile", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), tenantProfile_controller_1.getTenantProfile);
// PUT /api/tenant/update-profile
router.put("/update-profile", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), tenantProfile_controller_1.updateTenantProfile);
// PUT /api/tenant/uplaod
router.put("/upload", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), upload_1.profileUpload.single("profileImg"), tenantProfile_controller_1.updateProfileImage);
// PUT /api/tenant/update-password
router.put("/update-password", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), tenantProfile_controller_1.updatePassword);
exports.default = router;
