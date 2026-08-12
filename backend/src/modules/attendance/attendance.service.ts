import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./attendance.repository";
import type { RosterQuery, MarkAttendanceDto, BulkMarkAttendanceDto } from "./attendance.validation";

/**
 * Get daily attendance roster - list of all active students in the branch with their attendance status for the specified date.
 */
export const getRoster = async (
  currentUser: AuthUser,
  query: RosterQuery
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;

  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const { roster, total } = await repo.findDailyStudentRoster({
    date: query.date,
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    skip,
    take: limit,
  });

  const meta = buildMeta(total, page, limit);
  return { data: roster, meta };
};

/**
 * Mark attendance for a single student in a class session.
 */
export const markAttendance = async (
  dto: MarkAttendanceDto,
  markedBy?: string
) => {
  return repo.upsertStudentAttendance({
    classSessionId: dto.classSessionId,
    studentId: dto.studentId,
    status: dto.status,
    markedBy,
    remarks: dto.remarks,
  });
};

/**
 * Mark attendance for multiple students at once.
 */
export const bulkMarkAttendance = async (
  dto: BulkMarkAttendanceDto,
  markedBy?: string
) => {
  const entries = dto.entries.map((e) => ({
    classSessionId: e.classSessionId || dto.classSessionId!,
    studentId: e.studentId,
    status: e.status,
    remarks: e.remarks,
  }));

  return repo.bulkUpsertStudentAttendance(entries, markedBy);
};

/**
 * Get attendance records for a specific class session.
 */
export const getSessionAttendance = async (classSessionId: string) => {
  return repo.findAttendanceBySession(classSessionId);
};
