import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/reports.api";
import { useAuthStore } from "@/store/auth.store";
import { getScopedBranchId } from "@/utils/branch-scope.util";
import type {
  StudentReportData,
  FacultyReportData,
  CourseReportData,
  FinancialReportData,
  AdmissionsReportData,
  AttendanceReportData,
  ExaminationsReportData,
} from "../services/reports.api";

export const useStudentReport = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<StudentReportData>({
    queryKey: ["reports", "students", scopedBranchId],
    queryFn: () => reportsApi.getStudentReport(scopedBranchId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFacultyReport = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<FacultyReportData>({
    queryKey: ["reports", "faculty", scopedBranchId],
    queryFn: () => reportsApi.getFacultyReport(scopedBranchId),
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
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<FinancialReportData>({
    queryKey: ["reports", "financial", scopedBranchId],
    queryFn: () => reportsApi.getFinancialReport(scopedBranchId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAdmissionsReport = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<AdmissionsReportData>({
    queryKey: ["reports", "admissions", scopedBranchId],
    queryFn: () => reportsApi.getAdmissionsReport(scopedBranchId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAttendanceReport = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<AttendanceReportData>({
    queryKey: ["reports", "attendance", scopedBranchId],
    queryFn: () => reportsApi.getAttendanceReport(scopedBranchId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useExaminationsReport = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery<ExaminationsReportData>({
    queryKey: ["reports", "examinations", scopedBranchId],
    queryFn: () => reportsApi.getExaminationsReport(scopedBranchId),
    staleTime: 1000 * 60 * 5,
  });
};
