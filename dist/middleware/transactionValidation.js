"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualPaymentValidation = exports.reservationValidation = void 0;
const express_validator_1 = require("express-validator");
exports.reservationValidation = [
    (0, express_validator_1.body)("roomTypeId").notEmpty().bail().withMessage("roomTypeId wajib diisi"),
    (0, express_validator_1.body)("checkInDate")
        .notEmpty()
        .withMessage("checkInDate wajib diisi")
        .bail()
        .isISO8601()
        .withMessage("checkInDate harus format tanggal yang valid"),
    (0, express_validator_1.body)("checkOutDate")
        .notEmpty()
        .withMessage("checkOutDate wajib diisi")
        .bail()
        .isISO8601()
        .withMessage("checkOutDate harus format tanggal yang valid"),
    (0, express_validator_1.body)("qty")
        .notEmpty()
        .withMessage("qty wajib diisi")
        .bail()
        .isInt({ min: 1 })
        .withMessage("qty harus integer minimal 1"),
];
exports.manualPaymentValidation = [
    (0, express_validator_1.body)("transactionId")
        .exists()
        .withMessage("transactionId wajib diisi")
        .bail()
        .isInt({ min: 1 })
        .withMessage("transactionId harus berupa angka positif"),
];
