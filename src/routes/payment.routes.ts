import { Router } from "express";
import { mockAuthUser } from "../middleware/mockAuth";
import { singleFile } from "../utils/uploader";
import { uploadPaymentProof } from "../controllers/payment.controller";

const router = Router();

router.post(
  "/manual",
  mockAuthUser,
  singleFile("pp", "/payments"),
  uploadPaymentProof
);

export default router;
