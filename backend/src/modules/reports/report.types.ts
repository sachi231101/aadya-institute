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
  /** Joined admission course names (course package). */
  coursePackage: string;
  courses?: Array<{ id: string; name: string; code?: string }>;
  enquiryDate: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  counsellorName: string | null;
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
}

export interface FacultyReportFilters {
  branchId?: string;
  branchIds?: string[];
  status?: string;
}

export interface FacultyAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
}

export interface FacultyReportResponse {
  summary: FacultyReportSummary;
  workload: FacultyWorkloadItem[];
  ratingDistribution: FeedbackRatingItem[];
  faculty: FacultyPerformanceRow[];
  needsAttention: {
    lowRating: FacultyAttentionItem[];
    lowAttendance: FacultyAttentionItem[];
    unassigned: FacultyAttentionItem[];
  };
}

export interface CourseEnrollmentComparisonItem {
  course: string;
  students: number;
  capacity: number;
  available: number;
  occupancyPct: number;
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
  totalEnrolledStudents: number;
}

export interface CourseReportFilters {
  branchId?: string;
  branchIds?: string[];
  status?: string;
  category?: string;
}

export interface CourseAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
}

export interface CoursePerformanceRow {
  id: string;
  code: string;
  name: string;
  category: string;
  durationMonths: number;
  modulesCount: number;
  enrolledStudents: number;
  capacity: number;
  availableSeats: number;
  occupancyPct: number;
  batchesCount: number;
  activeBatchesCount: number;
  status: string;
}

export interface CourseReportResponse {
  summary: CourseReportSummary;
  enrollmentComparison: CourseEnrollmentComparisonItem[];
  categoryBreakdown: Array<{ category: string; count: number; color: string }>;
  /** @deprecated Prefer categoryBreakdown — kept empty for older clients */
  structureOverview: ModuleStatusItem[];
  courses: CoursePerformanceRow[];
  needsAttention: {
    noModules: CourseAttentionItem[];
    zeroEnrollment: CourseAttentionItem[];
    overCapacity: CourseAttentionItem[];
  };
}

export interface MonthlyFinancialItem {
  month: string;
  demand: number;
  collected: number;
  pending: number;
  refunds: number;
  concession: number;
  netCollection: number;
  collectionRate: number;
}

export interface PaymentMethodItem {
  name: string;
  value: number;
  color: string;
  count: number;
  percentage: number;
  channel: "ONLINE" | "OFFLINE" | "OTHER";
}

export interface FinancialReportSummary {
  totalFeeDemand: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  totalConcession: number;
  totalRefunds: number;
  netRevenue: number;
  projectedRevenue: number;
  voidedAmount: number;
  failedAmount: number;
}

export interface FinancialReportFilters {
  branchId?: string;
  branchIds?: string[];
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
  meta: string | null;
  count: number;
  amount?: number;
}

export interface RecentPaymentItem {
  id: string;
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  courseName: string;
  branchName: string | null;
  feeHead: string | null;
  amount: number;
  date: string;
  method: string;
  gateway: string | null;
  transactionRef: string | null;
  status: string;
  collectedBy: string | null;
  studentId: string | null;
  admissionId: string | null;
  receiptPdfUrl: string | null;
}

export interface FinancialBranchBreakdownItem {
  branchId: string;
  branchName: string;
  demand: number;
  collected: number;
  pending: number;
  collectionRate: number;
}

