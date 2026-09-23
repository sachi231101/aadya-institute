import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import {
  assertFacultyOwnsBatch,
  isPureFaculty,
  resolveFacultyIdForUser,
} from "../../utils/auth-user.util";
import { assertBranchRecordAccess } from "../../utils/branch-isolation.util";
import {
  applyModuleCompletion,
  applyTopicCompletion,
  buildTopicProgressFromCourseTopics,
  parseTopicProgress,
  resolveTeachableCourseIds,
  summarizeCurriculumProgress,
} from "./batch-curriculum.util";

type CourseTopicCatalog = {
  id: string;
  title: string;
  durationHours?: number;
  description?: string;
};

const parseCourseTopicCatalog = (topics: unknown): CourseTopicCatalog[] => {
  if (!Array.isArray(topics)) return [];
  const result: CourseTopicCatalog[] = [];
  for (const t of topics) {
    if (!t || typeof t !== "object") continue;
    const row = t as Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.trim() === "") continue;
    result.push({
      id: row.id,
      title: typeof row.title === "string" ? row.title : "Untitled topic",
      durationHours: typeof row.durationHours === "number" ? row.durationHours : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
    });
  }
  return result;
};

const batchCurriculumInclude = {
  course: { select: { id: true, name: true, code: true } },
  faculty: { select: { id: true } },
  batchCourses: {
    select: { courseId: true, facultyId: true },
  },
  batchModules: {
    orderBy: { sequence: "asc" as const },
    include: {
      courseModule: {
        select: {
          id: true,
          courseId: true,
          name: true,
          code: true,
          description: true,
          sequence: true,
          duration: true,
          topics: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
      completedBy: { select: { id: true, name: true } },
    },
  },
};

const mapBatchModuleRow = (bm: {
  id: string;
  courseModuleId: string;
  sequence: number;
  isCompleted: boolean;
  completedAt: Date | null;
  completedById: string | null;
  topicProgress: unknown;
  completedBy?: { id: string; name: string } | null;
  courseModule: {
    id: string;
    courseId: string;
    name: string;
    code: string | null;
    description: string | null;
    sequence: number;
    duration: number | null;
    topics: unknown;
    course: { id: string; name: string; code: string | null };
  };
}) => {
  const catalog = parseCourseTopicCatalog(bm.courseModule.topics);
  const progressMap = new Map(
    parseTopicProgress(bm.topicProgress).map((p) => [p.topicId, p])
  );
  const topicIds =
    catalog.length > 0
      ? catalog.map((t) => t.id)
      : Array.from(progressMap.keys());

  const topics = topicIds.map((topicId) => {
    const cat = catalog.find((t) => t.id === topicId);
    const prog = progressMap.get(topicId);
    return {
      topicId,
      title: cat?.title ?? "Topic",
      durationHours: cat?.durationHours,
      description: cat?.description,
      isCompleted: Boolean(prog?.isCompleted),
      completedAt: prog?.completedAt ?? null,
      completedById: prog?.completedById ?? null,
    };
  });

  return {
    id: bm.id,
    courseModuleId: bm.courseModuleId,
    sequence: bm.sequence,
    isCompleted: bm.isCompleted,
    completedAt: bm.completedAt?.toISOString() ?? null,
    completedById: bm.completedById,
    completedBy: bm.completedBy ?? null,
    name: bm.courseModule.name,
    code: bm.courseModule.code,
    description: bm.courseModule.description,
    duration: bm.courseModule.duration,
    course: bm.courseModule.course,
    courseId: bm.courseModule.courseId,
    topics,
  };
};

const loadBatchForCurriculum = async (batchId: string, instituteId: string) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    include: batchCurriculumInclude,
  });
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  return batch;
};

const assertCanAccessBatchCurriculum = async (
  currentUser: AuthUser,
  batch: { id: string; branchId: string }
) => {
  await assertFacultyOwnsBatch(currentUser, batch.id);
  if (!isPureFaculty(currentUser.roles)) {
    assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");
  }
};

