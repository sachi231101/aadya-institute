import React, { useState, useMemo } from "react";
import {
  Layers,
  MapPin,
  School,
  Briefcase,
  GraduationCap,
  Users,
  UserCheck,
  Boxes,
  Compass,
  GitCommit,
  Bell,
  Calendar,
  Clock,
  Sun,
  ShieldCheck,
  CalendarCheck,
  FileCheck,
  Star,
  Tag,
  BookMarked,
  Landmark,
  Receipt,
  BookOpen,
  CreditCard,
  Percent,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  ChevronRight,
  HelpCircle,
  ArrowLeft,
  LayoutGrid,
  List
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Master Entity Definition
export interface MasterCategory {
  id: string;
  name: string;
  group: "BASIC" | "ACCOUNTING";
  icon: React.ElementType;
  description: string;
  count: number;
  columns: { key: string; label: string }[];
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  // ─── BASIC MASTERS (Exact 20 Entities matching ZenoxERP) ────────────────────
  // Row 1
  {
    id: "area",
    name: "Area",
    group: "BASIC",
    icon: MapPin,
    description: "Manage student catchment zones, postal codes, and city localities",
    count: 8,
    columns: [
      { key: "code", label: "Area Code" },
      { key: "name", label: "Area Name" },
      { key: "city", label: "City" },
      { key: "pincode", label: "PIN Code" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "classroom",
    name: "Class Room",
    group: "BASIC",
    icon: School,
    description: "Lecture rooms, labs, seminar halls, projector equipment and seat capacity",
    count: 6,
    columns: [
      { key: "code", label: "Room Code" },
      { key: "name", label: "Room Name" },
      { key: "capacity", label: "Capacity" },
      { key: "type", label: "Room Type" },
      { key: "projector", label: "Equipped" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "designation",
    name: "Designation",
    group: "BASIC",
    icon: Briefcase,
    description: "Staff organizational roles, hierarchy grades, and departments",
    count: 7,
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Designation" },
      { key: "dept", label: "Department" },
      { key: "level", label: "Level" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "education",
    name: "Education",
    group: "BASIC",
    icon: GraduationCap,
    description: "Prior educational qualifications, degrees, and academic streams",
    count: 9,
    columns: [
      { key: "name", label: "Degree / Qualification" },
      { key: "category", label: "Category" },
      { key: "stream", label: "Stream" },
      { key: "status", label: "Status" },
    ],
  },

  // Row 2
  {
    id: "parent_info",
    name: "Parent Info",
    group: "BASIC",
    icon: Users,
    description: "Guardian relationship tags, alert preferences, and contact protocols",
    count: 5,
    columns: [
      { key: "relation", label: "Relation Type" },
      { key: "notifyAbsence", label: "Absence SMS" },
      { key: "notifyFee", label: "Fee Alert" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "employee",
    name: "Employee",
    group: "BASIC",
    icon: UserCheck,
    description: "Trainers, administrative staff, payroll codes, and center allocations",
    count: 14,
    columns: [
      { key: "code", label: "Emp Code" },
      { key: "name", label: "Full Name" },
      { key: "designation", label: "Designation" },
      { key: "mobile", label: "Mobile" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "inventory_cat",
    name: "Inventory Category",
    group: "BASIC",
    icon: Boxes,
    description: "Kit materials, study books, merchandise, and classroom assets",
    count: 5,
    columns: [
      { key: "code", label: "Cat Code" },
      { key: "name", label: "Category Name" },
      { key: "uom", label: "Unit of Measure" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "inventory_sub",
    name: "Inventory Sub Category",
    group: "BASIC",
    icon: Boxes,
    description: "Sub-items under kits, textbooks, lab hardware, and uniform merchandise",
    count: 6,
    columns: [
      { key: "catName", label: "Parent Category" },
      { key: "code", label: "Sub Code" },
      { key: "name", label: "Sub Category Name" },
      { key: "cost", label: "Unit Value (₹)" },
      { key: "status", label: "Status" },
    ],
  },

  // Row 3
  {
    id: "lead_source",
    name: "Lead Source",
    group: "BASIC",
    icon: Compass,
    description: "Marketing channels: Walk-in, Google, Meta Ads, Seminars, Referrals",
    count: 8,
    columns: [
      { key: "name", label: "Source Name" },
      { key: "type", label: "Channel Type" },
      { key: "isOnline", label: "Online Channel" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "lead_stage",
    name: "Lead Stage",
    group: "BASIC",
    icon: GitCommit,
    description: "Pipeline progression stages with pipeline order and colors",
    count: 6,
    columns: [
      { key: "order", label: "Seq" },
      { key: "name", label: "Stage Name" },
      { key: "color", label: "Badge Color" },
      { key: "isTerminal", label: "Terminal State" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "notification",
    name: "Notification Template",
    group: "BASIC",
    icon: Bell,
    description: "Automated WhatsApp and SMS templates with dynamic tags",
    count: 6,
    columns: [
      { key: "name", label: "Template Name" },
      { key: "channel", label: "Channel" },
      { key: "trigger", label: "Event Trigger" },
      { key: "tags", label: "Dynamic Tags" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "batch",
    name: "Admission Batch",
    group: "BASIC",
    icon: Calendar,
    description: "Batch codes, session timings, seat capacities, and assigned instructors",
    count: 10,
    columns: [
      { key: "code", label: "Batch Code" },
      { key: "name", label: "Batch Title" },
      { key: "course", label: "Course" },
      { key: "time", label: "Timing" },
      { key: "trainer", label: "Primary Trainer" },
      { key: "status", label: "Status" },
    ],
  },

  // Row 4
  {
    id: "holiday",
    name: "Holiday",
    group: "BASIC",
    icon: Sun,
    description: "Institute public holidays, academic closures, and branch festivals",
    count: 5,
    columns: [
      { key: "date", label: "Holiday Date" },
      { key: "name", label: "Occasion" },
      { key: "branch", label: "Branch Applicable" },
      { key: "type", label: "Holiday Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "admission_status",
    name: "Admission Status",
    group: "BASIC",
    icon: ShieldCheck,
    description: "Student lifecycle flags: Active, Completed, Discontinued, On Leave",
    count: 5,
    columns: [
      { key: "code", label: "Status Code" },
      { key: "name", label: "Status Label" },
      { key: "allowAttendance", label: "Allow Attendance" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "timeslot",
    name: "Time Slot",
    group: "BASIC",
    icon: Clock,
    description: "Standard morning, afternoon, and weekend class time slots",
    count: 7,
    columns: [
      { key: "name", label: "Slot Label" },
      { key: "start", label: "Start Time" },
      { key: "end", label: "End Time" },
      { key: "sessionType", label: "Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "events",
    name: "Events",
    group: "BASIC",
    icon: CalendarCheck,
    description: "Workshops, hackathons, guest lectures, and placement drives",
    count: 4,
    columns: [
      { key: "name", label: "Event Name" },
      { key: "category", label: "Category" },
      { key: "coordinator", label: "Coordinator" },
      { key: "status", label: "Status" },
    ],
  },

  // Row 5
  {
    id: "exam_term",
    name: "Exam Term",
    group: "BASIC",
    icon: FileCheck,
    description: "Academic evaluation terms, module exams, and final capstone reviews",
    count: 4,
    columns: [
      { key: "code", label: "Term Code" },
      { key: "name", label: "Term Title" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "course_review",
    name: "Course Review",
    group: "BASIC",
    icon: Star,
    description: "Student feedback survey questions and faculty evaluation parameters",
    count: 5,
    columns: [
      { key: "question", label: "Rubric Question" },
      { key: "scale", label: "Max Score" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "lead_type",
    name: "Lead Type",
    group: "BASIC",
    icon: Tag,
    description: "Enquiry prioritization: Hot, Warm, Cold with SLAs",
    count: 3,
    columns: [
      { key: "name", label: "Lead Priority" },
      { key: "sla", label: "Follow-up SLA" },
      { key: "color", label: "Tag Color" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "assignment_type",
    name: "Assignment Type",
    group: "BASIC",
    icon: BookMarked,
    description: "Practical Lab Task, Theory Homework, Coding Challenge, Project Submission",
    count: 4,
    columns: [
      { key: "name", label: "Assignment Type" },
      { key: "maxMarks", label: "Default Max Marks" },
      { key: "submissionFormat", label: "Submission Format" },
      { key: "status", label: "Status" },
    ],
  },

  // ─── ACCOUNTING MASTERS (5 Entities) ────────────────────────────────────────
  {
    id: "bank_accounts",
    name: "Bank Accounts",
    group: "ACCOUNTING",
    icon: Landmark,
    description: "Aadya Institute official bank deposit accounts, QR codes, and IFSCs",
    count: 3,
    columns: [
      { key: "bankName", label: "Bank Name" },
      { key: "accountNo", label: "Account Number" },
      { key: "ifsc", label: "IFSC Code" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "fee_heads",
    name: "Fee Heads",
    group: "ACCOUNTING",
    icon: Receipt,
    description: "Tuition Fee, Registration, Lab Fee, Exam Fee, Certification Head",
    count: 5,
    columns: [
      { key: "name", label: "Fee Head" },
      { key: "isGst", label: "GST Applicable" },
      { key: "defaultAmount", label: "Default ₹" },
      { key: "type", label: "Frequency" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "ledgers",
    name: "Ledgers",
    group: "ACCOUNTING",
    icon: BookOpen,
    description: "Chart of accounts, revenue heads, vendor ledgers, and expense accounts",
    count: 8,
    columns: [
      { key: "code", label: "Ledger Code" },
      { key: "name", label: "Ledger Name" },
      { key: "group", label: "Account Group" },
      { key: "type", label: "Dr/Cr Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "payment_modes",
    name: "Payment Modes",
    group: "ACCOUNTING",
    icon: CreditCard,
    description: "Cash, UPI/GPay, Bank NEFT/IMPS, Cheque, POS Card swipe",
    count: 5,
    columns: [
      { key: "name", label: "Payment Mode" },
      { key: "requiresRef", label: "Requires Txn ID" },
      { key: "gateway", label: "Gateway Link" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "concession_heads",
    name: "Concession Heads",
    group: "ACCOUNTING",
    icon: Percent,
    description: "Merit scholarships, early-bird discounts, director discretion waivers",
    count: 4,
    columns: [
      { key: "name", label: "Discount Category" },
      { key: "maxPct", label: "Max Limit %" },
      { key: "approver", label: "Approval Required" },
      { key: "status", label: "Status" },
    ],
  },
];

// Initial mock records for all masters
const INITIAL_RECORDS: Record<string, any[]> = {
  area: [
    { id: "1", code: "AR-101", name: "Malleswaram", city: "Bengaluru", pincode: "560003", status: "Active" },
    { id: "2", code: "AR-102", name: "Ramamurthy Nagar", city: "Bengaluru", pincode: "560016", status: "Active" },
    { id: "3", code: "AR-103", name: "Indiranagar", city: "Bengaluru", pincode: "560038", status: "Active" },
    { id: "4", code: "AR-104", name: "Hebbal", city: "Bengaluru", pincode: "560024", status: "Active" },
    { id: "5", code: "AR-105", name: "Koramangala", city: "Bengaluru", pincode: "560034", status: "Active" },
    { id: "6", code: "AR-106", name: "Whitefield", city: "Bengaluru", pincode: "560066", status: "Active" },
    { id: "7", code: "AR-107", name: "Rajajinagar", city: "Bengaluru", pincode: "560010", status: "Active" },
    { id: "8", code: "AR-108", name: "Electronic City", city: "Bengaluru", pincode: "560100", status: "Active" },
  ],
  classroom: [
    { id: "1", code: "LAB-01", name: "AI & Fullstack Lab", capacity: 40, type: "Computer Lab", projector: "Yes (Smart Screen)", status: "Active" },
    { id: "2", code: "LAB-02", name: "Data Analytics Lab", capacity: 35, type: "Computer Lab", projector: "Yes (Dual Display)", status: "Active" },
    { id: "3", code: "TH-201", name: "Lecture Room A", capacity: 50, type: "Theory Class", projector: "Yes (HD Projector)", status: "Active" },
    { id: "4", code: "TH-202", name: "Lecture Room B", capacity: 45, type: "Theory Class", projector: "Yes", status: "Active" },
    { id: "5", code: "SEM-01", name: "Main Seminar Hall", capacity: 120, type: "Auditorium", projector: "Yes (Audio-Visual)", status: "Active" },
    { id: "6", code: "CONF-1", name: "Board & Telecalling Room", capacity: 15, type: "Meeting Room", projector: "Yes", status: "Active" },
  ],
  designation: [
    { id: "1", code: "DES-01", name: "Center Manager", dept: "Administration", level: "Senior", status: "Active" },
    { id: "2", code: "DES-02", name: "Senior Counsellor", dept: "Admissions & CRM", level: "Lead", status: "Active" },
    { id: "3", code: "DES-03", name: "Lead Technical Trainer", dept: "Academic Faculty", level: "Principal", status: "Active" },
    { id: "4", code: "DES-04", name: "Junior Faculty / Mentor", dept: "Academic Faculty", level: "Associate", status: "Active" },
    { id: "5", code: "DES-05", name: "Telecalling Specialist", dept: "Admissions & CRM", level: "Executive", status: "Active" },
    { id: "6", code: "DES-06", name: "Senior Accountant", dept: "Accounts & Finance", level: "Lead", status: "Active" },
    { id: "7", code: "DES-07", name: "Lab Administrator", dept: "IT Infrastructure", level: "Executive", status: "Active" },
  ],
  education: [
    { id: "1", name: "10th Standard (SSLC / CBSE)", category: "Schooling", stream: "General", status: "Active" },
    { id: "2", name: "12th / PUC (Science - PCMB/PCMC)", category: "Pre-University", stream: "Science", status: "Active" },
    { id: "3", name: "12th / PUC (Commerce)", category: "Pre-University", stream: "Commerce", status: "Active" },
    { id: "4", name: "Diploma in Computer Science", category: "Polytechnic", stream: "Engineering", status: "Active" },
    { id: "5", name: "B.E / B.Tech (Computer Science / IT)", category: "Undergraduate", stream: "Engineering", status: "Active" },
    { id: "6", name: "B.Sc (Computer Science / Electronics)", category: "Undergraduate", stream: "Science", status: "Active" },
    { id: "7", name: "BCA (Bachelor of Computer Applications)", category: "Undergraduate", stream: "Computer Apps", status: "Active" },
    { id: "8", name: "B.Com / BBA", category: "Undergraduate", stream: "Commerce & Mgmt", status: "Active" },
    { id: "9", name: "MCA / M.Tech / MBA", category: "Postgraduate", stream: "Master Degree", status: "Active" },
  ],
  parent_info: [
    { id: "1", relation: "Father", notifyAbsence: "Yes", notifyFee: "Yes", status: "Active" },
    { id: "2", relation: "Mother", notifyAbsence: "Yes", notifyFee: "Yes", status: "Active" },
    { id: "3", relation: "Legal Guardian", notifyAbsence: "Yes", notifyFee: "Yes", status: "Active" },
    { id: "4", relation: "Spouse", notifyAbsence: "Yes", notifyFee: "No", status: "Active" },
    { id: "5", relation: "Sibling / Relative", notifyAbsence: "No", notifyFee: "No", status: "Active" },
  ],
  employee: [
    { id: "1", code: "EMP-101", name: "Vidya Y A", designation: "Senior Counsellor", mobile: "9845012345", branch: "Malleswaram", status: "Active" },
    { id: "2", code: "EMP-102", name: "Dr. Rajesh Sharma", designation: "Lead Technical Trainer", mobile: "9880198765", branch: "Ramamurthy Nagar", status: "Active" },
    { id: "3", code: "EMP-103", name: "Suresh Gowda", designation: "Center Manager", mobile: "9741234567", branch: "Malleswaram", status: "Active" },
    { id: "4", code: "EMP-104", name: "Ananya Rao", designation: "Telecalling Specialist", mobile: "9900112233", branch: "Malleswaram", status: "Active" },
    { id: "5", code: "EMP-105", name: "Karthik Sundaram", designation: "Junior Faculty / Mentor", mobile: "9844556677", branch: "Ramamurthy Nagar", status: "Active" },
  ],
  inventory_cat: [
    { id: "1", code: "INV-BK", name: "Course Textbooks & Workbooks", uom: "Books", status: "Active" },
    { id: "2", code: "INV-KT", name: "Student Welcome Kit & Bag", uom: "Sets", status: "Active" },
    { id: "3", code: "INV-ID", name: "RFID Student Smart ID Cards", uom: "Cards", status: "Active" },
    { id: "4", code: "INV-HW", name: "Lab Raspberry Pi / Dev Boards", uom: "Units", status: "Active" },
    { id: "5", code: "INV-CRT", name: "Course Completion Certificate Folders", uom: "Pcs", status: "Active" },
  ],
  inventory_sub: [
    { id: "1", catName: "Course Textbooks & Workbooks", code: "SUB-BK-01", name: "Full Stack MERN Developer Guide", cost: "850", status: "Active" },
    { id: "2", catName: "Course Textbooks & Workbooks", code: "SUB-BK-02", name: "AI & Machine Learning Handbook", cost: "1200", status: "Active" },
    { id: "3", catName: "Student Welcome Kit & Bag", code: "SUB-KT-01", name: "Aadya Institute Premium Backpack", cost: "650", status: "Active" },
    { id: "4", catName: "Student Welcome Kit & Bag", code: "SUB-KT-02", name: "Aadya Notebook + Metal Pen Set", cost: "250", status: "Active" },
    { id: "5", catName: "RFID Student Smart ID Cards", code: "SUB-ID-01", name: "NFC / RFID Lanyard Smart Card", cost: "150", status: "Active" },
    { id: "6", catName: "Lab Raspberry Pi / Dev Boards", code: "SUB-HW-01", name: "Raspberry Pi 4 Model B (4GB)", cost: "4500", status: "Active" },
  ],
  lead_source: [
    { id: "1", name: "Walk-in Enquiry", type: "Direct Campus", isOnline: "No", status: "Active" },
    { id: "2", name: "Google Search Ads", type: "Digital Paid", isOnline: "Yes", status: "Active" },
    { id: "3", name: "Instagram / Meta Campaign", type: "Social Paid", isOnline: "Yes", status: "Active" },
    { id: "4", name: "Website Direct Form", type: "Organic Web", isOnline: "Yes", status: "Active" },
    { id: "5", name: "Student / Alumni Reference", type: "Word of Mouth", isOnline: "No", status: "Active" },
    { id: "6", name: "Telecalling Campaign", type: "Outbound CRM", isOnline: "No", status: "Active" },
    { id: "7", name: "College Workshop / Seminar", type: "Campus Event", isOnline: "No", status: "Active" },
    { id: "8", name: "Outdoor Banner / Hoarding", type: "Print Media", isOnline: "No", status: "Active" },
  ],
  lead_stage: [
    { id: "1", order: "1", name: "New Enquiry", color: "Blue", isTerminal: "No", status: "Active" },
    { id: "2", order: "2", name: "Followup In-Progress", color: "Orange", isTerminal: "No", status: "Active" },
    { id: "3", order: "3", name: "Demo Class Scheduled", color: "Purple", isTerminal: "No", status: "Active" },
    { id: "4", order: "4", name: "Ready for Admission", color: "Teal", isTerminal: "No", status: "Active" },
    { id: "5", order: "5", name: "Admitted / Enrolled", color: "Green", isTerminal: "Yes (Success)", status: "Active" },
    { id: "6", order: "6", name: "Lost / Dropped", color: "Red", isTerminal: "Yes (Lost)", status: "Active" },
  ],
  notification: [
    { id: "1", name: "WhatsApp Welcome Message", channel: "WhatsApp", trigger: "New Lead Creation", tags: "{StudentName}, {Course}", status: "Active" },
    { id: "2", name: "Class 2hr Reminder", channel: "WhatsApp", trigger: "2 Hours Before Class", tags: "{StudentName}, {Batch}, {Time}", status: "Active" },
    { id: "3", name: "Absence Alert to Parent", channel: "SMS / WhatsApp", trigger: "Daily Attendance Absence", tags: "{StudentName}, {Date}, {Parent}", status: "Active" },
    { id: "4", name: "Fee Payment Receipt PDF", channel: "WhatsApp", trigger: "Payment Received", tags: "{ReceiptNo}, {Amount}, {Course}", status: "Active" },
    { id: "5", name: "Fee Overdue Reminder", channel: "SMS", trigger: "Installment Due Date", tags: "{StudentName}, {DueAmount}, {DueDate}", status: "Active" },
    { id: "6", name: "First Day Rules & Onboarding", channel: "WhatsApp", trigger: "Admission Confirmed", tags: "{StudentName}, {BatchStart}, {Room}", status: "Active" },
  ],
  batch: [
    { id: "1", code: "BATCH-2026-FSD1", name: "Full Stack Web Dev (Morning MWF)", course: "Full Stack Software Engineering", time: "07:30 AM - 09:30 AM", trainer: "Dr. Rajesh Sharma", status: "Active" },
    { id: "2", code: "BATCH-2026-AI1", name: "Applied AI & GenAI Masterclass", course: "Artificial Intelligence & Data Science", time: "10:00 AM - 12:00 PM", trainer: "Karthik Sundaram", status: "Active" },
    { id: "3", code: "BATCH-2026-CYB", name: "Cybersecurity & Ethical Hacking", course: "Cybersecurity & Cloud Security", time: "02:00 PM - 04:00 PM", trainer: "Dr. Rajesh Sharma", status: "Active" },
    { id: "4", code: "BATCH-2026-FSD2", name: "Full Stack Evening Batch (TTS)", course: "Full Stack Software Engineering", time: "06:00 PM - 08:00 PM", trainer: "Karthik Sundaram", status: "Active" },
    { id: "5", code: "BATCH-2026-WKND", name: "Executive Weekend Data Science", course: "Artificial Intelligence & Data Science", time: "Sat/Sun 10:00 AM - 02:00 PM", trainer: "Dr. Rajesh Sharma", status: "Active" },
  ],
  holiday: [
    { id: "1", date: "26/01/2026", name: "Republic Day", branch: "All Branches", type: "National Holiday", status: "Active" },
    { id: "2", date: "15/08/2026", name: "Independence Day", branch: "All Branches", type: "National Holiday", status: "Active" },
    { id: "3", date: "02/10/2026", name: "Gandhi Jayanti", branch: "All Branches", type: "National Holiday", status: "Active" },
    { id: "4", date: "01/11/2026", name: "Kannada Rajyotsava", branch: "Karnataka Branches", type: "State Holiday", status: "Active" },
    { id: "5", date: "25/12/2026", name: "Christmas Day", branch: "All Branches", type: "Festival Holiday", status: "Active" },
  ],
  admission_status: [
    { id: "1", code: "ACT", name: "Active Enrolled", allowAttendance: "Yes", status: "Active" },
    { id: "2", code: "LV", name: "On Approved Leave", allowAttendance: "No", status: "Active" },
    { id: "3", code: "CMP", name: "Course Completed & Certified", allowAttendance: "No", status: "Active" },
    { id: "4", code: "DSC", name: "Discontinued (3 Consecutive Absences)", allowAttendance: "No", status: "Active" },
    { id: "5", code: "CAN", name: "Admission Cancelled / Refunded", allowAttendance: "No", status: "Active" },
  ],
  timeslot: [
    { id: "1", name: "Early Morning Slot (MWF)", start: "07:30 AM", end: "09:30 AM", sessionType: "Theory + Lab", status: "Active" },
    { id: "2", name: "Morning Primary Slot (TTS)", start: "10:00 AM", end: "12:00 PM", sessionType: "Theory + Lab", status: "Active" },
    { id: "3", name: "Afternoon Intensive Slot", start: "02:00 PM", end: "04:00 PM", sessionType: "Lab Coding", status: "Active" },
    { id: "4", name: "Evening Professional Slot", start: "06:00 PM", end: "08:00 PM", sessionType: "Theory + Project", status: "Active" },
    { id: "5", name: "Weekend Extended Batch", start: "10:00 AM", end: "02:00 PM", sessionType: "Weekend Marathon", status: "Active" },
  ],
  events: [
    { id: "1", name: "24-Hour GenAI Hackathon 2026", category: "Technical Hackathon", coordinator: "Dr. Rajesh Sharma", status: "Active" },
    { id: "2", name: "Industry Tech Leaders Placement Summit", category: "Placement Drive", coordinator: "Vidya Y A", status: "Active" },
    { id: "3", name: "Open Source CodeFest Workshop", category: "Hands-on Workshop", coordinator: "Karthik Sundaram", status: "Active" },
    { id: "4", name: "Aadya Alumni Annual Meet", category: "Institutional Event", coordinator: "Suresh Gowda", status: "Active" },
  ],
  exam_term: [
    { id: "1", code: "TERM-M1", name: "Module 1: Foundations & Core Logic", duration: "90 Minutes", status: "Active" },
    { id: "2", code: "TERM-M2", name: "Module 2: Advanced Architecture & DB", duration: "120 Minutes", status: "Active" },
    { id: "3", code: "TERM-CAP", name: "Capstone Project Code Review & Defense", duration: "45 Minutes / Student", status: "Active" },
    { id: "4", code: "TERM-MOCK", name: "Mock Technical Interview & DSA Exam", duration: "60 Minutes", status: "Active" },
  ],
  course_review: [
    { id: "1", question: "Faculty technical clarity and concept explanation", scale: "5 Stars", category: "Teaching Quality", status: "Active" },
    { id: "2", question: "Hands-on lab exercises and practical mentorship", scale: "5 Stars", category: "Lab Support", status: "Active" },
    { id: "3", question: "Class schedule punctuality and pace of syllabus", scale: "5 Stars", category: "Punctuality", status: "Active" },
    { id: "4", question: "Doubt resolution & 1-on-1 assistance", scale: "5 Stars", category: "Support", status: "Active" },
    { id: "5", question: "Overall satisfaction with Aadya Institute facilities", scale: "5 Stars", category: "Infrastructure", status: "Active" },
  ],
  lead_type: [
    { id: "1", name: "Hot (Immediate Enrolment)", sla: "< 2 Hours", color: "Red", status: "Active" },
    { id: "2", name: "Warm (Deciding in 1-2 Weeks)", sla: "< 24 Hours", color: "Amber", status: "Active" },
    { id: "3", name: "Cold (Exploring Future Batches)", sla: "< 3 Days", color: "Slate", status: "Active" },
  ],
  assignment_type: [
    { id: "1", name: "Practical Lab Coding Task", maxMarks: "50", submissionFormat: "GitHub Repo URL", status: "Active" },
    { id: "2", name: "Theoretical Quiz & Multiple Choice", maxMarks: "25", submissionFormat: "Online Quiz Form", status: "Active" },
    { id: "3", name: "Full Stack Mini Project", maxMarks: "100", submissionFormat: "Live URL + Code ZIP", status: "Active" },
    { id: "4", name: "Database Schema Design & Query Test", maxMarks: "50", submissionFormat: "SQL Script Upload", status: "Active" },
  ],

  // ACCOUNTING MASTERS
  bank_accounts: [
    { id: "1", bankName: "HDFC Bank Ltd", accountNo: "50200088991122", ifsc: "HDFC0001234", branch: "Malleswaram Branch, Bengaluru", status: "Active" },
    { id: "2", bankName: "State Bank of India (SBI)", accountNo: "308945678912", ifsc: "SBIN0040123", branch: "Ramamurthy Nagar, Bengaluru", status: "Active" },
    { id: "3", bankName: "ICICI Bank Ltd", accountNo: "001205009988", ifsc: "ICIC0000012", branch: "MG Road, Bengaluru", status: "Active" },
  ],
  fee_heads: [
    { id: "1", name: "Tuition / Course Fee", isGst: "Yes (18% Included)", defaultAmount: "45000", type: "Core Course", status: "Active" },
    { id: "2", name: "Registration & Admission Kit", isGst: "Yes", defaultAmount: "5000", type: "One-Time", status: "Active" },
    { id: "3", name: "Lab & Cloud Sandbox Access Fee", isGst: "Yes", defaultAmount: "3000", type: "Per Semester", status: "Active" },
    { id: "4", name: "Examination & Assessment Fee", isGst: "No", defaultAmount: "1500", type: "Per Term", status: "Active" },
    { id: "5", name: "Global Certification Processing Fee", isGst: "Yes", defaultAmount: "4500", type: "Optional / Exit", status: "Active" },
  ],
  ledgers: [
    { id: "1", code: "LED-401", name: "Course Tuition Revenue A/c", group: "Direct Incomes", type: "Credit", status: "Active" },
    { id: "2", code: "LED-402", name: "Admission & Kit Registration A/c", group: "Direct Incomes", type: "Credit", status: "Active" },
    { id: "3", code: "LED-201", name: "Student Advance Fees Ledger", group: "Current Liabilities", type: "Credit", status: "Active" },
    { id: "4", code: "LED-501", name: "Faculty Trainer Remuneration A/c", group: "Direct Expenses", type: "Debit", status: "Active" },
    { id: "5", code: "LED-502", name: "Center Lease & Rent A/c", group: "Indirect Expenses", type: "Debit", status: "Active" },
    { id: "6", code: "LED-503", name: "WhatsApp & SMS Gateway Expenses", group: "Operating Expenses", type: "Debit", status: "Active" },
    { id: "7", code: "LED-504", name: "Electricity & High-Speed Internet", group: "Indirect Expenses", type: "Debit", status: "Active" },
    { id: "8", code: "LED-101", name: "HDFC Bank Operating Ledger", group: "Bank Accounts", type: "Debit", status: "Active" },
  ],
  payment_modes: [
    { id: "1", name: "UPI / QR Code (GPay, PhonePe, Paytm)", requiresRef: "Yes (UPI UTR No)", gateway: "Direct Dynamic QR", status: "Active" },
    { id: "2", name: "Cash (At Center Counter)", requiresRef: "No (Physical Receipt)", gateway: "Cash Register", status: "Active" },
    { id: "3", name: "Net Banking (NEFT / IMPS / RTGS)", requiresRef: "Yes (Bank Txn ID)", gateway: "Bank Statement Sync", status: "Active" },
    { id: "4", name: "Credit / Debit Card (POS Terminal)", requiresRef: "Yes (Approval Code)", gateway: "Pine Labs POS", status: "Active" },
    { id: "5", name: "Cheque / Demand Draft", requiresRef: "Yes (Cheque No & Bank)", gateway: "Cheque Clearing", status: "Active" },
  ],
  concession_heads: [
    { id: "1", name: "Merit Academic Scholarship (>85% in Degree)", maxPct: "20%", approver: "Center Manager", status: "Active" },
    { id: "2", name: "Early Bird Enrolment Incentive", maxPct: "10%", approver: "Senior Counsellor", status: "Active" },
    { id: "3", name: "Sibling / Alumni Referral Discount", maxPct: "15%", approver: "Senior Counsellor", status: "Active" },
    { id: "4", name: "Director Discretionary Special Concession", maxPct: "50%", approver: "Managing Director", status: "Active" },
  ],
};

export const MasterSetup: React.FC = () => {
  const [viewMode, setViewMode] = useState<"GRID" | "DETAIL">("GRID");
  const [selectedMasterId, setSelectedMasterId] = useState<string>("area");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [records, setRecords] = useState<Record<string, any[]>>(INITIAL_RECORDS);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  const currentCategory = useMemo(() => {
    return MASTER_CATEGORIES.find((m) => m.id === selectedMasterId) || MASTER_CATEGORIES[0];
  }, [selectedMasterId]);

  const basicMasters = useMemo(() => {
    return MASTER_CATEGORIES.filter((m) => m.group === "BASIC");
  }, []);

  const accountingMasters = useMemo(() => {
    return MASTER_CATEGORIES.filter((m) => m.group === "ACCOUNTING");
  }, []);

  // Filtered by global search for the grid view
  const filteredBasicMasters = useMemo(() => {
    if (!searchQuery.trim()) return basicMasters;
    return basicMasters.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [basicMasters, searchQuery]);

  const filteredAccountingMasters = useMemo(() => {
    if (!searchQuery.trim()) return accountingMasters;
    return accountingMasters.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [accountingMasters, searchQuery]);

  const activeRecords = useMemo(() => {
    const raw = records[selectedMasterId] || [];
    return raw.filter((r) => {
      const matchesSearch = Object.values(r).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, selectedMasterId, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    const initial: Record<string, string> = { status: "Active" };
    currentCategory.columns.forEach((col) => {
      initial[col.key] = "";
    });
    setFormFields(initial);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingRecord(item);
    setFormFields({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this master entry?")) {
      setRecords((prev) => ({
        ...prev,
        [selectedMasterId]: (prev[selectedMasterId] || []).filter((r) => r.id !== id),
      }));
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      // Edit
      setRecords((prev) => ({
        ...prev,
        [selectedMasterId]: (prev[selectedMasterId] || []).map((r) =>
          r.id === editingRecord.id ? { ...r, ...formFields } : r
        ),
      }));
    } else {
      // Add
      const newEntry = {
        id: String(Date.now()),
        ...formFields,
        status: formFields.status || "Active",
      };
      setRecords((prev) => ({
        ...prev,
        [selectedMasterId]: [newEntry, ...(prev[selectedMasterId] || [])],
      }));
    }
    setIsModalOpen(false);
  };

  const exportToCSV = () => {
    const headers = currentCategory.columns.map((c) => c.label).join(",");
    const rows = activeRecords.map((r) =>
      currentCategory.columns.map((c) => `"${r[c.key] || ""}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedMasterId}_master_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectMasterCard = (id: string) => {
    setSelectedMasterId(id);
    setViewMode("DETAIL");
    setSearchQuery("");
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* ─── TOP HEADER BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1769AA] flex items-center justify-center text-white shadow-md shadow-[#1769AA]/30">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Master Setup
                <Badge variant="outline" className="bg-[#1769AA]/10 text-[#1769AA] border-[#1769AA]/30 font-bold text-xs">
                  25 Entities
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                ZenoxERP Centralized Matrix Configuration for Aadya Institute of Technology
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Button
            size="sm"
            variant={viewMode === "GRID" ? "default" : "ghost"}
            onClick={() => setViewMode("GRID")}
            className={`font-bold text-xs gap-1.5 transition-all ${
              viewMode === "GRID"
                ? "bg-[#1769AA] text-white hover:bg-[#1769AA]/90 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={14} />
            Zenox Grid View
          </Button>

          <Button
            size="sm"
            variant={viewMode === "DETAIL" ? "default" : "ghost"}
            onClick={() => setViewMode("DETAIL")}
            className={`font-bold text-xs gap-1.5 transition-all ${
              viewMode === "DETAIL"
                ? "bg-[#1769AA] text-white hover:bg-[#1769AA]/90 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List size={14} />
            Table & CRUD View
          </Button>
        </div>
      </div>

      {/* ─── FULL-WIDTH ZENOX SEARCH INPUT BAR ─────────────────────────── */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search master modules, entities, codes, descriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 text-sm bg-white border border-slate-300 rounded-lg shadow-xs focus-visible:ring-1 focus-visible:ring-[#1769AA]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* ─── MODE 1: AUTHENTIC ZENOXERP GRID VIEW (Exact Screenshot Parity) ── */}
      {viewMode === "GRID" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* SECTION 1: BASIC MASTERS (20 TILES IN 4 COLUMNS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                Basic
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {filteredBasicMasters.length} Modules
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBasicMasters.map((cat) => {
                const count = records[cat.id]?.length ?? cat.count;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectMasterCard(cat.id)}
                    className="group relative flex items-center justify-between bg-[#1185E0] hover:bg-[#0E70BD] text-white px-5 py-3.5 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 active:scale-[0.99] border border-[#0E70BD]"
                  >
                    <span className="text-sm font-semibold tracking-wide select-none">
                      {cat.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white group-hover:bg-white/30">
                        {count}
                      </span>
                      <div
                        title={cat.description}
                        className="h-5 w-5 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors"
                      >
                        <HelpCircle size={13} className="text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: ACCOUNTING MASTERS (5 TILES IN 4 COLUMNS) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                Accounting
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {filteredAccountingMasters.length} Modules
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAccountingMasters.map((cat) => {
                const count = records[cat.id]?.length ?? cat.count;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectMasterCard(cat.id)}
                    className="group relative flex items-center justify-between bg-[#1185E0] hover:bg-[#0E70BD] text-white px-5 py-3.5 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 active:scale-[0.99] border border-[#0E70BD]"
                  >
                    <span className="text-sm font-semibold tracking-wide select-none">
                      {cat.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white group-hover:bg-white/30">
                        {count}
                      </span>
                      <div
                        title={cat.description}
                        className="h-5 w-5 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors"
                      >
                        <HelpCircle size={13} className="text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODE 2: INTERACTIVE TABLE & CRUD DETAIL VIEW ───────────────── */}
      {viewMode === "DETAIL" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode("GRID")}
                className="gap-1.5 text-xs font-bold text-slate-700 bg-white border-slate-300 hover:bg-slate-100"
              >
                <ArrowLeft size={14} />
                Back to Master Grid
              </Button>

              <div className="h-4 w-[1px] bg-slate-300" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {currentCategory.group === "BASIC" ? "Basic Masters" : "Accounting Masters"}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentCategory.name}
                </span>
              </div>
            </div>

            {/* Quick Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden md:inline">Jump to Master:</span>
              <select
                value={selectedMasterId}
                onChange={(e) => {
                  setSelectedMasterId(e.target.value);
                  setSearchQuery("");
                }}
                className="h-8 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 focus:outline-none cursor-pointer"
              >
                <optgroup label="── Basic Masters (20) ──">
                  {basicMasters.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── Accounting Masters (5) ──">
                  {accountingMasters.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Master Table Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#1185E0] text-white flex items-center justify-center shadow-xs">
                    {React.createElement(currentCategory.icon, { size: 20 })}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {currentCategory.name} Master
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-[#1769AA]">
                        {activeRecords.length} Records
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {currentCategory.description}
                    </CardDescription>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportToCSV}
                    className="font-semibold text-xs gap-1.5 text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                  >
                    <Download size={14} />
                    Export CSV
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleOpenAdd}
                    className="font-bold text-xs gap-1.5 bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-xs transition-colors"
                  >
                    <Plus size={15} />
                    Add {currentCategory.name}
                  </Button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/80">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs font-bold text-slate-600">#</TableHead>
                      {currentCategory.columns.map((col) => (
                        <TableHead key={col.key} className="text-xs font-bold text-slate-700">
                          {col.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-right text-xs font-bold text-slate-700 pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRecords.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={currentCategory.columns.length + 2}
                          className="h-32 text-center text-slate-500 text-xs"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Boxes size={28} className="text-slate-300" />
                            <p className="font-semibold text-slate-600">No entries found matching criteria</p>
                            <Button size="sm" variant="outline" onClick={handleOpenAdd} className="text-xs mt-1">
                              + Create first entry
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeRecords.map((row, idx) => (
                        <TableRow key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-center text-xs font-medium text-slate-400">
                            {idx + 1}
                          </TableCell>
                          {currentCategory.columns.map((col) => {
                            const val = row[col.key];

                            if (col.key === "status") {
                              return (
                                <TableCell key={col.key}>
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] font-bold ${
                                      val === "Active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {val || "Active"}
                                  </Badge>
                                </TableCell>
                              );
                            }

                            if (col.key === "color") {
                              return (
                                <TableCell key={col.key}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full border border-slate-300"
                                      style={{ backgroundColor: String(val).toLowerCase() }}
                                    />
                                    <span className="text-xs font-medium text-slate-700">{val}</span>
                                  </div>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={col.key} className="text-xs font-medium text-slate-800">
                                {val || "—"}
                              </TableCell>
                            );
                          })}

                          {/* Action Buttons */}
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(row)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-[#1769AA] hover:bg-blue-50 rounded-md"
                              >
                                <Edit2 size={13} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(row.id)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── DYNAMIC ADD / EDIT MODAL FOR MASTER ENTITY ─────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              {editingRecord ? `Edit ${currentCategory.name}` : `Add New ${currentCategory.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Fill in required parameters according to ZenoxERP field specifications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModal} className="space-y-3.5 py-2">
            {currentCategory.columns.map((col) => {
              if (col.key === "status") {
                return (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">{col.label}</label>
                    <select
                      value={formFields.status || "Active"}
                      onChange={(e) => setFormFields((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full h-9 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                );
              }

              return (
                <div key={col.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{col.label}</label>
                  <Input
                    placeholder={`Enter ${col.label}...`}
                    value={formFields[col.key] || ""}
                    onChange={(e) =>
                      setFormFields((prev) => ({
                        ...prev,
                        [col.key]: e.target.value,
                      }))
                    }
                    required
                    className="h-9 text-xs"
                  />
                </div>
              );
            })}

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1769AA] hover:bg-[#F39A16] text-white text-xs font-bold"
              >
                {editingRecord ? "Save Changes" : "Create Master Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
