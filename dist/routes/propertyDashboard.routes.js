"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const propertyDashboard_controller_1 = require("../controllers/propertyDashboard.controller");
const property_controller_1 = require("../controllers/property.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const upload_1 = require("../middleware/upload");
const uploadMultiple = upload_1.mixedUpload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'roomImg_0', maxCount: 10 },
    { name: 'roomImg_1', maxCount: 10 },
    { name: 'roomImg_2', maxCount: 10 },
    { name: 'roomImg_3', maxCount: 10 },
    { name: 'roomImg_4', maxCount: 10 },
    { name: 'roomImg_5', maxCount: 10 },
    { name: 'roomImg_6', maxCount: 10 },
    { name: 'roomImg_7', maxCount: 10 },
    { name: 'roomImg_8', maxCount: 10 },
    { name: 'roomImg_9', maxCount: 10 },
    { name: 'roomImg_10', maxCount: 10 },
]);
const router = express_1.default.Router();
router.post("/add", authMiddleware_1.authenticate, uploadMultiple, propertyDashboard_controller_1.createProperty);
router.get("/categories", propertyDashboard_controller_1.getPropertyCategories);
router.get("/my", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), propertyDashboard_controller_1.getMyProperties);
router.get("/:id", authMiddleware_1.authenticate, property_controller_1.getPropertyById);
router.put("/:id", authMiddleware_1.authenticate, uploadMultiple, propertyDashboard_controller_1.updateProperty);
router.delete("/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), propertyDashboard_controller_1.deleteProperty);
exports.default = router;
