import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
import { mockAuthTenant, mockAuthUser } from "../middleware/mockAuth";
import { reservationValidation } from "../middleware/transactionValidation";
import { getUserOrders } from "../controllers/userorder.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.post("/", mockAuthUser, reservationValidation, createReservation);

router.get("/user", mockAuthUser, getUserOrders);

export default router;
