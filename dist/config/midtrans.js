"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.midtransSnap = void 0;
const midtrans_client_1 = __importDefault(require("midtrans-client"));
exports.midtransSnap = new midtrans_client_1.default.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SANDBOX_SERVER_KEY,
    clientKey: process.env.MIDTRANS_SANDBOX_CLIENT_KEY,
});
