import type { Prisma } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import {
  assertFacultyOwnsBatch,
  getFacultyTeachingBatchIds,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
  resolveFacultyIdForUser,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import { AnnouncementRepository } from "./announcement.repository";
import type {
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  MarkAllAnnouncementsInput,
} from "./announcement.validation";
import { prisma } from "../../config/database";

const TARGET_ROLES = ["STUDENT", "FACULTY", "COUNSELLOR", "CENTER_MANAGER", "ALL"] as const;
type TargetRole = (typeof TARGET_ROLES)[number];

type Actor = {
  isAdmin: boolean;
  isCenterManager: boolean;
  isCounsellor: boolean;
  isFaculty: boolean;
  isStudent: boolean;
};

const upperRoles = (roles: string[] = []): string[] => roles.map((role) => role.toUpperCase());

const classify = (currentUser: AuthUser): Actor => {
  const roles = upperRoles(currentUser.roles);
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isCenterManager = roles.includes("CENTER_MANAGER") && !isAdmin;
  const isCounsellor = roles.includes("COUNSELLOR") && !isAdmin && !isCenterManager;
  const isFaculty =
    isPureFaculty(roles) ||
    (roles.includes("FACULTY") && !isAdmin && !isCenterManager && !isCounsellor);
  const isStudent =
    roles.includes("STUDENT") && !isAdmin && !isCenterManager && !isCounsellor && !isFaculty;
  return { isAdmin, isCenterManager, isCounsellor, isFaculty, isStudent };
};

const authorRoleFor = (actor: Actor): string => {
  if (actor.isAdmin) return "ADMIN";
  if (actor.isCenterManager) return "CENTER_MANAGER";
  if (actor.isCounsellor) return "COUNSELLOR";
  return "FACULTY";
};

const allowedBranchIds = (currentUser: AuthUser): string[] => {
  const ids = new Set<string>();
  if (currentUser.branchId) ids.add(currentUser.branchId);
  for (const id of currentUser.allowedBranchIds || []) {
    if (id) ids.add(id);
  }
  return [...ids];
};

const assertBranchAllowed = (currentUser: AuthUser, branchId: string): void => {
  const allowed = allowedBranchIds(currentUser);
  if (!allowed.includes(branchId)) {
    throw new AppError("You do not have access to this branch", 403);
  }
};

const loadBatch = async (instituteId: string, batchId: string) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    select: { id: true, branchId: true, courseId: true },
  });
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  return batch;
};

const emptyPage = (page: number, limit: number) => ({
  data: [],
  meta: buildMeta(0, page, limit),
});

const shapeRow = (row: {
  reads?: { readAt: Date }[];
  _count?: { reads: number };
  batch?: { _count?: { enrollments: number } } | null;
}) => {
  const { reads, _count, batch, ...rest } = row as typeof row & Record<string, unknown>;
  const batchCount = batch?._count;
  const batchRest = batch ? { ...batch } : batch;
  if (batchRest && "_count" in batchRest) {
    delete (batchRest as { _count?: unknown })._count;
  }
  return {
    ...rest,
    batch: batchRest,
    isRead: Boolean(reads && reads.length > 0),
    readAt: reads?.[0]?.readAt ?? null,
    readCount: _count?.reads ?? 0,
    sentCount: batchCount?.enrollments ?? 0,
  };
};

const resolveStudentAudience = async (currentUser: AuthUser) => {
  const student = await prisma.student.findFirst({
    where: {
      userId: currentUser.id || currentUser.userId,
      instituteId: currentUser.instituteId,
    },
    include: {
      batchEnrollments: { where: { status: "ACTIVE" }, select: { batchId: true } },
    },
  });
  if (!student) return null;
  return {
    studentId: student.id,
    branchId: student.branchId,
    batchIds: student.batchEnrollments.map((enrollment) => enrollment.batchId),
  };
};

const facultyInboxBranchIds = async (currentUser: AuthUser): Promise<string[]> => {
  const facultyId = await resolveFacultyIdForUser(currentUser.id || currentUser.userId!);
  const ids = new Set<string>(allowedBranchIds(currentUser));
  if (!facultyId) return [...ids];
  const batchIds = await getFacultyTeachingBatchIds(facultyId, currentUser.instituteId);
  if (batchIds.length === 0) return [...ids];
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds }, instituteId: currentUser.instituteId },
    select: { branchId: true },
  });
  for (const batch of batches) {
    if (batch.branchId) ids.add(batch.branchId);
  }
  return [...ids];
};

