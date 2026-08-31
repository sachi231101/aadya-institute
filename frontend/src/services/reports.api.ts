import { api } from "./api";

export interface ScheduleSummary {
  todayClasses: number;
  upcomingClasses: number;
  liveClasses: number;
  completedThisWeek: number;
  discontinuationRiskCount: number;
  recordingsExpiringSoon: number;
  todaySessions: Array<{
    id: string;
    title: string | null;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    sessionStatus: string | null;
    batchName: string | null;
    facultyName: string | null;
  }>;
}

export interface StudentReportData {
  summary: {
    totalStudents: number;
    avgAttendanceRate: number;
    assignmentCompletionRate: number;
    discontinuationRiskCount: number;
  };
  enrollmentTrend: { month: string; students: number }[];
  attendanceDistribution: { range: string; count: number; color: string }[];
  courseShare: { name: string; value: number; color: string }[];
  students: {
    id: string;
    studentCode: string;
    name: string;
    branchId?: string;
    branchName: string;
    courseName: string;
    attendancePercentage: number;
    assignmentsSubmitted: number;
    totalAssignments: number;
    riskFlag: "Normal" | "At Risk" | "Triggered";
  }[];
}

export interface FacultyReportData {
  summary: {
    totalActiveFaculty: number;
    avgStudentRating: number;
    monthlyTeachingHours: number;
    sessionCompliancePercentage: number;
  };
  workload: { name: string; hours: number; batches: number }[];
  ratingDistribution: { rating: string; count: number; color: string }[];
  faculty: {
    id: string;
    facultyCode: string;
    name: string;
    specialization: string;
    assignedBatchesCount: number;
    teachingHours: number;
    avgRating: number;
    status: string;
  }[];
}

export interface CourseReportData {
  summary: {
    totalCourses: number;
    activeBatches: number;
    avgBatchOccupancy: number;
    totalModules: number;
  };
  enrollmentComparison: { course: string; students: number; capacity: number }[];
  structureOverview: { status: string; count: number; color: string }[];
  courses: {
    id: string;
    code: string;
    name: string;
    category: string;
    durationMonths: number;
    modulesCount: number;
    enrolledStudents: number;
    batchesCount: number;
    status: string;
  }[];
}

export interface RecentPaymentData {
  id: string;
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}

export interface FinancialReportData {
  summary: {
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    projectedRevenue: number;
  };
  monthlyTrend: { month: string; collected: number; pending: number }[];
  paymentMethodShare: { name: string; value: number; color: string }[];
  monthlyBreakdown: { month: string; collected: number; pending: number }[];
  recentPayments?: RecentPaymentData[];
}

export const reportsApi = {
  getStudentReport: async (branchId?: string): Promise<StudentReportData> => {
    const response = await api.get("/reports/students", { params: { branchId } });
    return response.data.data;
  },

  getFacultyReport: async (branchId?: string): Promise<FacultyReportData> => {
    const response = await api.get("/reports/faculty", { params: { branchId } });
    return response.data.data;
  },

  getCourseReport: async (): Promise<CourseReportData> => {
    const response = await api.get("/reports/courses");
    return response.data.data;
  },

  getFinancialReport: async (branchId?: string): Promise<FinancialReportData> => {
    const response = await api.get("/reports/financial", { params: { branchId } });
    return response.data.data;
  },

  getScheduleSummary: async (branchId?: string): Promise<ScheduleSummary> => {
    const response = await api.get<{ success: boolean; data: ScheduleSummary }>(
      "/reports/schedule/summary",
      { params: branchId ? { branchId } : undefined }
    );
    return response.data.data;
  },
};
