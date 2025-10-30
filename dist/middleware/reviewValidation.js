"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyReviewValidation = exports.createReviewValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createReviewValidation = [
    (0, express_validator_1.body)("transactionId")
        .exists()
        .withMessage("transactionId wajib diisi")
        .bail()
        .isInt({ min: 1 })
        .withMessage("transactionId harus integer positif"),
    (0, express_validator_1.body)("comment")
        .exists()
        .withMessage("comment wajib diisi")
        .bail()
        .isString()
        .withMessage("comment harus berupa string")
        .isLength({ min: 1, max: 1000 })
        .withMessage("comment 1-1000 karakter"),
];
exports.replyReviewValidation = [
    (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage("id review harus integer positif"),
    (0, express_validator_1.body)("reply")
        .exists()
        .withMessage("reply wajib diisi")
        .bail()
        .isString()
        .withMessage("reply harus berupa string")
        .isLength({ min: 1, max: 1000 })
        .withMessage("reply 1-1000 karakter"),
];
