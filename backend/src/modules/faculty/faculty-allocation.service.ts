import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./faculty.repository";

export const assignFacultyToBatch = async (
  currentUser: AuthUser,
  batchId: string,
  facultyId: string
) => {
  const faculty = await repo.findFacultyById(facultyId);
  if (!faculty || faculty.instituteId !== currentUser.instituteId) {
    throw new AppError("Faculty not found", 404);
  }
  if (faculty.status !== "ACTIVE") {
    throw new AppError("Only ACTIVE faculty can be assigned to a batch", 400);
  }

  if (
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    faculty.branchId !== currentUser.branchId
  ) {
    throw new AppError("Faculty not found", 404);
  }

  const batch = await repo.findBatchForAssign(batchId, currentUser.instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  if (
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    batch.branchId !== currentUser.branchId
  ) {
    throw new AppError("Batch not found", 404);
  }

  return repo.assignFacultyToBatch(batchId, facultyId);
};
