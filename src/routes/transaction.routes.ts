import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
import { mockAuthTenant, mockAuthUser } from "../middleware/mockAuth";
import { reservationValidation } from "../middleware/transactionValidation";

const router = Router();

router.post("/", mockAuthUser, reservationValidation, createReservation);

export default router;
