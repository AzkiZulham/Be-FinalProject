import { Router } from "express";
import { createReservation } from "../controllers/transaction.controller";
import { mockAuthTenant, mockAuthUser } from "../middleware/mockAuth";

const router = Router();

router.post("/", mockAuthUser, createReservation);

export default router;
