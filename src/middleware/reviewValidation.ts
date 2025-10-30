import { body, param } from "express-validator";

export const createReviewValidation = [
  body("transactionId")
    .exists()
    .withMessage("transactionId wajib diisi")
    .bail()
    .isInt({ min: 1 })
    .withMessage("transactionId harus integer positif"),
  body("comment")
    .exists()
    .withMessage("comment wajib diisi")
    .bail()
    .isString()
    .withMessage("comment harus berupa string")
    .isLength({ min: 1, max: 1000 })
    .withMessage("comment 1-1000 karakter"),
];

export const replyReviewValidation = [
  param("id").isInt({ min: 1 }).withMessage("id review harus integer positif"),
  body("reply")
    .exists()
    .withMessage("reply wajib diisi")
    .bail()
    .isString()
    .withMessage("reply harus berupa string")
    .isLength({ min: 1, max: 1000 })
    .withMessage("reply 1-1000 karakter"),
];