const inboxWhere = async (
  currentUser: AuthUser,
  actor: Actor,
  query: ListAnnouncementsQuery
): Promise<Prisma.AnnouncementWhereInput | null> => {
  const base: Prisma.AnnouncementWhereInput = {
    instituteId: currentUser.instituteId,
    status: "PUBLISHED",
  };

  if (actor.isStudent) {
    const audience = await resolveStudentAudience(currentUser);
    if (!audience || audience.batchIds.length === 0) return null;

    if (query.batchId && !audience.batchIds.includes(query.batchId)) {
      return null;
    }

    let batchScope: Prisma.AnnouncementWhereInput;
    if (query.batchId) {
      const batch = await prisma.batch.findFirst({
        where: { id: query.batchId, instituteId: currentUser.instituteId },
        select: { branchId: true },
      });
      batchScope = {
        OR: [
          { batchId: query.batchId },
          {
            batchId: null,
            OR: [{ branchId: null }, ...(batch?.branchId ? [{ branchId: batch.branchId }] : [])],
          },
        ],
      };
    } else {
      batchScope = {
        OR: [
          { batchId: { in: audience.batchIds } },
          { batchId: null, branchId: audience.branchId },
          { batchId: null, branchId: null },
        ],
      };
    }

    return {
      ...base,
      targetRole: { in: ["STUDENT", "ALL"] },
      ...batchScope,
    };
  }

  if (actor.isFaculty) {
    const branchIds = await facultyInboxBranchIds(currentUser);
    return {
      ...base,
      targetRole: { in: ["FACULTY", "ALL"] },
      OR: [{ branchId: null }, ...(branchIds.length ? [{ branchId: { in: branchIds } }] : [])],
    };
  }

  if (actor.isCounsellor || actor.isCenterManager) {
    const branchIds = allowedBranchIds(currentUser);
    const targetRole = actor.isCounsellor ? "COUNSELLOR" : "CENTER_MANAGER";
    return {
      ...base,
      targetRole: { in: [targetRole, "ALL"] },
      OR: [{ branchId: null }, ...(branchIds.length ? [{ branchId: { in: branchIds } }] : [])],
    };
  }

  if (actor.isAdmin) {
    return base;
  }

  return null;
};

const sentWhere = async (
  currentUser: AuthUser,
  actor: Actor
): Promise<Prisma.AnnouncementWhereInput | null> => {
  const userId = currentUser.id || currentUser.userId!;
  if (actor.isAdmin) {
    return { instituteId: currentUser.instituteId };
  }
  if (actor.isCenterManager) {
    const branchIds = allowedBranchIds(currentUser);
    return {
      instituteId: currentUser.instituteId,
      OR: [
        { createdById: userId },
        ...(branchIds.length ? [{ branchId: { in: branchIds } }] : []),
        { branchId: null },
      ],
    };
  }
  if (actor.isFaculty) {
    const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
    return {
      instituteId: currentUser.instituteId,
      OR: [{ createdById: userId }, ...(facultyId ? [{ facultyId }] : [])],
    };
  }
  if (actor.isCounsellor) {
    return { instituteId: currentUser.instituteId, createdById: userId };
  }
  return null;
};

const canReadAnnouncement = async (
  currentUser: AuthUser,
  announcementId: string
): Promise<boolean> => {
  const actor = classify(currentUser);
  const where = await inboxWhere(currentUser, actor, {
    page: 1,
    limit: 1,
    status: "PUBLISHED",
  });
  if (!where) return false;
  const found = await prisma.announcement.findFirst({
    where: { AND: [where, { id: announcementId }] },
    select: { id: true },
  });
  return Boolean(found);
};

