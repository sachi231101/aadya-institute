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
import {
  resolveOptionalMasterFields,
  resolveRequiredMasterFields,
} from "../masters/master-resolve.service";
import { SequenceService } from "../masters/sequence.service";
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
    let branchId = dto.branchId || currentUser.branchId;
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
        `An active lead with phone number ${dto.phoneNumber} already exists (${existingActiveLead.name})`,
        409
      );
    }

    // 3. Resolve Course ID if not explicitly provided
    let courseId = dto.courseId;
    if (!courseId && dto.interestedIn) {
      const matchedCourse = await prisma.course.findFirst({
        where: {
          instituteId,
          name: { contains: dto.interestedIn, mode: "insensitive" },
        },
      });
      if (matchedCourse) {
        courseId = matchedCourse.id;
      }
    }

    // 4. Assign ownership based on role or explicit selection
    let assignedCounsellorId = dto.assignedCounsellorId;
    if (!assignedCounsellorId) {
      const isCounsellor = currentUser.roles.includes("COUNSELLOR");
      assignedCounsellorId = isCounsellor ? (currentUser.userId || currentUser.id) : undefined;
    }

    // 4. Resolve master references for source / stage / lead type
    let sourceCode = dto.source || "WALK_IN";
    let sourceMasterId: string | undefined;
    let stageCode = assignedCounsellorId ? "ASSIGNED" : "NEW";
    let stageMasterId: string | undefined;

    if (dto.sourceMasterId) {
      const resolved = await resolveRequiredMasterFields({
        instituteId,
        entityType: "leadsource",
        masterRecordId: dto.sourceMasterId,
        branchId,
      });
      sourceMasterId = resolved.masterId;
      sourceCode = resolved.code || resolved.label;
    }

    if (dto.stageMasterId) {
      const resolved = await resolveRequiredMasterFields({
        instituteId,
        entityType: "leadstage",
        masterRecordId: dto.stageMasterId,
        branchId,
      });
      stageMasterId = resolved.masterId;
      stageCode = resolved.code || resolved.label;
    }

    const lead = await LeadRepository.createLead({
      instituteId,
      branchId,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      interestedIn: dto.interestedIn,
      courseId,
      source: sourceCode,
      sourceMasterId,
      stage: stageCode,
      stageMasterId,
      priority: dto.priority ?? "MEDIUM",
      notes: dto.notes,
      createdById: currentUser.userId || currentUser.id,
      assignedCounsellorId,
    });

    // Keep admissions Enquiry assignee in sync when a counsellor owns the lead
    if (assignedCounsellorId) {
      const { syncEnquiryAssigneeFromLead } = await import(
        "./services/lead-enquiry-sync.service"
      );
      await syncEnquiryAssigneeFromLead({
        instituteId,
        phoneNumber: dto.phoneNumber,
        counsellorId: assignedCounsellorId,
      });
    }

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

    const counsellorId = currentUser.userId || currentUser.id;
    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");

    // COUNSELLOR may only see leads assigned to them (unless ADMIN/CM).
    const effectiveAssignedId = isCounsellorOnly
      ? counsellorId
      : assignedCounsellorId;

    const { leads, total } = await LeadRepository.findLeads({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      assignedCounsellorId: effectiveAssignedId,
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

    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");
    const counsellorId = currentUser.userId || currentUser.id;

    if (
      isCounsellorOnly &&
      lead.assignedCounsellorId &&
      lead.assignedCounsellorId !== counsellorId
    ) {
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
        userId: currentUser.userId || currentUser.id,
        description: `Updated by ${currentUser.name ?? (currentUser.userId || currentUser.id)}`,
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
    const lead = await this.getLeadById(leadId, currentUser);
    let stageCode = dto.stage || lead.stage;
    let stageMasterId = dto.stageMasterId;

    if (dto.stageMasterId) {
      const resolved = await resolveRequiredMasterFields({
        instituteId: currentUser.instituteId,
        entityType: "leadstage",
        masterRecordId: dto.stageMasterId,
        branchId: lead.branchId,
      });
      stageMasterId = resolved.masterId;
      stageCode = resolved.code || resolved.label;
    }

    const updated = await LeadRepository.changeStage(
      leadId,
      stageCode,
      currentUser.userId || currentUser.id,
      dto.notes,
      stageMasterId
    );
    if (!updated) throw new AppError("Lead not found", 404);
    return updated;
  },

  // ─── Mark Lost ──────────────────────────────────────────────────────────────
  async markLost(leadId: string, currentUser: AuthUser, dto: MarkLeadLostDTO) {
    await this.getLeadById(leadId, currentUser);
    const updated = await LeadRepository.markLost(leadId, dto.reason, currentUser.userId || currentUser.id, dto.notes);
    if (!updated) throw new AppError("Lead not found", 404);
    return updated;
  },

  // ─── Convert Lead ───────────────────────────────────────────────────────────
  async convertLead(leadId: string, currentUser: AuthUser, dto: ConvertLeadDTO) {
    return LeadConversionService.convertLead(leadId, currentUser, dto);
  },

  // ─── Create Application from Lead ───────────────────────────────────────────
  async createApplicationFromLead(
    leadId: string,
    currentUser: AuthUser,
    dto?: { feeStatus?: string; notes?: string; branchId?: string; courseId?: string }
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { branch: true, course: true },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    // Branch check for CENTER_MANAGER
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    // Determine course
    let courseId = dto?.courseId || lead.courseId;
    if (!courseId) {
      const matched = await prisma.course.findFirst({
        where: { instituteId: lead.instituteId, name: { contains: lead.interestedIn, mode: "insensitive" } },
      });
      if (matched) {
        courseId = matched.id;
      } else {
        const fallback = await prisma.course.findFirst({
          where: { instituteId: lead.instituteId, status: "ACTIVE" },
        });
        if (!fallback) throw new AppError("No course found in institute", 400);
        courseId = fallback.id;
      }
    }

    const applicationNo = await SequenceService.getNextNumber(lead.instituteId, "APPLICATION");
    const { normalizePhoneDigits } = await import("./services/lead-enquiry-sync.service");
    const phone = normalizePhoneDigits(lead.phoneNumber);
    const enquiries = await prisma.enquiry.findMany({
      where: { instituteId: lead.instituteId },
      select: { id: true, phone: true },
    });
    const matchedEnquiry = enquiries.find(
      (e) => normalizePhoneDigits(e.phone) === phone
    );
    const counsellorId = lead.assignedCounsellorId || currentUser.userId || currentUser.id;

    const application = await prisma.$transaction(async (tx) => {
      // 1. Create Application preserving lead data (schema: no leadId/counsellorId columns)
      const newApp = await tx.application.create({
        data: {
          instituteId: lead.instituteId,
          branchId: dto?.branchId || lead.branchId,
          applicationNo,
          enquiryId: matchedEnquiry?.id || null,
          applicantName: lead.name,
          email: lead.email,
          phone: lead.phoneNumber,
          courseId: courseId!,
          feeStatus: (dto?.feeStatus === "PAID" ? "PAID" : "PENDING") as any,
          status: "SUBMITTED",
          notes:
            dto?.notes ||
            `Created from Lead ${lead.id} (${lead.name}, source=${lead.source || "—"}, counsellor=${counsellorId})`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          enquiry: true,
        },
      });

      // 2. Update Lead stage toward conversion pipeline
      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: "INTERESTED",
        },
      });

      // 3. Log lead activity
      await tx.leadActivity.create({
        data: {
          leadId,
          userId: currentUser.userId || currentUser.id,
          type: "STAGE_CHANGED",
          title: "Application Created",
          description: `Application ${applicationNo} created from lead by ${currentUser.name || "Counsellor"}`,
          metadata: { applicationId: newApp.id, applicationNo },
        },
      });

      return newApp;
    });

    return application;
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
        userId: currentUser.userId || currentUser.id,
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

  async getCounsellorPerformance(currentUser: AuthUser, branchId?: string) {
    const scope = getBranchScopeFilter(currentUser, branchId);
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

  // ─── Trigger AI Call for Lead ───────────────────────────────────────────────
  async triggerLeadCall(leadId: string, currentUser: AuthUser) {
    const lead = await this.getLeadById(leadId, currentUser);
    const userId = currentUser.userId || currentUser.id;
    const telephonyConfigured = Boolean(
      process.env.TELEPHONY_BASE_URL && process.env.TELEPHONY_API_KEY
    );

    let externalCallId = `call_${Date.now()}`;
    let status = "INITIATED";
    let providerMessage =
      "AI call queued locally. Configure TELEPHONY_BASE_URL + TELEPHONY_API_KEY to place live calls; Sarvam webhook will complete the CallLog.";

    if (telephonyConfigured) {
      try {
        const { initiateCall } = await import(
          "../../integrations/telephony/telephony.client"
        );
        const callbackBase =
          process.env.PUBLIC_API_BASE_URL ||
          `http://localhost:${process.env.PORT || 5000}`;
        const response = await initiateCall({
          to: lead.phoneNumber,
          from: process.env.TELEPHONY_FROM_NUMBER || "",
          callbackUrl: `${callbackBase}/api/v1/webhooks/sarvam/callback`,
          metadata: {
            leadId: lead.id,
            instituteId: lead.instituteId,
            triggeredBy: userId,
          },
        });
        externalCallId = response.callId || externalCallId;
        status = response.status || "INITIATED";
        providerMessage = "AI voice call initiated via telephony provider";
      } catch (err) {
        status = "FAILED";
        providerMessage =
          err instanceof Error
            ? `Telephony initiate failed: ${err.message}`
            : "Telephony initiate failed";
        logger.error({ err, leadId: lead.id }, "[LeadService] triggerLeadCall telephony error");
      }
    }

    const callLog = await prisma.callLog.create({
      data: {
        leadId: lead.id,
        externalCallId,
        status,
        duration: 0,
        transcript: null,
      },
    });

    // Mark contacted once a call is placed (or queued for provider)
    if (
      status !== "FAILED" &&
      (lead.stage === "NEW" || lead.stage === "ASSIGNED")
    ) {
      await LeadRepository.changeStage(
        lead.id,
        "CONTACTED",
        userId,
        "Updated when AI voice call was initiated"
      );
    }

    await LeadActivityService.logActivity(
      lead.id,
      status === "FAILED" ? "NOTE_ADDED" : "CALL_COMPLETED",
      status === "FAILED"
        ? "AI voice call failed to initiate"
        : `AI voice call ${status.toLowerCase()}`,
      {
        userId,
        description: providerMessage,
        metadata: { callId: callLog.id, status, telephonyConfigured },
      }
    );

    return {
      success: status !== "FAILED",
      call: callLog,
      message: providerMessage,
    };
  },
};
