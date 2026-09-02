import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Target,
  UserCheck,
  GraduationCap,
  Users,
  BookOpen,
  FolderOpen,
  Calendar,
  ClipboardList,
  FileText,
  CreditCard,
  Award,
  BarChart3,
  MessageSquare,
  Briefcase,
  Building2,
  Settings,
} from "lucide-react";

export interface CenterNavSubItem {
  title: string;
  url: string;
  itemKey: string;
}

export interface CenterNavModule {
  title: string;
  url: string;
  icon: LucideIcon;
  moduleKey?: string;
  isAi?: boolean;
  items?: CenterNavSubItem[];
}

/** Center Manager sidebar — aligned with Admin ERP permission catalog order. */
export const CENTER_PORTAL_NAV: CenterNavModule[] = [
  {
    title: "Dashboard",
    url: "/center/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "ASK ME",
    url: "/center/ask-me",
    icon: Sparkles,
    isAi: true,
  },
  {
    title: "Lead Management",
    url: "/center/leads",
    icon: Bot,
    moduleKey: "leads_ai_calling",
    items: [
      { title: "All Leads", url: "/center/leads", itemKey: "leads.all" },
      { title: "New Lead", url: "/center/leads/add", itemKey: "leads.new" },
      { title: "AI Calling", url: "/center/leads/ai-calling", itemKey: "leads.ai_calling" },
      { title: "Follow-ups", url: "/center/leads/follow-ups", itemKey: "leads.followups" },
      { title: "Call History", url: "/center/leads/call-history", itemKey: "leads.call_history" },
    ],
  },
  {
    title: "Admission Management",
    url: "/center/admissions/all",
    icon: Target,
    moduleKey: "admissions",
    items: [
      { title: "Enquiries", url: "/center/admissions/enquiries", itemKey: "admissions.enquiries" },
      { title: "Applications", url: "/center/admissions/applications", itemKey: "admissions.applications" },
      { title: "Admissions", url: "/center/admissions/all", itemKey: "admissions.all" },
      { title: "Admission Documents", url: "/center/admissions/documents", itemKey: "admissions.documents" },
    ],
  },
  {
    title: "Counsellor Management",
    url: "/center/counselor/all",
    icon: UserCheck,
    moduleKey: "counsellor",
    items: [
      { title: "All Counsellors", url: "/center/counselor/all", itemKey: "counsellor.all" },
      { title: "Lead Allocation", url: "/center/counselor/overview", itemKey: "counsellor.lead_allocation" },
      { title: "Student Allocation", url: "/center/counselor/assign-students", itemKey: "counsellor.student_allocation" },
      { title: "Performance", url: "/center/performance", itemKey: "counsellor.performance" },
    ],
  },
  {
    title: "Student Management",
    url: "/center/students/all",
    icon: GraduationCap,
    moduleKey: "students",
    items: [
      { title: "All Students", url: "/center/students/all", itemKey: "students.all" },
      { title: "Student Documents", url: "/center/students/documents", itemKey: "students.documents" },
      { title: "Batch Allocation", url: "/center/students/batch-allocation", itemKey: "students.batch_allocation" },
      { title: "Attendance", url: "/center/students/attendance", itemKey: "students.attendance" },
      { title: "Performance", url: "/center/students/performance", itemKey: "students.performance" },
      { title: "Discontinuation Risk", url: "/center/students/discontinuation-risk", itemKey: "students.discontinuation" },
    ],
  },
  {
    title: "Faculty Management",
    url: "/center/faculty/all",
    icon: Users,
    moduleKey: "faculty",
    items: [
      { title: "All Faculty", url: "/center/faculty/all", itemKey: "faculty.all" },
      { title: "Course Assignment", url: "/center/faculty/courses", itemKey: "faculty.course_assignment" },
      { title: "Batch Assignment", url: "/center/faculty/batch-assignment", itemKey: "faculty.batch_assignment" },
      { title: "Attendance", url: "/center/faculty/attendance", itemKey: "faculty.attendance" },
      { title: "Performance", url: "/center/faculty/ratings", itemKey: "faculty.performance" },
    ],
  },
  {
    title: "Course Management",
    url: "/center/courses/all",
    icon: BookOpen,
    moduleKey: "courses",
    items: [
      { title: "All Courses", url: "/center/courses/all", itemKey: "courses.all" },
      { title: "Curriculum", url: "/center/courses/curriculum", itemKey: "courses.curriculum" },
      { title: "Modules", url: "/center/courses/modules", itemKey: "courses.modules" },
    ],
  },
  {
    title: "Batch Management",
    url: "/center/batches",
    icon: FolderOpen,
    moduleKey: "batches",
    items: [
      { title: "All Batches", url: "/center/batches", itemKey: "batches.all" },
      { title: "Create Batch", url: "/center/batches/create", itemKey: "batches.create" },
      { title: "Student Allocation", url: "/center/batches/student-allocation", itemKey: "batches.student_allocation" },
      { title: "Faculty Allocation", url: "/center/batches/faculty-allocation", itemKey: "batches.faculty_allocation" },
    ],
  },
  {
    title: "Class & Schedule",
    url: "/center/schedule/classes",
    icon: Calendar,
    moduleKey: "schedule",
    items: [
      { title: "Timetable", url: "/center/schedule/timetable", itemKey: "schedule.timetable" },
      { title: "Classes & Sessions", url: "/center/schedule/classes", itemKey: "schedule.classes" },
      { title: "Live Classes", url: "/center/schedule/live", itemKey: "schedule.live" },
      { title: "Recordings", url: "/center/schedule/recordings", itemKey: "schedule.recordings" },
    ],
  },
  {
    title: "Assignment Management",
    url: "/center/assignments",
    icon: ClipboardList,
    moduleKey: "assignments",
    items: [
      { title: "All Assignments", url: "/center/assignments", itemKey: "assignments.all" },
      { title: "Create Assignment", url: "/center/assignments/create", itemKey: "assignments.create" },
      { title: "Submissions", url: "/center/assignments/submissions", itemKey: "assignments.submissions" },
      { title: "Reviews", url: "/center/assignments/reviews", itemKey: "assignments.reviews" },
    ],
  },
  {
    title: "Examination Management",
    url: "/center/exams",
    icon: FileText,
    moduleKey: "examinations",
    items: [
      { title: "All Examinations", url: "/center/exams", itemKey: "exams.all" },
      { title: "Create Examination", url: "/center/exams/create", itemKey: "exams.create" },
      { title: "Question Bank", url: "/center/exams/question-bank", itemKey: "exams.question_bank" },
      { title: "Results", url: "/center/exams/results", itemKey: "exams.results" },
    ],
  },
  {
    title: "Fee Management",
    url: "/center/fees/payments",
    icon: CreditCard,
    moduleKey: "fees",
    items: [
      { title: "Fee Plans", url: "/center/fees/plans", itemKey: "fees.plans" },
      { title: "Student Fees", url: "/center/fees/student-fees", itemKey: "fees.student_fees" },
      { title: "Payments", url: "/center/fees/payments", itemKey: "fees.payments" },
      { title: "Pending Fees", url: "/center/fees/pending", itemKey: "fees.pending" },
      { title: "Receipts", url: "/center/fees/receipts", itemKey: "fees.receipts" },
      { title: "Fee Reports", url: "/center/fees/reports", itemKey: "fees.reports" },
    ],
  },
  {
    title: "Target & Incentive",
    url: "/center/targets",
    icon: Award,
    moduleKey: "targets",
    items: [
      { title: "Targets", url: "/center/targets", itemKey: "targets.all" },
      { title: "Target Assignments", url: "/center/targets/assignments", itemKey: "targets.assignments" },
      { title: "Leaderboard", url: "/center/performance", itemKey: "targets.leaderboard" },
      { title: "Incentive Approvals", url: "/center/incentives", itemKey: "targets.incentives" },
    ],
  },
  {
    title: "Report Management",
    url: "/center/reports/students",
    icon: BarChart3,
    moduleKey: "reports",
    items: [
      { title: "Student Reports", url: "/center/reports/students", itemKey: "reports.students" },
      { title: "Admission Reports", url: "/center/reports/admissions", itemKey: "reports.admissions" },
      { title: "Attendance Reports", url: "/center/reports/attendance", itemKey: "reports.attendance" },
      { title: "Faculty Reports", url: "/center/reports/faculty", itemKey: "reports.faculty" },
      { title: "Course Reports", url: "/center/reports/courses", itemKey: "reports.courses" },
      { title: "Examination Reports", url: "/center/reports/examinations", itemKey: "reports.examinations" },
      { title: "Finance Reports", url: "/center/reports/financial", itemKey: "reports.financial" },
    ],
  },
  {
    title: "Communication",
    url: "/center/notifications",
    icon: MessageSquare,
    moduleKey: "notifications",
    items: [
      { title: "Notifications", url: "/center/notifications", itemKey: "communication.notifications" },
      { title: "WhatsApp", url: "/center/notifications/whatsapp", itemKey: "communication.whatsapp" },
      { title: "Email", url: "/center/communication/email", itemKey: "communication.email" },
      { title: "Automation", url: "/center/communication/automation", itemKey: "communication.automation" },
    ],
  },
  {
    title: "Placement Management",
    url: "/center/placement/eligible",
    icon: Briefcase,
    moduleKey: "placement",
    items: [
      { title: "Eligible Students", url: "/center/placement/eligible", itemKey: "placement.eligible" },
      { title: "Companies", url: "/center/placement/companies", itemKey: "placement.companies" },
      { title: "Jobs", url: "/center/placement/jobs", itemKey: "placement.jobs" },
      { title: "Applications", url: "/center/placement/applications", itemKey: "placement.applications" },
      { title: "Interviews", url: "/center/placement/interviews", itemKey: "placement.interviews" },
      { title: "Placements", url: "/center/placement/placements", itemKey: "placement.placements" },
    ],
  },
  {
    title: "Administration",
    url: "/center/masters",
    icon: Building2,
    moduleKey: "masters",
    items: [{ title: "Masters", url: "/center/masters", itemKey: "admin.masters" }],
  },
  {
    title: "Settings",
    url: "/center/settings",
    icon: Settings,
  },
];

export const buildCenterNavPermissionKeys = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const mod of CENTER_PORTAL_NAV) {
    mod.items?.forEach((item) => {
      map[item.url] = item.itemKey;
    });
  }
  return map;
};

export const CENTER_NAV_PERMISSION_KEYS_FROM_CONFIG = buildCenterNavPermissionKeys();
