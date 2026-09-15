import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import {
  assertFacultyOwnsBatch,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
  resolveFacultyIdForUser,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import { AnnouncementRepository } from "./announcement.repository";
import type {
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
} from "./announcement.validation";
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

export const AnnouncementService = {
  async list(currentUser: AuthUser, query: ListAnnouncementsQuery) {
    const facultyId = await resolveOwnFacultyId(currentUser);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const { total, data } = await AnnouncementRepository.findMany({
      instituteId: currentUser.instituteId,
      facultyId,
      batchId: query.batchId,
      courseId: query.courseId,
      search: query.search,
      status: query.status,
      skip,
      take: limit,
    });

    return { data, meta: buildMeta(total, page, limit) };
  },

  async create(currentUser: AuthUser, input: CreateAnnouncementInput) {
    const facultyId = await resolveOwnFacultyId(currentUser);

    if (input.batchId) {
      await assertFacultyOwnsBatch(currentUser, input.batchId);
    }

    if (input.courseId) {
      // Course must be linked via teaching desk (batch course or coordinator batch)
      const teaches = await prisma.batch.findFirst({
        where: {
          instituteId: currentUser.instituteId,
          OR: [
            { facultyId, courseId: input.courseId },
            { batchCourses: { some: { facultyId, courseId: input.courseId } } },
            {
              classSessions: {
                some: { facultyId, status: "ACTIVE", batch: { courseId: input.courseId } },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!teaches) {
        throw new AppError("You do not teach this course", 403);
      }
    }

    return AnnouncementRepository.create({
      instituteId: currentUser.instituteId,
      facultyId,
      batchId: input.batchId,
      courseId: input.courseId,
      title: input.title,
      body: input.body,
      type: input.type,
      status: input.status,
    });
  },

  async remove(currentUser: AuthUser, id: string) {
    const facultyId = await resolveOwnFacultyId(currentUser);
    const existing = await AnnouncementRepository.findById(id, currentUser.instituteId);
    if (!existing) {
      throw new AppError("Announcement not found", 404);
    }
    if (existing.facultyId !== facultyId) {
      throw new AppError("You do not have access to this announcement", 403);
    }
    await AnnouncementRepository.delete(id, currentUser.instituteId, facultyId);
  },
};
