import { body } from "express-validator";

export const reservationValidation = [
  body("roomTypeId").notEmpty().bail().withMessage("roomTypeId wajib diisi"),
  body("checkInDate")
    .notEmpty()
    .withMessage("checkInDate wajib diisi")
    .bail()
    .isISO8601()
    .withMessage("checkInDate harus format tanggal yang valid"),
  body("checkOutDate")
    .notEmpty()
    .withMessage("checkOutDate wajib diisi")
    .bail()
    .isISO8601()
    .withMessage("checkOutDate harus format tanggal yang valid"),
  body("qty")
    .notEmpty()
    .withMessage("qty wajib diisi")
    .bail()
    .isInt({ min: 1 })
    .withMessage("qty harus integer minimal 1"),
];
