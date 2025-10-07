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
import {
  confirmPayment,
  rejectPayment,
} from "../controllers/confirmation.controller";

const router = Router();

//User

router.post("/", mockAuthUser, reservationValidation, createReservation);

router.get("/user", mockAuthUser, getUserOrders);

router.patch("/cancel/:id", mockAuthUser, cancelOrderUser);

//Tenant

router.get("/tenant/orders", mockAuthTenant, getTenantOrder);

router.patch("/tenant/orders/:id/confirm", mockAuthTenant, confirmPayment);
router.patch("/tenant/orders/:id/reject", mockAuthTenant, rejectPayment);
export default router;
