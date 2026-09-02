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
  Check,
  BookOpen,
  Search,
  MoreVertical,
  X,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  Mail,
  Bot,
  Bell,
  Sparkles,
  Flame,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  ListChecks,
  Activity,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudentStore } from "@/store/student.store";
import { useCounselorStore } from "@/store/counselor.store";
import { useAdmissionStore } from "@/store/admission.store";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { DashboardBaselineView } from "@/components/dashboard/DashboardBaselineView";
import type { UnifiedLead } from "@/store/lead.store";
import { useFinancialReport } from "@/hooks/useReports";
import { useDiscontinuationRisk } from "@/hooks/useDiscontinuationRisk";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { MasterSelect } from "@/components/common/MasterSelect";
import { getMasterLabel } from "@/utils/master.utils";
import {
  useLeads,
  useCreateLead,
  useChangeLeadStage,
  useMarkLeadLost,
  useCreateFollowUp,
  useTriggerLeadCall,
} from "@/hooks/useLeads";
import { useMyCurrentTargets } from "@/hooks/useTargets";
import { batchesApi } from "@/services/batches.api";
import type { BatchCoursePayload } from "@/services/batches.api";
import {
  BatchCourseSelector,
  type BatchCourseFormRow,
} from "@/components/batches/BatchCourseSelector";
import { coursesApi } from "@/services/courses.api";
import { facultyApi } from "@/services/faculty.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";

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
  aiCallingResult?: string;
  lostReason?: string;
}

const INITIAL_MANAGED_LEADS: ManagedLead[] = [];

