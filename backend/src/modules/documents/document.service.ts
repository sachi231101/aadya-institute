import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import { createAuditLog } from "../../utils/audit-log.util";
import type { AuthUser } from "../auth/auth.types";
import { DocumentRepository } from "./document.repository";
import type {
  ListDocumentsQuery,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "./document.validation";
import { prisma } from "../../config/database";

async function assertEntityAccess(
  instituteId: string,
  entityType: CreateDocumentInput["entityType"],
  entityId: string,
  branchId?: string
) {
  if (entityType === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: entityId, instituteId },
      select: { branchId: true },
    });
    if (!student) throw new AppError("Student not found", 404);
    if (branchId && student.branchId !== branchId) {
      throw new AppError("Student does not belong to the specified branch", 400);
    }
    return student.branchId;
  }

  if (entityType === "ADMISSION") {
    const admission = await prisma.admission.findFirst({
      where: { id: entityId, instituteId },
      select: { branchId: true },
    });
    if (!admission) throw new AppError("Admission not found", 404);
    if (branchId && admission.branchId !== branchId) {
      throw new AppError("Admission does not belong to the specified branch", 400);
    }
    return admission.branchId;
  }

  const lead = await prisma.lead.findFirst({
    where: { id: entityId, instituteId },
    select: { branchId: true },
  });
  if (!lead) throw new AppError("Lead not found", 404);
  if (branchId && lead.branchId !== branchId) {
    throw new AppError("Lead does not belong to the specified branch", 400);
  }
  return lead.branchId;
}

export const DocumentService = {
  async list(currentUser: AuthUser, query: ListDocumentsQuery) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const { total, data } = await DocumentRepository.findMany({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      entityType: query.entityType,
      entityId: query.entityId,
      status: query.status,
      search: query.search,
      skip,
      take: limit,
    });

    return { data, meta: buildMeta(total, page, limit) };
  },

  async getById(currentUser: AuthUser, id: string) {
    const doc = await DocumentRepository.findById(id, currentUser.instituteId);
    if (!doc) throw new AppError("Document not found", 404);
    if (doc.branchId && !hasBranchAccess(currentUser, doc.branchId)) {
      throw new AppError("Access denied to this branch document", 403);
    }
    return doc;
  },

  async create(currentUser: AuthUser, input: CreateDocumentInput) {
    const scope = getBranchScopeFilter(currentUser, input.branchId);
    const entityBranchId = await assertEntityAccess(
      scope.instituteId,
      input.entityType,
      input.entityId,
      scope.branchId
    );

    const resolvedBranchId = input.branchId || entityBranchId || scope.branchId;
    if (!resolvedBranchId) {
      throw new AppError("Branch is required for document creation", 400);
    }

    const doc = await DocumentRepository.create({
      institute: { connect: { id: scope.instituteId } },
      branch: { connect: { id: resolvedBranchId } },
      entityType: input.entityType,
      entityId: input.entityId,
      name: input.name,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      notes: input.notes,
      status: input.fileUrl ? "UPLOADED" : "PENDING",
      uploadedBy: { connect: { id: currentUser.userId || currentUser.id } },
    });

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: scope.instituteId,
      action: "DOCUMENT_CREATED",
      entityType: "Document",
      entityId: doc.id,
      newData: { entityType: input.entityType, entityId: input.entityId, name: input.name },
    });

    return doc;
  },

  async update(currentUser: AuthUser, id: string, input: UpdateDocumentInput) {
    const existing = await DocumentService.getById(currentUser, id);
    const doc = await DocumentRepository.update(id, currentUser.instituteId, {
      ...input,
      ...(input.fileUrl ? { status: input.status || "UPLOADED" } : {}),
    });

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "DOCUMENT_UPDATED",
      entityType: "Document",
      entityId: id,
      oldData: existing,
      newData: input,
    });

    return doc;
  },

  async verify(currentUser: AuthUser, id: string, notes?: string) {
    await DocumentService.getById(currentUser, id);
    const userId = currentUser.userId || currentUser.id;

    const doc = await DocumentRepository.update(id, currentUser.instituteId, {
      status: "VERIFIED",
      verifiedBy: { connect: { id: userId } },
      verifiedAt: new Date(),
      rejectedReason: null,
      notes,
    });

    await createAuditLog({
      userId,
      instituteId: currentUser.instituteId,
      action: "DOCUMENT_VERIFIED",
      entityType: "Document",
      entityId: id,
    });

    return doc;
  },

  async reject(currentUser: AuthUser, id: string, rejectedReason: string) {
    await DocumentService.getById(currentUser, id);
    const userId = currentUser.userId || currentUser.id;

    const doc = await DocumentRepository.update(id, currentUser.instituteId, {
      status: "REJECTED",
      rejectedReason,
      verifiedBy: { connect: { id: userId } },
      verifiedAt: new Date(),
    });

    await createAuditLog({
      userId,
      instituteId: currentUser.instituteId,
      action: "DOCUMENT_REJECTED",
      entityType: "Document",
      entityId: id,
      newData: { rejectedReason },
    });

    return doc;
  },

  async remove(currentUser: AuthUser, id: string) {
    const existing = await DocumentService.getById(currentUser, id);
    await DocumentRepository.delete(id, currentUser.instituteId);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: id,
      oldData: existing,
    });
  },
};
