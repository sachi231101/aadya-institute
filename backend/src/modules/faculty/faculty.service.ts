import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import * as repo from "./faculty.repository";
import type { CreateFacultyDto, UpdateFacultyDto, ListFacultyQuery } from "./faculty.validation";

/**
 * List faculty with pagination, search, and optional branch isolation.
 */
export const getAllFaculty = async (
  instituteId: string,
  userBranchId: string | null | undefined,
  query: ListFacultyQuery
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  // Branch isolation: if user has a branchId, restrict to that branch
  const branchId = userBranchId || query.branchId || undefined;

  const params: repo.FindAllFacultyParams = {
    instituteId,
    branchId,
    search: query.search || undefined,
    status: query.status || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findAllFaculty(params),
    repo.countFaculty({
      instituteId: params.instituteId,
      branchId: params.branchId,
      search: params.search,
      status: params.status,
    }),
  ]);

  const meta = buildMeta(total, page, limit);
  return { data, meta };
};

/**
 * Get a single faculty member by ID.
 */
export const getFacultyById = async (id: string) => {
  const faculty = await repo.findFacultyById(id);
  if (!faculty) throw new AppError("Faculty not found", 404);
  return faculty;
};

/**
 * Create a new faculty member (User + Faculty + FACULTY role).
 */
export const createFaculty = async (instituteId: string, dto: CreateFacultyDto) => {
  // Check for duplicate employee code
  const existing = await repo.findFacultyByEmployeeCode(instituteId, dto.employeeCode);
  if (existing) {
    throw new AppError(`Employee code '${dto.employeeCode}' already exists`, 409);
  }

  // Hash password for the new User
  const passwordHash = await hashPassword(dto.password);

  return repo.createFacultyWithUser({
    instituteId,
    branchId: dto.branchId,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    passwordHash,
    employeeCode: dto.employeeCode,
    specialization: dto.specialization,
  });
};

/**
 * Update a faculty member's details.
 */
export const updateFaculty = async (id: string, dto: UpdateFacultyDto) => {
  await getFacultyById(id); // throws 404 if not found
  return repo.updateFaculty(id, dto);
};

/**
 * Soft-delete a faculty member.
 */
export const deleteFaculty = async (id: string) => {
  await getFacultyById(id); // throws 404 if not found
  return repo.softDeleteFaculty(id);
};
