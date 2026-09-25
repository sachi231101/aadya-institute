import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/reports.api";
import { useAuthStore } from "@/store/auth.store";
import { getScopedBranchId } from "@/utils/branch-scope.util";
import type {
  StudentReportData,
  StudentReportParams,
  FacultyReportData,
  FacultyReportParams,
  CourseReportData,
  CourseReportParams,
  FinancialReportData,
  FinancialReportParams,
  AdmissionsReportData,
  AdmissionsReportParams,
  AttendanceReportData,
  AttendanceReportParams,
  ExaminationsReportData,
  ExaminationsReportParams,
} from "../services/reports.api";

export const useStudentReport = (branchIdOrParams?: string | StudentReportParams) => {
  const { user } = useAuthStore();
  const params: StudentReportParams =
    typeof branchIdOrParams === "string"
      ? { branchId: branchIdOrParams }
      : branchIdOrParams || {};
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: StudentReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<StudentReportData>({
    queryKey: ["reports", "students", scopedParams],
    queryFn: () => reportsApi.getStudentReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFacultyReport = (branchIdOrParams?: string | FacultyReportParams) => {
  const { user } = useAuthStore();
  const params: FacultyReportParams =
    typeof branchIdOrParams === "string"
      ? { branchId: branchIdOrParams }
      : branchIdOrParams || {};
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: FacultyReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<FacultyReportData>({
    queryKey: ["reports", "faculty", scopedParams],
    queryFn: () => reportsApi.getFacultyReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCourseReport = (params: CourseReportParams = {}) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: CourseReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<CourseReportData>({
    queryKey: ["reports", "courses", scopedParams],
    queryFn: () => reportsApi.getCourseReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFinancialReport = (
  branchIdOrParams?: string | FinancialReportParams
) => {
  const { user } = useAuthStore();
  const params: FinancialReportParams =
    typeof branchIdOrParams === "string"
      ? { branchId: branchIdOrParams }
      : branchIdOrParams || {};
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: FinancialReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<FinancialReportData>({
    queryKey: ["reports", "financial", scopedParams],
    queryFn: () => reportsApi.getFinancialReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAdmissionsReport = (params: AdmissionsReportParams = {}) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: AdmissionsReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<AdmissionsReportData>({
    queryKey: ["reports", "admissions", scopedParams],
    queryFn: () => reportsApi.getAdmissionsReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAttendanceReport = (params: AttendanceReportParams = {}) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: AttendanceReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<AttendanceReportData>({
    queryKey: ["reports", "attendance", scopedParams],
    queryFn: () => reportsApi.getAttendanceReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useExaminationsReport = (
  branchIdOrParams?: string | ExaminationsReportParams
) => {
  const { user } = useAuthStore();
  const params: ExaminationsReportParams =
    typeof branchIdOrParams === "string"
      ? { branchId: branchIdOrParams }
      : branchIdOrParams || {};
  const scopedBranchId = getScopedBranchId(user, params.branchId);
  const scopedParams: ExaminationsReportParams = {
    ...params,
    branchId: scopedBranchId,
  };
  return useQuery<ExaminationsReportData>({
    queryKey: ["reports", "examinations", scopedParams],
    queryFn: () => reportsApi.getExaminationsReport(scopedParams),
    staleTime: 1000 * 60 * 5,
  });
};
