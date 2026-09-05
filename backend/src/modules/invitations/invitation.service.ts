import { createHash, randomBytes } from "crypto";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { hashPassword } from "../../utils/password";
import { createAuditLog } from "../../utils/audit-log.util";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { sendEmail } from "../../integrations/email/email.client";
import { prisma } from "../../config/database";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateInvitationDto,
  InvitationListQueryDto,
  AcceptInvitationDto,
} from "./invitation.validation";
import {
  createInvitation,
  findPendingInvitations,
  findInvitationById,
  findInvitationByTokenHash,
  updateInvitationStatus,
  findRoleByName,
  findBranchesInInstitute,
  findUserByEmailInInstitute,
  findPendingInviteByEmail,
  acceptInvitationTransaction,
  storeInviteBranchIds,
  loadInviteBranchIds,
} from "./invitation.repository";

const hashToken = (raw: string): string =>
  createHash("sha256").update(raw).digest("hex");

const resolveBranchIds = (input: CreateInvitationDto): string[] => {
  const ids = [
    ...(input.branchIds ?? []),
    ...(input.branchId ? [input.branchId] : []),
  ];
  return [...new Set(ids.filter(Boolean))];
};

export const createInvitationService = async (
  currentUser: AuthUser,
  input: CreateInvitationDto
) => {
  const instituteId = currentUser.instituteId;
  const invitedById = currentUser.userId || currentUser.id;
  const email = input.email.toLowerCase().trim();
  const roleName = input.roleName.trim().toUpperCase();

  const role = await findRoleByName(roleName);
  if (!role) {
    throw new AppError(`Invalid role: ${input.roleName}`, 400);
  }

  if (roleName === "ADMIN" && !currentUser.roles.includes("ADMIN")) {
    throw new AppError("Cannot invite ADMIN role", 403);
  }

  const existingUser = await findUserByEmailInInstitute(email, instituteId);
  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const existingInvite = await findPendingInviteByEmail(email, instituteId);
  if (existingInvite) {
    throw new AppError("A pending invitation already exists for this email", 409);
  }

  const branchIds = resolveBranchIds(input);
  if (branchIds.length > 0) {
    const found = await findBranchesInInstitute(instituteId, branchIds);
    if (found.length !== branchIds.length) {
      throw new AppError("One or more branches are invalid for this institute", 400);
    }
  }

  const primaryBranchId = input.branchId ?? branchIds[0] ?? null;
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await createInvitation({
    instituteId,
    branchId: primaryBranchId,
    email,
    phone: input.phone ?? null,
    name: input.name.trim(),
    roleName,
    tokenHash,
    expiresAt,
    invitedById,
  });

  await storeInviteBranchIds(invitation.id, branchIds);

  const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, "");
  const inviteLink = frontendUrl
    ? `${frontendUrl}/accept-invite?token=${rawToken}`
    : undefined;

  // Non-blocking email (stub provider still succeeds)
  void sendEmail({
    to: email,
    subject: "You're invited to Aadya Institute",
    html: `<p>Hello ${invitation.name},</p>
<p>You have been invited to join Aadya Institute as <strong>${roleName}</strong>.</p>
${
  inviteLink
    ? `<p><a href="${inviteLink}">Accept your invitation</a></p>
<p>Or paste this link: ${inviteLink}</p>`
    : `<p>Please contact your administrator for the invite link.</p>`
}
<p>This invitation expires on ${expiresAt.toUTCString()}.</p>`,
  }).catch((err) => {
    logger.warn({ err, email }, "[invitation] Failed to send invite email");
  });

  await createAuditLog({
    userId: invitedById,
    instituteId,
    branchId: primaryBranchId,
    action: "USER_INVITED",
    entityType: "UserInvitation",
    entityId: invitation.id,
    newData: {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      roleName: invitation.roleName,
      branchId: invitation.branchId,
      branchIds,
      expiresAt: invitation.expiresAt,
    },
  });

  return {
    ...invitation,
    ...(inviteLink ? { inviteLink } : {}),
  };
};

export const listInvitationsService = async (
  currentUser: AuthUser,
  query: InvitationListQueryDto
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const { invitations, total } = await findPendingInvitations({
    instituteId: currentUser.instituteId,
    search: query.search,
    skip,
    take: limit,
  });

  return {
    invitations,
    meta: buildMeta(total, page, limit),
  };
};

