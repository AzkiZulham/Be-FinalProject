import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
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
import { Role } from "@prisma/client";

const router = Router();

//User

router.post(
  "/",
  authenticate,
  authorize(["USER"]),
  reservationValidation,
  createReservation
);

router.get("/user/orders", authenticate, authorize(["USER"]), getUserOrders);
router.get(
  "/user/orders/:id",
  authenticate,
  authorize([Role.USER]),
  getDetailUserOrder
);

router.patch(
  "/user/orders/:id/cancel",
  authenticate,
  authorize([Role.USER]),
  cancelOrderUser
);

//Tenant

router.get(
  "/tenant/orders",
  authenticate,
  authorize([Role.TENANT]),
  getTenantOrder
);
router.get(
  "/tenant/orders/:id",
  authenticate,
  authorize([Role.TENANT]),
  getDetailTenantOrder
);

router.patch(
  "/tenant/orders/:id/cancel",
  authenticate,
  authorize([Role.TENANT]),
  cancelOrderTenant
);
router.patch(
  "/tenant/orders/:id/confirm",
  authenticate,
  authorize([Role.TENANT]),
  confirmPayment
);
router.patch(
  "/tenant/orders/:id/reject",
  authenticate,
  authorize([Role.TENANT]),
  rejectPayment
);
export default router;
