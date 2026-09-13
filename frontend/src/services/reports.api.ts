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
    coursePackage?: string;
    courses?: Array<{ id: string; name: string; code?: string }>;
    enquiryDate?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    counsellorName?: string | null;
    attendancePercentage: number;
    assignmentsSubmitted: number;
    totalAssignments: number;
    riskFlag: "Normal" | "At Risk" | "Triggered";
  }[];
}

export interface FacultyReportParams {
  branchId?: string;
  status?: string;
}

export interface FacultyAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
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
    employeeCode: string;
    name: string;
    branchName: string;
    specialization: string;
    assignedBatchesCount: number;
    totalStudents: number;
    avgStudentAttendancePct: number;
    facultyAttendancePct: number;
    teachingHours: number;
    workloadHoursPerWeek: number;
    avgRating: number;
    status: string;
  }[];
  needsAttention?: {
    lowRating: FacultyAttentionItem[];
    lowAttendance: FacultyAttentionItem[];
    unassigned: FacultyAttentionItem[];
  };
}

export interface CourseReportParams {
  branchId?: string;
  status?: string;
  category?: string;
}

export interface CourseAttentionItem {
  id: string;
  label: string;
  meta?: string | null;
  count?: number;
}

export interface CourseReportData {
  summary: {
    totalCourses: number;
    activeBatches: number;
    avgBatchOccupancy: number;
    totalModules: number;
    totalEnrolledStudents?: number;
  };
  enrollmentComparison: {
    course: string;
    students: number;
    capacity: number;
    available?: number;
    occupancyPct?: number;
  }[];
  categoryBreakdown?: { category: string; count: number; color: string }[];
  /** @deprecated Prefer categoryBreakdown */
  structureOverview?: { status: string; count: number; color: string }[];
  courses: {
    id: string;
    code: string;
    name: string;
    category: string;
    durationMonths: number;
    modulesCount: number;
    enrolledStudents: number;
    capacity?: number;
    availableSeats?: number;
    occupancyPct?: number;
    batchesCount: number;
    activeBatchesCount?: number;
    status: string;
  }[];
  needsAttention?: {
    noModules: CourseAttentionItem[];
    zeroEnrollment: CourseAttentionItem[];
    overCapacity: CourseAttentionItem[];
  };
}

export interface AdmissionsReportParams {
  branchId?: string;
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  batchId?: string;
  status?: string;
  counsellorId?: string;
  leadSource?: string;
}

export interface AdmissionReportBreakdown {
  name?: string;
  count: number;
}

export interface AdmissionAttentionItem {
  id: string;
  label: string;
  meta?: string | null;
  count?: number;
}

export interface AdmissionsReportData {
  summary: {
    totalAdmissions: number;
    confirmedAdmissions: number;
    provisionalAdmissions: number;
    cancelledAdmissions: number;
    conversionRate: number;
  };
  monthlyTrend: { month: string; admissions: number }[];
  yearlyTrend: { year: string; admissions: number }[];
  courseBreakdown: { courseName: string; count: number }[];
  branchBreakdown: { branchName: string; count: number }[];
  counsellorBreakdown: Array<
    AdmissionReportBreakdown & { counsellorId?: string; counsellorName?: string }
  >;
  leadSourceBreakdown: Array<
    AdmissionReportBreakdown & { leadSource?: string; source?: string }
  >;
  batchBreakdown: Array<{
    batchId?: string;
    batchName: string;
    capacity: number;
    occupied: number;
    available: number;
    count: number;
  }>;
  funnel: Array<{ stage: string; count: number }>;
  recentAdmissions: Array<{
    id: string;
    admissionNo: string;
    studentId?: string;
    studentName: string;
    courseName: string;
    courses?: Array<{ id: string; name: string; code?: string }>;
    branchName: string;
    batchName?: string | null;
    counsellorName?: string | null;
    leadSource?: string | null;
    status: string;
    admissionDate: string;
    createdAt: string;
  }>;
  needsAttention: {
    provisional: AdmissionAttentionItem[];
    pendingFees: AdmissionAttentionItem[];
    missingDocuments: AdmissionAttentionItem[];
    unallocatedBatches: AdmissionAttentionItem[];
  };
}

export interface AttendanceReportParams {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  batchId?: string;
  facultyId?: string;
  sessionType?: string;
}

export interface AttendanceAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
}

export interface AttendanceStudentRow {
  id: string;
  studentCode: string;
  name: string;
  branchName: string;
  courseName: string;
  batchName: string;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  totalRecords: number;
  consecutiveTheoryAbsences: number;
  riskFlag: "Normal" | "At Risk" | "Triggered";
}

