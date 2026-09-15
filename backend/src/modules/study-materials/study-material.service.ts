import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import {
  assertFacultyOwnsBatch,
  assertFacultyOwnsSession,
  requireFacultyIdIfPureFaculty,
  resolveFacultyIdForUser,
  isPureFaculty,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import { StudyMaterialRepository } from "./study-material.repository";
import type {
  CreateStudyMaterialInput,
  ListStudyMaterialsQuery,
} from "./study-material.validation";
import { prisma } from "../../config/database";

const resolveOwnFacultyId = async (currentUser: AuthUser): Promise<string> => {
  if (isPureFaculty(currentUser.roles)) {
    return (await requireFacultyIdIfPureFaculty(currentUser))!;
  }
  const facultyId = await resolveFacultyIdForUser(currentUser.id);
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }
  return facultyId;
};

export const StudyMaterialService = {
  async list(currentUser: AuthUser, query: ListStudyMaterialsQuery) {
    const facultyId = await resolveOwnFacultyId(currentUser);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const { total, data } = await StudyMaterialRepository.findMany({
      instituteId: currentUser.instituteId,
      facultyId,
      batchId: query.batchId,
      classSessionId: query.classSessionId,
      search: query.search,
      skip,
      take: limit,
    });

    return { data, meta: buildMeta(total, page, limit) };
  },

  async create(currentUser: AuthUser, input: CreateStudyMaterialInput) {
    const facultyId = await resolveOwnFacultyId(currentUser);

    let batchId = input.batchId ?? null;
    const classSessionId = input.classSessionId ?? null;

    if (classSessionId) {
      await assertFacultyOwnsSession(currentUser, classSessionId);
      const session = await prisma.classSession.findFirst({
        where: { id: classSessionId },
        select: { batchId: true, facultyId: true },
      });
      if (!session || session.facultyId !== facultyId) {
        throw new AppError("You do not have access to this class session", 403);
      }
      batchId = batchId || session.batchId;
    }

    if (batchId) {
      await assertFacultyOwnsBatch(currentUser, batchId);
    }

    return StudyMaterialRepository.create({
      instituteId: currentUser.instituteId,
      facultyId,
      batchId,
      classSessionId,
      title: input.title,
      description: input.description,
      fileType: input.fileType,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    });
  },

  async remove(currentUser: AuthUser, id: string) {
    const facultyId = await resolveOwnFacultyId(currentUser);
    const existing = await StudyMaterialRepository.findById(id, currentUser.instituteId);
    if (!existing) {
      throw new AppError("Study material not found", 404);
    }
    if (existing.facultyId !== facultyId) {
      throw new AppError("You do not have access to this study material", 403);
    }
    await StudyMaterialRepository.delete(id, currentUser.instituteId, facultyId);
  },
};