export interface FinancialReportResponse {
  summary: FinancialReportSummary;
  monthlyTrend: MonthlyFinancialItem[];
  yearlyTrend: Array<{
    year: string;
    collected: number;
    demand: number;
    pending: number;
    collectionRate: number;
    growthPct: number | null;
  }>;
  paymentMethodShare: PaymentMethodItem[];
  channelShare: Array<{ channel: string; amount: number; count: number; percentage: number }>;
  monthlyBreakdown: MonthlyFinancialItem[];
  dailyCollection: Array<{
    date: string;
    transactions: number;
    collected: number;
    refunds: number;
    netCollection: number;
  }>;
  feeHeadBreakdown: Array<{
    feeHeadMasterId: string;
    feeHead: string;
    demand: number;
    collected: number;
    pending: number;
  }>;
  branchBreakdown: FinancialBranchBreakdownItem[];
  courseBreakdown: Array<{
    courseId: string | null;
    courseName: string;
    students: number;
    demand: number;
    collected: number;
    pending: number;
    concession: number;
    collectionRate: number;
  }>;
  batchBreakdown: Array<{
    batchId: string | null;
    batchName: string;
    students: number;
    demand: number;
    collected: number;
    pending: number;
    collectionRate: number;
  }>;
  outstandingStudents: Array<{
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
  agingBuckets: Array<{ bucket: string; amount: number; count: number }>;
  concessionBreakdown: {
    total: number;
    byHead: Array<{ head: string; amount: number }>;
    byBranch: Array<{ branchName: string; amount: number }>;
    byCourse: Array<{ courseName: string; amount: number }>;
    byStudent: Array<{ studentName: string; admissionNo: string; amount: number }>;
  };
  refundReport: {
    totalRefunds: number;
    refundCount: number;
    items: Array<{
      id: string;
      date: string;
      studentName: string;
      admissionNo: string;
      amount: number;
      reason: string | null;
      paymentReference: string | null;
      approvedBy: string | null;
    }>;
    note: string;
  };
  reconciliation: {
    gatewayAmount: number;
    erpAmount: number;
    matched: number;
    unmatched: number;
    failed: number;
    pending: number;
    voided: number;
    note: string;
  };
  recentPayments: RecentPaymentItem[];
  needsAttention: {
    overdueFees: FinancialAttentionItem[];
    highOutstanding: FinancialAttentionItem[];
    failedPayments: FinancialAttentionItem[];
    voidedPayments: FinancialAttentionItem[];
    partiallyPaid: FinancialAttentionItem[];
    unreconciled: FinancialAttentionItem[];
    refundsAwaiting: FinancialAttentionItem[];
    expiredLinks: FinancialAttentionItem[];
  };
  filterOptions: {
    courses: Array<{ id: string; name: string; code?: string }>;
    batches: Array<{ id: string; name: string }>;
    feeHeads: Array<{ id: string; name: string }>;
    paymentModes: Array<{ id: string; name: string }>;
    counsellors: Array<{ id: string; name: string }>;
    academicYears: Array<{ id: string; name: string }>;
  };
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

export interface AdmissionsReportFilters {
  branchId?: string;
  branchIds?: string[];
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  batchId?: string;
  status?: string;
  counsellorId?: string;
  leadSource?: string;
}

export interface AdmissionAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
}

export interface AdmissionsReportResponse {
  summary: AdmissionsReportSummary;
  monthlyTrend: Array<{ month: string; admissions: number }>;
  yearlyTrend: Array<{ year: string; admissions: number }>;
  courseBreakdown: Array<{ courseName: string; count: number }>;
  branchBreakdown: Array<{ branchName: string; count: number }>;
  counsellorBreakdown: Array<{
    name: string;
    count: number;
    counsellorId?: string;
    counsellorName: string;
  }>;
  leadSourceBreakdown: Array<{
    name: string;
    count: number;
    leadSource: string;
    source: string;
  }>;
  batchBreakdown: Array<{
    batchId: string;
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
    courses: Array<{ id: string; name: string; code?: string }>;
    branchName: string;
    batchName: string | null;
    counsellorName: string | null;
    leadSource: string | null;
    status: string;
    admissionDate: Date;
    createdAt: Date;
  }>;
  needsAttention: {
    provisional: AdmissionAttentionItem[];
    pendingFees: AdmissionAttentionItem[];
    missingDocuments: AdmissionAttentionItem[];
    unallocatedBatches: AdmissionAttentionItem[];
  };
}

export interface AttendanceReportSummary {
  totalSessions: number;
  avgAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  atRiskStudents: number;
  discontinuationRiskCount: number;
}

export interface AttendanceReportFilters {
  branchId?: string;
  branchIds?: string[];
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

export interface AttendanceReportResponse {
  summary: AttendanceReportSummary;
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

export interface ExaminationsReportSummary {
  totalExams: number;
  publishedExams: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
}

export interface ExaminationsReportFilters {
  branchId?: string;
  branchIds?: string[];
  status?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExaminationAttentionItem {
  id: string;
  label: string;
  meta: string | null;
  count: number;
}

export interface ExaminationsReportResponse {
  summary: ExaminationsReportSummary;
  examBreakdown: Array<{
    id: string;
    title: string;
    status: string;
    courseName: string | null;
    branchName: string | null;
    attempts: number;
    avgScore: number;
    passRate: number;
    startAt: string | null;
  }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  courseBreakdown: Array<{ courseName: string; exams: number; attempts: number; avgScore: number; passRate: number }>;
  studentResults: Array<{
    attemptId: string;
    examId: string;
    examName: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    email: string | null;
    branchName: string | null;
    attemptNumber: number;
    status: string;
    score: number | null;
    totalMarks: number | null;
    percentage: number | null;
    passed: boolean | null;
    submittedAt: string | null;
    startedAt: string | null;
  }>;
  needsAttention: {
    lowPassRate: ExaminationAttentionItem[];
    zeroAttempts: ExaminationAttentionItem[];
    pendingEvaluation: ExaminationAttentionItem[];
  };
  filterOptions: {
    courses: Array<{ id: string; name: string; code?: string }>;
  };
}