export const AnnouncementService = {
  async list(currentUser: AuthUser, query: ListAnnouncementsQuery) {
    const actor = classify(currentUser);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    // Students always read the inbox. Staff default to the management list unless they ask for inbox.
    const useInbox = actor.isStudent || query.view === "inbox";

    const where = useInbox
      ? await inboxWhere(currentUser, actor, query)
      : await sentWhere(currentUser, actor);

    if (!where) return emptyPage(page, limit);

    const filters: Prisma.AnnouncementWhereInput[] = [where];
    if (!useInbox && query.status && query.status !== "ALL") {
      filters.push({ status: query.status });
    }
    if (query.batchId && !actor.isStudent) {
      filters.push({ batchId: query.batchId });
    }
    if (query.courseId) {
      filters.push({ courseId: query.courseId });
    }
    if (query.search) {
      filters.push({
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { body: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    const { total, data } = await AnnouncementRepository.findMany({
      where: { AND: filters },
      skip,
      take: limit,
      readerUserId: currentUser.id || currentUser.userId!,
    });

    return {
      data: data.map((row) => shapeRow(row)),
      meta: buildMeta(total, page, limit),
    };
  },

  async create(currentUser: AuthUser, input: CreateAnnouncementInput) {
    const actor = classify(currentUser);
    if (actor.isStudent || (!actor.isAdmin && !actor.isCenterManager && !actor.isCounsellor && !actor.isFaculty)) {
      throw new AppError("You cannot publish announcements", 403);
    }

    const userId = currentUser.id || currentUser.userId!;
    let targetRole: TargetRole = "STUDENT";
    let branchId: string | null = input.branchId ?? null;
    let batchId: string | null = input.batchId ?? null;
    let courseId: string | null = input.courseId ?? null;
    let facultyId: string | null = null;

    if (actor.isFaculty) {
      facultyId = await requireFacultyIdIfPureFaculty(currentUser);
      if (!facultyId) {
        facultyId = await resolveFacultyIdForUser(userId);
      }
      if (!facultyId) {
        throw new AppError("Faculty profile not found for this user", 403);
      }
      if (!batchId) {
        throw new AppError("A batch is required", 400);
      }
      await assertFacultyOwnsBatch(currentUser, batchId);
      const batch = await loadBatch(currentUser.instituteId, batchId);
      targetRole = "STUDENT";
      branchId = batch.branchId;
      courseId = courseId || batch.courseId;
      if (input.courseId) {
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
    } else if (actor.isCounsellor) {
      if (input.targetRole && input.targetRole !== "STUDENT") {
        throw new AppError("Counsellors can only announce to students", 403);
      }
      const branches = allowedBranchIds(currentUser);
      branchId = branchId || currentUser.branchId || branches[0] || null;
      if (!branchId) {
        throw new AppError("A branch is required", 400);
      }
      assertBranchAllowed(currentUser, branchId);
      targetRole = "STUDENT";
      if (batchId) {
        const batch = await loadBatch(currentUser.instituteId, batchId);
        if (batch.branchId !== branchId) {
          throw new AppError("That batch is not in your branch", 403);
        }
        courseId = courseId || batch.courseId;
      }
    } else {
      const requested = (input.targetRole || "STUDENT") as TargetRole;
      if (!TARGET_ROLES.includes(requested)) {
        throw new AppError("Invalid audience", 400);
      }
      targetRole = requested;
      if (batchId && targetRole !== "STUDENT") {
        throw new AppError("A batch can only be selected when the audience is students", 400);
      }
      if (actor.isCenterManager) {
        const branches = allowedBranchIds(currentUser);
        branchId = branchId || currentUser.branchId || branches[0] || null;
        if (!branchId) {
          throw new AppError("A branch is required", 400);
        }
        assertBranchAllowed(currentUser, branchId);
      } else if (branchId) {
        const branch = await prisma.branch.findFirst({
          where: { id: branchId, instituteId: currentUser.instituteId },
          select: { id: true },
        });
        if (!branch) throw new AppError("Branch not found", 404);
      }
      if (batchId) {
        const batch = await loadBatch(currentUser.instituteId, batchId);
        if (branchId && batch.branchId !== branchId) {
          throw new AppError("That batch is not in the selected branch", 400);
        }
        branchId = branchId || batch.branchId;
        courseId = courseId || batch.courseId;
      }
    }

    return AnnouncementRepository.create({
      instituteId: currentUser.instituteId,
      facultyId,
      createdById: userId,
      authorRole: authorRoleFor(actor),
      targetRole,
      branchId,
      batchId,
      courseId,
      title: input.title,
      body: input.body,
      type: input.type,
      status: input.status,
    });
  },

  async remove(currentUser: AuthUser, id: string) {
    const actor = classify(currentUser);
    const existing = await AnnouncementRepository.findById(id, currentUser.instituteId);
    if (!existing) {
      throw new AppError("Announcement not found", 404);
    }

    const userId = currentUser.id || currentUser.userId!;
    if (actor.isAdmin) {
      await AnnouncementRepository.delete(id, currentUser.instituteId);
      return;
    }

    if (actor.isCenterManager) {
      const branches = allowedBranchIds(currentUser);
      if (existing.branchId && branches.includes(existing.branchId)) {
        await AnnouncementRepository.delete(id, currentUser.instituteId);
        return;
      }
      if (existing.createdById === userId) {
        await AnnouncementRepository.delete(id, currentUser.instituteId);
        return;
      }
      throw new AppError("You do not have access to this announcement", 403);
    }

    const facultyId = actor.isFaculty ? await resolveFacultyIdForUser(userId) : null;
    const owns =
      existing.createdById === userId || (facultyId != null && existing.facultyId === facultyId);
    if (!owns) {
      throw new AppError("You do not have access to this announcement", 403);
    }
    await AnnouncementRepository.delete(id, currentUser.instituteId);
  },

  async markRead(currentUser: AuthUser, id: string) {
    const visible = await canReadAnnouncement(currentUser, id);
    if (!visible) {
      throw new AppError("Announcement not found", 404);
    }
    const userId = currentUser.id || currentUser.userId!;
    return AnnouncementRepository.markRead(id, userId);
  },

  async markAllRead(currentUser: AuthUser, input: MarkAllAnnouncementsInput) {
    const actor = classify(currentUser);
    const where = await inboxWhere(currentUser, actor, {
      page: 1,
      limit: 100,
      status: "PUBLISHED",
      batchId: input.batchId,
    });
    if (!where) return { marked: 0 };
    const rows = await prisma.announcement.findMany({
      where,
      select: { id: true },
    });
    const userId = currentUser.id || currentUser.userId!;
    await AnnouncementRepository.markAllRead(
      rows.map((row) => row.id),
      userId
    );
    return { marked: rows.length };
  },
};
