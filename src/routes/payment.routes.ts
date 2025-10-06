import { Router } from "express";
import { mockAuthUser } from "../middleware/mockAuth";
import { singleFile } from "../utils/uploader";
import { uploadPaymentProof } from "../controllers/payment.controller";
import { manualPaymentValidation } from "../middleware/transactionValidation";

const router = Router();

router.post(
  "/manual",
  mockAuthUser,
  manualPaymentValidation,
  singleFile("pp", "/payments"),
  uploadPaymentProof
);

export default router;
