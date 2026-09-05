import path from "path";
import fs from "fs";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { buildMeta } from "../../utils/pagination";
import { saveFile, getFileUrl } from "../../integrations/storage/storage.client";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as repo from "./assignment.repository";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateAssignmentDTO,
  UpdateAssignmentDTO,
  AssignmentQueryDTO,
  SubmissionQueryDTO,
  SubmitAssignmentDTO,
  GradeSubmissionDTO,
  AssignmentTargetDTO,
} from "./assignment.types";

const ALLOWED_SUBMISSION_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".zip"]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".zip",
  ".png",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".txt",
  ".mp4",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const getFacultyIdForUser = async (userId: string): Promise<string | null> => {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  return faculty?.id ?? null;
};

const isAdminOrManager = (user: AuthUser) =>
  user.roles.includes("ADMIN") || user.roles.includes("CENTER_MANAGER");

const parseOptionalDate = (value?: string | null): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError("Invalid date", 400);
  return d;
};

const assertFacultyTeachesBatch = async (facultyId: string, batchId: string) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      batchCourses: { select: { facultyId: true } },
      classSessions: { where: { status: "ACTIVE" }, select: { facultyId: true }, take: 50 },
    },
  });
  if (!batch) throw new AppError("Batch not found", 404);

  const teaches =
    batch.facultyId === facultyId ||
    batch.batchCourses.some((bc) => bc.facultyId === facultyId) ||
    batch.classSessions.some((cs) => cs.facultyId === facultyId);

  if (!teaches) {
    throw new AppError("Selected faculty is not assigned to this batch", 400);
  }
};

const validateMaster = async (
  instituteId: string,
  entityType: string,
  masterId: string | null | undefined,
  required: boolean,
  label: string
) => {
  if (!masterId) {
    if (required) throw new AppError(`${label} is required`, 400);
    return;
  }
  const record = await prisma.masterRecord.findFirst({
    where: {
      id: masterId,
      instituteId,
      entityType,
      status: "ACTIVE",
    },
  });
  if (!record) throw new AppError(`Invalid ${label}`, 400);
};

const validateAndNormalizeTargets = async (
  currentUser: AuthUser,
  targets: AssignmentTargetDTO[]
): Promise<AssignmentTargetDTO[]> => {
  if (!targets.length) throw new AppError("At least one target row is required", 400);

  const normalized: AssignmentTargetDTO[] = [];

  for (const target of targets) {
    const course = await prisma.course.findFirst({
      where: { id: target.courseId, instituteId: currentUser.instituteId, status: "ACTIVE" },
    });
    if (!course) throw new AppError("Course not found in target", 400);

    if (target.courseModuleId) {
      const mod = await prisma.courseModule.findFirst({
        where: { id: target.courseModuleId, courseId: target.courseId, status: "ACTIVE" },
      });
      if (!mod) throw new AppError("Module does not belong to the selected course", 400);
    }

    const batch = await prisma.batch.findFirst({
      where: {
        id: target.batchId,
        instituteId: currentUser.instituteId,
        ...(currentUser.roles.includes("ADMIN")
          ? {}
          : currentUser.branchId
            ? { branchId: currentUser.branchId }
            : {}),
      },
      include: { batchCourses: { select: { courseId: true } } },
    });
    if (!batch) throw new AppError("Batch not found in target", 400);

    const batchHasCourse =
      batch.courseId === target.courseId ||
      batch.batchCourses.some((bc) => bc.courseId === target.courseId);
    if (!batchHasCourse) {
      throw new AppError("Selected batch does not include the selected course", 400);
    }

    normalized.push({
      courseId: target.courseId,
      courseModuleId: target.courseModuleId || null,
      topic: target.topic || null,
      batchId: target.batchId,
    });
  }

  return normalized;
};

