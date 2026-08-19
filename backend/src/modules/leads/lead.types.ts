import type { 
  LeadSource, 
  LeadStage, 
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
  source: LeadSource;
  priority?: string;
  notes?: string;
}

export interface UpdateLeadDTO {
  name?: string;
  phoneNumber?: string;
  email?: string;
  interestedIn?: string;
  priority?: string;
  notes?: string;
}

export interface AssignLeadDTO {
  counsellorId: string;
  notes?: string;
}

export interface ChangeLeadStageDTO {
  stage: LeadStage;
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
  stage?: LeadStage;
  status?: LeadStatus;
  source?: LeadSource;
  assignedCounsellorId?: string;
  courseId?: string;
  branchId?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
}
