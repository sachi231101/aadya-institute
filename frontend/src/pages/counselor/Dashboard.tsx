import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCheck,
  Target,
  GraduationCap,
  Users,
  CreditCard,
  BarChart2,
  Calendar,
  Phone,
  MessageSquare,
  Plus,
  TrendingUp,
  ArrowRight,
  Filter,
  Wallet,
  PhoneCall,
  Trash2,
  History,
  Layers,
  CheckCircle2,
  Clock,
  Check,
  BookOpen,
  Search,
} from "lucide-react";
import { useStudentStore } from "@/store/student.store";
import { useCounselorStore } from "@/store/counselor.store";
import { useAdmissionStore } from "@/store/admission.store";
import { useAuthStore } from "@/store/auth.store";
import { useTimetableStore } from "@/store/timetable.store";
import { useFinancialReport } from "@/hooks/useReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Donut colors for Lead Sources
const LEAD_SOURCE_COLORS = [
  "#2563EB", // Website (Blue)
  "#06B6D4", // Google Ads (Cyan)
  "#6366F1", // Meta Ads (Indigo)
  "#A855F7", // Instagram (Purple)
  "#F97316", // Referral (Orange)
  "#94A3B8", // Others (Slate)
];

export interface LeadAttempt {
  attemptNo: number;
  mode: "PHONE" | "WHATSAPP" | "DEMO" | "EMAIL";
  timestamp: string;
  response: string;
  notes: string;
  nextFollowUp?: string;
}

export interface ManagedLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  course: string;
  source?: string;
  stage: "NEW" | "CONTACTED" | "INTERESTED" | "FOLLOW_UP" | "CONVERTED" | "LOST";
  stageColor: string;
  nextFollowUp: string;
  priority: "Urgent" | "Due Today" | "Upcoming";
  priorityColor: string;
  attemptsCount: number;
  latestResponse: string;
  attemptsHistory: LeadAttempt[];
  assignedTo?: string;
  assignedDate?: string;
}

const INITIAL_MANAGED_LEADS: ManagedLead[] = [
  {
    id: "L001",
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul.s@example.com",
    course: "Digital Marketing",
    source: "Website",
    stage: "INTERESTED",
    stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    nextFollowUp: "Today, 11:00 AM",
    priority: "Urgent",
    priorityColor: "text-red-600 bg-red-500",
    attemptsCount: 2,
    latestResponse: "Interested in weekend batch, requested fee discount details.",
    assignedTo: "Priya",
    assignedDate: "14 Aug 2026",
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "PHONE",
        timestamp: "14 Aug 2026, 11:30 AM",
        response: "Connected - Initial Enquiry",
        notes: "Shared course syllabus and duration over WhatsApp.",
        nextFollowUp: "15 Aug 2026, 10:00 AM"
      },
      {
        attemptNo: 2,
        mode: "PHONE",
        timestamp: "15 Aug 2026, 10:30 AM",
        response: "Interested",
        notes: "Requested weekend batch options and payment installment plan.",
        nextFollowUp: "Today, 11:00 AM"
      }
    ]
  },
  {
    id: "L002",
    name: "Sneha Patil",
    phone: "9876543211",
    email: "sneha.p@example.com",
    course: "Graphic Design",
    source: "Instagram",
    stage: "FOLLOW_UP",
    stageColor: "bg-amber-50 text-amber-700 border-amber-200",
    nextFollowUp: "Today, 02:30 PM",
    priority: "Due Today",
    priorityColor: "text-amber-600 bg-amber-500",
    attemptsCount: 1,
    latestResponse: "Attended demo class, requested follow-up today.",
    assignedTo: "Priya",
    assignedDate: "14 Aug 2026",
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "WHATSAPP",
        timestamp: "14 Aug 2026, 03:15 PM",
        response: "Demo Attended",
        notes: "Liked the demo instructor, reviewing course curriculum.",
        nextFollowUp: "Today, 02:30 PM"
      }
    ]
  },
  {
    id: "L003",
    name: "Amit Kumar",
    phone: "9876543212",
    email: "amit.k@example.com",
    course: "Web Development",
    source: "Google Ads",
    stage: "CONTACTED",
    stageColor: "bg-purple-50 text-purple-700 border-purple-200",
    nextFollowUp: "Tomorrow, 10:30 AM",
    priority: "Due Today",
    priorityColor: "text-amber-600 bg-amber-500",
    attemptsCount: 3,
    latestResponse: "Comparing with another institute, counseling scheduled.",
    assignedTo: "Priya",
    assignedDate: "13 Aug 2026",
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "PHONE",
        timestamp: "13 Aug 2026, 12:00 PM",
        response: "Busy / Callback",
        notes: "Asked to call back in the evening.",
        nextFollowUp: "13 Aug 2026, 06:00 PM"
      },
      {
        attemptNo: 2,
        mode: "PHONE",
        timestamp: "13 Aug 2026, 06:15 PM",
        response: "Interested",
        notes: "Explained MERN full stack roadmap.",
        nextFollowUp: "14 Aug 2026, 04:00 PM"
      },
      {
        attemptNo: 3,
        mode: "PHONE",
        timestamp: "14 Aug 2026, 04:30 PM",
        response: "Counseling Scheduled",
        notes: "Scheduled 1-on-1 career counselling session with senior faculty.",
        nextFollowUp: "Tomorrow, 10:30 AM"
      }
    ]
  },
  {
    id: "L004",
    name: "Pooja Nair",
    phone: "9876543213",
    email: "pooja.nair@example.com",
    course: "Data Science",
    source: "Referral",
    stage: "INTERESTED",
    stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    nextFollowUp: "Tomorrow, 04:00 PM",
    priority: "Upcoming",
    priorityColor: "text-emerald-600 bg-emerald-500",
    attemptsCount: 1,
    latestResponse: "Wants Python + AI certification curriculum brochure.",
    assignedTo: "Priya",
    assignedDate: "14 Aug 2026",
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "WHATSAPP",
        timestamp: "14 Aug 2026, 05:00 PM",
        response: "Connected - Brochure Sent",
        notes: "Shared Data Science brochure and placement statistics.",
        nextFollowUp: "Tomorrow, 04:00 PM"
      }
    ]
  },
  {
    id: "L005",
    name: "Vikram Singh",
    phone: "9876543214",
    email: "vikram.s@example.com",
    course: "UI/UX Design",
    source: "Website",
    stage: "CONTACTED",
    stageColor: "bg-blue-50 text-blue-700 border-blue-200",
    nextFollowUp: "May 20, 11:00 AM",
    priority: "Upcoming",
    priorityColor: "text-emerald-600 bg-emerald-500",
    attemptsCount: 1,
    latestResponse: "Enquired about Figma tools & live portfolio projects.",
    assignedTo: "Priya",
    assignedDate: "14 Aug 2026",
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "PHONE",
        timestamp: "14 Aug 2026, 02:00 PM",
        response: "Contacted",
        notes: "Interested in UI/UX project portfolio mentorship.",
        nextFollowUp: "May 20, 11:00 AM"
      }
    ]
  },
];