const resolveAudienceStudentIds = async (
  targets: AssignmentTargetDTO[],
  recipientStudentIds?: string[]
): Promise<string[]> => {
  const batchIds = [...new Set(targets.map((t) => t.batchId))];

  if (recipientStudentIds && recipientStudentIds.length > 0) {
    const unique = [...new Set(recipientStudentIds)];
    const enrolled = await prisma.batchEnrollment.findMany({
      where: {
        batchId: { in: batchIds },
        studentId: { in: unique },
        status: "ACTIVE",
      },
      select: { studentId: true },
    });
    const enrolledSet = new Set(enrolled.map((e) => e.studentId));
    const invalid = unique.filter((id) => !enrolledSet.has(id));
    if (invalid.length > 0) {
      throw new AppError("Some selected students are not enrolled in the target batches", 400);
    }
    return unique;
  }

  const enrollments = await prisma.batchEnrollment.findMany({
    where: { batchId: { in: batchIds }, status: "ACTIVE" },
    select: { studentId: true },
  });
  return [...new Set(enrollments.map((e) => e.studentId))];
};

const triggerAssignmentNotifications = async (assignmentId: string) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        batch: {
          include: {
            course: true,
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { include: { user: true } } },
            },
          },
        },
        recipients: { select: { studentId: true } },
        targets: { select: { batchId: true } },
      },
    });

    if (!assignment) return;

    const recipientFilter =
      assignment.recipients.length > 0
        ? new Set(assignment.recipients.map((r) => r.studentId))
        : null;

    const batchIds = [
      ...new Set([assignment.batchId, ...assignment.targets.map((t) => t.batchId)]),
    ];
    const enrollments = await prisma.batchEnrollment.findMany({
      where: { batchId: { in: batchIds }, status: "ACTIVE" },
      include: {
        student: { include: { user: true } },
        batch: true,
      },
    });

    const seen = new Set<string>();
    const dueDate = assignment.dueDate ? assignment.dueDate.toISOString().split("T")[0] : "";

    for (const enrollment of enrollments) {
      const student = enrollment.student;
      if (seen.has(student.id)) continue;
      if (recipientFilter && !recipientFilter.has(student.id)) continue;
      seen.add(student.id);
      if (!student.user?.phone) continue;

      await triggerNotification({
        instituteId: enrollment.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.ASSIGNMENT_CREATED,
        idempotencyKey: buildIdempotencyKey.ASSIGNMENT_CREATED(student.id, assignment.id),
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: enrollment.batch.name ?? "Batch",
          assignment_title: assignment.title,
          due_date: dueDate || "not specified",
        },
        metadata: {
          assignmentId: assignment.id,
          batchId: assignment.batchId,
          classSessionId: assignment.classSessionId,
        },
      });
    }
  } catch (err) {
    logger.error({ err, assignmentId }, "[assignments] Failed to trigger assignment notification");
  }
};

const resolveTargetsFromLegacy = async (
  currentUser: AuthUser,
  dto: CreateAssignmentDTO
): Promise<AssignmentTargetDTO[]> => {
  if (dto.targets && dto.targets.length > 0) {
    return validateAndNormalizeTargets(currentUser, dto.targets);
  }

  let batchId = dto.batchId;
  if (!batchId && dto.classSessionId) {
    const session = await prisma.classSession.findUnique({ where: { id: dto.classSessionId } });
    batchId = session?.batchId;
  }
  if (!batchId) throw new AppError("At least one target, batch, or class session is required", 400);

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId: currentUser.instituteId },
  });
  if (!batch) throw new AppError("Batch not found", 404);

  return validateAndNormalizeTargets(currentUser, [
    { courseId: batch.courseId, batchId: batch.id },
  ]);
};

