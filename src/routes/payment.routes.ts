import { Router } from "express";
import { mockAuthUser } from "../middleware/mockAuth";
import { singleFile } from "../utils/uploader";
import { uploadPaymentProof } from "../controllers/payment.controller";
import { manualPaymentValidation } from "../middleware/transactionValidation";
import { createMidtransPayment } from "../controllers/midtrans.controller";
import { midtransWebhook } from "../controllers/webhooks.controller";

const router = Router();

router.post(
  "/manual",
  mockAuthUser,
  manualPaymentValidation,
  singleFile("pp", "/payments"),
  uploadPaymentProof
);

router.post("/midtrans/create", mockAuthUser, createMidtransPayment);

router.post("/midtrans/webhook", midtransWebhook);

export default router;
