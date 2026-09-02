import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Target,
  GraduationCap,
  Users,
  Layers,
  FileText,
  CreditCard,
  BarChart3,
  Award,
  Settings,
} from "lucide-react";

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

/** Counsellor sidebar — aligned with backend COUNSELLOR permission catalog. */
export const COUNSELOR_PORTAL_NAV: CounselorNavModule[] = [
  {
    title: "Dashboard",
    url: "/counselor/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "ASK ME",
    url: "/counselor/ask-me",
    icon: Sparkles,
    isAi: true,
  },
  {
    title: "Target & Incentive",
    url: "/counselor/performance",
    icon: Award,
    moduleKey: "targets",
    items: [
      {
        title: "My Targets & Rewards",
        url: "/counselor/performance",
        itemKey: "targets.performance",
      },
    ],
  },
  {
    title: "Lead Management",
    url: "/counselor/leads",
    icon: Bot,
    moduleKey: "leads_ai_calling",
    items: [
      { title: "All Leads", url: "/counselor/leads", itemKey: "leads.all" },
      { title: "New Lead", url: "/counselor/leads/add", itemKey: "leads.new" },
      { title: "AI Calling", url: "/counselor/leads/ai-calling", itemKey: "leads.ai_calling" },
      { title: "Follow-ups", url: "/counselor/leads/follow-ups", itemKey: "leads.followups" },
    ],
  },
  {
    title: "Admission Management",
    url: "/counselor/admissions/all",
    icon: Target,
    moduleKey: "admissions",
    items: [
      { title: "Enquiries", url: "/counselor/admissions/enquiries", itemKey: "admissions.enquiries" },
      { title: "Applications", url: "/counselor/admissions/applications", itemKey: "admissions.applications" },
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
      { title: "Attendance", url: "/counselor/students/attendance", itemKey: "students.attendance" },
    ],
  },
  {
    title: "Faculty Management",
    url: "/counselor/faculty/all",
    icon: Users,
    moduleKey: "faculty",
    items: [
      { title: "All Faculty", url: "/counselor/faculty/all", itemKey: "faculty.all" },
      { title: "Assigned Courses", url: "/counselor/faculty/courses", itemKey: "faculty.course_assignment" },
      { title: "Attendance", url: "/counselor/faculty/attendance", itemKey: "faculty.attendance" },
    ],
  },
  {
    title: "Batch Management",
    url: "/counselor/batches",
    icon: Layers,
    moduleKey: "batches",
    items: [
      { title: "All Batches", url: "/counselor/batches", itemKey: "batches.all" },
      { title: "Class Timetable", url: "/counselor/timetable", itemKey: "schedule.timetable" },
    ],
  },
  {
    title: "Examination Management",
    url: "/counselor/exams",
    icon: FileText,
    moduleKey: "examinations",
    items: [
      { title: "All Examinations", url: "/counselor/exams", itemKey: "exams.all" },
    ],
  },
  {
    title: "Fee Management",
    url: "/counselor/fees/payments",
    icon: CreditCard,
    moduleKey: "fees",
    items: [
      { title: "Payments", url: "/counselor/fees/payments", itemKey: "fees.payments" },
      { title: "Pending Fees", url: "/counselor/fees/pending", itemKey: "fees.pending" },
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
      { title: "Faculty Reports", url: "/counselor/reports/faculty", itemKey: "reports.faculty" },
      { title: "Course Reports", url: "/counselor/reports/courses", itemKey: "reports.courses" },
      { title: "Financial Reports", url: "/counselor/reports/financial", itemKey: "reports.financial" },
    ],
  },
  {
    title: "Settings",
    url: "/counselor/settings",
    icon: Settings,
  },
];

export const buildCounselorNavPermissionKeys = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const mod of COUNSELOR_PORTAL_NAV) {
    mod.items?.forEach((item) => {
      map[item.url] = item.itemKey;
    });
  }
  return map;
};