export const getAssignments = async (currentUser: AuthUser, query: AssignmentQueryDTO) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const isStudentViewer =
    currentUser.roles.includes("STUDENT") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("FACULTY") &&
    !currentUser.roles.includes("CENTER_MANAGER");

  // Students are scoped by enrollment batches, not user.branchId (which can drift).
  const branchId =
    currentUser.roles.includes("ADMIN") || isStudentViewer
      ? undefined
      : (currentUser.branchId ?? undefined);

  let facultyId = query.facultyId;
  if (
    currentUser.roles.includes("FACULTY") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("CENTER_MANAGER")
  ) {
    const ownFacultyId = await getFacultyIdForUser(currentUser.id);
    if (!ownFacultyId) throw new AppError("Faculty profile not found for this user", 403);
    facultyId = ownFacultyId;
  }

  let studentBatchIds: string[] | undefined;
  let forStudentId: string | undefined;
  if (isStudentViewer) {
    const student = await prisma.student.findFirst({
      where: { userId: currentUser.id, instituteId: currentUser.instituteId },
      include: { batchEnrollments: { where: { status: "ACTIVE" } } },
    });
    if (!student) throw new AppError("Student profile not found", 403);
    forStudentId = student.id;
    studentBatchIds = student.batchEnrollments.map((e) => e.batchId);
    if (studentBatchIds.length === 0) {
      return { data: [], meta: buildMeta(0, page, limit) };
    }
  }

  const { assignments, total } = await repo.findAssignments({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    batchIds: studentBatchIds,
    forStudentId,
    classSessionId: query.classSessionId,
    facultyId,
    status: query.status,
    search: query.search,
    assignedFrom: query.assignedFrom ? new Date(query.assignedFrom) : undefined,
    assignedTo: query.assignedTo ? new Date(query.assignedTo) : undefined,
    academicYearMasterId: query.academicYearMasterId,
    assignmentTypeMasterId: query.assignmentTypeMasterId,
    skip,
    take: limit,
  });

  // Students must only see their own submission rows
  const data = forStudentId
    ? assignments.map((a) => ({
        ...a,
        submissions: (a.submissions || []).filter((s) => s.studentId === forStudentId),
      }))
    : assignments;

  return { data, meta: buildMeta(total, page, limit) };
};

export const getAssignmentById = async (currentUser: AuthUser, id: string) => {
  const assignment = await repo.findAssignmentById(id);
  if (!assignment) throw new AppError("Assignment not found", 404);

  const batch = assignment.batch ?? assignment.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Assignment not found", 404);
  }

  const isStudentViewer =
    currentUser.roles.includes("STUDENT") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("FACULTY") &&
    !currentUser.roles.includes("CENTER_MANAGER");

  // Branch isolation applies to staff; students are authorized via enrollment below.
  if (
    !isStudentViewer &&
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    batch.branchId !== currentUser.branchId
  ) {
    throw new AppError("Assignment not found", 404);
  }

  if (isStudentViewer) {
    const student = await prisma.student.findFirst({
      where: { userId: currentUser.id, instituteId: currentUser.instituteId },
    });
    if (!student) throw new AppError("Student profile not found", 403);

    const targetBatchIds = [
      assignment.batchId,
      ...(assignment.targets || []).map((t) => t.batchId),
    ];
    const enrollment = await prisma.batchEnrollment.findFirst({
      where: {
        batchId: { in: targetBatchIds },
        studentId: student.id,
        status: "ACTIVE",
      },
    });
    if (!enrollment) throw new AppError("Assignment not found", 404);

    if (
      assignment.recipients &&
      assignment.recipients.length > 0 &&
      !assignment.recipients.some((r) => r.studentId === student.id)
    ) {
      throw new AppError("Assignment not found", 404);
    }

    return {
      ...assignment,
      submissions: (assignment.submissions || []).filter((s) => s.studentId === student.id),
    };
  }

  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== assignment.facultyId) {
      throw new AppError("Assignment not found", 404);
    }
  }

  return assignment;
};

