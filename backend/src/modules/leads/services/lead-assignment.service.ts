import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { LeadActivityService } from "./lead-activity.service";
import type { AuthUser } from "../../auth/auth.types";
import type { AssignLeadDTO } from "../lead.types";

export const LeadAssignmentService = {
  async assignLead(
    leadId: string,
    currentUser: AuthUser,
    dto: AssignLeadDTO
  ) {
    const { counsellorId, notes } = dto;

    // 1. Fetch Lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { branch: true },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    // Branch isolation check for CENTER_MANAGER
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    // 2. Validate Target Counsellor
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

    // Check institute match
    if (counsellor.instituteId !== lead.instituteId) {
      throw new AppError("Counsellor does not belong to this institute", 400);
    }

    // Check branch match for CENTER_MANAGER
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      counsellor.branchId &&
      counsellor.branchId !== lead.branchId
    ) {
      throw new AppError("Cannot assign lead to a counsellor in another branch", 403);
    }

    // Check role is COUNSELLOR or ADMIN/CENTER_MANAGER
    const hasCounsellorRole = counsellor.userRoles.some((ur) =>
      ["COUNSELLOR", "ADMIN", "CENTER_MANAGER"].includes(ur.role.name)
    );
    if (!hasCounsellorRole) {
      throw new AppError("Assigned user must have the COUNSELLOR role", 400);
    }

    // 3. Perform Transaction
    return prisma.$transaction(async (tx) => {
      // Mark current assignments as inactive
      await tx.leadAssignment.updateMany({
        where: { leadId, isCurrent: true },
        data: { isCurrent: false, unassignedAt: new Date() },
      });

      // Create new assignment record
      const assignment = await tx.leadAssignment.create({
        data: {
          leadId,
          counsellorId,
          assignedById: currentUser.userId,
          isCurrent: true,
          notes: notes ?? null,
        },
      });

      // Update Lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedCounsellorId: counsellorId,
          stage: lead.stage === "NEW" ? "ASSIGNED" : lead.stage,
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

      // Log Activity
      await LeadActivityService.logActivity(
        leadId,
        "LEAD_ASSIGNED",
        `Lead assigned to ${counsellor.name}`,
        {
          userId: currentUser.userId,
          description: notes ?? `Assigned by ${currentUser.name ?? currentUser.userId}`,
          metadata: { counsellorId, counsellorName: counsellor.name },
          tx,
        }
      );

      return { lead: updatedLead, assignment };
    });
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
