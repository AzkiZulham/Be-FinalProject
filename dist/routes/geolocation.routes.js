"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geolocation_controller_1 = require("../controllers/geolocation.controller");
const router = (0, express_1.Router)();
router.get("/reverse", geolocation_controller_1.reverseGeocode);
router.get("/forward", geolocation_controller_1.forwardGeocode);
exports.default = router;
