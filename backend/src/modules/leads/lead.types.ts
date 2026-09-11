import type { 
  LeadStatus, 
  LeadLostReason, 
  FollowUpType, 
  FollowUpStatus, 
  LeadActivityType 
} from "@prisma/client";

export interface CreateLeadDTO {
  name: string;
  phoneNumber: string;
  email?: string;
  interestedIn: string;
  courseId?: string;
  branchId?: string;
  assignedCounsellorId?: string;
  /** @deprecated use sourceMasterId */
  source?: string;
  sourceMasterId?: string;
  stageMasterId?: string;
  leadTypeMasterId?: string;
  priority?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadDTO {
  name?: string;
  phoneNumber?: string;
  email?: string;
  interestedIn?: string;
  courseId?: string;
  priority?: string;
  notes?: string;
  sourceMasterId?: string;
  leadTypeMasterId?: string;
  tags?: string[];
}

export interface AssignLeadDTO {
  counsellorId: string;
  notes?: string;
}

export interface BulkAssignLeadsDTO {
  leadIds: string[];
  counsellorId: string;
  notes?: string;
}

export interface MergeLeadsDTO {
  primaryLeadId: string;
  duplicateLeadId: string;
}

export interface UpdateLeadScoreDTO {
  leadScore?: number | null;
  admissionProbability?: number | null;
  nextBestAction?: string | null;
}

export interface UpdateLeadTagsDTO {
  tags: string[];
}

export interface CreateManualCallLogDTO {
  leadId: string;
  status?: string;
  duration?: number;
  outcome?: string | null;
  notes?: string | null;
  qualification?: string | null;
  sentiment?: string | null;
  nextAction?: string | null;
  interestStatus?: string | null;
  startedAt?: string | Date;
  endedAt?: string | Date;
}

export interface ChangeLeadStageDTO {
  /** @deprecated use stageMasterId */
  stage?: string;
  stageMasterId?: string;
  notes?: string;
}

export interface MarkLeadLostDTO {
  reason: LeadLostReason;
  notes?: string;
}

export interface ConvertLeadDTO {
  courseId?: string;
  batchId?: string;
  feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
  notes?: string;
  createStudentUser?: boolean;
  totalFee?: number;
  amountPaid?: number;
  paymentMethod?: "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE";
  transactionRef?: string;
  installments?: Array<{ installmentNo: number; dueDate: string; amount: number }>;
}

export interface CreateFollowUpDTO {
  type?: FollowUpType;
  scheduledAt: string | Date;
  notes?: string;
  priority?: string;
  counsellorId?: string;
}

export interface UpdateFollowUpDTO {
  status?: FollowUpStatus;
  notes?: string;
  outcome?: string;
  scheduledAt?: string | Date;
  priority?: string;
}

export interface AddActivityDTO {
  type?: LeadActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryLeadsDTO {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  stageMasterId?: string;
  status?: LeadStatus;
  source?: string;
  sourceMasterId?: string;
  assignedCounsellorId?: string;
  courseId?: string;
  branchId?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  scoreBand?: "hot" | "warm" | "cold" | "unscored";
  unassigned?: boolean;
  tag?: string;
}

export type CallHistoryView = "queue" | "active" | "results";

export interface QueryCallHistoryDTO {
  page?: number;
  limit?: number;
  branchId?: string;
  leadId?: string;
  studentId?: string;
  status?: string;
  /** Comma-separated statuses */
  statuses?: string;
  callType?: "ALL" | "AI" | "MANUAL";
  /** Convenience buckets for AI Calling tabs */
  view?: CallHistoryView;
}
