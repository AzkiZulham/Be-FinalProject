import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
import {
  mockAuthTenant,
  mockAuthTenant2,
  mockAuthUser,
} from "../middleware/mockAuth";
import { reservationValidation } from "../middleware/transactionValidation";
import {
  getDetailUserOrder,
  getUserOrders,
} from "../controllers/userorder.controller";
import { authenticate, authorize } from "../middleware/authMiddleware";
import {
  getDetailTenantOrder,
  getTenantOrder,
} from "../controllers/tenantorder.controller";
import {
  confirmPayment,
  rejectPayment,
} from "../controllers/confirmation.controller";
import {
  cancelOrderTenant,
  cancelOrderUser,
} from "../controllers/cancelorder.controller";

const router = Router();

//User

router.post("/", mockAuthUser, reservationValidation, createReservation);

router.get("/user/orders", mockAuthUser, getUserOrders);
router.get("/user/orders/:id", mockAuthUser, getDetailUserOrder);

router.patch("/user/orders/:id/cancel", mockAuthUser, cancelOrderUser);

//Tenant

router.get("/tenant/orders", mockAuthTenant, getTenantOrder);
router.get("/tenant/orders/:id", mockAuthTenant, getDetailTenantOrder);

router.patch("/tenant/orders/:id/cancel", mockAuthTenant, cancelOrderTenant);
router.patch("/tenant/orders/:id/confirm", mockAuthTenant, confirmPayment);
router.patch("/tenant/orders/:id/reject", mockAuthTenant, rejectPayment);
export default router;