export const getBatchCurriculum = async (
  batchId: string,
  instituteId: string,
  currentUser: AuthUser
) => {
  const batch = await loadBatchForCurriculum(batchId, instituteId);
  await assertCanAccessBatchCurriculum(currentUser, batch);

  let modules = batch.batchModules.map(mapBatchModuleRow);

  if (isPureFaculty(currentUser.roles)) {
    const facultyId = await resolveFacultyIdForUser(currentUser.id);
    if (!facultyId) {
      throw new AppError("Faculty profile not found for this user", 403);
    }
    const teachable = resolveTeachableCourseIds(batch, facultyId);
    modules = modules.filter((m) => teachable.has(m.courseId));
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    batchCode: batch.code,
    modules,
  };
};

const assertFacultyCanMarkModule = async (
  currentUser: AuthUser,
  batch: {
    courseId: string;
    facultyId: string | null;
    batchCourses: Array<{ courseId: string; facultyId: string | null }>;
  },
  courseId: string
) => {
  if (!isPureFaculty(currentUser.roles)) return;
  const facultyId = await resolveFacultyIdForUser(currentUser.id);
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }
  const teachable = resolveTeachableCourseIds(batch, facultyId);
  if (!teachable.has(courseId)) {
    throw new AppError("You can only mark curriculum for courses you teach on this batch", 403);
  }
};

