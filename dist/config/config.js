"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRONTEND_URL = exports.JWT_SECRET = void 0;
exports.JWT_SECRET = process.env.JWT_SECRET || "supersecret";
exports.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
