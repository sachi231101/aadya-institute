import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Target,
  GraduationCap,
  Users,
  FolderOpen,
  FileText,
  CreditCard,
  BarChart3,
  Award,
  Settings,
} from "lucide-react";

import { NAV_ITEM_LABELS } from "./nav-labels";

const L = NAV_ITEM_LABELS;

export interface CounselorNavSubItem {
  title: string;
  url: string;
  itemKey: string;
}

export interface CounselorNavModule {
  title: string;
  url: string;
  icon: LucideIcon;
  moduleKey?: string;
  isAi?: boolean;
  items?: CounselorNavSubItem[];
}

/**
 * Counsellor sidebar — module set matches Counsellor catalog;
 * sub-items under each module match Admin Dashboard / CM hierarchy exactly.
 */
export const COUNSELOR_PORTAL_NAV: CounselorNavModule[] = [
  {
    title: "Dashboard",
    url: "/counselor/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "ASK ME",
    url: "/counselor/home",
    icon: Sparkles,
    isAi: true,
  },
  {
    title: "Lead Management",
    url: "/counselor/leads",
    icon: Bot,
    moduleKey: "leads_ai_calling",
    items: [
      { title: "All Leads", url: "/counselor/leads", itemKey: "leads.all" },
      { title: "AI Calling", url: "/counselor/leads/ai-calling", itemKey: "leads.ai_calling" },
      { title: "Follow-ups", url: "/counselor/leads/follow-ups", itemKey: "leads.followups" },
      { title: "Call History", url: "/counselor/leads/call-history", itemKey: "leads.call_history" },
    ],
  },
  {
    title: "Admission Management",
    url: "/counselor/admissions/all",
    icon: Target,
    moduleKey: "admissions",
    items: [
      { title: L["admissions.enquiries"] ?? "Enquiries", url: "/counselor/admissions/enquiries", itemKey: "admissions.enquiries" },
      { title: L["admissions.applications"] ?? "Admission Applications", url: "/counselor/admissions/applications", itemKey: "admissions.applications" },
      { title: "Admissions", url: "/counselor/admissions/all", itemKey: "admissions.all" },
    ],
  },
  {
    title: "Student Management",
    url: "/counselor/students/all",
    icon: GraduationCap,
    moduleKey: "students",
    items: [
      { title: "All Students", url: "/counselor/students/all", itemKey: "students.all" },
      { title: "Student Documents", url: "/counselor/students/documents", itemKey: "students.documents" },
      { title: L["students.student_allocation"] ?? "Assign Students to Batches", url: "/counselor/students/student-allocation", itemKey: "students.student_allocation" },
      { title: L["students.attendance"] ?? "Student Attendance", url: "/counselor/students/attendance", itemKey: "students.attendance" },
      { title: L["students.performance"] ?? "Academic Performance", url: "/counselor/students/performance", itemKey: "students.performance" },
      { title: "Discontinuation Risk", url: "/counselor/students/discontinuation-risk", itemKey: "students.discontinuation" },
    ],
  },
  {
    title: "Faculty Management",
    url: "/counselor/faculty/all",
    icon: Users,
    moduleKey: "faculty",
    items: [
      { title: "All Faculty", url: "/counselor/faculty/all", itemKey: "faculty.all" },
      { title: L["faculty.attendance"] ?? "Faculty Attendance", url: "/counselor/faculty/attendance", itemKey: "faculty.attendance" },
      { title: L["faculty.performance"] ?? "Faculty Ratings & Feedback", url: "/counselor/faculty/ratings", itemKey: "faculty.performance" },
    ],
  },
  {
    title: "Batch Management",
    url: "/counselor/batches",
    icon: FolderOpen,
    moduleKey: "batches",
    items: [
      { title: "All Batches", url: "/counselor/batches", itemKey: "batches.all" },
    ],
  },
  {
    title: "Examination Management",
    url: "/counselor/exams",
    icon: FileText,
    moduleKey: "examinations",
    items: [
      { title: "All Examinations", url: "/counselor/exams", itemKey: "exams.all" },
      { title: "Create Examination", url: "/counselor/exams/create", itemKey: "exams.create" },
      { title: "Question Bank", url: "/counselor/exams/question-bank", itemKey: "exams.question_bank" },
      { title: "Results", url: "/counselor/exams/results", itemKey: "exams.results" },
    ],
  },
  {
    title: "Fee Management",
    url: "/counselor/fees/students",
    icon: CreditCard,
    moduleKey: "fees",
    items: [
      { title: "Student Fees", url: "/counselor/fees/students", itemKey: "fees.students" },
      { title: "Invoices", url: "/counselor/fees/invoices", itemKey: "fees.invoices" },
      { title: "Receipts", url: "/counselor/fees/receipts", itemKey: "fees.receipts" },
      { title: "Fee Reports", url: "/counselor/fees/reports", itemKey: "fees.reports" },
    ],
  },
  {
    title: "Report Management",
    url: "/counselor/reports/students",
    icon: BarChart3,
    moduleKey: "reports",
    items: [
      { title: "Student Reports", url: "/counselor/reports/students", itemKey: "reports.students" },
      { title: "Admission Reports", url: "/counselor/reports/admissions", itemKey: "reports.admissions" },
      { title: "Attendance Reports", url: "/counselor/reports/attendance", itemKey: "reports.attendance" },
      { title: "Faculty Reports", url: "/counselor/reports/faculty", itemKey: "reports.faculty" },
      { title: "Course Reports", url: "/counselor/reports/courses", itemKey: "reports.courses" },
      { title: "Examination Reports", url: "/counselor/reports/examinations", itemKey: "reports.examinations" },
      { title: L["reports.financial"] ?? "Revenue & Finance Reports", url: "/counselor/reports/financial", itemKey: "reports.financial" },
    ],
  },
  {
    title: "Target & Incentive",
    url: "/counselor/targets",
    icon: Award,
    moduleKey: "targets",
    items: [
      { title: L["targets.all"] ?? "Target Plans & Assignments", url: "/counselor/targets", itemKey: "targets.all" },
      { title: L["targets.leaderboard"] ?? "Leaderboard", url: "/counselor/targets/leaderboard", itemKey: "targets.leaderboard" },
      { title: "Incentive Approvals", url: "/counselor/incentives", itemKey: "targets.incentives" },
    ],
  },
  {
    title: "Settings",
    url: "/counselor/settings",
    icon: Settings,
  },
];

export const buildCounselorNavPermissionKeys = (): Record<string, string> => {
  const map: Record<string, string> = {
    "/counselor/students": "students.all",
    "/counselor/faculty": "faculty.all",
    "/counselor/admissions": "admissions.all",
    "/counselor/leads": "leads.all",
    "/counselor/admissions/direct-entry": "admissions.all",
    "/counselor/leads/add": "leads.all",
    "/counselor/students/add": "students.all",
    "/counselor/faculty/add": "faculty.all",
    "/counselor/faculty/courses": "faculty.all",
    "/counselor/timetable": "batches.all",
    "/counselor/performance": "targets.all",
  };
  for (const mod of COUNSELOR_PORTAL_NAV) {
    mod.items?.forEach((item) => {
      map[item.url] = item.itemKey;
    });
  }
  return map;
};
