import { FeeRepository } from "./fee.repository";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
  QueryFeePlansDTO,
  CreateFeePlanDTO,
  UpdateFeePlanDTO,
  QueryReceiptsDTO,
} from "./fee.types";
import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { AppError } from "../../middlewares/error.middleware";
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

  async getFeePlans(currentUser: AuthUser, query: QueryFeePlansDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    return FeeRepository.findFeePlans(scope.instituteId, {
      branchId: scope.branchId,
      courseId: query.courseId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  },

  async createFeePlan(currentUser: AuthUser, dto: CreateFeePlanDTO) {
    const scope = getBranchScopeFilter(currentUser, dto.branchId);
    return FeeRepository.createFeePlan(scope.instituteId, {
      ...dto,
      branchId: dto.branchId || scope.branchId,
    });
  },

  async updateFeePlan(currentUser: AuthUser, id: string, dto: UpdateFeePlanDTO) {
    const existing = await FeeRepository.findFeePlanById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Fee plan template not found", 404);
    return FeeRepository.updateFeePlan(id, currentUser.instituteId, {
      ...dto,
      planType: dto.planType as never,
      status: dto.status as never,
    });
  },

  async getReceipts(currentUser: AuthUser, query: QueryReceiptsDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    return FeeRepository.findReceipts(scope.instituteId, {
      search: query.search,
      branchId: scope.branchId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
    });
  },
};