export const createAssignment = async (currentUser: AuthUser, dto: CreateAssignmentDTO) => {
  const targets = await resolveTargetsFromLegacy(currentUser, dto);
  const primaryBatchId = targets[0].batchId;

  await validateMaster(
    currentUser.instituteId,
    "academicyear",
    dto.academicYearMasterId,
    true,
    "Academic year"
  );
  await validateMaster(
    currentUser.instituteId,
    "assignmenttype",
    dto.assignmentTypeMasterId,
    false,
    "Assignment type"
  );

  let session = dto.classSessionId
    ? await prisma.classSession.findUnique({
        where: { id: dto.classSessionId },
        include: { batch: true },
      })
    : null;

  if (!session) {
    session = await prisma.classSession.findFirst({
      where: {
        batchId: primaryBatchId,
        batch: { instituteId: currentUser.instituteId },
        status: "ACTIVE",
      },
      include: { batch: true },
      orderBy: { scheduledDate: "desc" },
    });
  }

  const primaryBatch = await prisma.batch.findUnique({ where: { id: primaryBatchId } });
  if (!primaryBatch || primaryBatch.instituteId !== currentUser.instituteId) {
    throw new AppError("Batch not found", 404);
  }

  let facultyId =
    dto.facultyId || session?.facultyId || primaryBatch.facultyId || undefined;

  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const ownFacultyId = await getFacultyIdForUser(currentUser.id);
    if (!ownFacultyId) throw new AppError("Faculty profile not found for this user", 403);
    if (dto.facultyId && dto.facultyId !== ownFacultyId) {
      throw new AppError("You can only create assignments as yourself", 403);
    }
    facultyId = ownFacultyId;
    for (const t of targets) {
      await assertFacultyTeachesBatch(ownFacultyId, t.batchId);
    }
  } else if (facultyId) {
    for (const t of targets) {
      await assertFacultyTeachesBatch(facultyId, t.batchId);
    }
  }

  if (!facultyId) {
    throw new AppError("Faculty is required for the assignment", 400);
  }

  const dueDate = parseOptionalDate(dto.dueDate);
  if (!dueDate) throw new AppError("Due date is required", 400);
  if (dueDate.getTime() < Date.now() - 60_000) {
    throw new AppError("Due date cannot be in the past", 400);
  }

  const assignedAt = parseOptionalDate(dto.assignedAt) ?? new Date();
  const validTill = parseOptionalDate(dto.validTill);

  const pendingStudentIds = await resolveAudienceStudentIds(targets, dto.recipientStudentIds);

  const assignment = await repo.createAssignment({
    classSessionId: session?.id ?? null,
    batchId: primaryBatchId,
    facultyId,
    title: dto.title,
    description: dto.description || undefined,
    dueDate,
    assignedAt: assignedAt instanceof Date ? assignedAt : new Date(),
    validTill: validTill === undefined ? null : validTill,
    maxMarks: dto.maxMarks,
    allowLate: dto.allowLate,
    restrictStudentUpload: dto.restrictStudentUpload,
    youtubeVideoId: dto.youtubeVideoId,
    assignmentTypeMasterId: dto.assignmentTypeMasterId,
    academicYearMasterId: dto.academicYearMasterId,
    targets,
    recipientStudentIds: dto.recipientStudentIds,
    pendingStudentIds,
  });

  setImmediate(() => {
    triggerAssignmentNotifications(assignment.id);
  });

  return assignment;
};

