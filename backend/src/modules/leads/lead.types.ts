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
}

export interface AssignLeadDTO {
  counsellorId: string;
  notes?: string;
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
}

export interface CreateFollowUpDTO {
  type?: FollowUpType;
  scheduledAt: string | Date;
  notes?: string;
}

export interface UpdateFollowUpDTO {
  status?: FollowUpStatus;
  notes?: string;
  outcome?: string;
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
}

export interface QueryCallHistoryDTO {
  page?: number;
  limit?: number;
  branchId?: string;
  leadId?: string;
  studentId?: string;
  status?: string;
}
