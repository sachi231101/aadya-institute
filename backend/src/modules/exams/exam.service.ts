import * as repository from './exam.repository';
import { CreateExamDto, UpdateExamDto, ScheduleExamDto, AddQuestionToExamDto, AddQuestionBankToExamDto, ReorderQuestionsDto, AssignStudentsToExamDto } from './exam.types';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../config/database';
import { resolveOptionalMasterFields } from '../masters/master-resolve.service';
import { logger } from '../../config/logger';

// ─── Valid status transitions ─────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'SCHEDULED', 'ARCHIVED', 'CANCELLED'],
  PUBLISHED: ['SCHEDULED', 'ARCHIVED', 'CANCELLED', 'DRAFT'],
  SCHEDULED: ['LIVE', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'],
  LIVE: ['ENDED'],
  ENDED: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

// ─── Audit logging helper ─────────────────────────────────────────────────────
const logActivity = async (
  userId: string,
  instituteId: string,
  action: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        instituteId,
        action,
        entityType: 'Exam',
        entityId,
        oldData: oldData as any,
        newData: newData as any,
      },
    });
  } catch (err) {
    logger.error({ err, action, entityId }, '[exam.service] Failed to write activity log');
  }
};

// ─── Service functions ────────────────────────────────────────────────────────
export const getExams = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: Parameters<typeof repository.findAllExams>[2]
) => {
  return repository.findAllExams(instituteId, branchId, filters);
};

export const getExamById = async (id: string, instituteId: string) => {
  const exam = await repository.findExamById(id, instituteId);
  if (!exam) throw new AppError('Exam not found', 404);
  return exam;
};

export const createExam = async (
  instituteId: string,
  branchId: string | undefined | null,
  userId: string,
  data: CreateExamDto
) => {
  let payload = { ...data };
  if (data.examTermMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "examterm",
      masterRecordId: data.examTermMasterId,
      branchId: data.branchId || branchId,
    });
    payload = { ...payload, examTermMasterId: resolved?.masterId };
  }
  const exam = await repository.createExam(instituteId, branchId, userId, payload);
  await logActivity(userId, instituteId, 'EXAM_CREATED', exam.id, null, { name: exam.name, status: exam.status });
  return exam;
};

export const updateExam = async (
  id: string,
  instituteId: string,
  userId: string,
  data: UpdateExamDto
) => {
  const existing = await getExamById(id, instituteId);

  if (existing.status === 'ARCHIVED' || existing.status === 'CANCELLED') {
    throw new AppError(`Cannot update an exam in ${existing.status} status`, 400);
  }

  let payload = { ...data };
  if (data.examTermMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "examterm",
      masterRecordId: data.examTermMasterId,
      branchId: data.branchId || existing.branchId,
    });
    payload = { ...payload, examTermMasterId: resolved?.masterId };
  }

  const updated = await repository.updateExam(id, instituteId, payload);
  const { cacheDel } = await import('../../config/cache');
  await cacheDel(`exam-paper:${id}`);
  await logActivity(userId, instituteId, 'EXAM_UPDATED', id, existing, updated);
  return updated;
};

export const publishExam = async (id: string, instituteId: string, userId: string) => {
  const exam = await getExamById(id, instituteId);

  // Validate publishability
  const errors: string[] = [];
  if (!exam.name?.trim()) errors.push('Exam name is required');
  if (exam.durationMinutes <= 0) errors.push('Duration must be positive');
  if (exam.totalMarks <= 0) errors.push('Exam must have at least one question');
  if (exam.passingMarks > exam.totalMarks) errors.push('Passing marks cannot exceed total marks');
  if (!exam.batchAssignments?.length && !(exam as any)._count?.studentAssignments) {
    errors.push('Exam must be assigned to at least one batch or student');
  }
  if ((exam as any)._count?.examQuestions === 0) errors.push('Exam must have at least one question');

  if (errors.length > 0) {
    throw new AppError(`Cannot publish exam: ${errors.join('; ')}`, 400);
  }

  if (!VALID_TRANSITIONS[exam.status]?.includes('PUBLISHED')) {
    throw new AppError(`Cannot publish exam in ${exam.status} status`, 400);
  }

  await repository.updateExamStatus(id, 'PUBLISHED');
  const { cacheDel } = await import('../../config/cache');
  await cacheDel(`exam-paper:${id}`);
  await logActivity(userId, instituteId, 'EXAM_PUBLISHED', id, { status: exam.status }, { status: 'PUBLISHED' });
  return repository.findExamById(id, instituteId);
};