export interface AttendanceReportData {
  summary: {
    totalSessions: number;
    avgAttendanceRate: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    atRiskStudents: number;
    discontinuationRiskCount: number;
  };
  statusDistribution: Array<{ status: string; count: number; color: string }>;
  monthlyTrend: Array<{ month: string; attendanceRate: number }>;
  branchBreakdown: Array<{
    branchName: string;
    attendanceRate: number;
    sessions: number;
    presentCount: number;
    absentCount: number;
  }>;
  courseBreakdown: Array<{ courseName: string; attendanceRate: number; sessions: number }>;
  batchBreakdown: Array<{ batchName: string; attendanceRate: number; sessions: number }>;
  facultyBreakdown: Array<{ facultyName: string; attendanceRate: number; sessions: number }>;
  students: AttendanceStudentRow[];
  needsAttention: {
    consecutiveAbsences: AttendanceAttentionItem[];
    lowAttendance: AttendanceAttentionItem[];
    unmarkedSessions: AttendanceAttentionItem[];
  };
}

export interface ExaminationsReportParams {
  branchId?: string;
  status?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExaminationAttentionItem {
  id: string;
  label: string;
  meta?: string | null;
  count?: number;
}

export interface ExaminationsReportData {
  summary: {
    totalExams: number;
    publishedExams: number;
    totalAttempts: number;
    avgScore: number;
    passRate: number;
  };
  examBreakdown: Array<{
    id: string;
    title: string;
    status: string;
    courseName?: string | null;
    branchName?: string | null;
    attempts: number;
    avgScore: number;
    passRate: number;
    startAt?: string | null;
  }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  courseBreakdown?: Array<{
    courseName: string;
    exams: number;
    attempts: number;
    avgScore: number;
    passRate: number;
  }>;
  studentResults?: Array<{
    attemptId: string;
    examId: string;
    examName: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    email: string | null;
    branchName?: string | null;
    attemptNumber: number;
    status: string;
    score: number | null;
    totalMarks: number | null;
    percentage: number | null;
    passed: boolean | null;
    submittedAt: string | null;
    startedAt: string | null;
  }>;
  needsAttention?: {
    lowPassRate: ExaminationAttentionItem[];
    zeroAttempts: ExaminationAttentionItem[];
    pendingEvaluation: ExaminationAttentionItem[];
  };
  filterOptions?: {
    courses: Array<{ id: string; name: string; code?: string }>;
  };
}

export interface FinancialReportParams {
  branchId?: string;
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  batchId?: string;
  studentId?: string;
  feeHeadMasterId?: string;
  paymentModeMasterId?: string;
  paymentStatus?: string;
  counsellorId?: string;
  transactionType?: string;
  outstandingFilter?: string;
  trendGranularity?: "monthly" | "yearly" | "quarterly";
}

export interface FinancialAttentionItem {
  id: string;
  label: string;
  meta?: string | null;
  count?: number;
  amount?: number;
}

export interface RecentPaymentData {
  id: string;
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  courseName: string;
  branchName?: string | null;
  feeHead?: string | null;
  amount: number;
  date: string;
  method: string;
  gateway?: string | null;
  transactionRef?: string | null;
  status: string;
  collectedBy?: string | null;
  studentId?: string | null;
  admissionId?: string | null;
  receiptPdfUrl?: string | null;
}

export interface FinancialReportData {
  summary: {
    totalFeeDemand?: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    totalConcession?: number;
    totalRefunds?: number;
    netRevenue?: number;
    projectedRevenue: number;
    voidedAmount?: number;
    failedAmount?: number;
  };
  monthlyTrend: Array<{
    month: string;
    collected: number;
    pending: number;
    demand?: number;
    refunds?: number;
    concession?: number;
    netCollection?: number;
    collectionRate?: number;
  }>;
  yearlyTrend?: Array<{
    year: string;
    collected: number;
    demand: number;
    pending: number;
    collectionRate: number;
    growthPct: number | null;
  }>;
  paymentMethodShare: Array<{
    name: string;
    value: number;
    color: string;
    count?: number;
    percentage?: number;
    channel?: string;
  }>;
  channelShare?: Array<{ channel: string; amount: number; count: number; percentage: number }>;
  monthlyBreakdown: Array<{
    month: string;
    collected: number;
    pending: number;
    demand?: number;
    refunds?: number;
    concession?: number;
    netCollection?: number;
    collectionRate?: number;
  }>;
  dailyCollection?: Array<{
    date: string;
    transactions: number;
    collected: number;
    refunds: number;
    netCollection: number;
  }>;
  feeHeadBreakdown?: Array<{
    feeHeadMasterId: string;
    feeHead: string;
    demand: number;
    collected: number;
    pending: number;
  }>;
  branchBreakdown?: Array<{
    branchId: string;
    branchName?: string;
    demand?: number;
    collected: number;
    pending: number;
    collectionRate?: number;
  }>;
  courseBreakdown?: Array<{
    courseId: string | null;
    courseName: string;
    students: number;
    demand: number;
    collected: number;
    pending: number;
    concession: number;
    collectionRate: number;
  }>;
  batchBreakdown?: Array<{
    batchId: string | null;
    batchName: string;
    students: number;
    demand: number;
    collected: number;
    pending: number;
    collectionRate: number;
  }>;
  outstandingStudents?: Array<{
    id: string;
    studentId: string | null;
    studentName: string;
    admissionNo: string;
    courseName: string;
    batchName: string | null;
    totalFee: number;
    paid: number;
    pending: number;
    dueDate: string;
    status: string;
    overdueDays: number;
  }>;
  agingBuckets?: Array<{ bucket: string; amount: number; count: number }>;
  concessionBreakdown?: {
    total: number;
    byHead: Array<{ head: string; amount: number }>;
    byBranch: Array<{ branchName: string; amount: number }>;
    byCourse: Array<{ courseName: string; amount: number }>;
    byStudent: Array<{ studentName: string; admissionNo: string; amount: number }>;
  };
  refundReport?: {
    totalRefunds: number;
    refundCount: number;
    items: Array<Record<string, unknown>>;
    note: string;
  };
  reconciliation?: {
    gatewayAmount: number;
    erpAmount: number;
    matched: number;
    unmatched: number;
    failed: number;
    pending: number;
    voided: number;
    note: string;
  };
  recentPayments?: RecentPaymentData[];
  needsAttention?: {
    overdueFees: FinancialAttentionItem[];
    highOutstanding: FinancialAttentionItem[];
    failedPayments: FinancialAttentionItem[];
    voidedPayments: FinancialAttentionItem[];
    partiallyPaid: FinancialAttentionItem[];
    unreconciled: FinancialAttentionItem[];
    refundsAwaiting: FinancialAttentionItem[];
    expiredLinks: FinancialAttentionItem[];
  };
  filterOptions?: {
    courses: Array<{ id: string; name: string; code?: string }>;
    batches: Array<{ id: string; name: string }>;
    feeHeads: Array<{ id: string; name: string }>;
    paymentModes: Array<{ id: string; name: string }>;
    counsellors: Array<{ id: string; name: string }>;
    academicYears: Array<{ id: string; name: string }>;
  };
}

export const reportsApi = {
  getStudentReport: async (branchId?: string): Promise<StudentReportData> => {
    const response = await api.get("/reports/students", { params: { branchId } });
    return response.data.data;
  },

  getFacultyReport: async (
    branchIdOrParams?: string | FacultyReportParams
  ): Promise<FacultyReportData> => {
    const params: FacultyReportParams =
      typeof branchIdOrParams === "string"
        ? { branchId: branchIdOrParams }
        : branchIdOrParams || {};
    const response = await api.get("/reports/faculty", { params });
    return response.data.data;
  },

  getCourseReport: async (
    params: CourseReportParams = {}
  ): Promise<CourseReportData> => {
    const response = await api.get("/reports/courses", { params });
    return response.data.data;
  },

  getFinancialReport: async (
    branchIdOrParams?: string | FinancialReportParams
  ): Promise<FinancialReportData> => {
    const params: FinancialReportParams =
      typeof branchIdOrParams === "string"
        ? { branchId: branchIdOrParams }
        : branchIdOrParams || {};
    const response = await api.get("/reports/financial", { params });
    return response.data.data;
  },

  getScheduleSummary: async (branchId?: string): Promise<ScheduleSummary> => {
    const response = await api.get<{ success: boolean; data: ScheduleSummary }>(
      "/reports/schedule/summary",
      { params: branchId ? { branchId } : undefined }
    );
    return response.data.data;
  },

  getAdmissionsReport: async (
    params: AdmissionsReportParams = {}
  ): Promise<AdmissionsReportData> => {
    const response = await api.get("/reports/admissions", { params });
    return response.data.data;
  },

  getAttendanceReport: async (
    params: AttendanceReportParams = {}
  ): Promise<AttendanceReportData> => {
    const response = await api.get("/reports/attendance", { params });
    return response.data.data;
  },

  getExaminationsReport: async (
    branchIdOrParams?: string | ExaminationsReportParams
  ): Promise<ExaminationsReportData> => {
    const params: ExaminationsReportParams =
      typeof branchIdOrParams === "string"
        ? { branchId: branchIdOrParams }
        : branchIdOrParams || {};
    const response = await api.get("/reports/examinations", { params });
    return response.data.data;
  },
};
