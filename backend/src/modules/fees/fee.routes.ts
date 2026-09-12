import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  getPayments,
  createPayment,
  deletePayment,
  voidPayment,
  createCharges,
  createCharge,
  getPendingFees,
  collectPendingFee,
  sendFeeReminder,
  getFeeStats,
  getFeeReports,
  getStudentFeeStatement,
  listFeeStudents,
  getReceipts,
  getReceipt,
  downloadReceiptPdf,
  ensureReceiptPdf,
  listStudentInvoices,
  getStudentInvoice,
  cancelStudentInvoice,
  listOtherInvoices,
  getOtherInvoice,
  createOtherInvoice,
} from "./fee.controller";

const router = Router();

router.use(authMiddleware);

// Stats & Financial Reports
router.get("/stats", requirePermission("fee.read"), getFeeStats);
router.get("/reports", requirePermission("fee.read"), getFeeReports);

// Receipts
router.get("/receipts", requirePermission("fee.read"), getReceipts);
router.get("/receipts/:id", requirePermission("fee.read"), getReceipt);
router.get("/receipts/:id/pdf", requirePermission("fee.read"), downloadReceiptPdf);
router.post("/receipts/:id/pdf", requirePermission("fee.read"), ensureReceiptPdf);

// Student fee workspace
router.get("/students", requirePermission("fee.read"), listFeeStudents);
router.get("/students/:studentId", requirePermission("fee.read"), getStudentFeeStatement);

// Student invoices
router.get("/invoices", requirePermission("fee.read"), listStudentInvoices);
router.get("/invoices/:id", requirePermission("fee.read"), getStudentInvoice);
router.post("/invoices/:id/cancel", requirePermission("fee.update"), cancelStudentInvoice);

// Other invoices
router.get("/other-invoices", requirePermission("fee.read"), listOtherInvoices);
router.get("/other-invoices/:id", requirePermission("fee.read"), getOtherInvoice);
router.post("/other-invoices", requirePermission("fee.create"), createOtherInvoice);

// Ad-hoc charges (book / exam / etc.)
router.post("/charges", requirePermission("fee.create"), createCharges);
router.post("/charge", requirePermission("fee.create"), createCharge);

// Payments
router.get("/payments", requirePermission("fee.read"), getPayments);
router.post("/payments", requirePermission("fee.create"), createPayment);
router.post("/payments/:id/void", requirePermission("fee.delete"), voidPayment);
router.delete("/payments/:id", requirePermission("fee.delete"), deletePayment);

// Pending Fees
router.get("/pending", requirePermission("fee.read"), getPendingFees);
router.post("/pending/:id/collect", requirePermission("fee.update"), collectPendingFee);
router.post("/pending/:id/reminder", requirePermission("fee.update"), sendFeeReminder);

export default router;
