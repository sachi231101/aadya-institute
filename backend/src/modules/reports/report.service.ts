import { ReportRepository } from "./report.repository";
import type {
  StudentReportResponse,
  FacultyReportResponse,
  CourseReportResponse,
  FinancialReportResponse,
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
}