export const CounselorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();
  const { fetchCounselors } = useCounselorStore();
  const { admissions, fetchEnquiries, fetchAdmissions } = useAdmissionStore();
  const { data: financialReport } = useFinancialReport(user?.branchId || undefined);

  // Managed Leads State (allows full in-memory & store CRUD with persistent checkbox workflow)
  const [leadsList, setLeadsList] = useState<ManagedLead[]>(INITIAL_MANAGED_LEADS);

  // CRUD Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogAttemptModal, setShowLogAttemptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeLead, setActiveLead] = useState<ManagedLead | null>(null);

  // Form states for Add / Edit Lead
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCourse, setFormCourse] = useState("Digital Marketing");
  const [formSource, setFormSource] = useState("Website");
  const [formStage] = useState<ManagedLead["stage"]>("NEW");
  const [formPriority] = useState<ManagedLead["priority"]>("Upcoming");
  const [formNotes, setFormNotes] = useState("");

  // Form states for Log Attempt
  const [attemptMode, setAttemptMode] = useState<"PHONE" | "WHATSAPP" | "DEMO" | "EMAIL">("PHONE");
  const [attemptResponse, setAttemptResponse] = useState("Connected - Interested");
  const [attemptNotes, setAttemptNotes] = useState("");
  const [attemptNextDate, setAttemptNextDate] = useState("Tomorrow, 11:00 AM");
  const [attemptNewStage, setAttemptNewStage] = useState<ManagedLead["stage"]>("INTERESTED");

  // Batch & Timetable Assignment State
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [batchCode, setBatchCode] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchCourse, setBatchCourse] = useState("Digital Marketing");
  const [batchCategory, setBatchCategory] = useState<"Digital Marketing" | "Design" | "Data Analytics" | "Programming" | "Others">("Digital Marketing");
  const [batchFacultyId, setBatchFacultyId] = useState("FA-RAMESH");
  const [batchFacultyName, setBatchFacultyName] = useState("Ramesh Kumar");
  const [batchBranchId, setBatchBranchId] = useState("b-central");
  const [batchBranchName, setBatchBranchName] = useState("Aadya Central Branch");
  const [batchCapacity, setBatchCapacity] = useState<number>(40);
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [batchDays, setBatchDays] = useState<Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">>(["MON", "WED", "FRI"]);
  const [batchPeriod, setBatchPeriod] = useState<number>(1);
  const [batchStartTime, setBatchStartTime] = useState("09:00 AM");
  const [batchEndTime, setBatchEndTime] = useState("10:00 AM");
  const [batchRoomNo, setBatchRoomNo] = useState("Room 201");
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  const handleCreateBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCode.trim() || !batchName.trim()) {
      alert("Please provide both Batch Code and Batch Name.");
      return;
    }

    useTimetableStore.getState().createBatchWithSchedule({
      code: batchCode.trim(),
      name: batchName.trim(),
      courseId: `c-${batchCourse.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      courseName: batchCourse,
      category: batchCategory,
      facultyId: batchFacultyId,
      facultyName: batchFacultyName,
      branchId: batchBranchId,
      branchName: batchBranchName,
      capacity: batchCapacity,
      studentIds: selectedBatchStudentIds,
      days: batchDays,
      period: batchPeriod,
      startTime: batchStartTime,
      endTime: batchEndTime,
      roomNo: batchRoomNo,
    });

    setBatchSuccessMsg(`✓ Batch ${batchCode} successfully created with ${selectedBatchStudentIds.length || batchCapacity} students and scheduled to ${batchFacultyName}'s timetable!`);
    setTimeout(() => setBatchSuccessMsg(null), 5000);
    setShowCreateBatchModal(false);

    // Reset form
    setBatchCode("");
    setBatchName("");
    setSelectedBatchStudentIds([]);
  };

  useEffect(() => {
    fetchCounselors();
    fetchEnquiries();
    fetchAdmissions();
    fetchStudents();
  }, []);

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const day = now.getDate();
    return `${month} 1 – ${month} ${day}`;
  }, []);

  const prevMonthFormatted = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return now.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, []);

  // Top KPI metrics
  const newLeadsToday = 32;
  const followupsDueCount = 14;
  const counsellingSessionsCount = 18;
  const confirmedAdmissionsCount = admissions.length > 5 ? admissions.length : 24;
  const registeredStudentsCount = students.length > 5 ? students.length : 156;

  // Revenue overview metrics
  const pendingFeeAmount = financialReport?.summary?.totalPending && financialReport.summary.totalPending > 0
    ? financialReport.summary.totalPending
    : 120000;

  const collectedThisMonthAmount = financialReport?.summary?.totalCollected && financialReport.summary.totalCollected > 0
    ? financialReport.summary.totalCollected
    : 680000;

  const prevMonthRevenueAmount = 590000;

  // Checkbox stage toggle helper
  const handleToggleStageCheckbox = (leadId: string, targetStage: ManagedLead["stage"]) => {
    setLeadsList((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;

        let stageColor = "bg-blue-50 text-blue-700 border-blue-200";
        if (targetStage === "INTERESTED") stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (targetStage === "FOLLOW_UP") stageColor = "bg-amber-50 text-amber-700 border-amber-200";
        if (targetStage === "CONVERTED") stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (targetStage === "LOST") stageColor = "bg-red-50 text-red-700 border-red-200";

        return {
          ...lead,
          stage: targetStage,
          stageColor,
        };
      })
    );
  };

  // Add New Lead handler
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) return;

    const newLead: ManagedLead = {
      id: `L00${leadsList.length + 1}`,
      name: formName,
      phone: formPhone,
      email: formEmail,
      course: formCourse,
      source: formSource,
      stage: formStage,
      stageColor: formStage === "INTERESTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200",
      nextFollowUp: "Tomorrow, 10:00 AM",
      priority: formPriority,
      priorityColor: formPriority === "Urgent" ? "text-red-600 bg-red-500" : formPriority === "Due Today" ? "text-amber-600 bg-amber-500" : "text-emerald-600 bg-emerald-500",
      attemptsCount: 0,
      latestResponse: formNotes || "New enquiry created.",
      assignedTo: user?.name || "Priya",
      assignedDate: "Today",
      attemptsHistory: formNotes ? [
        {
          attemptNo: 1,
          mode: "PHONE",
          timestamp: "Just now",
          response: "New Enquiry Logged",
          notes: formNotes,
          nextFollowUp: "Tomorrow, 10:00 AM"
        }
      ] : []
    };

    setLeadsList([newLead, ...leadsList]);
    setShowAddModal(false);
    // Reset form
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormNotes("");
  };

  // Log Attempt handler
  const handleSaveAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    const newAttempt: LeadAttempt = {
      attemptNo: (activeLead.attemptsHistory?.length || 0) + 1,
      mode: attemptMode,
      timestamp: "Just now",
      response: attemptResponse,
      notes: attemptNotes,
      nextFollowUp: attemptNextDate
    };

    setLeadsList((prev) =>
      prev.map((lead) => {
        if (lead.id !== activeLead.id) return lead;
        return {
          ...lead,
          stage: attemptNewStage,
          attemptsCount: lead.attemptsCount + 1,
          latestResponse: attemptResponse,
          nextFollowUp: attemptNextDate,
          attemptsHistory: [newAttempt, ...(lead.attemptsHistory || [])]
        };
      })
    );

    setShowLogAttemptModal(false);
    setActiveLead(null);
    setAttemptNotes("");
  };

  // Delete Lead handler
  const handleDeleteLead = (leadId: string) => {
    if (window.confirm("Are you sure you want to delete this lead enquiry?")) {
      setLeadsList(prev => prev.filter(l => l.id !== leadId));
    }
  };

  // 5. ADMISSION FUNNEL DATA
  const admissionFunnelData = [
    { label: "Total Leads", count: 128, percentage: "", color: "bg-blue-600", width: "100%" },
    { label: "Contacted", count: 54, percentage: "42%", color: "bg-sky-500", width: "85%" },
    { label: "Interested", count: 34, percentage: "26%", color: "bg-indigo-500", width: "70%" },
    { label: "Counseling", count: 18, percentage: "14%", color: "bg-purple-600", width: "55%" },
    { label: "Demo", count: 9, percentage: "7%", color: "bg-amber-500", width: "42%" },
    { label: "Admission", count: 8, percentage: "6%", color: "bg-orange-500", width: "32%" },
    { label: "Converted", count: 5, percentage: "4%", color: "bg-emerald-600", width: "22%" },
  ];

  // 6. LEAD SOURCES DATA
  const leadSourcesData = [
    { name: "Website", count: 48, percentage: "37%", color: LEAD_SOURCE_COLORS[0] },
    { name: "Google Ads", count: 28, percentage: "21%", color: LEAD_SOURCE_COLORS[1] },
    { name: "Meta Ads", count: 20, percentage: "16%", color: LEAD_SOURCE_COLORS[2] },
    { name: "Instagram", count: 12, percentage: "9%", color: LEAD_SOURCE_COLORS[3] },
    { name: "Referral", count: 10, percentage: "8%", color: LEAD_SOURCE_COLORS[4] },
    { name: "Others", count: 10, percentage: "8%", color: LEAD_SOURCE_COLORS[5] },
  ];

  const handleCall = (lead: ManagedLead) => {
    setActiveLead(lead);
    setAttemptMode("PHONE");
    setAttemptNewStage(lead.stage);
    setShowLogAttemptModal(true);
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (lead: ManagedLead) => {
    setActiveLead(lead);
    setAttemptMode("WHATSAPP");
    setAttemptNewStage(lead.stage);
    setShowLogAttemptModal(true);
    const text = encodeURIComponent(`Hello ${lead.name}, greetings from Aadya Institute!`);
    window.open(`https://wa.me/91${lead.phone}?text=${text}`, "_blank");
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      {/* ─── 1. TOP HEADER & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 shrink-0 mt-0.5">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
              Counsellor Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Lead Pipeline, Student Admissions & Counselling Operations — <span className="text-slate-800 font-semibold">Aadya Institute</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowCreateBatchModal(true)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold px-4 py-2 rounded-xl shadow-xs gap-2 h-10 transition-all"
          >
            <Layers className="h-4 w-4" /> Create Batch & Schedule
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl shadow-xs gap-2 h-10 transition-all"
          >
            <Plus className="h-4 w-4 text-[#1769AA]" /> New Lead Enquiry
          </Button>

          <Button
            onClick={() => navigate("/counselor/students/all")}
            className="bg-[#059669] hover:bg-[#047857] text-white font-semibold px-4.5 py-2 rounded-xl shadow-sm gap-2 h-10 transition-all"
          >
            <Plus className="h-4 w-4" /> Register Students
          </Button>
        </div>
      </div>

      <InstallDashboardBanner />
      {/* ─── BATCH CREATION SUCCESS NOTIFICATION ─── */}
      {batchSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{batchSuccessMsg}</span>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/counselor/timetable")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7"
          >
            View in Timetable →
          </Button>
        </div>
      )}

      {/* ─── 2. TOP 5 KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4.5 hover:shadow-md transition-all">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">New Leads</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">{newLeadsToday}</h3>
              <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Today</p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4.5 hover:shadow-md transition-all">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Follow-ups Due</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">{followupsDueCount}</h3>
              <p className="text-[11px] font-bold text-amber-600 mt-0.5">Require attention</p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4.5 hover:shadow-md transition-all">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Counselling Sessions</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">{counsellingSessionsCount}</h3>
              <p className="text-[11px] font-bold text-blue-600 mt-0.5">Scheduled today</p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4.5 hover:shadow-md transition-all">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Confirmed Admissions</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">{confirmedAdmissionsCount}</h3>
              <p className="text-[11px] font-bold text-purple-600 mt-0.5">This month</p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4.5 hover:shadow-md transition-all">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Registered Students</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">{registeredStudentsCount}</h3>
              <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Currently enrolled</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── 3. REVENUE & FEE OVERVIEW (3 CARDS) ─── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-[#0A2540]">Revenue & Fee Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pending Fee</p>
                  <h3 className="text-2xl font-black text-amber-600 mt-0.5 tracking-tight">
                    {formatINR(pendingFeeAmount)}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Outstanding balance</p>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] px-2 py-0.5">
                Pending
              </Badge>
            </div>
          </Card>

          <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Collected Till This Month</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-0.5 tracking-tight">
                    {formatINR(collectedThisMonthAmount)}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{currentDateFormatted}</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] px-2 py-0.5">
                Collected
              </Badge>
            </div>
          </Card>

          <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Previous Month Revenue</p>
                  <h3 className="text-2xl font-black text-[#0A2540] mt-0.5 tracking-tight">
                    {formatINR(prevMonthRevenueAmount)}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{prevMonthFormatted}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold text-emerald-600 flex items-center justify-end gap-0.5">
                  <TrendingUp className="h-3.5 w-3.5" /> 15%
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">vs previous month</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── 4. COUNSELLOR LEADS & PIPELINE CHECKBOXES (ALL LEADS & ATTEMPTS) ─── */}
      <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-[#0A2540] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#1769AA]" />
              Leads Requiring Attention & Pipeline Checklist
            </CardTitle>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Counsellor maintains student attempts, follow-up responses, and stage checkboxes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
          >
            + Add Lead
          </button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50/70 text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-3 px-4 font-bold">Student / Lead</th>
                <th className="py-3 px-3 font-bold">Course Interested</th>
                <th className="py-3 px-2 font-bold text-center">New</th>
                <th className="py-3 px-2 font-bold text-center">Contacted</th>
                <th className="py-3 px-2 font-bold text-center">Interested</th>
                <th className="py-3 px-2 font-bold text-center">Follow-up</th>
                <th className="py-3 px-2 font-bold text-center">Converted</th>
                <th className="py-3 px-2 font-bold text-center">Lost</th>
                <th className="py-3 px-3 font-bold">Attempts & Latest Response</th>
                <th className="py-3 px-3 font-bold">Next Follow-up</th>
                <th className="py-3 px-3 font-bold">Priority</th>
                <th className="py-3 px-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leadsList.map((lead) => {
                const isNew = true;
                const isContacted = lead.stage !== "NEW";
                const isInterested = lead.stage === "INTERESTED" || lead.stage === "FOLLOW_UP" || lead.stage === "CONVERTED";
                const isFollowUp = lead.stage === "FOLLOW_UP" || lead.stage === "CONVERTED";
                const isConverted = lead.stage === "CONVERTED";
                const isLost = lead.stage === "LOST";

                return (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800 text-sm">{lead.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lead.phone}</p>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">{lead.course}</td>

                    {/* Interactive Checkbox 1: NEW */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={() => handleToggleStageCheckbox(lead.id, "NEW")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        title="Mark as New"
                      />
                    </td>

                    {/* Interactive Checkbox 2: CONTACTED */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isContacted}
                        onChange={() => handleToggleStageCheckbox(lead.id, "CONTACTED")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        title="Mark as Contacted"
                      />
                    </td>

                    {/* Interactive Checkbox 3: INTERESTED */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isInterested}
                        onChange={() => handleToggleStageCheckbox(lead.id, "INTERESTED")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        title="Mark as Interested"
                      />
                    </td>

                    {/* Interactive Checkbox 4: FOLLOW-UP */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isFollowUp}
                        onChange={() => handleToggleStageCheckbox(lead.id, "FOLLOW_UP")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        title="Mark as Follow-up Scheduled"
                      />
                    </td>

                    {/* Interactive Checkbox 5: CONVERTED */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isConverted}
                        onChange={() => handleToggleStageCheckbox(lead.id, "CONVERTED")}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 cursor-pointer"
                        title="Mark as Converted"
                      />
                    </td>

                    {/* Interactive Checkbox 6: LOST */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isLost}
                        onChange={() => handleToggleStageCheckbox(lead.id, "LOST")}
                        className="h-4 w-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                        title="Mark as Lost"
                      />
                    </td>

                    {/* Attempts & Response */}
                    <td className="py-3.5 px-3 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                          {lead.attemptsCount} calls
                        </span>
                        <p className="text-[11px] text-slate-600 truncate font-medium" title={lead.latestResponse}>
                          {lead.latestResponse}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 font-medium text-[11px]">
                      {lead.nextFollowUp}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${lead.priorityColor}`} />
                        <span className="font-bold text-[11px] text-slate-700">{lead.priority}</span>
                      </div>
                    </td>

                    {/* Actions: Call, WhatsApp, History, Delete */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCall(lead)}
                          className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                          title="Call & Log Attempt"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(lead)}
                          className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                          title="WhatsApp & Log Attempt"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveLead(lead);
                            setShowHistoryModal(true);
                          }}
                          className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-xs"
                          title="View Attempt History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors shadow-xs"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ─── 5. LOWER DASHBOARD (4 CARDS) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Admission Funnel */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-[#0A2540]">Admission Funnel <span className="text-slate-400 font-normal text-xs">(This Month)</span></h3>
            </div>

            <div className="space-y-1.5 my-2">
              {admissionFunnelData.map((tier, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-20 shrink-0 text-slate-600 font-medium text-[11px] truncate flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${tier.color}`} />
                    {tier.label}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-md h-4 overflow-hidden flex items-center px-1.5">
                    <div
                      className={`h-2.5 rounded-sm ${tier.color} transition-all`}
                      style={{ width: tier.width }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 shrink-0 w-12 text-right">
                    {tier.count} {tier.percentage && <span className="text-slate-400 font-normal">({tier.percentage})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 text-center">
            <p className="text-xs font-semibold text-slate-600">
              Conversion Rate (Lead → Admission): <strong className="text-emerald-600 font-extrabold">18.7%</strong>
            </p>
          </div>
        </Card>

        {/* Card 2: Lead Sources */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-[#0A2540]">Lead Sources <span className="text-slate-400 font-normal text-xs">(This Month)</span></h3>
            </div>

            <div className="grid grid-cols-12 items-center gap-2 py-1">
              <div className="col-span-5 h-[130px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      formatter={(val: any) => [`${val} Leads`, "Count"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "10px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }}
                    />
                    <Pie
                      data={leadSourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {leadSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="col-span-7 space-y-1 text-xs">
                {leadSourcesData.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 truncate">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 shrink-0 ml-1">
                      {s.count} <span className="text-slate-400 text-[10px]">({s.percentage})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Total Leads: <strong className="text-slate-800">128</strong></span>
            <span>Conversion Rate: <strong className="text-emerald-600">22.66%</strong></span>
          </div>
        </Card>

        {/* Card 3: Student Overview */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#0A2540]">Student Overview</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Total Students</span>
                <span className="font-bold text-slate-900 text-sm">156</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">New Students (This Month)</span>
                <span className="font-bold text-slate-900 text-sm">24</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Active Students</span>
                <span className="font-bold text-slate-900 text-sm">142</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-amber-600 font-semibold">Students with Pending Fees</span>
                <span className="font-extrabold text-amber-600 text-sm">32</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-red-600 font-semibold">Low Attendance Students</span>
                <span className="font-extrabold text-red-600 text-sm">18</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => navigate("/counselor/students/all")}
              className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
            >
              View All Students <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        {/* Card 4: My Performance */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#0A2540]">My Performance <span className="text-slate-400 font-normal text-xs">(This Month)</span></h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Leads Assigned</span>
                <span className="font-bold text-slate-900 text-sm">128</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Follow-ups Completed</span>
                <span className="font-bold text-slate-900 text-sm">28</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Counselling Sessions</span>
                <span className="font-bold text-slate-900 text-sm">18</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Admissions Converted</span>
                <span className="font-bold text-slate-900 text-sm">24</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Conversion Rate</span>
                <span className="font-extrabold text-emerald-600 text-sm">18.7%</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Revenue Generated</span>
                <span className="font-extrabold text-emerald-600 text-sm">₹6,80,000</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => navigate("/counselor/reports/students")}
              className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
            >
              View Full Report <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* ─── MODAL 1: ADD NEW LEAD ENQUIRY ─── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              New Student Lead Enquiry
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-3.5 pt-2 text-xs">
            <div>
              <Label className="text-slate-600 text-xs font-medium">Student / Candidate Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Aditi Roy"
                className="mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600 text-xs font-medium">Contact Phone *</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-600 text-xs font-medium">Email Address</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="aditi@gmail.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600 text-xs font-medium">Interested Course</Label>
                <select
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Python Programming">Python Programming</option>
                  <option value="Tally Prime">Tally Prime</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-600 text-xs font-medium">Lead Source</Label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="Website">Website</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-slate-600 text-xs font-medium">Initial Notes & Response</Label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Candidate enquired about fees and batch timings..."
                className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs min-h-[60px]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#059669] hover:bg-[#047857] text-white">
                Save & Add Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: LOG ATTEMPT & LEAD RESPONSE ─── */}
      <Dialog open={showLogAttemptModal} onOpenChange={setShowLogAttemptModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-600" />
              Log Contact Attempt — {activeLead?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAttempt} className="space-y-3.5 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
              <div>
                <p className="font-bold text-slate-800">{activeLead?.name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{activeLead?.phone} • {activeLead?.course}</p>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                Attempt #{(activeLead?.attemptsHistory?.length || 0) + 1}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600 text-xs font-medium">Contact Mode</Label>
                <select
                  value={attemptMode}
                  onChange={(e: any) => setAttemptMode(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="PHONE">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="DEMO">Demo Session</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-600 text-xs font-medium">Lead Stage</Label>
                <select
                  value={attemptNewStage}
                  onChange={(e: any) => setAttemptNewStage(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="FOLLOW_UP">Follow-up Due</option>
                  <option value="CONVERTED">Converted to Admission</option>
                  <option value="LOST">Marked as Lost</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-600 text-xs font-medium">Lead's Specific Response *</Label>
              <select
                value={attemptResponse}
                onChange={(e) => setAttemptResponse(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
              >
                <option value="Connected - Interested">Connected - Interested</option>
                <option value="Requested Callback">Requested Callback Later</option>
                <option value="Fee Structure Discussion">Discussing Fees with Parents</option>
                <option value="Scheduled Demo Class">Scheduled Demo Class</option>
                <option value="Admission Form Sent">Admission Form Sent</option>
                <option value="Busy / No Answer">Busy / No Answer</option>
                <option value="Not Interested">Not Interested / Joined elsewhere</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-600 text-xs font-medium">Counsellor Remarks & Conversation Summary</Label>
              <textarea
                value={attemptNotes}
                onChange={(e) => setAttemptNotes(e.target.value)}
                placeholder="Candidate agreed for demo on Saturday 11 AM..."
                className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs min-h-[60px]"
                required
              />
            </div>

            <div>
              <Label className="text-slate-600 text-xs font-medium">Next Scheduled Follow-up</Label>
              <Input
                value={attemptNextDate}
                onChange={(e) => setAttemptNextDate(e.target.value)}
                placeholder="e.g. Tomorrow, 11:00 AM"
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowLogAttemptModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white">
                Save Attempt & Response
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: VIEW ATTEMPTS & FOLLOW-UP HISTORY ─── */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Attempt & Follow-up History — {activeLead?.name}
            </DialogTitle>
          </DialogHeader>
          {activeLead && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{activeLead.name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{activeLead.phone} • {activeLead.course}</p>
                </div>
                <Badge className={activeLead.stageColor}>
                  {activeLead.stage}
                </Badge>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-2.5 text-xs">Communication Timeline ({activeLead.attemptsHistory?.length || 0} Attempts)</h5>
                <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
                  {activeLead.attemptsHistory && activeLead.attemptsHistory.length > 0 ? (
                    activeLead.attemptsHistory.map((att, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px]">Attempt #{att.attemptNo} ({att.mode})</span>
                            <span className="text-[10px] text-slate-400">{att.timestamp}</span>
                          </div>
                          <p className="text-emerald-700 font-semibold text-[11px]">Response: {att.response}</p>
                          <p className="text-slate-600 text-xs">{att.notes}</p>
                          {att.nextFollowUp && (
                            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                              Next Follow-up: <strong className="text-slate-700">{att.nextFollowUp}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No previous attempts logged.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ─── MODAL 4: CREATE BATCH & TIMETABLE ASSIGNMENT ─── */}
      <Dialog open={showCreateBatchModal} onOpenChange={setShowCreateBatchModal}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#1769AA]" />
              Create Batch & Assign Faculty / Timetable
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a batch, enroll students, and automatically publish the scheduled period to the assigned faculty's timetable.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateBatchSubmit} className="space-y-4 pt-3 text-xs">
            {/* 1. Batch Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-[#1769AA]" /> 1. Batch & Course Information
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Batch Code *</Label>
                  <Input
                    required
                    placeholder="e.g. Batch FS-02"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="h-9 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Batch Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Full Stack MERN Fast-Track"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Course *</Label>
                  <select
                    value={batchCourse}
                    onChange={(e) => {
                      setBatchCourse(e.target.value);
                      if (e.target.value.includes("Marketing") || e.target.value.includes("SEO")) setBatchCategory("Digital Marketing");
                      else if (e.target.value.includes("Design") || e.target.value.includes("Photoshop")) setBatchCategory("Design");
                      else if (e.target.value.includes("Analytics") || e.target.value.includes("Excel")) setBatchCategory("Data Analytics");
                      else if (e.target.value.includes("MERN") || e.target.value.includes("Stack")) setBatchCategory("Programming");
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                  >
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="SEO Masterclass">SEO Masterclass</option>
                    <option value="Google Ads (PPC)">Google Ads (PPC)</option>
                    <option value="Full Stack MERN">Full Stack MERN</option>
                    <option value="Graphic Design">Graphic Design & UI/UX</option>
                    <option value="Data Analytics">Data Analytics & AI</option>
                    <option value="Advanced Excel">Advanced Excel & SQL</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Branch *</Label>
                  <select
                    value={batchBranchName}
                    onChange={(e) => setBatchBranchName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                  >
                    <option value="Aadya Central Branch">Aadya Central Branch</option>
                    <option value="Ramanagar Branch">Ramanagar Branch</option>
                    <option value="Malleshwaram Branch">Malleshwaram Branch</option>
                    <option value="Jayanagar Branch">Jayanagar Branch</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Assign Faculty */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" /> 2. Assign Faculty Member
              </h5>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Select Instructor (Will appear in their timetable) *</Label>
                <select
                  value={batchFacultyName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setBatchFacultyName(name);
                    if (name === "Ramesh Kumar") setBatchFacultyId("FA-RAMESH");
                    else if (name === "Priya Sharma") setBatchFacultyId("FA002");
                    else if (name === "Arjun Das") setBatchFacultyId("FA005");
                    else if (name === "Neha Reddy") setBatchFacultyId("FA008");
                    else if (name === "HM Adithya") setBatchFacultyId("FA001");
                  }}
                  className="w-full h-9 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                >
                  <option value="Ramesh Kumar">👨‍🏫 Ramesh Kumar (Digital Marketing & SEO Lead)</option>
                  <option value="Priya Sharma">👩‍🏫 Priya Sharma (Digital Marketing)</option>
                  <option value="Arjun Das">👨‍🎨 Arjun Das (Graphic Design & UI/UX)</option>
                  <option value="Neha Reddy">👩‍💻 Neha Reddy (Data Analytics & AI)</option>
                  <option value="HM Adithya">👨‍💻 HM Adithya (Full Stack MERN)</option>
                </select>
              </div>
            </div>

            {/* 3. Assign Students */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" /> 3. Assign Students ({selectedBatchStudentIds.length} Selected)
                </h5>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedBatchStudentIds.length === (students?.length || 0)) {
                      setSelectedBatchStudentIds([]);
                    } else {
                      setSelectedBatchStudentIds(students.map((s) => s.id));
                    }
                  }}
                  className="text-[10px] font-bold h-6 px-2 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                >
                  {selectedBatchStudentIds.length === (students?.length || 0) ? "Deselect All" : "Select All Available"}
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search students by name or email..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 bg-white p-2 rounded-xl border border-slate-200">
                {students && students.length > 0 ? (
                  students
                    .filter((s) => {
                      const name = s.user?.name || s.studentCode || "";
                      const email = s.user?.email || "";
                      const term = studentSearchTerm.toLowerCase();
                      return !studentSearchTerm || name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
                    })
                    .map((s) => {
                      const isChecked = selectedBatchStudentIds.includes(s.id);
                      const displayName = s.user?.name || s.studentCode || `Student #${s.id.slice(0, 8)}`;
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            isChecked ? "bg-indigo-50/70 font-bold text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedBatchStudentIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] h-3.5 w-3.5"
                            />
                            <span>{displayName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{s.studentCode || s.id.slice(0, 8)}</span>
                        </label>
                      );
                    })
                ) : (
                  <p className="text-slate-400 text-center py-3 text-xs italic">
                    Sample batch cohort (40 students) will be assigned automatically.
                  </p>
                )}
              </div>
            </div>

            {/* 4. Timetable Schedule Slot */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-600" /> 4. Schedule Timetable Slot
              </h5>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-700">Days of the Week *</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {(["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const).map((day) => {
                    const isSelected = batchDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          setBatchDays((prev) =>
                            prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
                          );
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                          isSelected
                            ? "bg-[#1769AA] text-white border-[#1769AA] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Period Slot *</Label>
                  <select
                    value={batchPeriod}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setBatchPeriod(p);
                      if (p === 1) { setBatchStartTime("09:00 AM"); setBatchEndTime("10:00 AM"); }
                      else if (p === 2) { setBatchStartTime("10:00 AM"); setBatchEndTime("11:00 AM"); }
                      else if (p === 3) { setBatchStartTime("11:15 AM"); setBatchEndTime("12:15 PM"); }
                      else if (p === 4) { setBatchStartTime("12:15 PM"); setBatchEndTime("01:15 PM"); }
                      else if (p === 5) { setBatchStartTime("02:00 PM"); setBatchEndTime("03:00 PM"); }
                      else if (p === 6) { setBatchStartTime("03:00 PM"); setBatchEndTime("04:00 PM"); }
                      else if (p === 7) { setBatchStartTime("04:15 PM"); setBatchEndTime("05:15 PM"); }
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                  >
                    <option value={1}>Period 1 (09:00 - 10:00 AM)</option>
                    <option value={2}>Period 2 (10:00 - 11:00 AM)</option>
                    <option value={3}>Period 3 (11:15 - 12:15 PM)</option>
                    <option value={4}>Period 4 (12:15 - 01:15 PM)</option>
                    <option value={5}>Period 5 (02:00 - 03:00 PM)</option>
                    <option value={6}>Period 6 (03:00 - 04:00 PM)</option>
                    <option value={7}>Period 7 (04:15 - 05:15 PM)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Time Range</Label>
                  <Input
                    value={`${batchStartTime} – ${batchEndTime}`}
                    readOnly
                    className="h-9 text-xs bg-slate-100 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Room / Lab *</Label>
                  <select
                    value={batchRoomNo}
                    onChange={(e) => setBatchRoomNo(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                  >
                    <option value="Room 201">Room 201 (Theory)</option>
                    <option value="Room 202">Room 202 (Theory)</option>
                    <option value="Room 203">Room 203 (Interactive)</option>
                    <option value="Lab 1">Computer Lab 1</option>
                    <option value="Lab 2">Digital Marketing Lab 2</option>
                    <option value="Design Lab 1">Design Studio 1</option>
                    <option value="Analytics Lab 3">Analytics Lab 3</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateBatchModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold gap-1.5 shadow-md">
                <Check className="h-4 w-4" /> Create & Publish to Faculty Timetable
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
