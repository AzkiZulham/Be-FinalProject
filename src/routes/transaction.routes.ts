import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
import {
  mockAuthTenant,
  mockAuthTenant2,
  mockAuthUser,
} from "../middleware/mockAuth";
import { reservationValidation } from "../middleware/transactionValidation";
import {
  cancelOrderUser,
  getUserOrders,
} from "../controllers/userorder.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { getTenantOrder } from "../controllers/tenantorder.controller";

const router = Router();

router.post("/", mockAuthUser, reservationValidation, createReservation);

router.get("/user", mockAuthUser, getUserOrders);

router.patch("/cancel/:id", mockAuthUser, cancelOrderUser);

router.get("/tenant/orders", mockAuthTenant, getTenantOrder);
export default router;
