import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import { assertCourseAvailableForBranch } from "../../utils/course-branch.util";
import { LeadRepository } from "./lead.repository";
import { LeadAssignmentService } from "./services/lead-assignment.service";
import { LeadFollowupService } from "./services/lead-followup.service";
import { LeadConversionService } from "./services/lead-conversion.service";
import { LeadActivityService } from "./services/lead-activity.service";
import {
  resolveRequiredMasterFields,
} from "../masters/master-resolve.service";
import { SequenceService } from "../masters/sequence.service";
import { assertActiveMaster } from "../masters/master.validator";
import { recordApplicationFeePayment } from "../admissions/application-fee-payment.service";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateLeadDTO,
  UpdateLeadDTO,
  AssignLeadDTO,
  BulkAssignLeadsDTO,
  MergeLeadsDTO,
  UpdateLeadScoreDTO,
  UpdateLeadTagsDTO,
  CreateManualCallLogDTO,
  ChangeLeadStageDTO,
  MarkLeadLostDTO,
  ConvertLeadDTO,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  AddActivityDTO,
  QueryLeadsDTO,
  QueryCallHistoryDTO,
} from "./lead.types";
import type { SarvamWebhookPayload } from "../../integrations/sarvam/sarvam.types";

const CALL_HISTORY_VIEW_STATUSES: Record<string, string[]> = {
  queue: ["INITIATED"],
  active: ["INITIATED", "RINGING", "ANSWERED"],
  results: ["COMPLETED", "NO_ANSWER", "BUSY", "FAILED", "CALLBACK_REQUESTED"],
};

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
          status: "ACTIVE",
          name: { contains: dto.interestedIn, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (matchedCourse) {
        const linked = await prisma.courseBranch.findFirst({
          where: { courseId: matchedCourse.id, branchId },
          select: { id: true },
        });
        // Only attach course when it is available for this branch
        if (linked) {
          courseId = matchedCourse.id;
        }
      }
    }

    if (courseId) {
      await assertCourseAvailableForBranch(instituteId, courseId, branchId);
    }

    // 4. Resolve source (master or free-text fallback)
    let sourceCode = dto.source || "WALK_IN";
    let sourceMasterId: string | undefined;

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

    const creatorId = currentUser.userId || currentUser.id;
    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");

    // Counsellors self-assign on create. Admin / Center Manager leave unassigned
    // (or may pass assignedCounsellorId) so they can allocate later.
    let assignedCounsellorId: string | undefined;
    let initialStage = "NEW";
    if (isCounsellorOnly) {
      assignedCounsellorId = creatorId;
      initialStage = "ASSIGNED";
    } else if (dto.assignedCounsellorId) {
      assignedCounsellorId = dto.assignedCounsellorId;
      initialStage = "ASSIGNED";
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
      stage: initialStage,
      priority: dto.priority ?? "MEDIUM",
      notes: dto.notes,
      tags: dto.tags,
      createdById: creatorId,
      assignedCounsellorId,
    });

    const { startInitialAiCall } = await import("./services/lead-ai-call.service");
    await startInitialAiCall({
      id: lead.id,
      phoneNumber: lead.phoneNumber,
      createdById: lead.createdById,
      instituteId: lead.instituteId,
      branchId: lead.branchId,
      importJobId: lead.importJobId ?? null,
    });

    const refreshed = await LeadRepository.findLeadById(lead.id, instituteId);
    if (!refreshed) {
      throw new AppError("Failed to load created lead", 500);
    }
    return refreshed;
  },

  // ─── List Leads ─────────────────────────────────────────────────────────────
  async getLeads(currentUser: AuthUser, query: QueryLeadsDTO) {
    const {
      page = 1,
      limit = 20,
      search,
      stage,
      stages: stagesRaw,
      status,
      statuses: statusesRaw,
      source,
      stageMasterId,
      sourceMasterId,
      assignedCounsellorId,
      courseId,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
      scoreBand,
      unassigned,
      hasRemarks,
      tag,
    } = query;

    const stages = stagesRaw
      ? stagesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const statuses = statusesRaw
      ? (statusesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as ("ACTIVE" | "CONVERTED" | "LOST" | "ARCHIVED")[])
      : undefined;

    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const skip = (page - 1) * limit;

    const counsellorId = currentUser.userId || currentUser.id;
    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");

    // COUNSELLOR: assigned to them, or unassigned leads they created (AI dial before score assign).
    const { leads, total } = await LeadRepository.findLeads({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
      assignedCounsellorId: isCounsellorOnly ? undefined : assignedCounsellorId,
      counsellorVisibleId: isCounsellorOnly ? counsellorId : undefined,
      courseId,
      stage,
      stages,
      stageMasterId,
      status: statuses?.length ? undefined : status,
      statuses,
      source,
      sourceMasterId,
      search,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
      scoreBand,
      unassigned: isCounsellorOnly ? undefined : unassigned,
      hasRemarks,
      tag,
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

    if (isCounsellorOnly) {
      const isAssignee = lead.assignedCounsellorId === counsellorId;
      const isCreatorWaiting =
        !lead.assignedCounsellorId && lead.createdById === counsellorId;
      if (!isAssignee && !isCreatorWaiting) {
        throw new AppError("Lead not found", 404);
      }
    }

    return lead;
  },

  // ─── Update Lead Info ───────────────────────────────────────────────────────
  async updateLead(leadId: string, currentUser: AuthUser, dto: UpdateLeadDTO) {
    const lead = await this.getLeadById(leadId, currentUser); // Ensures authorization & existence

    if (dto.courseId) {
      await assertCourseAvailableForBranch(
        currentUser.instituteId,
        dto.courseId,
        lead.branchId
      );
    }

    const updated = await LeadRepository.updateLead(leadId, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.interestedIn ? { interestedIn: dto.interestedIn } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.courseId !== undefined ? { courseId: dto.courseId || null } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
    });

    await LeadActivityService.logActivity(
      leadId,
      "NOTE_ADDED",
      "Lead details updated",
      {
        userId: currentUser.userId || currentUser.id,
        description:
          dto.notes !== undefined
            ? dto.notes?.trim() || "Remarks cleared"
            : `Updated by ${currentUser.name ?? (currentUser.userId || currentUser.id)}`,
      }
    );

    return updated;
  },

  // ─── Assign Lead ────────────────────────────────────────────────────────────
  async assignLead(leadId: string, currentUser: AuthUser, dto: AssignLeadDTO) {
    return LeadAssignmentService.assignLead(leadId, currentUser, dto);
  },

  async bulkAssignLeads(currentUser: AuthUser, dto: BulkAssignLeadsDTO) {
    return LeadAssignmentService.bulkAssignLeads(currentUser, dto);
  },

  async updateLeadTags(
    leadId: string,
    currentUser: AuthUser,
    dto: UpdateLeadTagsDTO
  ) {
    await this.getLeadById(leadId, currentUser);
    const updated = await LeadRepository.updateLead(leadId, { tags: dto.tags });
    await LeadActivityService.logActivity(leadId, "NOTE_ADDED", "Lead tags updated", {
      userId: currentUser.userId || currentUser.id,
      description: `Tags: ${dto.tags.join(", ") || "(none)"}`,
      metadata: { tags: dto.tags },
    });
    return updated;
  },

  async updateLeadScore(
    leadId: string,
    currentUser: AuthUser,
    dto: UpdateLeadScoreDTO
  ) {
    await this.getLeadById(leadId, currentUser);
    const updated = await LeadRepository.updateLead(leadId, {
      ...(dto.leadScore !== undefined ? { leadScore: dto.leadScore } : {}),
      ...(dto.admissionProbability !== undefined
        ? { admissionProbability: dto.admissionProbability }
        : {}),
      ...(dto.nextBestAction !== undefined
        ? { nextBestAction: dto.nextBestAction }
        : {}),
    });
    await LeadActivityService.logActivity(
      leadId,
      "SCORE_UPDATED",
      "Lead score manually updated",
      {
        userId: currentUser.userId || currentUser.id,
        description: `Score override by ${currentUser.name ?? currentUser.userId}`,
        metadata: {
          leadScore: dto.leadScore,
          admissionProbability: dto.admissionProbability,
          nextBestAction: dto.nextBestAction,
        },
      }
    );
    return updated;
  },

  async archiveLead(leadId: string, currentUser: AuthUser) {
    await this.getLeadById(leadId, currentUser);
    const archived = await LeadRepository.archiveLead(
      leadId,
      currentUser.userId || currentUser.id
    );
    return archived;
  },

  async mergeLeads(currentUser: AuthUser, dto: MergeLeadsDTO) {
    const primary = await this.getLeadById(dto.primaryLeadId, currentUser);
    const duplicate = await this.getLeadById(dto.duplicateLeadId, currentUser);

    if (primary.instituteId !== duplicate.instituteId) {
      throw new AppError("Cannot merge leads from different institutes", 400);
    }

    const result = await LeadRepository.mergeLeads({
      primaryLeadId: dto.primaryLeadId,
      duplicateLeadId: dto.duplicateLeadId,
      mergedById: currentUser.userId || currentUser.id,
    });

    if (!result) {
      throw new AppError("One or both leads not found", 404);
    }

    return result;
  },

  async createManualCallLog(
    currentUser: AuthUser,
    dto: CreateManualCallLogDTO
  ) {
    const lead = await this.getLeadById(dto.leadId, currentUser);
    const userId = currentUser.userId || currentUser.id;
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : new Date();
    const idempotencyKey = `manual_call:${lead.instituteId}:${lead.id}:${userId}:${startedAt.getTime()}`;

    const callLog = await prisma.callLog.create({
      data: {
        instituteId: lead.instituteId,
        branchId: lead.branchId,
        leadId: lead.id,
        callType: "MANUAL",
        callerUserId: userId,
        status: dto.status || "COMPLETED",
        duration: dto.duration ?? 0,
        outcome: dto.outcome ?? null,
        qualification: dto.qualification ?? null,
        sentiment: dto.sentiment ?? null,
        nextAction: dto.nextAction ?? null,
        interestStatus: dto.interestStatus ?? null,
        transcript: dto.notes ?? null,
        aiSummary: dto.notes ?? null,
        idempotencyKey,
        startedAt,
        endedAt,
        attemptNumber: 1,
      },
      include: {
        lead: {
          select: { id: true, name: true, phoneNumber: true },
        },
        caller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactedAt: endedAt,
        ...(dto.nextAction ? { nextBestAction: dto.nextAction } : {}),
      },
    });

    await LeadActivityService.logActivity(
      lead.id,
      "CALL_COMPLETED",
      `Manual call logged (${callLog.status})`,
      {
        userId,
        description: dto.notes ?? dto.outcome ?? undefined,
        metadata: {
          callLogId: callLog.id,
          callType: "MANUAL",
          status: callLog.status,
          duration: callLog.duration,
        },
      }
    );

    return callLog;
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

    if (stageCode === "CONVERTED") {
      throw new AppError(
        "Use Direct Admission to convert a lead. Stage cannot be set to CONVERTED directly.",
        400
      );
    }
    if (stageCode === "LOST") {
      throw new AppError(
        "Use Mark Lost to mark a lead as lost. Stage cannot be set to LOST directly.",
        400
      );
    }

    if (stageCode === "FOLLOW_UP") {
      const pendingCount = await prisma.leadFollowUp.count({
        where: { leadId, status: "PENDING" },
      });

      if (pendingCount === 0 && !dto.scheduledAt) {
        throw new AppError(
          "Cannot set stage to FOLLOW_UP without a scheduled follow-up. Provide scheduledAt or create a follow-up task first.",
          400
        );
      }

      if (dto.scheduledAt) {
        await LeadFollowupService.createFollowUp(leadId, currentUser, {
          scheduledAt: dto.scheduledAt,
          notes: dto.notes,
          type: "CALL",
        });
        if (stageMasterId) {
          await prisma.lead.update({
            where: { id: leadId },
            data: { stageMasterId },
          });
        }
        return this.getLeadById(leadId, currentUser);
      }
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
    dto?: {
      feeStatus?: string;
      applicationFee?: number;
      paymentModeMasterId?: string;
      paymentRef?: string;
      notes?: string;
      branchId?: string;
      courseId?: string;
    }
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

    if (lead.status === "LOST" || lead.stage === "LOST") {
      throw new AppError("Cannot create an application from a lost lead", 400);
    }

    if (lead.status === "CONVERTED" || lead.stage === "CONVERTED") {
      throw new AppError("Lead has already been converted", 400);
    }

    const courseId = dto?.courseId || lead.courseId;
    if (!courseId) {
      throw new AppError("Course is required to create an application", 400);
    }

    const applicationBranchId = dto?.branchId || lead.branchId;
    await assertCourseAvailableForBranch(lead.instituteId, courseId, applicationBranchId);

    const isPaid = dto?.feeStatus === "PAID";
    if (isPaid) {
      if (dto?.applicationFee == null || Number.isNaN(Number(dto.applicationFee))) {
        throw new AppError("Application fee amount is required when marked as paid", 400);
      }
      if (!dto?.paymentModeMasterId) {
        throw new AppError("Payment mode is required when marked as paid", 400);
      }
      await assertActiveMaster({
        instituteId: lead.instituteId,
        entityType: "paymentmodes",
        masterRecordId: dto.paymentModeMasterId,
        branchId: dto?.branchId || lead.branchId,
      });
    }

    const applicationNo = await SequenceService.getNextNumber(lead.instituteId, "APPLICATION");
    const counsellorId = lead.assignedCounsellorId || currentUser.userId || currentUser.id;

    const application = await prisma.$transaction(async (tx) => {
      const newApp = await tx.application.create({
        data: {
          instituteId: lead.instituteId,
          branchId: dto?.branchId || lead.branchId,
          applicationNo,
          leadId: lead.id,
          applicantName: lead.name,
          email: lead.email,
          phone: lead.phoneNumber,
          courseId,
          feeStatus: (isPaid ? "PAID" : "PENDING") as any,
          applicationFee: isPaid && dto?.applicationFee !== undefined ? dto.applicationFee : null,
          paymentModeMasterId: isPaid ? dto?.paymentModeMasterId || null : null,
          paymentRef: isPaid ? dto?.paymentRef || null : null,
          feePaidAt: isPaid ? new Date() : null,
          status: "SUBMITTED",
          notes:
            dto?.notes ||
            `Created from Lead ${lead.id} (${lead.name}, source=${lead.source || "—"}, counsellor=${counsellorId})`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          lead: { select: { id: true, name: true, source: true } },
          paymentModeMaster: { select: { id: true, name: true, code: true } },
        },
      });

      await tx.applicationActivity.create({
        data: {
          applicationId: newApp.id,
          userId: currentUser.userId || currentUser.id,
          type: "CREATED",
          title: "Application created from lead",
          description: `Created from Lead ${lead.name} (${lead.source || "—"})${
            isPaid ? `. Fee ₹${dto?.applicationFee} paid.` : ""
          }`,
          metadata: {
            leadId: lead.id,
            ...(isPaid
              ? {
                  applicationFee: dto?.applicationFee,
                  paymentModeMasterId: dto?.paymentModeMasterId,
                  paymentRef: dto?.paymentRef || null,
                }
              : {}),
          },
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: "INTERESTED",
        },
      });

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

    if (isPaid && dto?.paymentModeMasterId && dto.applicationFee != null) {
      const recorded = await recordApplicationFeePayment({
        instituteId: lead.instituteId,
        branchId: dto?.branchId || lead.branchId,
        applicationId: application.id,
        applicationNo,
        applicantName: lead.name,
        courseName: application.course?.name || lead.course?.name || "Course",
        amount: Number(dto.applicationFee),
        paymentModeMasterId: dto.paymentModeMasterId,
        paymentRef: dto.paymentRef,
        recordedById: currentUser.userId || currentUser.id,
      });

      await prisma.applicationActivity.create({
        data: {
          applicationId: application.id,
          userId: currentUser.userId || currentUser.id,
          type: "FEE_STATUS_CHANGED",
          title: "Application fee recorded",
          description: `Fee ₹${dto.applicationFee} posted as receipt ${recorded.receiptNo}`,
          metadata: {
            paymentId: recorded.paymentId,
            receiptNo: recorded.receiptNo,
            applicationFee: dto.applicationFee,
            paymentModeMasterId: dto.paymentModeMasterId,
            paymentRef: dto.paymentRef || null,
          },
        },
      });

      return prisma.application.findFirst({
        where: { id: application.id },
        include: {
          course: { select: { id: true, name: true, code: true } },
          lead: { select: { id: true, name: true, source: true } },
          paymentModeMaster: { select: { id: true, name: true, code: true } },
          payment: {
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              status: true,
              transactionRef: true,
              date: true,
            },
          },
        },
      });
    }

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

  async getFollowUpDashboard(
    currentUser: AuthUser,
    branchId?: string,
    pagination?: { page?: number; limit?: number }
  ) {
    const scope = getBranchScopeFilter(currentUser, branchId);
    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");
    return LeadFollowupService.getFollowUpDashboard(
      scope.instituteId,
      scope.branchId,
      currentUser.userId || currentUser.id,
      {
        branchIds: scope.branchIds,
        scopeToAssignee: isCounsellorOnly,
        page: pagination?.page,
        limit: pagination?.limit,
      }
    );
  },

  // ─── Activities & History ───────────────────────────────────────────────────
  async addActivity(leadId: string, currentUser: AuthUser, dto: AddActivityDTO) {
    const lead = await this.getLeadById(leadId, currentUser);
    const type = dto.type ?? "NOTE_ADDED";

    // Keep Lead.notes in sync when staff add a remark from the Activity remarks panel.
    if (type === "NOTE_ADDED" && dto.description?.trim()) {
      const { appendLeadRemarks } = await import("./utils/append-lead-notes");
      const roles = (currentUser.roles || []).map((r) => String(r).toUpperCase());
      const actor = roles.includes("COUNSELLOR")
        ? "counsellor"
        : roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")
          ? "admin"
          : "staff";
      const appended = appendLeadRemarks(lead.notes, dto.description, actor);
      if (appended !== undefined) {
        await LeadRepository.updateLead(leadId, { notes: appended });
      }
    }

    return LeadActivityService.logActivity(leadId, type, dto.title, {
      userId: currentUser.userId || currentUser.id,
      description: dto.description,
      metadata: dto.metadata,
    });
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
  async getDashboardSummary(currentUser: AuthUser, branchId?: string) {
    const scope = getBranchScopeFilter(currentUser, branchId);
    return LeadRepository.getDashboardSummary(
      scope.instituteId,
      scope.branchId,
      scope.branchIds
    );
  },

  async getCounsellorPerformance(currentUser: AuthUser, branchId?: string) {
    const scope = getBranchScopeFilter(currentUser, branchId);
    return LeadRepository.getCounsellorPerformance(
      scope.instituteId,
      scope.branchId,
      scope.branchIds
    );
  },

  // ─── Sarvam AI Webhook Integration (delegates to multi-tenant module) ────────
  async handleSarvamWebhook(payload: SarvamWebhookPayload): Promise<void> {
    const { AiCallingService } = await import("../ai-calling/ai-calling.service");
    await AiCallingService.handleSarvamWebhook(payload);
  },

  // ─── Trigger AI Call for Lead ───────────────────────────────────────────────
  async triggerLeadCall(leadId: string, currentUser: AuthUser) {
    const { AiCallingService } = await import("../ai-calling/ai-calling.service");
    return AiCallingService.triggerLeadCall(leadId, currentUser);
  },

  async getCallHistory(currentUser: AuthUser, query: QueryCallHistoryDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const isCounsellorOnly =
      currentUser.roles.includes("COUNSELLOR") &&
      !currentUser.roles.includes("ADMIN") &&
      !currentUser.roles.includes("CENTER_MANAGER");
    const counsellorId = currentUser.userId || currentUser.id;

    const viewStatuses = query.view
      ? CALL_HISTORY_VIEW_STATUSES[query.view]
      : undefined;
    const statusesFromQuery = query.statuses
      ? query.statuses
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const statuses = viewStatuses || statusesFromQuery;

    const { total, data } = await LeadRepository.findCallHistory({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
      counsellorVisibleId: isCounsellorOnly ? counsellorId : undefined,
      leadId: query.leadId,
      studentId: query.studentId,
      status: statuses ? undefined : query.status,
      statuses,
      callType: query.callType,
      search: query.search,
      skip,
      take: limit,
    });

    const callLogs = data.map((log) => {
      const next = (log.nextAction || "").toLowerCase();
      const followUpCreated = next.includes("follow-up created");
      return followUpCreated ? { ...log, followUpCreated: true } : log;
    });

    return {
      callLogs,
      meta: buildMeta(total, page, limit),
    };
  },
};
