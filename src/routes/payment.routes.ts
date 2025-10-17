import { Router } from "express";
import { mockAuthUser } from "../middleware/mockAuth";
import { singleFile } from "../utils/uploader";
import { uploadPaymentProof } from "../controllers/payment.controller";
import { manualPaymentValidation } from "../middleware/transactionValidation";
import { createMidtransPayment } from "../controllers/midtrans.controller";
import { midtransWebhook } from "../controllers/webhooks.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.post(
  "/manual",
  authenticate,
  authorize([Role.USER]),
  manualPaymentValidation,
  singleFile("pp", "/payments"),
  uploadPaymentProof
);

router.post(
  "/midtrans/create",
  authenticate,
  authorize([Role.USER]),
  createMidtransPayment
);

router.post("/midtrans/webhook", midtransWebhook);

export default router;
