// ─── Student (aligned with Prisma Student + User + Branch) ──────────────

export type StudentStatus = "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";

export interface StudentUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  whatsappEnabled?: boolean;
}

export interface StudentBranch {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export interface StudentGuardian {
  name?: string;
  relation?: string;
  phone?: string;
  email?: string;
}

export interface StudentAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface StudentFeeSummary {
  totalFee: number;
  discount: number;
  finalFee: number;
  amountPaid: number;
  dueAmount: number;
  feePlan: "FULL_PAYMENT" | "INSTALLMENT";
  status: "Paid" | "Pending" | "Overdue";
  nextDueDate?: string;
}

export interface StudentAttendanceSummary {
  overallPercentage: number;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  consecutiveAbsences: number;
  isDiscontinuationRisk: boolean;
}

export interface StudentAICallLog {
  id: string;
  date: string;
  durationSeconds: number;
  status: "ANSWERED" | "NO_ANSWER" | "CALLBACK_REQUESTED" | "BUSY" | "FAILED";
  intent: "HIGH_INTEREST" | "NEUTRAL" | "NOT_INTERESTED" | "QUERY";
  summary: string;
  transcriptSnippet?: string;
}

export interface StudentWhatsAppLog {
  id: string;
  timestamp: string;
  type: "CLASS_REMINDER" | "FEE_REMINDER" | "ABSENCE_ALERT" | "GENERAL";
  message: string;
  status: "DELIVERED" | "READ" | "FAILED";
}

export interface Student {
  id: string;
  userId: string | null;
  instituteId: string;
  branchId: string;
  studentCode: string;
  dateOfBirth: string | null;
  qualification: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  user: StudentUser | null;
  branch: StudentBranch;

  // Extended optional attributes for rich UI presentation
  gender?: "Male" | "Female" | "Other" | string;
  bloodGroup?: string;
  emergencyContact?: string;
  guardian?: StudentGuardian;
  address?: StudentAddress;
  leadSource?: string;
  counsellorName?: string;
  courseName?: string;
  batchName?: string;
  batchTiming?: string;
  facultyName?: string;
  fees?: StudentFeeSummary;
  attendance?: StudentAttendanceSummary;
  recentAICalls?: StudentAICallLog[];
  recentWhatsAppLogs?: StudentWhatsAppLog[];
}

// ─── Student with details (from getById) ────────────────────────────────

export interface StudentAdmission {
  id: string;
  courseId: string;
  admissionDate: string;
  status: string;
  feePlan?: string;
  notes?: string;
  course: { id: string; name: string; code: string };
}

export interface StudentBatchEnrollment {
  id: string;
  batchId: string;
  status: string;
  joinedAt: string;
  batch: {
    id: string;
    name: string;
    code: string;
    status: string;
    timeSlot?: string;
    schedulePattern?: string;
    faculty?: { id: string; user?: { name: string } };
    course: { id: string; name: string; code: string };
  };
}

export interface StudentAttendanceRecord {
  id: string;
  status: "PRESENT" | "ABSENT" | "LEAVE";
  markedAt: string;
  remarks?: string;
  classSession: {
    id: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    title?: string;
  };
}

export interface StudentAssignmentItem {
  id: string;
  title: string;
  dueDate: string | null;
  submittedAt: string | null;
  marks: number | null;
  feedback: string | null;
  status: "PENDING" | "SUBMITTED" | "GRADED";
}

export interface StudentPaymentRecord {
  id: string;
  receiptNo: string;
  amount: number;
  date: string;
  method: "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE";
  status: "SUCCESS" | "PENDING" | "FAILED";
  transactionRef?: string;
}

export interface StudentDetail extends Student {
  admissions: StudentAdmission[];
  batchEnrollments: StudentBatchEnrollment[];
  attendanceRecords?: StudentAttendanceRecord[];
  assignments?: StudentAssignmentItem[];
  payments?: StudentPaymentRecord[];
  pendingFees?: Array<{
    id: string;
    totalFee: number;
    amountPaid: number;
    dueAmount: number;
    dueDate: string;
    installmentNo: number;
    status: string;
  }>;
  courseModules?: Array<{ name: string; status: string }>;
}

// ─── Student Performance Metrics ────────────────────────────────────────

export interface TestScore {
  testName: string;
  score: number;
  maxScore: number;
}

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  batchName: string;
  batchCode: string;
  completionPercentage: number;
  totalModules: number;
  completedModules: number;
}

export interface StudentPerformanceMetrics {
  studentId: string;
  overallAttendancePercent: number;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  testScores: TestScore[];
  enrolledCourses: EnrolledCourse[];
  discontinuationAlert: boolean;
  maxConsecutiveAbsences: number;
}

// ─── API Payloads (Strictly matching Backend Validation) ────────────────

export interface CreateStudentPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  studentCode?: string;
  dateOfBirth?: string;
  qualification?: string;
  qualificationMasterId?: string;
  areaMasterId?: string;
  branchId: string;

  // Extended UI fields for progressive enhancement
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  courseId?: string;
  batchId?: string;
  totalFee?: number;
  feePlan?: string;
}

export interface UpdateStudentPayload {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  qualification?: string;
  qualificationMasterId?: string;
  areaMasterId?: string;
  status?: StudentStatus | "DRAFT";

  // Extended UI fields
  gender?: string;
  bloodGroup?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  branchId?: string;

  // Admission & Batch fields
  courseId?: string;
  batchId?: string;
  admissionStatus?: "CONFIRMED" | "PROVISIONAL" | "CANCELLED" | "PENDING" | "ACTIVE" | "COMPLETED";
  feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
  totalFee?: number;
  downPayment?: number;
  notes?: string;
}

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: StudentStatus;
}

// ─── Paginated Response ─────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
