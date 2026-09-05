export interface MonthlyEnrollmentTrend {
  month: string;
  students: number;
}

export interface AttendanceDistributionItem {
  range: string;
  count: number;
  color: string;
}

export interface CourseShareItem {
  name: string;
  value: number;
  color: string;
}

export interface StudentReportSummary {
  totalStudents: number;
  avgAttendanceRate: number;
  assignmentCompletionRate: number;
  discontinuationRiskCount: number;
}

export interface StudentPerformanceRow {
  id: string;
  studentCode: string;
  name: string;
  branchId?: string;
  branchName: string;
  courseName: string;
  courses?: Array<{ id: string; name: string; code?: string }>;
  attendancePercentage: number;
  assignmentsSubmitted: number;
  totalAssignments: number;
  riskFlag: "Normal" | "At Risk" | "Triggered";
}

export interface StudentReportResponse {
  summary: StudentReportSummary;
  enrollmentTrend: MonthlyEnrollmentTrend[];
  attendanceDistribution: AttendanceDistributionItem[];
  courseShare: CourseShareItem[];
  students: StudentPerformanceRow[];
}

export interface FacultyWorkloadItem {
  name: string;
  hours: number;
  batches: number;
}

export interface FeedbackRatingItem {
  rating: string;
  count: number;
  color: string;
}

export interface FacultyReportSummary {
  totalActiveFaculty: number;
  avgStudentRating: number;
  monthlyTeachingHours: number;
  sessionCompliancePercentage: number;
}

export interface FacultyPerformanceRow {
  id: string;
  facultyCode: string;
  name: string;
  specialization: string;
  assignedBatchesCount: number;
  teachingHours: number;
  avgRating: number;
  status: string;
}

export interface FacultyReportResponse {
  summary: FacultyReportSummary;
  workload: FacultyWorkloadItem[];
  ratingDistribution: FeedbackRatingItem[];
  faculty: FacultyPerformanceRow[];
}

export interface CourseEnrollmentComparisonItem {
  course: string;
  students: number;
  capacity: number;
}

export interface ModuleStatusItem {
  status: string;
  count: number;
  color: string;
}

export interface CourseReportSummary {
  totalCourses: number;
  activeBatches: number;
  avgBatchOccupancy: number;
  totalModules: number;
}

export interface CoursePerformanceRow {
  id: string;
  code: string;
  name: string;
  category: string;
  durationMonths: number;
  modulesCount: number;
  enrolledStudents: number;
  batchesCount: number;
  status: string;
}

export interface CourseReportResponse {
  summary: CourseReportSummary;
  enrollmentComparison: CourseEnrollmentComparisonItem[];
  structureOverview: ModuleStatusItem[];
  courses: CoursePerformanceRow[];
}

export interface MonthlyFinancialItem {
  month: string;
  collected: number;
  pending: number;
}

export interface PaymentMethodItem {
  name: string;
  value: number;
  color: string;
}

export interface FinancialReportSummary {
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  projectedRevenue: number;
}

export interface RecentPaymentItem {
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

export interface FinancialBranchBreakdownItem {
  branchId: string;
  collected: number;
  pending: number;
}

export interface FinancialReportResponse {
  summary: FinancialReportSummary;
  monthlyTrend: MonthlyFinancialItem[];
  paymentMethodShare: PaymentMethodItem[];
  monthlyBreakdown: MonthlyFinancialItem[];
  recentPayments: RecentPaymentItem[];
  branchBreakdown: FinancialBranchBreakdownItem[];
}

export interface ScheduleSummaryResponse {
  todayClasses: number;
  upcomingClasses: number;
  liveClasses: number;
  completedThisWeek: number;
  discontinuationRiskCount: number;
  recordingsExpiringSoon: number;
  todaySessions: Array<{
    id: string;
    title: string | null;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    sessionStatus: string | null;
    batchName: string | null;
    facultyName: string | null;
  }>;
}

export interface AdmissionsReportSummary {
  totalAdmissions: number;
  confirmedAdmissions: number;
  provisionalAdmissions: number;
  cancelledAdmissions: number;
  conversionRate: number;
}

export interface AdmissionsReportResponse {
  summary: AdmissionsReportSummary;
  monthlyTrend: Array<{ month: string; admissions: number }>;
  courseBreakdown: Array<{ courseName: string; count: number }>;
  branchBreakdown: Array<{ branchName: string; count: number }>;
  recentAdmissions: Array<{
    id: string;
    admissionNo: string;
    studentName: string;
    courseName: string;
    branchName: string;
    status: string;
    createdAt: Date;
  }>;
}

export interface AttendanceReportSummary {
  totalSessions: number;
  avgAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
}

export interface AttendanceReportResponse {
  summary: AttendanceReportSummary;
  branchBreakdown: Array<{ branchName: string; attendanceRate: number; sessions: number }>;
  monthlyTrend: Array<{ month: string; attendanceRate: number }>;
  atRiskStudents: number;
}

export interface ExaminationsReportSummary {
  totalExams: number;
  publishedExams: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
}

export interface ExaminationsReportResponse {
  summary: ExaminationsReportSummary;
  examBreakdown: Array<{
    id: string;
    title: string;
    status: string;
    attempts: number;
    avgScore: number;
    passRate: number;
  }>;
  scoreDistribution: Array<{ range: string; count: number }>;
}