export const revokeInvitationService = async (
  currentUser: AuthUser,
  invitationId: string
) => {
  const invitation = await findInvitationById(
    invitationId,
    currentUser.instituteId
  );
  if (!invitation) {
    throw new AppError("Invitation not found", 404);
  }
  if (invitation.status !== "PENDING") {
    throw new AppError("Only pending invitations can be revoked", 400);
  }

  const updated = await updateInvitationStatus(invitationId, "REVOKED");

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: invitation.branchId,
    action: "USER_INVITE_REVOKED",
    entityType: "UserInvitation",
    entityId: invitation.id,
    oldData: { status: invitation.status },
    newData: { status: "REVOKED" },
  });

  return updated;
};

export const getInvitationByTokenService = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const invitation = await findInvitationByTokenHash(tokenHash);

  if (!invitation || invitation.status !== "PENDING") {
    throw new AppError("Invitation is invalid or no longer available", 400);
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await updateInvitationStatus(invitation.id, "EXPIRED");
    throw new AppError("Invitation has expired", 400);
  }

  return {
    name: invitation.name,
    email: invitation.email,
    roleName: invitation.roleName,
  };
};

export const acceptInvitationService = async (input: AcceptInvitationDto) => {
  const tokenHash = hashToken(input.token);
  const invitation = await findInvitationByTokenHash(tokenHash);

  if (!invitation || invitation.status !== "PENDING") {
    throw new AppError("Invitation is invalid, reused, or revoked", 400);
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await updateInvitationStatus(invitation.id, "EXPIRED");
    throw new AppError("Invitation has expired", 400);
  }

  const role = await findRoleByName(invitation.roleName);
  if (!role) {
    throw new AppError("Invitation role is no longer valid", 400);
  }

  const existingUser = await findUserByEmailInInstitute(
    invitation.email,
    invitation.instituteId
  );
  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const branchAccessIds = await loadInviteBranchIds(
    invitation.id,
    invitation.branchId
  );

  if (branchAccessIds.length > 0) {
    const found = await findBranchesInInstitute(
      invitation.instituteId,
      branchAccessIds
    );
    if (found.length !== branchAccessIds.length) {
      throw new AppError("Invitation branch access is invalid", 400);
    }
  }

  const { loadInstitutePolicy } = await import("../security/security.service");
  const { validatePasswordAgainstPolicy } = await import(
    "../../utils/password-policy.util"
  );
  const policy = await loadInstitutePolicy(invitation.instituteId);
  const policyError = validatePasswordAgainstPolicy(input.password, policy);
  if (policyError) {
    throw new AppError(policyError, 400);
  }

  const passwordHash = await hashPassword(input.password);

  let facultyEmployeeCode: string | undefined;
  if (invitation.roleName === "FACULTY") {
    if (!invitation.branchId) {
      throw new AppError(
        "Faculty invitation is missing a branch assignment",
        400
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { id: invitation.branchId, instituteId: invitation.instituteId },
      select: { code: true },
    });
    if (!branch) {
      throw new AppError("Invitation branch is invalid", 400);
    }

    const { SequenceService } = await import("../masters/sequence.service");
    const { findFacultyByEmployeeCode } = await import(
      "../faculty/faculty.repository"
    );

    for (let attempt = 0; attempt < 20; attempt++) {
      facultyEmployeeCode = await SequenceService.getNextNumber(
        invitation.instituteId,
        "EMPLOYEE",
        { branchCode: branch.code }
      );
      const taken = await findFacultyByEmployeeCode(
        invitation.instituteId,
        facultyEmployeeCode
      );
      if (!taken) break;
      if (attempt === 19) {
        throw new AppError(
          "Unable to generate a unique employee code for Faculty invitation",
          500
        );
      }
    }
  }

  const user = await acceptInvitationTransaction({
    invitationId: invitation.id,
    name: invitation.name,
    email: invitation.email,
    phone: invitation.phone,
    passwordHash,
    instituteId: invitation.instituteId,
    branchId: invitation.branchId,
    roleId: role.id,
    roleName: invitation.roleName,
    branchAccessIds,
    facultyEmployeeCode,
  });

  if (!user) {
    throw new AppError("Invitation is invalid, reused, or expired", 400);
  }

  await createAuditLog({
    userId: user.id,
    instituteId: invitation.instituteId,
    branchId: invitation.branchId,
    action: "USER_INVITE_ACCEPTED",
    entityType: "User",
    entityId: user.id,
    newData: {
      invitationId: invitation.id,
      email: user.email,
      roleName: invitation.roleName,
      branchId: user.branchId,
      branchAccessIds,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
    branchId: user.branchId,
  };
};
