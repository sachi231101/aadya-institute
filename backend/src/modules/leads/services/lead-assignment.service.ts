import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { LeadActivityService } from "./lead-activity.service";
import { LeadNotifyService } from "./lead-notify.service";
import type { AuthUser } from "../../auth/auth.types";
import type { AssignLeadDTO, BulkAssignLeadsDTO } from "../lead.types";

type AssignLeadInternalParams = {
  leadId: string;
  counsellorId: string;
  assignedById: string;
  assignedByName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  /** When false, skip counsellor notification (default true). */
  notify?: boolean;
};

export const LeadAssignmentService = {
  /**
   * Internal assign used by HTTP assign and system auto-assign.
   * Does not enforce the AI-call gate — callers that need the gate must check first.
   */
  async assignLeadInternal(params: AssignLeadInternalParams) {
    const {
      leadId,
      counsellorId,
      assignedById,
      assignedByName,
      notes,
      metadata,
      notify = true,
    } = params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { branch: true },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    if (lead.status === "LOST" || lead.stage === "LOST") {
      throw new AppError("Cannot assign a lost lead", 400);
    }

    if (lead.status === "CONVERTED" || lead.stage === "CONVERTED") {
      throw new AppError("Cannot assign a converted lead", 400);
    }

    const counsellor = await prisma.user.findUnique({
      where: { id: counsellorId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!counsellor) {
      throw new AppError("Target counsellor not found", 404);
    }

    if (counsellor.instituteId !== lead.instituteId) {
      throw new AppError("Counsellor does not belong to this institute", 400);
    }

    const hasCounsellorRole = counsellor.userRoles.some((ur) =>
      ["COUNSELLOR", "ADMIN", "CENTER_MANAGER"].includes(ur.role.name)
    );
    if (!hasCounsellorRole) {
      throw new AppError("Assigned user must have the COUNSELLOR role", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.leadAssignment.updateMany({
        where: { leadId, isCurrent: true },
        data: { isCurrent: false, unassignedAt: new Date() },
      });

      const assignment = await tx.leadAssignment.create({
        data: {
          leadId,
          counsellorId,
          assignedById,
          isCurrent: true,
          notes: notes ?? null,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedCounsellorId: counsellorId,
          stage: ["NEW", "CONTACTED"].includes(lead.stage) ? "ASSIGNED" : lead.stage,
        },
        include: {
          assignedCounsellor: {
            select: { id: true, name: true, email: true, phone: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      await syncEnquiryAssigneeFromLead({
        instituteId: lead.instituteId,
        phoneNumber: lead.phoneNumber,
        counsellorId,
        tx: tx as any,
      });

      // Log Activity
      await LeadActivityService.logActivity(
        leadId,
        "LEAD_ASSIGNED",
        `Lead assigned to ${counsellor.name}`,
        {
          userId: assignedById,
          description:
            notes ??
            `Assigned by ${assignedByName ?? assignedById}`,
          metadata: {
            counsellorId,
            counsellorName: counsellor.name,
            ...metadata,
          },
          tx,
        }
      );

      return { lead: updatedLead, assignment };
    });

    if (notify) {
      await LeadNotifyService.notifyLeadAssigned({
        instituteId: lead.instituteId,
        branchId: lead.branchId,
        leadId,
        leadName: lead.name,
        counsellorId,
        assignedByName: assignedByName ?? undefined,
      });
    }

    return result;
  },

  async assignLead(
    leadId: string,
    currentUser: AuthUser,
    dto: AssignLeadDTO
  ) {
    const { counsellorId, notes } = dto;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        branchId: true,
        instituteId: true,
        status: true,
        stage: true,
      },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    if (lead.status === "LOST" || lead.stage === "LOST") {
      throw new AppError("Cannot assign a lost lead", 400);
    }

    if (lead.status === "CONVERTED" || lead.stage === "CONVERTED") {
      throw new AppError("Cannot assign a converted lead", 400);
    }

    const roles = currentUser.roles.map((r) => r.toUpperCase());
    const canBypassAiCallGate =
      roles.includes("ADMIN") ||
      roles.includes("SUPER_ADMIN") ||
      roles.includes("CENTER_MANAGER");

    const { hasTerminalAiCall } = await import("./lead-ai-call.service");
    const aiCallReady = await hasTerminalAiCall(leadId);
    if (!aiCallReady && !canBypassAiCallGate) {
      throw new AppError(
        "Lead cannot be assigned until the AI call has finished (completed, no-answer, busy, or failed)",
        400
      );
    }

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    const counsellor = await prisma.user.findUnique({
      where: { id: counsellorId },
      select: { id: true, branchId: true, instituteId: true },
    });

    if (!counsellor) {
      throw new AppError("Target counsellor not found", 404);
    }

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      counsellor.branchId &&
      counsellor.branchId !== lead.branchId
    ) {
      throw new AppError("Cannot assign lead to a counsellor in another branch", 403);
    }

    return this.assignLeadInternal({
      leadId,
      counsellorId,
      assignedById: currentUser.userId || currentUser.id,
      assignedByName: currentUser.name,
      notes,
      metadata: {
        ...(canBypassAiCallGate && !aiCallReady
          ? { aiCallGateBypassed: true, bypassedByRoles: roles }
          : {}),
      },
      notify: true,
    });
  },

  async bulkAssignLeads(
    currentUser: AuthUser,
    dto: BulkAssignLeadsDTO
  ) {
    const results: Array<{
      leadId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const leadId of dto.leadIds) {
      try {
        await this.assignLead(leadId, currentUser, {
          counsellorId: dto.counsellorId,
          notes: dto.notes,
        });
        results.push({ leadId, success: true });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Assignment failed";
        results.push({ leadId, success: false, error: message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;

    return {
      counsellorId: dto.counsellorId,
      total: results.length,
      succeeded,
      failed,
      results,
    };
  },

  async getAssignmentsByLeadId(leadId: string) {
    return prisma.leadAssignment.findMany({
      where: { leadId },
      include: {
        counsellor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        assignedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
