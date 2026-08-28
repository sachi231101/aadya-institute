import {
  GraduationCap,
  Users,
  BookOpen,
  Target,
  Bot,
  Calendar,
  CreditCard,
  BarChart3,
  UserCheck,
  Layers,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface FrontendModuleDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: string;
}

/**
 * Module options for CENTER_MANAGER permission checkboxes.
 */
export const MODULE_OPTIONS: FrontendModuleDef[] = [
  {
    key: "students",
    label: "Students",
    description: "Manage student profiles, student attendance records, performance, and discontinuation risk",
    icon: GraduationCap,
    category: "Academic",
  },
  {
    key: "faculty",
    label: "Faculty",
    description: "View and manage faculty profiles, assigned courses, faculty attendance, and ratings",
    icon: Users,
    category: "Academic",
  },
  {
    key: "courses",
    label: "Courses & Batches",
    description: "View courses, course modules, batch creation, and curriculum structure",
    icon: BookOpen,
    category: "Academic",
  },
  {
    key: "admissions",
    label: "Admissions",
    description: "Manage admission processing, application reviews, and student enrollment",
    icon: Target,
    category: "Operations",
  },
  {
    key: "leads_ai_calling",
    label: "Leads & AI Calling",
    description: "Handle lead capture, AI automated calling qualification, and counsellor follow-up tasks",
    icon: Bot,
    category: "Growth & AI",
  },
  {
    key: "schedule",
    label: "Schedule & Attendance",
    description: "Manage class scheduling, timetables, daily attendance marking, recordings, and assignments",
    icon: Calendar,
    category: "Academic",
  },
  {
    key: "fees",
    label: "Fees & Payments",
    description: "Track student fees, installment collections, pending dues, and fee receipts",
    icon: CreditCard,
    category: "Finance",
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    description: "Generate student, faculty, course, financial, and placement export reports",
    icon: BarChart3,
    category: "Operations",
  },
  {
    key: "counsellor",
    label: "Counsellor Management",
    description: "Manage counsellors, batch assignments, and team lead allocation",
    icon: UserCheck,
    category: "Operations",
  },
  {
    key: "masters",
    label: "Master Setup",
    description: "Configure classrooms, time slots, lead stages, fee heads, and institute reference data",
    icon: Layers,
    category: "Operations",
  },
  {
    key: "examinations",
    label: "Examinations & Question Banks",
    description: "Create assessments, manage question banks, schedule exams, and view submissions",
    icon: FileText,
    category: "Academic",
  },
];

export const ALL_MODULE_KEYS = MODULE_OPTIONS.map((m) => m.key);

/**
 * Module options for COUNSELLOR permission checkboxes.
 * Counsellors have a different set of available modules than Center Managers.
 */
export const COUNSELLOR_MODULE_OPTIONS: FrontendModuleDef[] = [
  {
    key: "leads_ai_calling",
    label: "Leads & AI Calling",
    description: "Manage leads, follow-ups, AI calling qualification, and student enquiries",
    icon: Bot,
    category: "Growth & AI",
  },
  {
    key: "admissions",
    label: "Admissions",
    description: "Manage admission processing, application reviews, and enrollment",
    icon: Target,
    category: "Operations",
  },
  {
    key: "students",
    label: "Students",
    description: "View student profiles, attendance records, and track enrolled students",
    icon: GraduationCap,
    category: "Academic",
  },
  {
    key: "faculty",
    label: "Faculty",
    description: "View faculty profiles, assigned courses, and faculty attendance",
    icon: Users,
    category: "Academic",
  },
  {
    key: "courses",
    label: "Batches & Timetable",
    description: "View batches, class timetables, and scheduled sessions",
    icon: Layers,
    category: "Academic",
  },
  {
    key: "examinations",
    label: "Examinations & Assessments",
    description: "View examination schedules, assigned assessments, and candidate batches",
    icon: FileText,
    category: "Academic",
  },
  {
    key: "fees",
    label: "Fees & Payments",
    description: "Track student fee payments, pending dues, and installment receipts",
    icon: CreditCard,
    category: "Finance",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Access student, faculty, course, and financial reports",
    icon: BarChart3,
    category: "Operations",
  },
];

export const ALL_COUNSELLOR_MODULE_KEYS = COUNSELLOR_MODULE_OPTIONS.map((m) => m.key);
