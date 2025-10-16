import { mockAuthTenant } from "../middleware/mockAuth";
import { getSalesReport } from "../controllers/report.controller";
import { Router } from "express";

const router = Router();

router.get("/sales", mockAuthTenant, getSalesReport);

export default router;