export const updateAssignment = async (
  currentUser: AuthUser,
  id: string,
  dto: UpdateAssignmentDTO
) => {
  const existing = await getAssignmentById(currentUser, id);

  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== existing.facultyId) {
      throw new AppError("You can only update your own assignments", 403);
    }
  }

  let targets: AssignmentTargetDTO[] | undefined;
  if (dto.targets) {
    targets = await validateAndNormalizeTargets(currentUser, dto.targets);
  }

  if (dto.academicYearMasterId !== undefined) {
    await validateMaster(
      currentUser.instituteId,
      "academicyear",
      dto.academicYearMasterId,
      false,
      "Academic year"
    );
  }
  if (dto.assignmentTypeMasterId !== undefined) {
    await validateMaster(
      currentUser.instituteId,
      "assignmenttype",
      dto.assignmentTypeMasterId,
      false,
      "Assignment type"
    );
  }

  const effectiveTargets =
    targets ||
    (existing.targets || []).map((t) => ({
      courseId: t.courseId,
      courseModuleId: t.courseModuleId,
      topic: t.topic,
      batchId: t.batchId,
    }));

  if (dto.facultyId && dto.facultyId !== existing.facultyId) {
    for (const t of effectiveTargets) {
      await assertFacultyTeachesBatch(dto.facultyId, t.batchId);
    }
  }

  let pendingStudentIdsToAdd: string[] | undefined;
  if (dto.targets || dto.recipientStudentIds !== undefined) {
    const audience = await resolveAudienceStudentIds(
      effectiveTargets,
      dto.recipientStudentIds === null
        ? undefined
        : (dto.recipientStudentIds ?? undefined)
    );
    pendingStudentIdsToAdd = audience;
  }

  return repo.updateAssignment(id, {
    title: dto.title,
    description: dto.description,
    dueDate: parseOptionalDate(dto.dueDate),
    assignedAt: parseOptionalDate(dto.assignedAt) ?? undefined,
    validTill: parseOptionalDate(dto.validTill),
    status: dto.status,
    maxMarks: dto.maxMarks,
    allowLate: dto.allowLate,
    restrictStudentUpload: dto.restrictStudentUpload,
    youtubeVideoId: dto.youtubeVideoId,
    facultyId: dto.facultyId,
    assignmentTypeMasterId: dto.assignmentTypeMasterId,
    academicYearMasterId: dto.academicYearMasterId,
    classSessionId: dto.classSessionId,
    batchId: targets?.[0]?.batchId,
    attachmentFileKey: dto.attachmentFileKey,
    attachmentFileName: dto.attachmentFileName,
    targets,
    recipientStudentIds: dto.recipientStudentIds,
    pendingStudentIdsToAdd,
  });
};

export const deleteAssignment = async (currentUser: AuthUser, id: string) => {
  const existing = await getAssignmentById(currentUser, id);

  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== existing.facultyId) {
      throw new AppError("You can only delete your own assignments", 403);
    }
  }

  await repo.deleteAssignment(id);
  return { id, deleted: true };
};

export const listSubmissions = async (currentUser: AuthUser, query: SubmissionQueryDTO) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const branchId = currentUser.roles.includes("ADMIN")
    ? undefined
    : (currentUser.branchId ?? undefined);

  let facultyId = query.facultyId;
  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const ownFacultyId = await getFacultyIdForUser(currentUser.id);
    if (!ownFacultyId) throw new AppError("Faculty profile not found for this user", 403);
    facultyId = ownFacultyId;
  }

  const allowedStatuses = new Set(["PENDING", "SUBMITTED", "LATE", "GRADED"]);
  const statuses = (query.statuses || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is "PENDING" | "SUBMITTED" | "LATE" | "GRADED" => allowedStatuses.has(s));

  const { submissions, total } = await repo.findSubmissions({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    facultyId,
    status: query.status,
    statuses: statuses.length > 0 ? statuses : undefined,
    submittedOnly: query.submittedOnly === true,
    ungradedOnly: query.ungradedOnly === true,
    search: query.search,
    skip,
    take: limit,
  });

  return { data: submissions, meta: buildMeta(total, page, limit) };
};