export const scheduleExam = async (
  id: string,
  instituteId: string,
  userId: string,
  data: ScheduleExamDto
) => {
  const exam = await getExamById(id, instituteId);

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  if (endAt <= startAt) {
    throw new AppError('End time must be after start time', 400);
  }

  if (!VALID_TRANSITIONS[exam.status]?.includes('SCHEDULED')) {
    throw new AppError(`Cannot schedule exam in ${exam.status} status`, 400);
  }

  const updated = await repository.scheduleExam(id, startAt, endAt);
  await logActivity(userId, instituteId, 'EXAM_SCHEDULED', id, { status: exam.status }, { status: 'SCHEDULED', startAt, endAt });
  return updated;
};

export const archiveExam = async (id: string, instituteId: string, userId: string) => {
  const exam = await getExamById(id, instituteId);

  if (!VALID_TRANSITIONS[exam.status]?.includes('ARCHIVED')) {
    throw new AppError(`Cannot archive exam in ${exam.status} status`, 400);
  }

  await repository.updateExamStatus(id, 'ARCHIVED');
  await logActivity(userId, instituteId, 'EXAM_ARCHIVED', id, { status: exam.status }, { status: 'ARCHIVED' });
};

export const deleteExam = async (id: string, instituteId: string, userId: string) => {
  const exam = await getExamById(id, instituteId);

  // Prevent deletion of published/scheduled/live exams
  if (!['DRAFT', 'CANCELLED'].includes(exam.status)) {
    throw new AppError('Only DRAFT or CANCELLED exams can be deleted. Use archive instead.', 400);
  }

  await repository.deleteExam(id, instituteId);
  await logActivity(userId, instituteId, 'EXAM_DELETED', id, { name: exam.name }, null);
};

export const addQuestionToExam = async (
  examId: string,
  instituteId: string,
  userId: string,
  data: AddQuestionToExamDto
) => {
  const exam = await getExamById(examId, instituteId);

  if (exam.status === 'ARCHIVED' || exam.status === 'CANCELLED') {
    throw new AppError(`Cannot modify questions in a ${exam.status} exam`, 400);
  }

  // Verify question belongs to same institute
  const question = await prisma.question.findFirst({
    where: { id: data.questionId, instituteId },
  });
  if (!question) throw new AppError('Question not found', 404);

  // Check duplicate
  const existing = await prisma.examQuestion.findFirst({
    where: { examId, questionId: data.questionId },
  });
  if (existing) throw new AppError('Question already added to this exam', 400);

  const examQuestion = await repository.addQuestionToExam(
    examId,
    data.questionId,
    data.displayOrder,
    data.marksOverride
  );

  await repository.recalculateTotalMarks(examId);
  await logActivity(userId, instituteId, 'QUESTION_ADDED_TO_EXAM', examId, null, { questionId: data.questionId });

  return examQuestion;
};

export const addQuestionBankToExam = async (
  examId: string,
  instituteId: string,
  userId: string,
  data: AddQuestionBankToExamDto
) => {
  const exam = await getExamById(examId, instituteId);

  if (exam.status === 'ARCHIVED' || exam.status === 'CANCELLED') {
    throw new AppError(`Cannot modify questions in a ${exam.status} exam`, 400);
  }

  const bank = await prisma.questionBank.findFirst({
    where: { id: data.questionBankId, instituteId },
  });
  if (!bank) throw new AppError('Question bank not found', 404);

  const result = await repository.addQuestionBankToExam(examId, data.questionBankId, instituteId);

  if (result.total === 0) {
    throw new AppError('This question bank has no questions', 400);
  }

  if (result.added === 0) {
    throw new AppError('All questions from this bank are already on the exam', 400);
  }

  await logActivity(userId, instituteId, 'QUESTION_BANK_ADDED_TO_EXAM', examId, null, {
    questionBankId: data.questionBankId,
    added: result.added,
    skipped: result.skipped,
  });

  return result;
};

