import { Router } from "express";
import {
  createReview,
  getReviewsByProperty,
  getTenantReview,
  getUserReview,
  tenantReply,
} from "../controllers/review.controller";
import {
  createReviewValidation,
  replyReviewValidation,
} from "../middleware/reviewValidation";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize([Role.USER]),
  createReviewValidation,
  createReview
);

router.get("/property/:propertyId", getReviewsByProperty);

router.get(
  "/tenant/:transactionId",
  authenticate,
  authorize([Role.TENANT]),
  getTenantReview
);

router.get(
  "/:transactionId",
  authenticate,
  authorize([Role.USER]),
  getUserReview
);

router.patch(
  "/:id/reply",
  authenticate,
  authorize(["TENANT"]),
  replyReviewValidation,
  tenantReply
);

export default router;
