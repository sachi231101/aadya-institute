import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  getPayments,
  createPayment,
  deletePayment,
  getPendingFees,
  collectPendingFee,
  sendFeeReminder,
  getFeeStats,
  getFeeReports,
} from "./fee.controller";

const router = Router();

router.use(authMiddleware);

// Stats & Financial Reports
router.get("/stats", requirePermission("fee.read"), getFeeStats);
router.get("/reports", requirePermission("fee.read"), getFeeReports);

// Payments
router.get("/payments", requirePermission("fee.read"), getPayments);
router.post("/payments", requirePermission("fee.create"), createPayment);
router.delete("/payments/:id", requirePermission("fee.delete"), deletePayment);

// Pending Fees
router.get("/pending", requirePermission("fee.read"), getPendingFees);
router.post("/pending/:id/collect", requirePermission("fee.update"), collectPendingFee);
router.post("/pending/:id/reminder", requirePermission("fee.update"), sendFeeReminder);

export default router;