export const gradeSubmission = async (
  currentUser: AuthUser,
  submissionId: string,
  dto: GradeSubmissionDTO
) => {
  const submission = await repo.findSubmissionById(submissionId);
  if (!submission) throw new AppError("Submission not found", 404);

  const batch = submission.assignment.batch ?? submission.assignment.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Submission not found", 404);
  }

  if (
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    batch.branchId !== currentUser.branchId
  ) {
    throw new AppError("Submission not found", 404);
  }

  if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== submission.assignment.facultyId) {
      throw new AppError("You can only grade submissions for your own assignments", 403);
    }
  }

  if (!submission.submittedAt && submission.submissionStatus === "PENDING") {
    throw new AppError("Cannot grade a submission that has not been submitted", 400);
  }

  const maxMarks = submission.assignment.maxMarks ?? 100;
  if (dto.marks > maxMarks) {
    throw new AppError(`Marks cannot exceed maximum of ${maxMarks}`, 400);
  }

  return repo.gradeSubmission(submissionId, {
    marks: dto.marks,
    feedback: dto.feedback || undefined,
    evaluatedBy: currentUser.id,
  });
};

export const submitAssignment = async (
  currentUser: AuthUser,
  assignmentId: string,
  dto: SubmitAssignmentDTO
) => {
  const assignment = await getAssignmentById(currentUser, assignmentId);

  if (assignment.status !== "ACTIVE") {
    throw new AppError("This assignment is closed", 400);
  }
  if (assignment.restrictStudentUpload) {
    throw new AppError("Student uploads are restricted for this assignment", 403);
  }

  const student = await prisma.student.findFirst({
    where: { userId: currentUser.id, instituteId: currentUser.instituteId },
  });
  if (!student) throw new AppError("Student profile not found", 403);

  const existing = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: { assignmentId, studentId: student.id },
    },
  });

  if (existing?.submissionStatus === "GRADED" || existing?.evaluatedAt) {
    throw new AppError("Cannot resubmit after grading", 400);
  }

  const now = new Date();
  if (assignment.validTill && now > assignment.validTill) {
    throw new AppError("Assignment is no longer valid for submission", 400);
  }

  const isLate = !!(assignment.dueDate && now > assignment.dueDate);
  if (isLate && !assignment.allowLate) {
    throw new AppError("Assignment due date has passed", 400);
  }

  return repo.upsertSubmission({
    assignmentId,
    studentId: student.id,
    fileKey: dto.fileKey,
    fileName: dto.fileName || undefined,
    notes: dto.notes || undefined,
    submissionStatus: isLate ? "LATE" : "SUBMITTED",
  });
};

