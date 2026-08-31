import { ReportRepository } from "./report.repository";
import { getDiscontinuationRisk } from "../attendance/attendance.service";
import type { AuthUser } from "../auth/auth.types";
import type {
  StudentReportResponse,
  FacultyReportResponse,
  CourseReportResponse,
  FinancialReportResponse,
  ScheduleSummaryResponse,
} from "./report.types";

export class ReportService {
  /**
   * Get Student Analytics & Performance Reports
   */
  static async getStudentReport(instituteId: string, branchId?: string): Promise<StudentReportResponse> {
    return ReportRepository.getStudentReportData(instituteId, branchId);
  }

  /**
   * Get Faculty Workload & Rating Reports
   */
  static async getFacultyReport(instituteId: string, branchId?: string): Promise<FacultyReportResponse> {
    return ReportRepository.getFacultyReportData(instituteId, branchId);
  }

  /**
   * Get Course & Curriculum Analytics Reports
   */
  static async getCourseReport(instituteId: string): Promise<CourseReportResponse> {
    return ReportRepository.getCourseReportData(instituteId);
  }

  /**
   * Get Financial & Revenue Reports
   */
  static async getFinancialReport(instituteId: string, branchId?: string): Promise<FinancialReportResponse> {
    return ReportRepository.getFinancialReportData(instituteId, branchId);
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
}
