import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/reports.api";
import type {
  StudentReportData,
  FacultyReportData,
  CourseReportData,
  FinancialReportData,
} from "../services/reports.api";

export const useStudentReport = (branchId?: string) => {
  return useQuery<StudentReportData>({
    queryKey: ["reports", "students", branchId],
    queryFn: () => reportsApi.getStudentReport(branchId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useFacultyReport = (branchId?: string) => {
  return useQuery<FacultyReportData>({
    queryKey: ["reports", "faculty", branchId],
    queryFn: () => reportsApi.getFacultyReport(branchId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCourseReport = () => {
  return useQuery<CourseReportData>({
    queryKey: ["reports", "courses"],
    queryFn: () => reportsApi.getCourseReport(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFinancialReport = (branchId?: string) => {
  return useQuery<FinancialReportData>({
    queryKey: ["reports", "financial", branchId],
    queryFn: () => reportsApi.getFinancialReport(branchId),
    staleTime: 1000 * 60 * 5,
  });
};
