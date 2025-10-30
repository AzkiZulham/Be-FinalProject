"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const transactionValidation_1 = require("../middleware/transactionValidation");
const userorder_controller_1 = require("../controllers/userorder.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const tenantorder_controller_1 = require("../controllers/tenantorder.controller");
const confirmation_controller_1 = require("../controllers/confirmation.controller");
const cancelorder_controller_1 = require("../controllers/cancelorder.controller");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
//User
router.post("/", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["USER"]), transactionValidation_1.reservationValidation, transaction_controller_1.createReservation);
router.get("/user/orders", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)(["USER"]), userorder_controller_1.getUserOrders);
router.get("/user/orders/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER]), userorder_controller_1.getDetailUserOrder);
router.patch("/user/orders/:id/cancel", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.USER]), cancelorder_controller_1.cancelOrderUser);
//Tenant
router.get("/tenant/orders", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), tenantorder_controller_1.getTenantOrder);
router.get("/tenant/orders/:id", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), tenantorder_controller_1.getDetailTenantOrder);
router.patch("/tenant/orders/:id/cancel", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), cancelorder_controller_1.cancelOrderTenant);
router.patch("/tenant/orders/:id/confirm", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), confirmation_controller_1.confirmPayment);
router.patch("/tenant/orders/:id/reject", authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.Role.TENANT]), confirmation_controller_1.rejectPayment);
exports.default = router;