export const markBatchModuleCompletion = async (
  batchId: string,
  batchModuleId: string,
  instituteId: string,
  currentUser: AuthUser,
  isCompleted: boolean
) => {
  const batch = await loadBatchForCurriculum(batchId, instituteId);
  await assertCanAccessBatchCurriculum(currentUser, batch);

  const bm = batch.batchModules.find((m) => m.id === batchModuleId);
  if (!bm) {
    throw new AppError("Batch module not found", 404);
  }

  await assertFacultyCanMarkModule(currentUser, batch, bm.courseModule.courseId);

  const nowIso = new Date().toISOString();
  const aligned = buildTopicProgressFromCourseTopics(bm.courseModule.topics, bm.topicProgress);
  const next = applyModuleCompletion(aligned, isCompleted, currentUser.id, nowIso);

  const updated = await prisma.batchModule.update({
    where: { id: bm.id },
    data: {
      isCompleted: next.isCompleted,
      completedAt: next.completedAt ? new Date(next.completedAt) : null,
      completedById: next.completedById,
      topicProgress: next.topicProgress as Prisma.InputJsonValue,
    },
    include: {
      courseModule: {
        select: {
          id: true,
          courseId: true,
          name: true,
          code: true,
          description: true,
          sequence: true,
          duration: true,
          topics: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
      completedBy: { select: { id: true, name: true } },
    },
  });

  return mapBatchModuleRow(updated);
};

export const markBatchTopicCompletion = async (
  batchId: string,
  batchModuleId: string,
  topicId: string,
  instituteId: string,
  currentUser: AuthUser,
  isCompleted: boolean
) => {
  const batch = await loadBatchForCurriculum(batchId, instituteId);
  await assertCanAccessBatchCurriculum(currentUser, batch);

  const bm = batch.batchModules.find((m) => m.id === batchModuleId);
  if (!bm) {
    throw new AppError("Batch module not found", 404);
  }

  await assertFacultyCanMarkModule(currentUser, batch, bm.courseModule.courseId);

  const nowIso = new Date().toISOString();
  const aligned = buildTopicProgressFromCourseTopics(bm.courseModule.topics, bm.topicProgress);
  const next = applyTopicCompletion(aligned, topicId, isCompleted, currentUser.id, nowIso);
  if (!next.topicFound) {
    throw new AppError("Topic not found on this module", 404);
  }

  const updated = await prisma.batchModule.update({
    where: { id: bm.id },
    data: {
      isCompleted: next.isCompleted,
      completedAt: next.completedAt ? new Date(next.completedAt) : null,
      completedById: next.completedById,
      topicProgress: next.topicProgress as Prisma.InputJsonValue,
    },
    include: {
      courseModule: {
        select: {
          id: true,
          courseId: true,
          name: true,
          code: true,
          description: true,
          sequence: true,
          duration: true,
          topics: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
      completedBy: { select: { id: true, name: true } },
    },
  });

  return mapBatchModuleRow(updated);
};

/**
 * When a CourseModule is created or its topics change after batches already exist,
 * ensure every batch linked to that course has a BatchModule row and aligned
 * topicProgress (preserving completion by topicId).
 *
 * Batch create/update still runs full syncBatchModulesForCourses; this covers
 * the catalog-side gap without requiring a batch edit.
 */
export const syncCourseModuleToExistingBatches = async (courseModuleId: string) => {
  const courseModule = await prisma.courseModule.findUnique({
    where: { id: courseModuleId },
    select: {
      id: true,
      courseId: true,
      status: true,
      topics: true,
    },
  });
  if (!courseModule || courseModule.status !== "ACTIVE") {
    return { linked: 0, created: 0, updated: 0 };
  }

  // Only sync into batches at branches linked to this course (CourseBranch).
  const courseBranches = await prisma.courseBranch.findMany({
    where: { courseId: courseModule.courseId },
    select: { branchId: true },
  });
  const assignedBranchIds = courseBranches.map((cb) => cb.branchId);
  if (assignedBranchIds.length === 0) {
    return { linked: 0, created: 0, updated: 0 };
  }

  const batches = await prisma.batch.findMany({
    where: {
      branchId: { in: assignedBranchIds },
      OR: [
        { courseId: courseModule.courseId },
        { batchCourses: { some: { courseId: courseModule.courseId } } },
      ],
    },
    select: {
      id: true,
      batchModules: {
        select: {
          id: true,
          courseModuleId: true,
          sequence: true,
          isCompleted: true,
          completedAt: true,
          completedById: true,
          topicProgress: true,
        },
      },
    },
  });

  let created = 0;
  let updated = 0;

  for (const batch of batches) {
    const existing = batch.batchModules.find(
      (bm) => bm.courseModuleId === courseModule.id
    );
    const topicProgress = buildTopicProgressFromCourseTopics(
      courseModule.topics,
      existing?.topicProgress
    );

    if (!existing) {
      const maxSequence = batch.batchModules.reduce(
        (max, bm) => Math.max(max, bm.sequence),
        0
      );
      await prisma.batchModule.create({
        data: {
          batchId: batch.id,
          courseModuleId: courseModule.id,
          sequence: maxSequence + 1,
          status: "ACTIVE",
          isCompleted: false,
          topicProgress: topicProgress as Prisma.InputJsonValue,
        },
      });
      created += 1;
      continue;
    }

    const allTopicsComplete =
      topicProgress.length > 0 && topicProgress.every((t) => t.isCompleted);
    // Empty catalog topics: keep existing module completion flag.
    const nextCompleted =
      topicProgress.length === 0 ? existing.isCompleted : allTopicsComplete;

    await prisma.batchModule.update({
      where: { id: existing.id },
      data: {
        topicProgress: topicProgress as Prisma.InputJsonValue,
        isCompleted: nextCompleted,
        completedAt: nextCompleted
          ? existing.completedAt ?? (allTopicsComplete ? new Date() : null)
          : null,
        completedById: nextCompleted ? existing.completedById : null,
      },
    });
    updated += 1;
  }

  return { linked: batches.length, created, updated };
};

/**
 * Student view: active enrollments only; return completed topics
 * (and modules that have at least one completed topic, or module marked complete).
 */
export const getMyCurriculum = async (currentUser: AuthUser) => {
  const student = await prisma.student.findFirst({
    where: {
      userId: currentUser.id,
      instituteId: currentUser.instituteId,
    },
    select: { id: true },
  });
  if (!student) {
    throw new AppError("Student profile not found", 404);
  }

  const enrollments = await prisma.batchEnrollment.findMany({
    where: {
      studentId: student.id,
      status: "ACTIVE",
      batch: { instituteId: currentUser.instituteId },
    },
    include: {
      batch: {
        include: batchCurriculumInclude,
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return enrollments.map((enrollment) => {
    const modules = enrollment.batch.batchModules
      .map(mapBatchModuleRow)
      .map((mod) => {
        const completedTopics = mod.topics.filter((t) => t.isCompleted);
        const showModule = mod.isCompleted || completedTopics.length > 0;
        if (!showModule) return null;
        return {
          ...mod,
          topics: completedTopics,
        };
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    return {
      batchId: enrollment.batch.id,
      batchName: enrollment.batch.name,
      batchCode: enrollment.batch.code,
      modules,
    };
  });
};

export type FacultyCurriculumProgress = {
  overallPct: number | null;
  topicsCompleted: number;
  topicsTotal: number;
  modulesCompleted: number;
  modulesTotal: number;
  byAssignment: Array<{
    batchId: string;
    batchName: string;
    batchCode: string;
    courseId: string;
    courseName: string;
    branchId: string;
    branchName: string;
    pct: number | null;
    topicsCompleted: number;
    topicsTotal: number;
    modulesCompleted: number;
    modulesTotal: number;
  }>;
};

/**
 * Curriculum progress for one faculty across their BatchCourse assignments
 * (and primary-batch faculty rows). Used by Faculty Details → Progress & Analytics.
 */
export const getFacultyCurriculumProgress = async (
  facultyId: string,
  instituteId: string
): Promise<FacultyCurriculumProgress> => {
  const batchCourses = await prisma.batchCourse.findMany({
    where: {
      facultyId,
      status: "ACTIVE",
      batch: { instituteId },
    },
    include: {
      course: { select: { id: true, name: true } },
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          batchModules: {
            where: { status: "ACTIVE" },
            select: {
              isCompleted: true,
              topicProgress: true,
              courseModule: { select: { courseId: true, status: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Also include batches where this faculty is primary coordinator but subject row
  // may not list them (legacy primary-only assignments).
  const primaryBatches = await prisma.batch.findMany({
    where: {
      instituteId,
      facultyId,
      NOT: {
        batchCourses: { some: { facultyId, status: "ACTIVE" } },
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      courseId: true,
      course: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      batchModules: {
        where: { status: "ACTIVE" },
        select: {
          isCompleted: true,
          topicProgress: true,
          courseModule: { select: { courseId: true, status: true } },
        },
      },
    },
  });

  type AssignmentRow = {
    batchId: string;
    batchName: string;
    batchCode: string;
    courseId: string;
    courseName: string;
    branchId: string;
    branchName: string;
    modules: Array<{ isCompleted: boolean; topicProgress: unknown }>;
  };

  const assignments: AssignmentRow[] = [];

  for (const bc of batchCourses) {
    const modules = bc.batch.batchModules.filter(
      (bm) =>
        bm.courseModule.status === "ACTIVE" && bm.courseModule.courseId === bc.courseId
    );
    assignments.push({
      batchId: bc.batch.id,
      batchName: bc.batch.name,
      batchCode: bc.batch.code,
      courseId: bc.course.id,
      courseName: bc.course.name,
      branchId: bc.batch.branchId,
      branchName: bc.batch.branch?.name || "—",
      modules,
    });
  }

  for (const batch of primaryBatches) {
    if (!batch.courseId || !batch.course) continue;
    const modules = batch.batchModules.filter(
      (bm) =>
        bm.courseModule.status === "ACTIVE" && bm.courseModule.courseId === batch.courseId
    );
    assignments.push({
      batchId: batch.id,
      batchName: batch.name,
      batchCode: batch.code,
      courseId: batch.course.id,
      courseName: batch.course.name,
      branchId: batch.branchId,
      branchName: batch.branch?.name || "—",
      modules,
    });
  }

  const byAssignment = assignments.map((a) => {
    const summary = summarizeCurriculumProgress(a.modules);
    return {
      batchId: a.batchId,
      batchName: a.batchName,
      batchCode: a.batchCode,
      courseId: a.courseId,
      courseName: a.courseName,
      branchId: a.branchId,
      branchName: a.branchName,
      pct: summary.pct,
      topicsCompleted: summary.topicsCompleted,
      topicsTotal: summary.topicsTotal,
      modulesCompleted: summary.modulesCompleted,
      modulesTotal: summary.modulesTotal,
    };
  });

  const topicsCompleted = byAssignment.reduce((s, a) => s + a.topicsCompleted, 0);
  const topicsTotal = byAssignment.reduce((s, a) => s + a.topicsTotal, 0);
  const modulesCompleted = byAssignment.reduce((s, a) => s + a.modulesCompleted, 0);
  const modulesTotal = byAssignment.reduce((s, a) => s + a.modulesTotal, 0);
  const overallPct =
    topicsTotal > 0
      ? Math.round((topicsCompleted / topicsTotal) * 100)
      : modulesTotal > 0
        ? Math.round((modulesCompleted / modulesTotal) * 100)
        : null;

  return {
    overallPct,
    topicsCompleted,
    topicsTotal,
    modulesCompleted,
    modulesTotal,
    byAssignment,
  };
};
