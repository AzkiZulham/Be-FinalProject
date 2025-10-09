import { Router } from "express";
import { mockAuthTenant, mockAuthUser } from "../middleware/mockAuth";
import {
  createReview,
  getReviewsByProperty,
  getUserReview,
  tenantReply,
} from "../controllers/review.controller";
import {
  createReviewValidation,
  replyReviewValidation,
} from "../middleware/reviewValidation";

const router = Router();

router.post("/", mockAuthUser, createReviewValidation, createReview);

router.get("/property/:propertyId", getReviewsByProperty);

router.get("/:transactionId", mockAuthUser, getUserReview);

router.patch("/:id/reply", mockAuthTenant, replyReviewValidation, tenantReply);

export default router;
