import * as repository from "./batch.repository";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters } from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";

export const getBatches = async (instituteId: string, branchId?: string, filters: BatchQueryFilters = {}) => {
  return repository.findAllBatches(instituteId, branchId, filters);
};

export const getBatchById = async (id: string, instituteId: string) => {
  const batch = await repository.findBatchById(id, instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  return batch;
};

export const createBatch = async (instituteId: string, defaultBranchId: string, data: CreateBatchDto) => {
  const existing = await repository.findAllBatches(instituteId, undefined, { search: data.code });
  if (existing.some((b) => b.code.toLowerCase() === data.code.toLowerCase())) {
    throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
  }
  return repository.createBatch(instituteId, defaultBranchId, data);
};

export const updateBatch = async (id: string, instituteId: string, data: UpdateBatchDto) => {
  await getBatchById(id, instituteId);
  return repository.updateBatch(id, instituteId, data);
};

export const assignFaculty = async (id: string, instituteId: string, facultyId: string) => {
  await getBatchById(id, instituteId);
  return repository.assignFacultyToBatch(id, instituteId, facultyId);
};

export const enrollStudent = async (batchId: string, instituteId: string, studentId: string, admissionId?: string) => {
  await getBatchById(batchId, instituteId);
  return repository.enrollStudentInBatch(batchId, studentId, admissionId);
};

export const removeStudent = async (batchId: string, instituteId: string, studentId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.removeStudentFromBatch(batchId, studentId);
};

export const getBatchStudents = async (batchId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.getBatchStudents(batchId);
};

export const deleteBatch = async (id: string, instituteId: string) => {
  await getBatchById(id, instituteId);
  return repository.deleteBatch(id, instituteId);
};