export const removeQuestionFromExam = async (
  examId: string,
  questionId: string,
  instituteId: string,
  userId: string
) => {
  await getExamById(examId, instituteId);
  await repository.removeQuestionFromExam(examId, questionId);
  await repository.recalculateTotalMarks(examId);
  await logActivity(userId, instituteId, 'QUESTION_REMOVED_FROM_EXAM', examId, null, { questionId });
};

export const reorderExamQuestions = async (
  examId: string,
  instituteId: string,
  data: ReorderQuestionsDto
) => {
  await getExamById(examId, instituteId);
  await repository.reorderExamQuestions(examId, data.questions);
};

export const getExamQuestions = async (examId: string, instituteId: string) => {
  await getExamById(examId, instituteId);
  return repository.getExamQuestions(examId);
};

export const assignBatchToExam = async (
  examId: string,
  batchId: string,
  instituteId: string,
  userId: string
) => {
  await getExamById(examId, instituteId);

  // Verify batch belongs to same institute
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId } });
  if (!batch) throw new AppError('Batch not found', 404);

  // Check duplicate
  const existing = await prisma.examBatch.findFirst({ where: { examId, batchId } });
  if (existing) throw new AppError('Batch already assigned to this exam', 400);

  const assignment = await repository.assignBatchToExam(examId, batchId);
  await logActivity(userId, instituteId, 'EXAM_ASSIGNED', examId, null, { batchId });
  return assignment;
};

export const removeBatchFromExam = async (
  examId: string,
  batchId: string,
  instituteId: string,
  userId: string
) => {
  await getExamById(examId, instituteId);
  await repository.removeBatchFromExam(examId, batchId);
  await logActivity(userId, instituteId, 'EXAM_UNASSIGNED', examId, null, { batchId });
};

export const getExamBatches = async (examId: string, instituteId: string) => {
  await getExamById(examId, instituteId);
  return repository.getExamBatches(examId);
};

export const assignStudentsToExam = async (
  examId: string,
  instituteId: string,
  userId: string,
  data: AssignStudentsToExamDto
) => {
  await getExamById(examId, instituteId);

  const uniqueIds = [...new Set(data.studentIds)];
  const students = await prisma.student.findMany({
    where: { id: { in: uniqueIds }, instituteId },
    select: { id: true },
  });

  if (students.length === 0) {
    throw new AppError('No valid students found', 404);
  }

  const validIds = students.map((s) => s.id);
  const added = await repository.assignStudentsToExam(examId, validIds);
  const skipped = validIds.length - added;

  if (added === 0) {
    throw new AppError('All selected students are already assigned to this exam', 400);
  }

  await logActivity(userId, instituteId, 'STUDENTS_ASSIGNED_TO_EXAM', examId, null, {
    studentIds: validIds,
    added,
    skipped,
  });

  return { added, skipped, total: validIds.length };
};

export const removeStudentFromExam = async (
  examId: string,
  studentId: string,
  instituteId: string,
  userId: string
) => {
  await getExamById(examId, instituteId);
  await repository.removeStudentFromExam(examId, studentId);
  await logActivity(userId, instituteId, 'STUDENT_REMOVED_FROM_EXAM', examId, null, { studentId });
};

export const getExamStudents = async (examId: string, instituteId: string) => {
  await getExamById(examId, instituteId);
  return repository.getExamStudents(examId);
};

export const getExamStats = async (instituteId: string, branchId?: string | null) => {
  return repository.getExamStats(instituteId, branchId);
};
