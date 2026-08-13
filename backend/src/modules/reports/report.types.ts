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
  branchName: string;
  courseName: string;
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

export interface FinancialReportResponse {
  summary: FinancialReportSummary;
  monthlyTrend: MonthlyFinancialItem[];
  paymentMethodShare: PaymentMethodItem[];
  monthlyBreakdown: MonthlyFinancialItem[];
}
