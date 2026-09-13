import {
  ReportRepository,
  type StudentReportBranchScope,
} from "./report.repository";
import { getDiscontinuationRisk } from "../attendance/attendance.service";
import type { AuthUser } from "../auth/auth.types";
import type {
  StudentReportResponse,
  FacultyReportResponse,
  FacultyReportFilters,
  CourseReportResponse,
  CourseReportFilters,
  FinancialReportResponse,
  ScheduleSummaryResponse,
  AdmissionsReportResponse,
  AdmissionsReportFilters,
  AttendanceReportResponse,
  AttendanceReportFilters,
  ExaminationsReportResponse,
  ExaminationsReportFilters,
  FinancialReportFilters,
} from "./report.types";

export class ReportService {
  /**
   * Get Student Analytics & Performance Reports
   */
  static async getStudentReport(
    instituteId: string,
    branchScope?: string | StudentReportBranchScope
  ): Promise<StudentReportResponse> {
    const scope =
      typeof branchScope === "string" ? { branchId: branchScope } : branchScope;
    return ReportRepository.getStudentReportData(instituteId, scope);
  }

  /**
   * Get Faculty Workload & Rating Reports
   */
  static async getFacultyReport(
    instituteId: string,
    branchScope?: string | FacultyReportFilters
  ): Promise<FacultyReportResponse> {
    const filters: FacultyReportFilters =
      typeof branchScope === "string" ? { branchId: branchScope } : branchScope || {};
    return ReportRepository.getFacultyReportData(instituteId, filters);
  }

  /**
   * Get Course & Curriculum Analytics Reports
   */
  static async getCourseReport(
    instituteId: string,
    filters: CourseReportFilters = {}
  ): Promise<CourseReportResponse> {
    return ReportRepository.getCourseReportData(instituteId, filters);
  }

  /**
   * Get Financial & Revenue Reports
   */
  static async getFinancialReport(
    instituteId: string,
    filters: FinancialReportFilters | string = {}
  ): Promise<FinancialReportResponse> {
    const resolved: FinancialReportFilters =
      typeof filters === "string" ? { branchId: filters } : filters || {};
    return ReportRepository.getFinancialReportData(instituteId, resolved);
  }

  static async getScheduleSummary(
    currentUser: AuthUser,
    branchId?: string
  ): Promise<ScheduleSummaryResponse> {
    const summary = await ReportRepository.getScheduleSummaryData(currentUser.instituteId, branchId);
    const risks = await getDiscontinuationRisk(currentUser, { branchId });
    return {
      ...summary,
      discontinuationRiskCount: risks.length,
    };
  }

  static async getAdmissionsReport(
    instituteId: string,
    filters: AdmissionsReportFilters = {}
  ): Promise<AdmissionsReportResponse> {
    return ReportRepository.getAdmissionsReportData(instituteId, filters);
  }

  static async getAttendanceReport(
    instituteId: string,
    filters: AttendanceReportFilters = {}
  ): Promise<AttendanceReportResponse> {
    return ReportRepository.getAttendanceReportData(instituteId, filters);
  }

  static async getExaminationsReport(
    instituteId: string,
    filters: ExaminationsReportFilters | string = {}
  ): Promise<ExaminationsReportResponse> {
    const resolved: ExaminationsReportFilters =
      typeof filters === "string" ? { branchId: filters } : filters || {};
    return ReportRepository.getExaminationsReportData(instituteId, resolved);
  }
}
