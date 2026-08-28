import { FeeRepository } from "./fee.repository";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
} from "./fee.types";
import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";
import {
  resolveOptionalMasterFields,
  resolveRequiredMasterFields,
} from "../masters/master-resolve.service";

async function resolvePaymentMasters(
  instituteId: string,
  dto: {
    paymentModeMasterId?: string;
    method?: string;
    bankAccountMasterId?: string;
    feeHeadMasterId?: string;
  },
  branchId?: string | null
) {
  let method = dto.method || "UPI";
  let paymentModeMasterId: string | undefined;
  let bankAccountMasterId: string | undefined;
  let feeHead: string | undefined;
  let feeHeadMasterId: string | undefined;

  if (dto.paymentModeMasterId) {
    const resolved = await resolveRequiredMasterFields({
      instituteId,
      entityType: "paymentmodes",
      masterRecordId: dto.paymentModeMasterId,
      branchId,
    });
    paymentModeMasterId = resolved.masterId;
    method = resolved.code || resolved.label;
  }

  if (dto.bankAccountMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "bankaccounts",
      masterRecordId: dto.bankAccountMasterId,
      branchId,
    });
    bankAccountMasterId = resolved?.masterId;
  }

  if (dto.feeHeadMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "feeheads",
      masterRecordId: dto.feeHeadMasterId,
      branchId,
    });
    feeHeadMasterId = resolved?.masterId;
    feeHead = resolved?.label;
  }

  return { method, paymentModeMasterId, bankAccountMasterId, feeHead, feeHeadMasterId };
}

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
    const masters = await resolvePaymentMasters(instituteId, dto, branchId);
    const receiptNo = await SequenceService.getNextNumber(instituteId, "RECEIPT");
    return FeeRepository.createPayment(instituteId, branchId, receiptNo, {
      ...dto,
      method: masters.method,
      paymentModeMasterId: masters.paymentModeMasterId,
      bankAccountMasterId: masters.bankAccountMasterId,
      feeHeadMasterId: masters.feeHeadMasterId,
      feeHead: masters.feeHead,
    }, recordedById);
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

    const receiptNo = await SequenceService.getNextNumber(instituteId, "RECEIPT");

    const masters = await resolvePaymentMasters(instituteId, dto, pendingItem.branchId);

    return FeeRepository.recordPendingFeePayment(
      pendingItem,
      receiptNo,
      {
        ...dto,
        method: masters.method,
        paymentModeMasterId: masters.paymentModeMasterId,
        feeHeadMasterId: masters.feeHeadMasterId ?? pendingItem.feeHeadMasterId ?? undefined,
        feeHead: masters.feeHead ?? pendingItem.feeHead ?? undefined,
      },
      recordedById
    );
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
