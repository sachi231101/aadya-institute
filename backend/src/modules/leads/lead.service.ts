import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import { LeadRepository } from "./lead.repository";
import { LeadAssignmentService } from "./services/lead-assignment.service";
import { LeadFollowupService } from "./services/lead-followup.service";
import { LeadConversionService } from "./services/lead-conversion.service";
import { LeadActivityService } from "./services/lead-activity.service";
import { logger } from "../../config/logger";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateLeadDTO,
  UpdateLeadDTO,
  AssignLeadDTO,
  ChangeLeadStageDTO,
  MarkLeadLostDTO,
  ConvertLeadDTO,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  AddActivityDTO,
  QueryLeadsDTO,
} from "./lead.types";
import type { SarvamWebhookPayload } from "../../integrations/sarvam/sarvam.types";

export const LeadService = {
  // ─── Create Lead ────────────────────────────────────────────────────────────
  async createLead(currentUser: AuthUser, dto: CreateLeadDTO) {
    const instituteId = currentUser.instituteId;

    // 1. Resolve Branch ID
    let branchId = currentUser.branchId;
    if (!branchId) {
      // If user has no branch (e.g. Super Admin), fetch the primary or first branch of the institute
      const defaultBranch = await prisma.branch.findFirst({
        where: { instituteId, status: "ACTIVE" },
      });
      if (!defaultBranch) {
        throw new AppError("No active branch found for this institute", 400);
      }
      branchId = defaultBranch.id;
    }

    // 2. Duplicate Detection for Active Leads
    const existingActiveLead = await LeadRepository.findActiveLeadByPhone(
      dto.phoneNumber,
      instituteId
    );

    if (existingActiveLead) {
      throw new AppError(
        `An active lead with phone number ${dto.phoneNumber} already exists`,
        409,
        {
          existingLeadId: existingActiveLead.id,
          name: existingActiveLead.name,
          assignedCounsellor: existingActiveLead.assignedCounsellor?.name ?? "Unassigned",
          stage: existingActiveLead.stage,
          createdAt: existingActiveLead.createdAt,
        }
      );
    }

    // 3. Resolve Course ID if interestedIn matches a known course name
    let courseId: string | undefined;
    const matchedCourse = await prisma.course.findFirst({
      where: {
        instituteId,
        name: { contains: dto.interestedIn, mode: "insensitive" },
      },
    });
    if (matchedCourse) {
      courseId = matchedCourse.id;
    }

    // 4. Assign ownership based on role
    // If creator is COUNSELLOR, they are auto-assigned as owner
    const isCounsellor = currentUser.roles.includes("COUNSELLOR");
    const assignedCounsellorId = isCounsellor ? currentUser.userId : currentUser.userId;

    const lead = await LeadRepository.createLead({
      instituteId,
      branchId,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      interestedIn: dto.interestedIn,
      courseId,
      source: dto.source,
      priority: dto.priority ?? "MEDIUM",
      notes: dto.notes,
      createdById: currentUser.userId,
      assignedCounsellorId,
    });

    return lead;
  },

  // ─── List Leads ─────────────────────────────────────────────────────────────
  async getLeads(currentUser: AuthUser, query: QueryLeadsDTO) {
    const {
      page = 1,
      limit = 20,
      search,
      stage,
      status,
      source,
      assignedCounsellorId,
      courseId,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
    } = query;

    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const skip = (page - 1) * limit;

    // If user is a COUNSELLOR, default to their branch and optionally filter by assigned if desired
    const { leads, total } = await LeadRepository.findLeads({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      assignedCounsellorId,
      courseId,
      stage,
      status,
      source,
      search,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
      skip,
      take: limit,
    });

    return {
      leads,
      meta: buildMeta(total, page, limit),
    };
  },

  // ─── Get Single Lead ────────────────────────────────────────────────────────
  async getLeadById(leadId: string, currentUser: AuthUser) {
    const scope = getBranchScopeFilter(currentUser);
    const lead = await LeadRepository.findLeadById(leadId, scope.instituteId, scope.branchId);

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    return lead;
  },

  // ─── Update Lead Info ───────────────────────────────────────────────────────
  async updateLead(leadId: string, currentUser: AuthUser, dto: UpdateLeadDTO) {
    await this.getLeadById(leadId, currentUser); // Ensures authorization & existence

    const updated = await LeadRepository.updateLead(leadId, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.interestedIn ? { interestedIn: dto.interestedIn } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    await LeadActivityService.logActivity(
      leadId,
      "NOTE_ADDED",
      "Lead details updated",
      {
        userId: currentUser.userId,
        description: `Updated by ${currentUser.name ?? currentUser.userId}`,
      }
    );

    return updated;
  },

  // ─── Assign Lead ────────────────────────────────────────────────────────────
  async assignLead(leadId: string, currentUser: AuthUser, dto: AssignLeadDTO) {
    return LeadAssignmentService.assignLead(leadId, currentUser, dto);
  },

  // ─── Change Stage ───────────────────────────────────────────────────────────
  async changeStage(leadId: string, currentUser: AuthUser, dto: ChangeLeadStageDTO) {
    await this.getLeadById(leadId, currentUser);
    const updated = await LeadRepository.changeStage(leadId, dto.stage, currentUser.userId, dto.notes);
    if (!updated) throw new AppError("Lead not found", 404);
    return updated;
  },

  // ─── Mark Lost ──────────────────────────────────────────────────────────────
  async markLost(leadId: string, currentUser: AuthUser, dto: MarkLeadLostDTO) {
    await this.getLeadById(leadId, currentUser);
    const updated = await LeadRepository.markLost(leadId, dto.reason, currentUser.userId, dto.notes);
    if (!updated) throw new AppError("Lead not found", 404);
    return updated;
  },

  // ─── Convert Lead ───────────────────────────────────────────────────────────
  async convertLead(leadId: string, currentUser: AuthUser, dto: ConvertLeadDTO) {
    return LeadConversionService.convertLead(leadId, currentUser, dto);
  },

  // ─── Follow-up Methods ──────────────────────────────────────────────────────
  async createFollowUp(leadId: string, currentUser: AuthUser, dto: CreateFollowUpDTO) {
    return LeadFollowupService.createFollowUp(leadId, currentUser, dto);
  },

  async updateFollowUp(followUpId: string, currentUser: AuthUser, dto: UpdateFollowUpDTO) {
    return LeadFollowupService.updateFollowUp(followUpId, currentUser, dto);
  },

  async getLeadFollowUps(leadId: string, currentUser: AuthUser) {
    await this.getLeadById(leadId, currentUser);
    return LeadFollowupService.getFollowUpsByLeadId(leadId);
  },

  async getFollowUpDashboard(currentUser: AuthUser) {
    const scope = getBranchScopeFilter(currentUser);
    return LeadFollowupService.getFollowUpDashboard(scope.instituteId, scope.branchId);
  },

  // ─── Activities & History ───────────────────────────────────────────────────
  async addActivity(leadId: string, currentUser: AuthUser, dto: AddActivityDTO) {
    await this.getLeadById(leadId, currentUser);
    return LeadActivityService.logActivity(
      leadId,
      dto.type ?? "NOTE_ADDED",
      dto.title,
      {
        userId: currentUser.userId,
        description: dto.description,
        metadata: dto.metadata,
      }
    );
  },

  async getLeadHistory(leadId: string, currentUser: AuthUser) {
    const lead = await this.getLeadById(leadId, currentUser);
    const assignments = await LeadAssignmentService.getAssignmentsByLeadId(leadId);
    const activities = await LeadActivityService.getActivitiesByLeadId(leadId);

    return {
      leadId: lead.id,
      stageHistory: lead.stageHistory,
      assignments,
      activities,
    };
  },

  // ─── Dashboards ─────────────────────────────────────────────────────────────
  async getDashboardSummary(currentUser: AuthUser) {
    const scope = getBranchScopeFilter(currentUser);
    return LeadRepository.getDashboardSummary(scope.instituteId, scope.branchId);
  },

  async getCounsellorPerformance(currentUser: AuthUser) {
    const scope = getBranchScopeFilter(currentUser);
    return LeadRepository.getCounsellorPerformance(scope.instituteId, scope.branchId);
  },

  // ─── Sarvam AI Webhook Integration ──────────────────────────────────────────
  async handleSarvamWebhook(payload: SarvamWebhookPayload): Promise<void> {
    const { attempt_id, status, interaction_transcript, duration } = payload;

    const transcriptText = interaction_transcript
      ? interaction_transcript.map((t) => `${t.role}: ${t.text}`).join("\n")
      : null;

    // Check if there is an associated lead for this attempt
    let matchedLeadId: string | null = null;
    if (payload.customer_number) {
      const normalized = payload.customer_number.replace(/\D/g, "");
      const phoneDigits = normalized.slice(-10);
      const lead = await prisma.lead.findFirst({
        where: {
          phoneNumber: { contains: phoneDigits },
          status: "ACTIVE",
        },
      });
      if (lead) {
        matchedLeadId = lead.id;
      }
    }

    await prisma.callLog.upsert({
      where: { externalCallId: attempt_id },
      update: {
        status,
        duration: duration ?? 0,
        transcript: transcriptText,
        ...(matchedLeadId ? { leadId: matchedLeadId } : {}),
      },
      create: {
        externalCallId: attempt_id,
        status,
        duration: duration ?? 0,
        transcript: transcriptText,
        leadId: matchedLeadId,
      },
    });

    if (matchedLeadId) {
      await LeadActivityService.logActivity(
        matchedLeadId,
        "CALL_COMPLETED",
        `AI Call completed with status: ${status}`,
        {
          description: `Duration: ${duration ?? 0}s. Attempt: ${attempt_id}`,
          metadata: { attempt_id, status, duration },
        }
      );
    }

    logger.info(
      { attempt_id, status, duration, matchedLeadId },
      "[LeadService] CallLog upserted after Sarvam webhook"
    );
  },
};
