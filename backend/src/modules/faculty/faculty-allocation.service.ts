import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./faculty.repository";
import { assertCourseAvailableForBranch } from "../../utils/course-branch.util";
import { assertBranchRecordAccess } from "../../utils/branch-isolation.util";

export const assignFacultyToBatch = async (
  currentUser: AuthUser,
  batchId: string,
  facultyId: string,
  courseId?: string
) => {
  const faculty = await repo.findFacultyById(facultyId);
  if (!faculty || faculty.instituteId !== currentUser.instituteId) {
    throw new AppError("Faculty not found", 404);
  }
  if (faculty.status !== "ACTIVE") {
    throw new AppError("Only ACTIVE faculty can be assigned to a batch", 400);
  }

  assertBranchRecordAccess(currentUser, faculty.branchId, "Faculty not found");

  const batch = await repo.findBatchForAssign(batchId, currentUser.instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");

  const subjectCourseId = courseId || batch.courseId;
  const subjectOnBatch =
    batch.batchCourses?.some((bc) => bc.courseId === subjectCourseId) ||
    batch.courseId === subjectCourseId;

  if (!subjectOnBatch) {
    throw new AppError("Selected subject is not part of this batch", 400);
  }

  await assertCourseAvailableForBranch(
    currentUser.instituteId,
    subjectCourseId,
    batch.branchId,
    { requireActive: true }
  );

  return repo.assignFacultyToBatchSubject(batchId, facultyId, subjectCourseId);
};
