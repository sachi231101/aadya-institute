import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./faculty.repository";
import type { CreateFacultyDto, UpdateFacultyDto, ListFacultyQuery } from "./faculty.validation";

/**
 * List faculty with pagination, search, and optional branch isolation.
 */
export const getAllFaculty = async (
  currentUser: AuthUser,
  query: ListFacultyQuery
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  // Use branch-isolation scope rule: ADMIN sees all unless query.branchId is set
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const params: repo.FindAllFacultyParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
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

// ─── Faculty Course Assignments ─────────────────────────────────────────

/**
 * List batches assigned to faculty members (course assignment view).
 */
export const getAllFacultyCourses = async (
  currentUser: AuthUser,
  query: { page?: number; limit?: number; facultyId?: string; branchId?: string }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const params: repo.FindFacultyCoursesParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    facultyId: query.facultyId || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findFacultyCourses(params),
    repo.countFacultyCourses({
      instituteId: params.instituteId,
      branchId: params.branchId,
      facultyId: params.facultyId,
    }),
  ]);

  const meta = buildMeta(total, page, limit);
  return { data, meta };
};

/**
 * Assign a faculty member to a batch.
 */
export const assignFacultyToBatch = async (batchId: string, facultyId: string) => {
  // Verify the faculty member exists
  await getFacultyById(facultyId);
  return repo.assignFacultyToBatch(batchId, facultyId);
};

// ─── Faculty Attendance ─────────────────────────────────────────────────

/**
 * List faculty attendance records.
 */
export const getAllFacultyAttendance = async (
  currentUser: AuthUser,
  query: { page?: number; limit?: number; facultyId?: string; branchId?: string; date?: string }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const params: repo.FindFacultyAttendanceParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    facultyId: query.facultyId || undefined,
    date: query.date || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findFacultyAttendance(params),
    repo.countFacultyAttendance({
      instituteId: params.instituteId,
      branchId: params.branchId,
      facultyId: params.facultyId,
      date: params.date,
    }),
  ]);

  const meta = buildMeta(total, page, limit);
  return { data, meta };
};

/**
 * Log (upsert) a faculty attendance record.
 */
export const logFacultyAttendance = async (data: {
  facultyId: string;
  classSessionId: string;
  loginAt?: string;
  logoutAt?: string;
}) => {
  // Verify faculty exists
  await getFacultyById(data.facultyId);

  return repo.upsertFacultyAttendance({
    facultyId: data.facultyId,
    classSessionId: data.classSessionId,
    loginAt: data.loginAt ? new Date(data.loginAt) : undefined,
    logoutAt: data.logoutAt ? new Date(data.logoutAt) : undefined,
  });
};

