import { FeeRepository } from "./fee.repository";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
} from "./fee.types";
import { prisma } from "../../config/database";

export const FeeService = {
  async getPayments(instituteId: string, query: QueryPaymentsDTO) {
    return FeeRepository.findPayments(instituteId, query);
  },

  async createPayment(
    instituteId: string,
    branchId: string | null | undefined,
    dto: CreatePaymentDTO,
    recordedById?: string
  ) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const receiptNo = `RCP-2026-${randomSuffix}`;
    return FeeRepository.createPayment(instituteId, branchId, receiptNo, dto, recordedById);
  },

  async deletePayment(id: string, instituteId: string) {
    const existing = await FeeRepository.findPaymentById(id, instituteId);
    if (!existing) {
      throw new Error("Payment record not found");
    }
    return FeeRepository.deletePayment(id, instituteId);
  },

  async getPendingFees(instituteId: string, query: QueryPendingFeesDTO) {
    return FeeRepository.findPendingFees(instituteId, query);
  },

  async collectPendingFee(
    pendingFeeId: string,
    instituteId: string,
    dto: CollectPendingFeeDTO,
    recordedById?: string
  ) {
    const pendingItem = await FeeRepository.findPendingFeeById(pendingFeeId, instituteId);
    if (!pendingItem) {
      throw new Error("Pending fee record not found");
    }

    if (dto.amountPaidNow > pendingItem.dueAmount) {
      throw new Error(`Amount paid (₹${dto.amountPaidNow}) exceeds due amount (₹${pendingItem.dueAmount})`);
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const receiptNo = `RCP-2026-${randomSuffix}`;

    return FeeRepository.recordPendingFeePayment(pendingItem, receiptNo, dto, recordedById);
  },

  async sendFeeReminder(pendingFeeId: string, instituteId: string) {
    const pendingItem = await FeeRepository.findPendingFeeById(pendingFeeId, instituteId);
    if (!pendingItem) {
      throw new Error("Pending fee record not found");
    }

    // Create a WhatsappLog record for payment reminder
    const waLog = await prisma.whatsappLog.create({
      data: {
        waMessageId: `REM-${Date.now()}`,
        from: "+91 98765 43210",
        to: pendingItem.phone,
        type: "FEE_REMINDER",
        body: `Dear ${pendingItem.studentName}, your fee installment of ₹${pendingItem.dueAmount} for ${pendingItem.courseName} is due on ${new Date(pendingItem.dueDate).toLocaleDateString()}. Please pay at the earliest.`,
        direction: "OUTBOUND",
        status: "SENT",
      },
    });

    return {
      message: `WhatsApp reminder sent to ${pendingItem.phone}`,
      logId: waLog.id,
      studentName: pendingItem.studentName,
      phone: pendingItem.phone,
    };
  },

  async getFeeStats(instituteId: string) {
    return FeeRepository.getFeeStats(instituteId);
  },

  async getFeeReports(instituteId: string) {
    return FeeRepository.getFeeReports(instituteId);
  },
};
