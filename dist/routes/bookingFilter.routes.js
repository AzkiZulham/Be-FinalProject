"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingFilter_controller_1 = require("../controllers/bookingFilter.controller");
const router = (0, express_1.Router)();
router.post('/search', bookingFilter_controller_1.searchProperties);
router.get('/cities', bookingFilter_controller_1.getCities);
exports.default = router;