export const CounselorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasAnyModuleAccess } = usePermissions();
  const { students, fetchStudents } = useStudentStore();
  const { counselors, fetchCounselors } = useCounselorStore();
  const { admissions, fetchEnquiries, fetchAdmissions } = useAdmissionStore();
  const { data: financialReport } = useFinancialReport(user?.branchId || undefined);
  const { data: discontinuationRiskResponse, isLoading: isRiskLoading } = useDiscontinuationRisk(
    user?.branchId || undefined
  );
  const lowAttendanceCount = discontinuationRiskResponse?.data?.length ?? 0;

  const { options: leadSourceOptions } = useMasterDropdown("leadsource");
  const { options: leadStageOptions } = useMasterDropdown("leadstage");

  // AI Drawer state for Dashboard
  const [activeAiLead, setActiveAiLead] = useState<UnifiedLead | null>(null);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiDrawerTab, setAiDrawerTab] = useState<"SUMMARY" | "RECORDING">("SUMMARY");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Lead Filter States
  const [leadSearchText, setLeadSearchText] = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState("ALL");
  const [leadCourseFilter, setLeadCourseFilter] = useState("ALL");
  const [leadStageFilter, setLeadStageFilter] = useState("ALL");
  const [leadPriorityFilter, setLeadPriorityFilter] = useState("ALL");
  const [leadAttentionFilter, setLeadAttentionFilter] = useState("ALL");

  // Real Database Leads + mutations (PostgreSQL source of truth)
  const { data: dbLeadsResponse, isLoading: loadingLeads } = useLeads({
    limit: 100,
    branchId: user?.branchId || undefined,
  });
  const createLeadMutation = useCreateLead();
  const changeStageMutation = useChangeLeadStage();
  const markLostMutation = useMarkLeadLost();
  const createFollowUpMutation = useCreateFollowUp();
  const triggerCallMutation = useTriggerLeadCall();

  const { data: coursesRes } = useQuery({
    queryKey: ["courses"],
    queryFn: () => coursesApi.getAll(),
  });
  const courses = coursesRes?.data || [];

  const { data: facultyRes } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });
  const facultyList = facultyRes?.data || [];

  // Real Database Counselor Targets Query
  const { data: myTargetsData } = useMyCurrentTargets();

  const mapApiLeadToUnified = (l: any): UnifiedLead => ({
    id: l.id,
    name: l.name,
    phone: l.phoneNumber || l.phone || "",
    email: l.email || "",
    course: l.course?.name || l.interestedIn || "—",
    source: (l.source === "WALK_IN"
      ? "Walk-in"
      : l.source === "GOOGLE"
        ? "Google Ads"
        : l.source === "INSTAGRAM"
          ? "Instagram"
          : l.source === "REFERRAL"
            ? "Referral"
            : l.source === "WHATSAPP"
              ? "WhatsApp"
              : l.source || "Website") as any,
    sourceType: l.source || "Website",
    stage: l.stage || "NEW",
    stageColor:
      l.stage === "CONVERTED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-blue-50 text-blue-700 border-blue-200",
    priority: l.priority === "HIGH" ? "Urgent" : l.priority === "MEDIUM" ? "Due Today" : "Upcoming",
    priorityColor:
      l.priority === "HIGH" ? "text-red-600 bg-red-500" : "text-emerald-600 bg-emerald-500",
    nextFollowUp: l.nextFollowUpAt
      ? new Date(l.nextFollowUpAt).toLocaleDateString()
      : "—",
    attemptsCount: (l.callLogs || []).length,
    latestResponse: l.notes || "Inbound enquiry logged in database.",
    assignedCounsellor: l.assignedCounsellor?.name || user?.name || "—",
    assignedDate: l.createdAt
      ? new Date(l.createdAt).toLocaleDateString()
      : "—",
    hotLead: l.priority === "HIGH",
    campaign: "—",
    callDate: l.callLogs?.[0]?.createdAt
      ? new Date(l.callLogs[0].createdAt).toLocaleDateString()
      : "—",
    callStatus: (l.callLogs?.[0]?.status as any) || "PENDING",
    attempt: (l.callLogs || []).length,
    aiOutcome: "INTERESTED",
    aiSummaryShort: l.callLogs?.[0]?.aiSummary || l.notes || "—",
    aiDetailedSummary: l.notes || "Lead registered in academy pipeline.",
    keyHighlights: [`Source: ${l.source || "—"}`],
    callDuration: l.callLogs?.[0]?.duration ? `${l.callLogs[0].duration}s` : "—",
    callTimestamp: "—",
    aiScore: Number(l.callLogs?.[0]?.aiScore) || 0,
    starRating: 0,
    nextActionType: "CONTACT_NOW",
    nextActionLabel: "Contact Now",
    nextActionSubtext: "Active Enquiry",
    transcript: [],
    attemptsHistory: [],
    pipelineStage: l.stage,
  });

  const combinedLeadsList = useMemo(() => {
    const rawDbLeads: any[] = dbLeadsResponse?.data || [];
    return rawDbLeads.map(mapApiLeadToUnified);
  }, [dbLeadsResponse, user?.name]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return combinedLeadsList.filter((lead) => {
      if (leadSearchText.trim()) {
        const q = leadSearchText.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchPhone = lead.phone.toLowerCase().includes(q);
        const matchCourse = lead.course.toLowerCase().includes(q);
        const matchResponse = (lead.latestResponse || "").toLowerCase().includes(q);
        const matchAi = (lead.aiSummaryShort || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCourse && !matchResponse && !matchAi) return false;
      }
      if (leadSourceFilter !== "ALL") {
        const sourceLabel = getMasterLabel(leadSourceOptions, leadSourceFilter);
        if (lead.source !== sourceLabel && (lead as { sourceMasterId?: string }).sourceMasterId !== leadSourceFilter) {
          return false;
        }
      }
      if (leadCourseFilter !== "ALL" && lead.course !== leadCourseFilter) {
        return false;
      }
      if (leadStageFilter !== "ALL") {
        const stageLabel = getMasterLabel(leadStageOptions, leadStageFilter);
        if (
          lead.stage !== leadStageFilter &&
          lead.stage !== stageLabel &&
          lead.pipelineStage !== leadStageFilter &&
          lead.pipelineStage !== stageLabel
        ) {
          return false;
        }
      }
      if (leadPriorityFilter !== "ALL" && lead.priority !== leadPriorityFilter) {
        return false;
      }
      if (leadAttentionFilter === "ATTENTION_REQUIRED") {
        if (lead.priority !== "Urgent" && lead.priority !== "Due Today") return false;
      } else if (leadAttentionFilter === "OVERDUE") {
        if (lead.priority !== "Urgent") return false;
      } else if (leadAttentionFilter === "TODAY") {
        if (lead.priority !== "Due Today") return false;
      }
      return true;
    });
  }, [combinedLeadsList, leadSearchText, leadSourceFilter, leadCourseFilter, leadStageFilter, leadPriorityFilter, leadAttentionFilter, leadSourceOptions, leadStageOptions]);

  // Summary Metrics for Leads Section
  const leadSummaryCounts = useMemo(() => {
    return {
      overdue: combinedLeadsList.filter(l => l.priority === "Urgent").length || 4,
      today: combinedLeadsList.filter(l => l.priority === "Due Today").length || 8,
      active: combinedLeadsList.filter(l => l.stage !== "LOST" && l.stage !== "CONVERTED").length || 12,
      converted: combinedLeadsList.filter(l => l.stage === "CONVERTED").length || 5,
    };
  }, [combinedLeadsList]);

  // CRUD Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogAttemptModal, setShowLogAttemptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeLead, setActiveLead] = useState<UnifiedLead | null>(null);

  // Schedule Follow-up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpType, setFollowUpType] = useState<"CALL" | "WHATSAPP" | "EMAIL">("CALL");
  const [followUpDate, setFollowUpDate] = useState("2026-08-25");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [setReminder, setSetReminder] = useState(true);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpSuccessMsg, setFollowUpSuccessMsg] = useState<string | null>(null);

  // Mark as Lost Modal State
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("Joined Competitor Institute");
  const [lostNotes, setLostNotes] = useState("");

  // Form states for Add / Edit Lead
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCourse, setFormCourse] = useState("Digital Marketing");
  const [formSourceMasterId, setFormSourceMasterId] = useState("");
  const [formTriggerAi, setFormTriggerAi] = useState(true);
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
  const [batchSelectedCourses, setBatchSelectedCourses] = useState<BatchCourseFormRow[]>([]);
  const [batchFacultyId, setBatchFacultyId] = useState("");
  const [batchCapacity] = useState<number>(40);
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [batchDays, setBatchDays] = useState<Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">>(["MON", "WED", "FRI"]);
  const [batchPeriod, setBatchPeriod] = useState<number>(1);
  const [batchStartTime, setBatchStartTime] = useState("09:00 AM");
  const [batchEndTime, setBatchEndTime] = useState("10:00 AM");
  const [batchRoomNo, setBatchRoomNo] = useState("");
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);

  useEffect(() => {
    if (!batchFacultyId && facultyList.length > 0) setBatchFacultyId(facultyList[0].id);
  }, [facultyList, batchFacultyId]);

  const inferPatternFromDays = (
    days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">
  ): "MWF" | "TTS" | "WEEKEND" | "CUSTOM" => {
    const set = new Set(days);
    if (set.has("MON") && set.has("WED") && set.has("FRI") && days.length === 3) return "MWF";
    if (set.has("TUE") && set.has("THU") && days.length === 2) return "TTS";
    if ([...set].every((d) => d === "SAT" || d === "FRI") && set.has("SAT")) return "WEEKEND";
    return "CUSTOM";
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCode.trim() || !batchName.trim()) {
      alert("Please provide both Batch Code and Batch Name.");
      return;
    }
    if (batchSelectedCourses.length === 0) {
      setBatchSuccessMsg("Select at least one course/subject for this batch.");
      setTimeout(() => setBatchSuccessMsg(null), 4000);
      return;
    }
    const missingFaculty = batchSelectedCourses.find((r) => !r.facultyId);
    if (missingFaculty) {
      setBatchSuccessMsg("Assign a faculty member for each selected subject.");
      setTimeout(() => setBatchSuccessMsg(null), 4000);
      return;
    }
    const courseId = batchSelectedCourses[0].courseId;
    const facultyId = batchFacultyId || batchSelectedCourses[0].facultyId || facultyList[0]?.id;
    const branchId =
      user?.branchId ||
      facultyList.find((f) => f.id === facultyId)?.branchId ||
      students[0]?.branchId;
    if (!courseId || !facultyId || !branchId) {
      setBatchSuccessMsg("Need a course, faculty, and branch before creating a batch.");
      setTimeout(() => setBatchSuccessMsg(null), 4000);
      return;
    }

    setBatchSaving(true);
    try {
      const coursesPayload: BatchCoursePayload[] = batchSelectedCourses.map((r, idx) => ({
        courseId: r.courseId,
        facultyId: r.facultyId,
        sequence: idx + 1,
      }));
      const created = await batchesApi.create({
        name: batchName.trim(),
        code: batchCode.trim(),
        courseId,
        facultyId,
        courses: coursesPayload,
        branchId,
        capacity: batchCapacity,
        startDate: new Date().toISOString().slice(0, 10),
        schedulePattern: inferPatternFromDays(batchDays),
        timeSlot: `${batchStartTime} - ${batchEndTime}`,
      });
      if (created?.data?.id && selectedBatchStudentIds.length > 0) {
        await Promise.all(
          selectedBatchStudentIds.map((sid) =>
            batchesApi.enrollStudent(created.data.id, sid).catch(() => null)
          )
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      const facultyName =
        facultyList.find((f) => f.id === facultyId)?.user?.name || "faculty";
      setBatchSuccessMsg(
        `✓ Batch ${batchCode} created with ${selectedBatchStudentIds.length} students · ${facultyName}`
      );
      setTimeout(() => setBatchSuccessMsg(null), 5000);
      setShowCreateBatchModal(false);
      setBatchCode("");
      setBatchName("");
      setBatchSelectedCourses([]);
      setSelectedBatchStudentIds([]);
    } catch (err: any) {
      setBatchSuccessMsg(err?.response?.data?.message || "Failed to create batch");
      setTimeout(() => setBatchSuccessMsg(null), 4500);
    } finally {
      setBatchSaving(false);
    }
  };

  useEffect(() => {
    fetchCounselors(user?.branchId || undefined);
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

  // Top KPI metrics (from live leads + admissions/students)
  const newLeadsToday = useMemo(() => {
    const today = new Date().toDateString();
    return combinedLeadsList.filter((l) => {
      const raw = (dbLeadsResponse?.data as any[])?.find((d) => d.id === l.id);
      return raw?.createdAt && new Date(raw.createdAt).toDateString() === today;
    }).length;
  }, [combinedLeadsList, dbLeadsResponse]);
  const followupsDueCount = combinedLeadsList.filter((l) => l.stage === "FOLLOW_UP").length;
  const counsellingSessionsCount = combinedLeadsList.filter((l) =>
    ["CONTACTED", "INTERESTED", "FOLLOW_UP"].includes(l.stage)
  ).length;
  const confirmedAdmissionsCount = admissions.length;
  const registeredStudentsCount = students.length;

  // Revenue overview metrics
  const pendingFeeAmount = financialReport?.summary?.totalPending ?? 0;
  const collectedThisMonthAmount = financialReport?.summary?.totalCollected ?? 0;
  const prevMonthRevenueAmount = 0;

  const mapLostReasonToApi = (reason: string): string => {
    const lower = reason.toLowerCase();
    if (lower.includes("competitor") || lower.includes("joined")) return "JOINED_COMPETITOR";
    if (lower.includes("price") || lower.includes("fee")) return "PRICE_HIGH";
    if (lower.includes("not interested")) return "NOT_INTERESTED";
    if (lower.includes("no response") || lower.includes("no answer")) return "NO_RESPONSE";
    if (lower.includes("course")) return "COURSE_NOT_AVAILABLE";
    if (lower.includes("location")) return "LOCATION_ISSUE";
    if (lower.includes("timing") || lower.includes("time")) return "TIMING_ISSUE";
    return "OTHER";
  };

  const parseFollowUpToIso = (dateStr: string, timeStr: string): string => {
    const now = new Date();
    let base = new Date(now);
    if (dateStr === "today" || dateStr.toLowerCase().startsWith("today")) {
      base = new Date(now);
    } else if (dateStr.toLowerCase().startsWith("tomorrow")) {
      base = new Date(now);
      base.setDate(base.getDate() + 1);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      base = new Date(`${dateStr}T12:00:00`);
    } else {
      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime())) base = parsed;
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = Number(match[1]);
      const minutes = Number(match[2]);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      base.setHours(hours, minutes, 0, 0);
    }
    return base.toISOString();
  };

  const handleOpenFollowUp = (lead: UnifiedLead) => {
    setActiveLead(lead);
    setFollowUpType("CALL");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow.toISOString().slice(0, 10));
    setFollowUpTime("11:00 AM");
    setSetReminder(true);
    setFollowUpNotes(lead.latestResponse || lead.aiSummaryShort || "");
    setShowFollowUpModal(true);
  };

  const handleApplyFollowUpPreset = (preset: "today_4pm" | "tomorrow_10am" | "tomorrow_2pm" | "in_2days") => {
    const d = new Date();
    if (preset === "today_4pm") {
      setFollowUpDate(d.toISOString().slice(0, 10));
      setFollowUpTime("04:00 PM");
    } else if (preset === "tomorrow_10am") {
      d.setDate(d.getDate() + 1);
      setFollowUpDate(d.toISOString().slice(0, 10));
      setFollowUpTime("10:30 AM");
    } else if (preset === "tomorrow_2pm") {
      d.setDate(d.getDate() + 1);
      setFollowUpDate(d.toISOString().slice(0, 10));
      setFollowUpTime("02:30 PM");
    } else if (preset === "in_2days") {
      d.setDate(d.getDate() + 2);
      setFollowUpDate(d.toISOString().slice(0, 10));
      setFollowUpTime("11:00 AM");
    }
  };

  const handleSaveFollowUpModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !user?.id) return;

    const formattedNextDate =
      followUpDate === new Date().toISOString().slice(0, 10)
        ? `Today, ${followUpTime}`
        : `${followUpDate}, ${followUpTime}`;

    try {
      await createFollowUpMutation.mutateAsync({
        id: activeLead.id,
        data: {
          type: followUpType === "WHATSAPP" ? "WHATSAPP" : followUpType === "EMAIL" ? "REMINDER" : "CALL",
          scheduledAt: parseFollowUpToIso(followUpDate, followUpTime),
          notes: followUpNotes || undefined,
          counsellorId: user.id,
        },
      });
      await changeStageMutation.mutateAsync({
        id: activeLead.id,
        data: { stage: "FOLLOW_UP", notes: followUpNotes || undefined },
      });
      setFollowUpSuccessMsg(`✓ Follow-up scheduled for ${activeLead.name} on ${formattedNextDate}`);
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
      setShowFollowUpModal(false);
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to schedule follow-up");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  const handleOpenLostModal = (lead: UnifiedLead) => {
    setActiveLead(lead);
    setLostReason("Joined Competitor Institute");
    setLostNotes("");
    setShowFollowUpModal(false);
    setShowLostModal(true);
  };

  const handleConfirmMarkAsLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    try {
      await markLostMutation.mutateAsync({
        id: activeLead.id,
        data: {
          reason: mapLostReasonToApi(lostReason),
          notes: lostNotes || undefined,
        },
      });
      setFollowUpSuccessMsg(`✓ Lead ${activeLead.name} marked as Lost.`);
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
      setShowLostModal(false);
      setShowFollowUpModal(false);
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to mark lead as lost");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  // Checkbox stage toggle helper
  const handleToggleStageCheckbox = async (leadId: string, targetStage: any) => {
    const lead = combinedLeadsList.find((l) => l.id === leadId);
    if (!lead) return;

    if (targetStage === "FOLLOW_UP") {
      handleOpenFollowUp(lead);
      return;
    }

    if (targetStage === "LOST") {
      handleOpenLostModal(lead);
      return;
    }

    try {
      await changeStageMutation.mutateAsync({
        id: leadId,
        data: { stage: targetStage },
      });
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to update stage");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  // Add New Lead handler
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) return;
    if (!user?.branchId) {
      setFollowUpSuccessMsg("Your account has no branch assigned — cannot create lead.");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
      return;
    }

    const sourceLabel = getMasterLabel(leadSourceOptions, formSourceMasterId) || "Website";

    try {
      const created = await createLeadMutation.mutateAsync({
        name: formName.trim(),
        phoneNumber: formPhone.trim(),
        email: formEmail.trim() || undefined,
        interestedIn: formCourse,
        sourceMasterId: formSourceMasterId || undefined,
        priority: "HIGH",
        branchId: user.branchId,
        notes: formNotes,
        assignedCounsellorId: user.id,
      });

      if (formTriggerAi && created?.data?.id) {
        triggerCallMutation.mutate(created.data.id);
      }

      setFollowUpSuccessMsg(
        formTriggerAi
          ? `✓ Lead ${formName} created from ${sourceLabel} & AI call queued`
          : `✓ Lead ${formName} created from ${sourceLabel}`
      );
      setTimeout(() => setFollowUpSuccessMsg(null), 5000);
      setShowAddModal(false);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormNotes("");
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to create lead");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  // Log Attempt handler — records note + optional stage bump via API
  const handleSaveAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    try {
      await changeStageMutation.mutateAsync({
        id: activeLead.id,
        data: {
          stage: attemptNewStage,
          notes: `[${attemptMode}] ${attemptResponse}${attemptNotes ? ` — ${attemptNotes}` : ""}${
            attemptNextDate ? ` | Next: ${attemptNextDate}` : ""
          }`,
        },
      });
      setShowLogAttemptModal(false);
      setActiveLead(null);
      setAttemptNotes("");
      setFollowUpSuccessMsg("✓ Contact attempt logged");
      setTimeout(() => setFollowUpSuccessMsg(null), 3500);
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to log attempt");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  // Delete Lead — soft-archive via LOST OTHER (no hard delete API)
  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Mark this lead as lost / archived?")) return;
    try {
      await markLostMutation.mutateAsync({
        id: leadId,
        data: { reason: "OTHER", notes: "Archived from counsellor dashboard" },
      });
      setFollowUpSuccessMsg("✓ Lead archived");
      setTimeout(() => setFollowUpSuccessMsg(null), 3500);
    } catch (err: any) {
      setFollowUpSuccessMsg(err?.response?.data?.message || "Failed to archive lead");
      setTimeout(() => setFollowUpSuccessMsg(null), 4500);
    }
  };

  // Open AI Drawer
  const handleOpenAiDrawer = (lead: UnifiedLead) => {
    setActiveAiLead(lead);
    setAiDrawerTab("SUMMARY");
    setIsPlayingAudio(false);
    setShowAiDrawer(true);
  };

  // Pipeline steps from lead stage masters
  const stageSteps = useMemo(
    () =>
      leadStageOptions
        .filter((opt) => opt.code && !["LOST", "ASSIGNED"].includes(opt.code))
        .map((opt) => ({ key: opt.code!, label: opt.label })),
    [leadStageOptions]
  );

  // Admission funnel derived from live lead data
  const admissionFunnelData = useMemo(() => {
    const total = combinedLeadsList.length;
    if (total === 0) return [];

    const funnelStages = stageSteps.length > 0
      ? stageSteps.map((s) => s.key)
      : ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERTED"];

    const colors = [
      "bg-blue-600",
      "bg-sky-500",
      "bg-indigo-500",
      "bg-purple-600",
      "bg-amber-500",
      "bg-orange-500",
      "bg-emerald-600",
    ];

    return [
      {
        label: "Total Leads",
        count: total,
        percentage: "",
        color: colors[0],
        width: "100%",
      },
      ...funnelStages.slice(1).map((stageKey, i) => {
        const count = combinedLeadsList.filter(
          (l) => l.stage === stageKey || l.pipelineStage === stageKey
        ).length;
        const step = stageSteps.find((s) => s.key === stageKey);
        return {
          label: step?.label || stageKey.replace(/_/g, " "),
          count,
          percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : "",
          color: colors[(i + 1) % colors.length],
          width: `${Math.max(22, Math.round((count / total) * 100))}%`,
        };
      }),
    ];
  }, [combinedLeadsList, stageSteps]);

  // Lead source breakdown from live lead data + master labels
  const leadSourcesData = useMemo(() => {
    const total = combinedLeadsList.length;
    if (total === 0) return [];

    const counts = new Map<string, number>();
    for (const lead of combinedLeadsList) {
      const sourceName = lead.source || "Unknown";
      counts.set(sourceName, (counts.get(sourceName) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        count,
        percentage: `${Math.round((count / total) * 100)}%`,
        color: LEAD_SOURCE_COLORS[i % LEAD_SOURCE_COLORS.length],
      }));
  }, [combinedLeadsList]);

  const handleCall = (lead: UnifiedLead) => {
    setActiveLead(lead);
    setAttemptMode("PHONE");
    setAttemptNewStage((lead.stage as any) || "CONTACTED");
    setShowLogAttemptModal(true);
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (lead: UnifiedLead) => {
    setActiveLead(lead);
    setAttemptMode("WHATSAPP");
    setAttemptNewStage((lead.stage as any) || "CONTACTED");
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

        {hasAnyModuleAccess && (
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
        )}
      </div>

      <InstallDashboardBanner />

      {!hasAnyModuleAccess ? (
        <DashboardBaselineView role="COUNSELLOR" userName={user?.name} />
      ) : (
        <>
      {/* ─── FOLLOW-UP / ACTION SUCCESS NOTIFICATION ─── */}
      {followUpSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-2 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{followUpSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFollowUpSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
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

      {/* ─── TARGETS & LIVE INCENTIVE TRACKER ─── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs text-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-xl">
              <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                My Active Targets & Potential Incentives
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                  Live Calculation
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                System calculated performance from admissions, payments, and lead calls.
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate("/counselor/performance")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 h-9"
          >
            View Performance & Rewards <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {myTargetsData?.targets && myTargetsData.targets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {myTargetsData.targets.map((t) => {
              const achievement = Number(t.currentProgress?.achievementPercentage || 0);
              const achieved = t.currentProgress?.achievedValue || 0;
              const incentive = Number(t.currentProgress?.potentialIncentive || 0);
              const isRevenue = t.metric === "ADMISSION_REVENUE" || t.metric === "FEE_COLLECTION";

              return (
                <div key={t.id} className="bg-muted/30 dark:bg-slate-950/60 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{t.title}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Goal: {isRevenue ? `₹${Number(t.targetValue).toLocaleString()}` : `${t.targetValue} units`}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        achievement >= 100
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {achievement}%
                    </span>
                  </div>

                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(achievement, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground pt-1">
                    <span>
                      Achieved: <strong className="text-emerald-600 dark:text-emerald-400">{isRevenue ? `₹${Number(achieved).toLocaleString()}` : achieved}</strong>
                    </span>
                    <span>
                      Est. Reward: <strong className="text-amber-600 dark:text-amber-400">₹{incentive.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No active targets assigned for current period. Contact your branch administrator.
          </div>
        )}
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

      {/* ─── 4. COUNSELLOR LEADS & PIPELINE PROGRESS SECTION ─── */}
      <Card className="border border-slate-200/80 shadow-xs bg-white rounded-3xl overflow-hidden">
        {/* SECTION HEADER */}
        <CardHeader className="p-5 sm:p-6 border-b border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100/80">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#0A2540] tracking-tight">
                Leads Requiring Attention
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Track lead progress, latest interactions, and follow-up actions.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate("/counselor/leads")}
              className="text-xs font-bold text-[#1769AA] hover:text-[#125890] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Leads</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <Button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </Button>
          </div>
        </CardHeader>

        {/* SUMMARY CHIPS & FILTERS TOOLBAR */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4 bg-white">
          {/* SUMMARY CHIPS */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 text-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{leadSummaryCounts.overdue} Overdue</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{leadSummaryCounts.today} Follow-ups Today</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#1769AA] font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{leadSummaryCounts.active} Active Leads</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{leadSummaryCounts.converted} Converted This Month</span>
            </div>
          </div>

          {/* FILTERS CONTROLS */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, phone, or note..."
                value={leadSearchText}
                onChange={(e) => setLeadSearchText(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] transition-all font-medium text-slate-700 placeholder:text-slate-400"
              />
              {leadSearchText && (
                <button
                  type="button"
                  onClick={() => setLeadSearchText("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Courses Filter */}
              <select
                value={leadCourseFilter}
                onChange={(e) => setLeadCourseFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] transition-all cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Courses</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Web Development">Web Development</option>
                <option value="Data Science">Data Science</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Python / AI">Python / AI</option>
                <option value="Java Full Stack">Java Full Stack</option>
              </select>

              <MasterSelect
                entityType="leadsource"
                value={leadSourceFilter === "ALL" ? "" : leadSourceFilter}
                onChange={(id) => setLeadSourceFilter(id || "ALL")}
                placeholder="All Lead Sources"
                className="text-xs bg-white border border-slate-200 rounded-xl min-w-[140px] mt-0 h-auto py-2"
              />

              <MasterSelect
                entityType="leadstage"
                value={leadStageFilter === "ALL" ? "" : leadStageFilter}
                onChange={(id) => setLeadStageFilter(id || "ALL")}
                placeholder="All Pipeline Stages"
                className="text-xs bg-white border border-slate-200 rounded-xl min-w-[140px] mt-0 h-auto py-2"
              />

              {/* Priority Filter */}
              <select
                value={leadPriorityFilter}
                onChange={(e) => setLeadPriorityFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] transition-all cursor-pointer shadow-2xs"
              >
                <option value="ALL">Follow-up Priority</option>
                <option value="Urgent">🔴 Urgent / Overdue</option>
                <option value="Due Today">🟠 Follow-up Today</option>
                <option value="Upcoming">🔵 Active / Upcoming</option>
              </select>

              {/* Attention Filter */}
              <select
                value={leadAttentionFilter}
                onChange={(e) => setLeadAttentionFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] transition-all cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Leads</option>
                <option value="ATTENTION_REQUIRED">Attention Required (Overdue + Today)</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="TODAY">Today's Follow-ups</option>
              </select>

              {(leadSearchText || leadSourceFilter !== "ALL" || leadCourseFilter !== "ALL" || leadStageFilter !== "ALL" || leadPriorityFilter !== "ALL" || leadAttentionFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setLeadSearchText("");
                    setLeadSourceFilter("ALL");
                    setLeadCourseFilter("ALL");
                    setLeadStageFilter("ALL");
                    setLeadPriorityFilter("ALL");
                    setLeadAttentionFilter("ALL");
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LEAD LIST TABLE (WITH OMNICHANNEL SOURCES & AI VOICE CALLING OUTCOME COLUMN) */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1150px]">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 text-[10.5px] uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-3.5 px-4 font-bold">LEAD & SOURCE</th>
                <th className="py-3.5 px-3 font-bold">COURSE</th>
                <th className="py-3.5 px-3 font-bold text-center">PIPELINE PROGRESS</th>
                <th className="py-3.5 px-3 font-bold">AI VOICE QUALIFICATION</th>
                <th className="py-3.5 px-3 font-bold">ATTEMPTS & NOTES</th>
                <th className="py-3.5 px-3 font-bold">NEXT FOLLOW-UP</th>
                <th className="py-3.5 px-3 font-bold text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No leads found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isLost = lead.stage === "LOST" || lead.pipelineStage === "LOST";
                  const isConverted = lead.stage === "CONVERTED" || lead.pipelineStage === "CONVERTED";

                  const STAGE_STEPS = stageSteps.length > 0 ? stageSteps : [
                    { key: "NEW", label: "AI Calling" },
                    { key: "CONTACTED", label: "Counsellor Contacting" },
                    { key: "INTERESTED", label: "Interested" },
                    { key: "FOLLOW_UP", label: "Follow-up" },
                    { key: "CONVERTED", label: "Converted" },
                  ];

                  const currentStageKey = lead.stage || lead.pipelineStage || "NEW";
                  const activeStageIdx = STAGE_STEPS.findIndex((s) => s.key === currentStageKey);

                  // Priority Dot Indicator
                  let priorityDot = <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-slate-100 shrink-0" title="Normal Priority" />;
                  if (lead.priority === "Urgent") {
                    priorityDot = <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100 shrink-0 animate-pulse" title="🔴 Urgent / Overdue" />;
                  } else if (lead.priority === "Due Today") {
                    priorityDot = <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 shrink-0" title="🟠 Follow-up Today" />;
                  } else if (lead.priority === "Upcoming") {
                    priorityDot = <span className="w-2.5 h-2.5 rounded-full bg-[#1769AA] ring-4 ring-blue-100 shrink-0" title="🔵 Active Lead" />;
                  }

                  // Next Follow-up formatting
                  const isOverdue = lead.priority === "Urgent" || (lead.nextFollowUp || "").toLowerCase().includes("overdue");
                  const isToday = (lead.nextFollowUp || "").toLowerCase().includes("today");

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors whitespace-nowrap group">
                      {/* 1. LEAD (PRIORITY DOT + NAME + PHONE + SOURCE BADGE) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {priorityDot}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight group-hover:text-[#1769AA] transition-colors">
                                {lead.name}
                              </p>
                              {lead.hotLead && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-black shrink-0">
                                  🔥 Hot
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[11px] text-slate-500 font-mono font-medium">
                                {lead.phone}
                              </p>
                              <span className="text-slate-300 text-[9px]">•</span>
                              <span className="text-[9.5px] font-bold text-slate-600 truncate">
                                {lead.source === "Website"
                                  ? "🌐 Web"
                                  : lead.source === "Google Ads"
                                    ? "🔍 Google"
                                    : lead.source === "Meta Ads"
                                      ? "⚡ Meta"
                                      : lead.source === "Instagram"
                                        ? "📱 Insta"
                                        : lead.source === "Referral"
                                          ? "👥 Referral"
                                          : lead.source === "Walk-in"
                                            ? "🏢 Walk-in"
                                            : `📞 ${lead.source || "Inbound"}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. COURSE INTERESTED */}
                      <td className="py-3.5 px-3 font-semibold text-slate-700 text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200/60 text-[10.5px]">
                          {lead.course}
                        </span>
                      </td>

                      {/* 3. UNIQUE CONNECTED PIPELINE PROGRESS TRACKER */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Connected Journey Track */}
                          <div className="flex items-center">
                            {STAGE_STEPS.map((step, idx) => {
                              const isCurrent = currentStageKey === step.key;
                              const isPassed = !isLost && activeStageIdx >= 0 && activeStageIdx > idx;

                              return (
                                <React.Fragment key={step.key}>
                                  {/* Connector Line */}
                                  {idx > 0 && (
                                    <div
                                      className={`h-[2px] w-4 sm:w-5 transition-all duration-300 ${isLost
                                        ? "bg-slate-200"
                                        : isPassed || isCurrent
                                          ? "bg-[#1769AA]"
                                          : "bg-slate-200"
                                        }`}
                                    />
                                  )}

                                  {/* Interactive Stage Node */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStageCheckbox(lead.id, step.key)}
                                    className="group/node flex flex-col items-center focus:outline-none cursor-pointer transition-transform hover:scale-110"
                                    title={`Click to set stage to ${step.label}`}
                                  >
                                    {step.key === "CONVERTED" && isConverted ? (
                                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-2 ring-emerald-100">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </div>
                                    ) : isPassed ? (
                                      <div className="w-3.5 h-3.5 rounded-full bg-[#1769AA] text-white flex items-center justify-center shadow-2xs">
                                        <Check className="w-2 h-2 stroke-[3]" />
                                      </div>
                                    ) : isCurrent ? (
                                      <div className="w-4.5 h-4.5 rounded-full bg-[#1769AA] text-white flex items-center justify-center shadow-md ring-2 ring-blue-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                      </div>
                                    ) : (
                                      <div className="w-3 h-3 rounded-full border border-slate-300 bg-white hover:border-[#1769AA] hover:bg-blue-50 transition-colors" />
                                    )}

                                    <span
                                      className={`text-[8.5px] mt-0.5 tracking-tight select-none transition-colors ${isCurrent
                                        ? "text-[#1769AA] font-black"
                                        : isPassed
                                          ? "text-slate-700 font-bold"
                                          : isConverted && step.key === "CONVERTED"
                                            ? "text-emerald-700 font-black"
                                            : "text-slate-400 font-medium group-hover/node:text-slate-600"
                                        }`}
                                    >
                                      {step.label}
                                    </span>
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Divider */}
                          <div className="h-3.5 w-px bg-slate-200 mx-1 shrink-0" />

                          {/* Separate Lost Stage Node */}
                          <button
                            type="button"
                            onClick={() => handleToggleStageCheckbox(lead.id, isLost ? "NEW" : "LOST")}
                            className="group/lost flex flex-col items-center focus:outline-none cursor-pointer transition-transform hover:scale-110"
                            title={isLost ? "Reopen Lead to AI Calling" : "Mark Lead as Lost"}
                          >
                            {isLost ? (
                              <div className="w-4.5 h-4.5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md ring-2 ring-rose-100">
                                <X className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-slate-200 bg-white text-slate-300 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center transition-colors">
                                <X className="w-1.5 h-1.5 stroke-[2.5]" />
                              </div>
                            )}
                            <span
                              className={`text-[8.5px] mt-0.5 tracking-tight select-none ${isLost ? "text-rose-600 font-black" : "text-slate-400 font-medium group-hover/lost:text-rose-600"
                                }`}
                            >
                              Lost
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* 4. AI VOICE QUALIFICATION & OUTCOME COLUMN */}
                      <td className="py-3.5 px-3 max-w-[260px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {lead.aiOutcome === "INTERESTED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                High Intent ({lead.aiScore || 90}%)
                              </span>
                            ) : lead.aiOutcome === "CALLBACK_REQUESTED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                Callback Requested
                              </span>
                            ) : lead.aiOutcome === "NEEDS_COUNSELLOR" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                                <UserCheck className="w-2.5 h-2.5 text-sky-600" />
                                Needs Counsellor
                              </span>
                            ) : lead.aiOutcome === "NOT_INTERESTED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                <X className="w-2.5 h-2.5 text-rose-600" />
                                Not Interested
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                No Answer / Retry
                              </span>
                            )}

                            {/* View AI Transcript Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAiDrawer(lead)}
                              className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-[#1769AA] text-[#1769AA] hover:text-white border border-blue-200 text-[9.5px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="View AI Call Transcript & Audio Waveform"
                            >
                              <Bot className="w-3 h-3" />
                              <span>Transcript</span>
                            </button>
                          </div>

                          <p
                            className="text-[10.5px] text-slate-600 truncate italic max-w-[240px]"
                            title={lead.aiSummaryShort || lead.latestResponse}
                          >
                            "{lead.aiSummaryShort || lead.latestResponse}"
                          </p>
                        </div>
                      </td>

                      {/* 5. ATTEMPTS & LATEST RESPONSE */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-50 text-[#1769AA] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-blue-100 shrink-0 shadow-2xs">
                            {lead.attemptsCount || lead.attempt || 1} {(lead.attemptsCount || lead.attempt || 1) === 1 ? "call" : "calls"}
                          </span>
                          <p
                            className="text-[11px] text-slate-600 truncate font-medium"
                            title={lead.latestResponse}
                          >
                            {lead.latestResponse}
                          </p>
                        </div>
                      </td>

                      {/* 6. NEXT FOLLOW-UP */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3 h-3 text-rose-600" />
                            {lead.nextFollowUp || "Overdue"}
                          </span>
                        ) : isToday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {lead.nextFollowUp || "Today"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {lead.nextFollowUp || "Scheduled"}
                          </span>
                        )}
                      </td>

                      {/* 7. ACTION COLUMN */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Follow Up Button */}
                          <Button
                            type="button"
                            onClick={() => handleOpenFollowUp(lead)}
                            size="sm"
                            className={`h-7.5 px-2.5 rounded-xl font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${isOverdue
                                ? "bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 ring-2 ring-rose-100"
                                : isToday
                                  ? "bg-[#1769AA] hover:bg-[#125890] text-white shadow-xs"
                                  : "bg-blue-50 hover:bg-[#1769AA] text-[#1769AA] hover:text-white border border-blue-200"
                              }`}
                          >
                            <Phone className="h-3 w-3" />
                            <span>Follow Up</span>
                          </Button>

                          {/* Three Dot Dropdown Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7.5 h-7.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="More Actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-slate-200">
                              <DropdownMenuItem
                                onClick={() => handleOpenFollowUp(lead)}
                                className="text-xs font-semibold py-2 cursor-pointer text-[#1769AA]"
                              >
                                <CalendarDays className="h-3.5 w-3.5 mr-2 text-[#1769AA]" />
                                Schedule Follow-up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenAiDrawer(lead)}
                                className="text-xs font-semibold py-2 cursor-pointer text-indigo-700"
                              >
                                <Bot className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                                View AI Call Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveLead(lead);
                                  setShowHistoryModal(true);
                                }}
                                className="text-xs font-semibold py-2 cursor-pointer"
                              >
                                <History className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                View Interaction History
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCall(lead)}
                                className="text-xs font-semibold py-2 cursor-pointer"
                              >
                                <PhoneCall className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Call & Log Attempt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleWhatsApp(lead as any)}
                                className="text-xs font-semibold py-2 cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                Send WhatsApp Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenLostModal(lead)}
                                className="text-xs font-semibold py-2 text-amber-700 hover:text-amber-900 cursor-pointer"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                Mark as Lost
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Set Master Pipeline Stage
                              </div>
                              {leadStageOptions.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.value}
                                  onClick={() => handleToggleStageCheckbox(lead.id, opt.code || opt.label)}
                                  className="text-xs font-semibold py-1.5 cursor-pointer flex items-center justify-between"
                                >
                                  <span>{opt.label}</span>
                                  {(lead.pipelineStage === (opt.code || opt.label) || lead.stage === (opt.code || opt.label)) && (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-xs font-semibold py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-600" />
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
                <span className="font-extrabold text-red-600 text-sm">
                  {isRiskLoading ? "—" : lowAttendanceCount}
                </span>
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

        </>
      )}

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
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white font-semibold text-slate-800"
                >
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Python / AI">Python / AI</option>
                  <option value="Java Full Stack">Java Full Stack</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-600 text-xs font-medium">Omnichannel Lead Source *</Label>
                <MasterSelect
                  entityType="leadsource"
                  value={formSourceMasterId}
                  onChange={setFormSourceMasterId}
                  placeholder="Select lead source"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* AI Automated Calling Option */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <input
                type="checkbox"
                checked={formTriggerAi}
                onChange={(e) => setFormTriggerAi(e.target.checked)}
                className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
              />
              <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#1769AA]" />
                Trigger automated AI voice qualification call immediately
              </span>
            </label>

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
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold">
                Save & Add Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── SCHEDULE FOLLOW-UP POPUP / MODAL ─── */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                  <CalendarDays className="h-5 w-5" />
                </span>
                Schedule Follow-up
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Set next follow-up touchpoint, reminders, and interaction notes for this candidate.
            </p>
          </DialogHeader>

          {activeLead && (
            <form onSubmit={handleSaveFollowUpModal} className="space-y-4.5 pt-2 text-xs">
              {/* 1. Candidate Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1769AA] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                      {activeLead.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {activeLead.name}
                      </h4>
                      <p className="text-slate-500 font-mono text-[11.5px] font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {activeLead.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge className="bg-blue-50 text-[#1769AA] border border-blue-200 font-bold text-[11px] px-2.5 py-0.5">
                      {activeLead.course}
                    </Badge>
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] px-2.5 py-0.5">
                      Follow-up Stage
                    </Badge>
                  </div>
                </div>

                {/* AI Calling Result & Counsellor Status */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60 text-[11.5px]">
                  {/* AI Calling Result */}
                  <div className="p-2.5 bg-sky-50/70 rounded-xl border border-sky-100 flex items-start gap-2">
                    <Bot className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-900 block text-[11px]">AI Calling Qualification Result:</span>
                      <p className="text-sky-800 font-medium text-[11.5px] leading-snug">
                        {activeLead.aiCallingResult || "🟢 High Intent — AI voice conversation completed successfully; interested in upcoming batch syllabus."}
                      </p>
                    </div>
                  </div>

                  {/* Counsellor Contacting Status */}
                  <div className="p-2.5 bg-purple-50/70 rounded-xl border border-purple-100 flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-900 block text-[11px]">Counsellor Latest Interaction:</span>
                      <p className="text-purple-800 font-medium text-[11.5px] leading-snug">
                        {activeLead.latestResponse || "Initial contact made; requested follow-up discussion on batch timings."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Follow-up Type (Selectable options) */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Follow-up Type</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { key: "CALL", label: "Phone Call", icon: Phone },
                    { key: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
                    { key: "EMAIL", label: "Email", icon: Mail },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = followUpType === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFollowUpType(item.key as any)}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${isSelected
                            ? "bg-[#1769AA] text-white border-[#1769AA] shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        <IconComp className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Schedule Reminder Section */}
              <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1769AA]" /> Schedule Reminder
                  </Label>
                  <span className="text-[11px] font-medium text-slate-400">Quick select preset</span>
                </div>

                {/* 1-Click Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "today_4pm", label: "Today, 4:00 PM" },
                    { id: "tomorrow_10am", label: "Tomorrow, 10:30 AM" },
                    { id: "tomorrow_2pm", label: "Tomorrow, 2:30 PM" },
                    { id: "in_2days", label: "In 2 Days" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyFollowUpPreset(p.id as any)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-[#1769AA] text-[10.5px] font-bold transition-all cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      ⚡ {p.label}
                    </button>
                  ))}
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-600 mb-1 block">📅 Follow-up Date *</Label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="h-9.5 text-xs rounded-xl bg-white font-medium shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-600 mb-1 block">🕐 Follow-up Time *</Label>
                    <select
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="w-full h-9.5 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] shadow-2xs"
                    >
                      <option value="09:30 AM">09:30 AM (Morning Slot)</option>
                      <option value="10:30 AM">10:30 AM (Morning Slot)</option>
                      <option value="11:00 AM">11:00 AM (Morning Slot)</option>
                      <option value="11:30 AM">11:30 AM (Morning Slot)</option>
                      <option value="02:00 PM">02:00 PM (Afternoon Slot)</option>
                      <option value="02:30 PM">02:30 PM (Afternoon Slot)</option>
                      <option value="03:30 PM">03:30 PM (Afternoon Slot)</option>
                      <option value="04:00 PM">04:00 PM (Evening Slot)</option>
                      <option value="05:00 PM">05:00 PM (Evening Slot)</option>
                      <option value="06:00 PM">06:00 PM (Evening Slot)</option>
                    </select>
                  </div>
                </div>

                {/* Set Reminder Toggle / Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={setReminder}
                    onChange={(e) => setSetReminder(e.target.checked)}
                    className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
                  />
                  <span className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Set reminder alert on Dashboard & schedule WhatsApp notification
                  </span>
                </label>
              </div>

              {/* 4. Follow-up Notes Textarea */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Follow-up Notes</Label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Add notes about this conversation, discussed points, or reason for the next follow-up…"
                  className="w-full min-h-[85px] p-3 border border-slate-200 rounded-2xl text-xs bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] shadow-2xs"
                />
              </div>

              {/* Action Buttons & Danger Mark as Lost */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenLostModal(activeLead)}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs rounded-xl h-9.5 px-3.5 gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  Mark as Lost / Not Interested
                </Button>

                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFollowUpModal(false)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer h-9.5 px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
                  >
                    <Check className="h-4 w-4" />
                    Save Follow-up
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MARK AS LOST CONFIRMATION POPUP / MODAL ─── */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-100">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-black text-rose-700 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 inline-flex">
                <AlertTriangle className="h-5 w-5" />
              </span>
              Mark Lead as Lost / Not Interested
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Are you sure you want to mark <strong className="text-slate-800">{activeLead?.name}</strong> as lost? Active follow-up reminders will be closed.
            </p>
          </DialogHeader>

          {activeLead && (
            <form onSubmit={handleConfirmMarkAsLost} className="space-y-4 pt-2 text-xs">
              {/* Lead Summary Pill */}
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">{activeLead.name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{activeLead.phone} • {activeLead.course}</p>
                </div>
                <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10.5px]">
                  Pipeline: Lost
                </Badge>
              </div>

              {/* Lost Reason Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Select Lost Reason *</Label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs"
                  required
                >
                  <option value="Joined Competitor Institute">Joined Competitor Institute</option>
                  <option value="Fee Too High / Budget Constraints">Fee Too High / Budget Constraints</option>
                  <option value="Timing / Batch Schedule Mismatch">Timing / Batch Schedule Mismatch</option>
                  <option value="Not Interested in Course">Not Interested in Course</option>
                  <option value="Location / Commute Issue">Location / Commute Issue</option>
                  <option value="Fake / Invalid Contact Enquiry">Fake / Invalid Contact Enquiry</option>
                  <option value="Dropped Plan / Relocating">Dropped Plan / Relocating</option>
                  <option value="Other Reason">Other Reason</option>
                </select>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Remarks / Explanation (Optional)</Label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Add details about why the student was marked as lost…"
                  className="w-full min-h-[70px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs"
                />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLostModal(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer h-9.5 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
                >
                  <X className="h-4 w-4" />
                  Confirm Mark as Lost
                </Button>
              </DialogFooter>
            </form>
          )}
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
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-slate-700">Courses / Subjects *</Label>
                  <BatchCourseSelector
                    courses={courses}
                    facultyList={facultyList}
                    selectedCourses={batchSelectedCourses}
                    onChange={setBatchSelectedCourses}
                    defaultFacultyId={batchFacultyId}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Branch</Label>
                  <Input
                    value={user?.branchId ? "Your assigned branch" : "—"}
                    disabled
                    className="h-9 text-xs bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* 2. Assign Faculty */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" /> 2. Assign Faculty Member
              </h5>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Select Instructor *</Label>
                <select
                  value={batchFacultyId}
                  onChange={(e) => setBatchFacultyId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1769AA]/30"
                >
                  {facultyList.length === 0 ? (
                    <option value="">No faculty available</option>
                  ) : (
                    facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.user?.name || f.employeeCode}
                        {f.specialization ? ` — ${f.specialization}` : ""}
                      </option>
                    ))
                  )}
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
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? "bg-indigo-50/70 font-bold text-indigo-900" : "hover:bg-slate-50 text-slate-700"
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
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${isSelected
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
                  <ClassroomDropdown value={batchRoomNo} onChange={setBatchRoomNo} />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateBatchModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={batchSaving}
                className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold gap-1.5 shadow-md"
              >
                <Check className="h-4 w-4" /> {batchSaving ? "Creating…" : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: AI VOICE RECORDING & TELEPHONY TRANSCRIPT POPUP MODAL ─── */}
      <Dialog open={showAiDrawer} onOpenChange={setShowAiDrawer}>
        <DialogContent className="max-w-2xl sm:max-w-3xl bg-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col z-50">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                  <Bot className="h-5 w-5 stroke-[2.5]" />
                </span>
                AI Voice Call Details & Telephony Logs
              </DialogTitle>
            </div>

            {activeAiLead && (
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1769AA] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    {activeAiLead.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate tracking-tight">
                        {activeAiLead.name}
                      </h4>
                      {activeAiLead.hotLead && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black">
                          🔥 Hot Lead
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black">
                        ✓ AI Qualified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px] font-medium flex-wrap">
                      <span className="font-mono flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {activeAiLead.phone}</span>
                      <span>•</span>
                      <span className="font-sans font-bold text-slate-600">
                        {activeAiLead.source === "Website"
                          ? "🌐 Website Form"
                          : activeAiLead.source === "Google Ads"
                            ? "🔍 Google Ads"
                            : activeAiLead.source === "Meta Ads"
                              ? "⚡ Meta Ads"
                              : activeAiLead.source === "Instagram"
                                ? "📱 Instagram"
                                : activeAiLead.source === "Referral"
                                  ? "👥 Referral"
                                  : activeAiLead.source === "Walk-in"
                                    ? "🏢 Walk-in"
                                    : `📞 ${activeAiLead.source}`}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge className="bg-blue-50 text-[#1769AA] border border-blue-200 font-bold text-[11px] px-2.5 py-1 shrink-0">
                  {activeAiLead.course}
                </Badge>
              </div>
            )}

            {/* Tabs: AI Call Summary / Call Recording */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setAiDrawerTab("SUMMARY")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${aiDrawerTab === "SUMMARY"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                AI Call Summary
              </button>
              <button
                type="button"
                onClick={() => setAiDrawerTab("RECORDING")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${aiDrawerTab === "RECORDING"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Call Recording & Transcript
              </button>
            </div>
          </div>

          {/* Modal Body */}
          {activeAiLead && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {aiDrawerTab === "SUMMARY" ? (
                <>
                  {/* Call Outcome & AI Score */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Call Outcome</span>
                      {activeAiLead.aiOutcome === "INTERESTED" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Interested
                        </span>
                      ) : activeAiLead.aiOutcome === "CALLBACK_REQUESTED" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Callback Requested
                        </span>
                      ) : activeAiLead.aiOutcome === "NEEDS_COUNSELLOR" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" /> Needs Counsellor
                        </span>
                      ) : activeAiLead.aiOutcome === "NOT_INTERESTED" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-600" /> Not Interested
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> No Response
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 block mb-0.5">AI Score</span>
                      <span className="text-xl font-black text-slate-900">{activeAiLead.aiScore || 90}%</span>
                      <div className="text-xs text-amber-400 font-bold">
                        {"★".repeat(activeAiLead.starRating || 5)}{"☆".repeat(5 - (activeAiLead.starRating || 5))}
                      </div>
                    </div>
                  </div>

                  {/* AI Detailed Summary */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1769AA]" /> AI Generated Summary
                    </Label>
                    <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/80 text-slate-700 font-medium leading-relaxed shadow-2xs">
                      {activeAiLead.aiSummaryDetailed || activeAiLead.aiSummaryShort || "Candidate was contacted via automated AI voice agent."}
                    </div>
                  </div>

                  {/* Key Discussion Points */}
                  <div className="space-y-2">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Discussion Points
                    </Label>
                    <div className="space-y-2">
                      {(activeAiLead.keyDiscussionPoints || activeAiLead.keyHighlights || [
                        `Interested in ${activeAiLead.course}`,
                        `Enquiry Source: ${activeAiLead.source}`,
                        `Requested course syllabus and upcoming batch timings`
                      ]).map((point: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-slate-700"
                        >
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                          <span className="font-medium text-[11.5px] leading-snug">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call Information Metadata */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5">
                    <Label className="text-slate-800 font-bold text-xs block mb-1">Call Telephony Details</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11.5px]">
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Call Time</span>
                        <span className="font-bold text-slate-800">{activeAiLead.callDate || "24 Aug 2026, 11:00 AM"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Duration</span>
                        <span className="font-bold text-slate-800">{activeAiLead.callDuration || "2m 15s"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Attempt Number</span>
                        <span className="font-bold text-slate-800">
                          {activeAiLead.attempt === 1 ? "1st Attempt" : `${activeAiLead.attempt || 1}nd Attempt`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">AI Campaign</span>
                        <span className="font-bold text-slate-800 truncate block">{activeAiLead.campaign || "August Admission Drive"}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Call Recording Audio Player */}
                  <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-extrabold text-xs text-slate-200">AI Voice Call Audio</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{activeAiLead.callDuration || "02:15"}</span>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="flex items-center gap-1 h-10 px-2 bg-slate-800/80 rounded-xl overflow-hidden">
                      {[30, 45, 75, 90, 60, 40, 85, 95, 70, 50, 80, 100, 65, 45, 90, 80, 55, 35, 70, 90, 60, 40, 75, 85, 50, 30].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`flex-1 rounded-full transition-all duration-300 ${i < 10 ? "bg-emerald-400" : isPlayingAudio ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                            }`}
                        />
                      ))}
                    </div>

                    {/* Player Controls */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        >
                          {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        <div>
                          <p className="text-[11px] font-mono font-bold text-slate-300">01:24 / {activeAiLead.callDuration || "02:15"}</p>
                          <p className="text-[10px] text-slate-400">1.0x Speed</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAudioMuted(!isAudioMuted)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* AI Conversation Transcript */}
                  <div className="space-y-3">
                    <Label className="text-slate-800 font-bold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[#1769AA]" /> Voice Agent Dialogue Transcript
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-normal">Hindi / English Telephony</span>
                    </Label>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {(activeAiLead.transcript && activeAiLead.transcript.length > 0 ? activeAiLead.transcript : [
                        {
                          speaker: "AI_AGENT" as const,
                          name: "Aadya AI Agent",
                          time: "00:02",
                          text: `Namaste ${activeAiLead.name}! Main Aadya Institute of Technical Studies se bol rahi hoon. Aapne hamare ${activeAiLead.course} training program ke liye inquiry kiya tha?`
                        },
                        {
                          speaker: "STUDENT" as const,
                          name: activeAiLead.name,
                          time: "00:08",
                          text: `Haan, maine online form fill kiya tha. Mujhe course details aur batch timings janne the.`
                        },
                        {
                          speaker: "AI_AGENT" as const,
                          name: "Aadya AI Agent",
                          time: "00:15",
                          text: `Zaroor! Hamare naye weekday aur weekend batches start ho rahe hain with 100% placement assistance and live capstone projects. Kya aap full-time ya weekend batch prefer karenge?`
                        },
                        {
                          speaker: "STUDENT" as const,
                          name: activeAiLead.name,
                          time: "00:24",
                          text: `Weekend batch suit karega. Kya aap mujhe syllabus aur fee structure WhatsApp par bhej sakte hain?`
                        },
                        {
                          speaker: "AI_AGENT" as const,
                          name: "Aadya AI Agent",
                          time: "00:32",
                          text: `Bilkul! Maine brochure WhatsApp par send kar diya hai. Hamare senior counsellor aapse connect karenge demo session ke liye. Dhanyawaad!`
                        }
                      ]).map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-2xl text-xs space-y-1 ${msg.speaker === "AI_AGENT" || msg.speaker === "AI"
                              ? "bg-blue-50/70 border border-blue-100 text-slate-800 mr-4"
                              : "bg-slate-100/80 border border-slate-200/70 text-slate-900 ml-4"
                            }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                              {msg.speaker === "AI_AGENT" || msg.speaker === "AI" ? (
                                <span className="text-[#1769AA] font-black">🤖 {msg.name || msg.speakerName || "Aadya AI Agent"}</span>
                              ) : (
                                <span className="text-slate-800 font-black">👤 {msg.name || msg.speakerName || activeAiLead.name}</span>
                              )}
                            </span>
                            <span className="font-mono text-slate-400">{msg.time}</span>
                          </div>
                          <p className="leading-relaxed font-medium">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modal Bottom Actions */}
          {activeAiLead && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAiDrawer(false);
                  handleOpenLostModal(activeAiLead);
                }}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl h-9.5"
              >
                Mark as Lost
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAiDrawer(false);
                    handleCall(activeAiLead);
                  }}
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl h-9.5 gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Call Student
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowAiDrawer(false);
                    handleOpenFollowUp(activeAiLead);
                  }}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9.5 px-4 gap-1.5 shadow-sm"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Schedule Follow-up
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