export const uploadSubmissionFile = async (
  currentUser: AuthUser,
  assignmentId: string,
  file: Express.Multer.File
) => {
  const assignment = await getAssignmentById(currentUser, assignmentId);
  if (assignment.restrictStudentUpload) {
    throw new AppError("Student uploads are restricted for this assignment", 403);
  }

  if (!file?.buffer?.length) {
    throw new AppError("File is required", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("File size must be 10MB or less", 400);
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_SUBMISSION_EXTENSIONS.has(ext)) {
    throw new AppError("Only pdf, doc, docx, and zip files are allowed", 400);
  }

  const safeBase = (file.originalname || "submission")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const filename = `${assignmentId}_${Date.now()}_${safeBase}`;
  const fileKey = await saveFile(file.buffer, filename, "assignments");

  return {
    fileKey,
    fileName: file.originalname,
    url: getFileUrl(fileKey),
  };
};

export const uploadAttachment = async (
  currentUser: AuthUser,
  assignmentId: string,
  file: Express.Multer.File
) => {
  await getAssignmentById(currentUser, assignmentId);

  if (!file?.buffer?.length) {
    throw new AppError("File is required", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("File size must be 10MB or less", 400);
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    throw new AppError(
      `Unsupported attachment file type "${ext}". Allowed types: ${[...ALLOWED_ATTACHMENT_EXTENSIONS].join(", ")}`,
      400
    );
  }

  const safeBase = (file.originalname || "attachment")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const filename = `${assignmentId}_${Date.now()}_${safeBase}`;
  const fileKey = await saveFile(file.buffer, filename, "assignment-attachments");

  const updated = await repo.updateAssignment(assignmentId, {
    attachmentFileKey: fileKey,
    attachmentFileName: file.originalname,
  });

  return {
    fileKey,
    fileName: file.originalname,
    url: getFileUrl(fileKey),
    assignment: updated,
  };
};

export const getAttachmentDownload = async (currentUser: AuthUser, assignmentId: string) => {
  const assignment = await getAssignmentById(currentUser, assignmentId);
  if (!assignment.attachmentFileKey) {
    throw new AppError("Attachment not found", 404);
  }

  const relativeKey = assignment.attachmentFileKey.replace(/^\//, "");
  const localPath = path.join(process.env.LOCAL_UPLOADS_DIR || "./uploads", relativeKey);
  if (!fs.existsSync(localPath)) {
    throw new AppError("File not found on storage", 404);
  }

  return {
    filePath: localPath,
    fileName: assignment.attachmentFileName || path.basename(localPath),
  };
};

export const getSubmissionDownload = async (
  currentUser: AuthUser,
  submissionId: string
) => {
  const submission = await repo.findSubmissionById(submissionId);
  if (!submission || !submission.fileKey) {
    throw new AppError("File not found", 404);
  }

  const batch = submission.assignment.batch ?? submission.assignment.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("File not found", 404);
  }

  const isStaff =
    currentUser.roles.includes("ADMIN") ||
    currentUser.roles.includes("CENTER_MANAGER") ||
    currentUser.roles.includes("FACULTY");

  if (!isStaff) {
    const student = await prisma.student.findFirst({
      where: { userId: currentUser.id, instituteId: currentUser.instituteId },
    });
    if (!student || student.id !== submission.studentId) {
      throw new AppError("File not found", 404);
    }
  } else if (currentUser.roles.includes("FACULTY") && !isAdminOrManager(currentUser)) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== submission.assignment.facultyId) {
      throw new AppError("File not found", 404);
    }
  }

  const relativeKey = submission.fileKey.replace(/^\//, "");
  const localPath = path.join(process.env.LOCAL_UPLOADS_DIR || "./uploads", relativeKey);

  if (!fs.existsSync(localPath)) {
    throw new AppError("File not found on storage", 404);
  }

  return {
    filePath: localPath,
    fileName: submission.fileName || path.basename(localPath),
  };
};

export const getAssignmentStats = async (currentUser: AuthUser) => {
  const branchId = currentUser.roles.includes("ADMIN")
    ? undefined
    : (currentUser.branchId ?? undefined);

  return repo.countAssignmentStats({
    instituteId: currentUser.instituteId,
    branchId,
  });
};

export const getBatchEnrolledStudents = async (
  currentUser: AuthUser,
  batchIds: string[]
) => {
  const unique = [...new Set(batchIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const enrollments = await prisma.batchEnrollment.findMany({
    where: {
      batchId: { in: unique },
      status: "ACTIVE",
      batch: {
        instituteId: currentUser.instituteId,
        ...(currentUser.roles.includes("ADMIN")
          ? {}
          : currentUser.branchId
            ? { branchId: currentUser.branchId }
            : {}),
      },
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      batch: { select: { id: true, name: true, code: true } },
    },
    orderBy: { student: { studentCode: "asc" } },
  });

  const map = new Map<
    string,
    {
      id: string;
      studentCode: string;
      name: string;
      email?: string;
      batches: Array<{ id: string; name: string; code?: string }>;
    }
  >();

  for (const e of enrollments) {
    const existing = map.get(e.studentId);
    if (existing) {
      if (!existing.batches.some((b) => b.id === e.batch.id)) {
        existing.batches.push(e.batch);
      }
    } else {
      map.set(e.studentId, {
        id: e.student.id,
        studentCode: e.student.studentCode,
        name: e.student.user?.name || e.student.studentCode,
        email: e.student.user?.email ?? undefined,
        batches: [e.batch],
      });
    }
  }

  return [...map.values()];
};
