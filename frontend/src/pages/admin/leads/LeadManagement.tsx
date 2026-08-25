import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Search, PhoneCall, ArrowRight,
  MoreHorizontal, Bot, Target, Clock, CheckCircle2,
  CalendarDays, MessageSquare, Phone, Laptop, Building,
  BookOpen, Bell, X, Trash2, Sparkles, Check, Flame,
  UserCheck, UserPlus, Play, Pause, Volume2, VolumeX,
  FileText, RotateCcw, AlertTriangle, ChevronRight,
  Filter, HelpCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetTitle
} from "@/components/ui/sheet";
import {
  useLeadStore,
  type UnifiedLead,
  type LeadSource,
  type PipelineStage,
} from "@/store/lead.store";

// Visual source badge helpers
const getSourceBadge = (source: string) => {
  switch (source) {
    case "Website":
      return { label: "Website", icon: "🌐", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    case "Meta Ads":
      return { label: "Meta Ads", icon: "📱", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "Google Ads":
      return { label: "Google Ads", icon: "🔎", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "Instagram":
      return { label: "Instagram", icon: "📱", bg: "bg-pink-50 text-pink-800 border-pink-200" };
    case "WhatsApp":
      return { label: "WhatsApp", icon: "📲", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "Walk-in":
      return { label: "Walk-in", icon: "🚶", bg: "bg-purple-50 text-purple-800 border-purple-200" };
    case "Direct Call":
      return { label: "Direct Call", icon: "📞", bg: "bg-sky-50 text-sky-800 border-sky-200" };
    case "Referral":
      return { label: "Referral", icon: "👥", bg: "bg-teal-50 text-teal-800 border-teal-200" };
    case "Campaign":
      return { label: "AI Campaign", icon: "🤖", bg: "bg-cyan-50 text-cyan-800 border-cyan-200" };
    default:
      return { label: source || "Manual", icon: "📝", bg: "bg-slate-100 text-slate-800 border-slate-200" };
  }
};

// Visual stage badge helper
const getStageBadge = (stage: string) => {
  switch (stage) {
    case "NEW":
      return { label: "New Lead", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    case "CONTACTED":
      return { label: "Contacted", bg: "bg-sky-50 text-sky-700 border-sky-200" };
    case "INTERESTED":
      return { label: "Interested", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "FOLLOW_UP":
      return { label: "Follow Up", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "CONVERTED":
      return { label: "Converted", bg: "bg-green-50 text-green-800 border-green-200" };
    case "LOST":
      return { label: "Lost", bg: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return { label: stage || "New", bg: "bg-slate-100 text-slate-700 border-slate-200" };
  }
};

export const LeadManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Centralized Store
  const {
    leads,
    addLead,
    updateLeadStage,
    scheduleFollowUp,
    markAsLost,
    assignCounsellor,
    retryAiCall,
    logAttempt,
  } = useLeadStore();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [counsellorFilter, setCounsellorFilter] = useState("ALL");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("ALL");

  // Drawer / Modal States
  const [activeLead, setActiveLead] = useState<UnifiedLead | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"OVERVIEW" | "AI_CALL" | "TIMELINE">("OVERVIEW");

  // Audio player state inside details
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Schedule Follow-up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<UnifiedLead | null>(null);
  const [followUpChannel, setFollowUpChannel] = useState<"PHONE" | "WHATSAPP" | "EMAIL">("PHONE");
  const [followUpDate, setFollowUpDate] = useState("2026-08-25");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [followUpType, setFollowUpType] = useState<"Phone Call" | "WhatsApp" | "Meeting" | "Other">("Phone Call");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [setReminderAlert, setSetReminderAlert] = useState(true);

  // Mark as Lost Modal State
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostLead, setLostLead] = useState<UnifiedLead | null>(null);
  const [lostReason, setLostReason] = useState("Not Interested");
  const [lostNotes, setLostNotes] = useState("");

  // Assign to Counsellor Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLead, setAssignLead] = useState<UnifiedLead | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState("Priya Singh");
  const [assignNotes, setAssignNotes] = useState("");

  // Add New Lead Modal State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCourse, setFormCourse] = useState("Digital Marketing");
  const [formSource, setFormSource] = useState<LeadSource>("Website");
  const [formNotes, setFormNotes] = useState("");
  const [formTriggerAi, setFormTriggerAi] = useState(true);

  // Toast / Notification Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // KPI Summary Calculations
  const kpis = useMemo(() => {
    const total = leads.length;
    const pendingCalls = leads.filter(
      (l) => l.callStatus === "IN_PROGRESS" || l.callStatus === "PENDING" || l.aiOutcome === "PENDING_CALL" || l.aiOutcome === "NO_RESPONSE"
    ).length;
    const aiQualified = leads.filter((l) => l.aiOutcome === "INTERESTED" || (l.aiScore && l.aiScore >= 80)).length;
    const followUpsDue = leads.filter(
      (l) => l.stage === "FOLLOW_UP" || l.priority === "Due Today" || l.priority === "Urgent"
    ).length;
    const converted = leads.filter((l) => l.stage === "CONVERTED").length;

    return { total, pendingCalls, aiQualified, followUpsDue, converted };
  }, [leads]);

  // Filtered Leads List
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesPhone = lead.phone.toLowerCase().includes(query);
        const matchesEmail = lead.email ? lead.email.toLowerCase().includes(query) : false;
        const matchesCourse = lead.course.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCourse) return false;
      }

      // 2. Source filter
      if (sourceFilter !== "ALL") {
        if (lead.source !== sourceFilter) return false;
      }

      // 3. Stage filter
      if (stageFilter !== "ALL") {
        if (stageFilter === "AI_CALLING") {
          if (lead.callStatus !== "IN_PROGRESS" && lead.aiOutcome !== "PENDING_CALL") return false;
        } else {
          if (lead.stage !== stageFilter) return false;
        }
      }

      // 4. Course filter
      if (courseFilter !== "ALL") {
        if (lead.course !== courseFilter) return false;
      }

      // 5. Counsellor filter
      if (counsellorFilter !== "ALL") {
        if (lead.assignedCounsellor !== counsellorFilter) return false;
      }

      // 6. Follow-up status filter
      if (followUpStatusFilter !== "ALL") {
        if (followUpStatusFilter === "DUE_TODAY" && !lead.nextFollowUp.includes("Today")) return false;
        if (followUpStatusFilter === "UPCOMING" && !lead.nextFollowUp.includes("Tomorrow") && !lead.nextFollowUp.includes("2026")) return false;
        if (followUpStatusFilter === "OVERDUE" && lead.priority !== "Urgent") return false;
        if (followUpStatusFilter === "COMPLETED" && lead.stage !== "CONVERTED" && lead.stage !== "LOST") return false;
      }

      return true;
    });
  }, [leads, searchTerm, sourceFilter, stageFilter, courseFilter, counsellorFilter, followUpStatusFilter]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchTerm("");
    setSourceFilter("ALL");
    setStageFilter("ALL");
    setCourseFilter("ALL");
    setCounsellorFilter("ALL");
    setFollowUpStatusFilter("ALL");
  };

  // Open Follow-up Modal
  const handleOpenFollowUp = (lead: UnifiedLead) => {
    setFollowUpLead(lead);
    setFollowUpChannel("PHONE");
    setFollowUpDate("2026-08-25");
    setFollowUpTime("11:00 AM");
    setFollowUpType("Phone Call");
    setFollowUpNotes(lead.latestResponse || lead.aiSummaryShort || "");
    setSetReminderAlert(true);
    setShowFollowUpModal(true);
  };

  // Save Follow-up Modal
  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpLead) return;

    const formattedNext =
      followUpDate === "2026-08-24"
        ? `Today, ${followUpTime}`
        : followUpDate === "2026-08-25"
        ? `Tomorrow, ${followUpTime}`
        : `${followUpDate}, ${followUpTime}`;

    scheduleFollowUp(followUpLead.id, {
      channel: followUpChannel,
      date: followUpDate,
      time: followUpTime,
      notes: followUpNotes,
      setReminder: setReminderAlert,
    });

    showToast(`✓ Follow-up scheduled for ${followUpLead.name} (${formattedNext})!`);
    setShowFollowUpModal(false);
  };

  // Open Mark as Lost Modal
  const handleOpenLostModal = (lead: UnifiedLead) => {
    setLostLead(lead);
    setLostReason("Not Interested");
    setLostNotes("");
    setShowFollowUpModal(false);
    setShowLostModal(true);
  };

  // Confirm Mark as Lost
  const handleConfirmLost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostLead) return;

    markAsLost(lostLead.id, lostReason, lostNotes);
    showToast(`✓ Lead ${lostLead.name} marked as Lost (${lostReason}).`);
    setShowLostModal(false);
  };

  // Open Assign to Counsellor Modal
  const handleOpenAssignModal = (lead: UnifiedLead) => {
    setAssignLead(lead);
    setSelectedCounsellor(lead.assignedCounsellor || "Priya Singh");
    setAssignNotes("");
    setShowAssignModal(true);
  };

  // Save Assignment
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignLead) return;

    assignCounsellor(assignLead.id, selectedCounsellor, assignNotes);
    showToast(`✓ Lead ${assignLead.name} assigned to ${selectedCounsellor}!`);
    setShowAssignModal(false);
  };

  // Add New Lead Submit
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const created = addLead({
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      course: formCourse,
      source: formSource,
      notes: formNotes.trim(),
      triggerImmediateCall: formTriggerAi,
    });

    showToast(
      formTriggerAi
        ? `✓ New lead ${created.name} added & Sarvam AI voice call initiated!`
        : `✓ Lead ${created.name} added successfully!`
    );

    // Reset Form
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormCourse("Digital Marketing");
    setFormSource("Website");
    setFormNotes("");
    setFormTriggerAi(true);
    setShowAddLeadModal(false);
  };

  // Open Details Drawer/Modal
  const handleOpenDetails = (lead: UnifiedLead, tab: "OVERVIEW" | "AI_CALL" | "TIMELINE" = "OVERVIEW") => {
    setActiveLead(lead);
    setDetailsTab(tab);
    setIsPlayingAudio(false);
    setShowDetailsDrawer(true);
  };

  // Quick Direct Call
  const handleCallStudent = (lead: UnifiedLead) => {
    window.location.href = `tel:${lead.phone}`;
  };

  // Quick WhatsApp
  const handleWhatsAppStudent = (lead: UnifiedLead) => {
    const text = encodeURIComponent(`Hello ${lead.name}, greetings from Aadya Institute regarding your ${lead.course} enquiry!`);
    window.open(`https://wa.me/91${lead.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#1769AA] shrink-0 mt-0.5 shadow-2xs">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
              Lead Management & AI Calling
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Manage leads from all sources, AI qualification, counsellor interactions, and follow-ups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowAddLeadModal(true)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold px-4.5 py-2 rounded-xl shadow-md gap-2 h-10 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Lead
          </Button>
        </div>
      </div>

      {/* ─── TOAST / BANNER NOTIFICATION ─── */}
      {toastMessage && (
        <div className="p-3.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-2 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── 2. COMPACT SUMMARY KPI CARDS (5 CARDS) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Leads */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-slate-500">Total Leads</p>
              <h3 className="text-2xl font-black text-[#0A2540] mt-1 tracking-tight">{kpis.total}</h3>
              <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">All Sources</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center font-bold border border-blue-100/70 shrink-0">
              <Target className="w-4.5 h-4.5" />
            </div>
          </div>
        </Card>

        {/* Card 2: Pending AI Calls */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-slate-500">Pending AI Calls</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">{kpis.pendingCalls}</h3>
              <p className="text-[10.5px] text-amber-600 font-medium mt-0.5">Queued for Telephony</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100/70 shrink-0">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
        </Card>

        {/* Card 3: AI Qualified / Interested */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-slate-500">AI Qualified</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1 tracking-tight">{kpis.aiQualified}</h3>
              <p className="text-[10.5px] text-emerald-600 font-medium mt-0.5">High Intent Leads</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100/70 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
          </div>
        </Card>

        {/* Card 4: Follow-ups Due */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-slate-500">Follow-ups Due</p>
              <h3 className="text-2xl font-black text-indigo-700 mt-1 tracking-tight">{kpis.followUpsDue}</h3>
              <p className="text-[10.5px] text-indigo-600 font-medium mt-0.5">Today & Upcoming</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100/70 shrink-0">
              <CalendarDays className="w-4.5 h-4.5" />
            </div>
          </div>
        </Card>

        {/* Card 5: Converted Leads */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-slate-500">Converted Leads</p>
              <h3 className="text-2xl font-black text-green-700 mt-1 tracking-tight">{kpis.converted}</h3>
              <p className="text-[10.5px] text-green-600 font-medium mt-0.5">Enrolled to Course</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold border border-green-100/70 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ─── 3. MULTI-FILTER BAR (ALL SOURCES, STAGES, COURSES, COUNSELLORS) ─── */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by lead name, phone, email, or course..."
              className="pl-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. All Sources Dropdown */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9.5 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🌐 All Sources</option>
              <option value="Website">🌐 Website Form</option>
              <option value="Meta Ads">📱 Meta / Facebook Ads</option>
              <option value="Google Ads">🔎 Google Search Ads</option>
              <option value="Instagram">📱 Instagram Campaign</option>
              <option value="WhatsApp">📲 WhatsApp Inbound</option>
              <option value="Walk-in">🚶 Center Walk-in</option>
              <option value="Direct Call">📞 Direct Call</option>
              <option value="Referral">👥 Student Referral</option>
              <option value="Campaign">🤖 AI Campaign</option>
            </select>

            {/* 2. All Stages Dropdown */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-9.5 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">📊 All Pipeline Stages</option>
              <option value="NEW">New Lead</option>
              <option value="AI_CALLING">AI Calling Active</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>

            {/* 3. All Courses Dropdown */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9.5 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🎓 All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Science">Data Science</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Python Programming">Python / AI</option>
              <option value="Java Full Stack">Java Full Stack</option>
            </select>

            {/* 4. Counsellor Dropdown */}
            <select
              value={counsellorFilter}
              onChange={(e) => setCounsellorFilter(e.target.value)}
              className="h-9.5 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">👤 All Counsellors</option>
              <option value="Priya Singh">Priya Singh</option>
              <option value="Ramesh Kumar">Ramesh Kumar</option>
              <option value="Deepak Joshi">Deepak Joshi</option>
              <option value="Ananya Sharma">Ananya Sharma</option>
            </select>

            {/* 5. Follow-up Status Dropdown */}
            <select
              value={followUpStatusFilter}
              onChange={(e) => setFollowUpStatusFilter(e.target.value)}
              className="h-9.5 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">📅 All Follow-ups</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="OVERDUE">Urgent / Overdue</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Reset Button */}
            {(searchTerm || sourceFilter !== "ALL" || stageFilter !== "ALL" || courseFilter !== "ALL" || counsellorFilter !== "ALL" || followUpStatusFilter !== "ALL") && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                className="h-9.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl px-3 cursor-pointer"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── 4. CENTRALIZED ALL LEADS TABLE (10 COLUMNS) ─── */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1280px]">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100 text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-bold min-w-[170px]">Lead</th>
                <th className="py-3 px-3 font-bold min-w-[125px]">Contact</th>
                <th className="py-3 px-3 font-bold min-w-[130px]">Course Interested</th>
                <th className="py-3 px-3 font-bold min-w-[110px]">Source</th>
                <th className="py-3 px-4 font-bold min-w-[210px] max-w-[280px]">AI Response</th>
                <th className="py-3 px-3 font-bold min-w-[100px]">Status</th>
                <th className="py-3 px-2 font-bold text-center min-w-[65px]">AI Score</th>
                <th className="py-3 px-3 font-bold min-w-[110px]">Counsellor</th>
                <th className="py-3 px-3 font-bold min-w-[130px]">Next Follow-up</th>
                <th className="py-3 px-4 font-bold text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <Target className="h-9 w-9 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">
                      {leads.length === 0 ? "No leads found" : "No leads match your filter criteria"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {leads.length === 0
                        ? 'Click "+ Add New Lead" to record a new candidate enquiry.'
                        : "Try resetting filters or adjusting your search query."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const src = getSourceBadge(lead.source);
                  const isPendingAi = lead.callStatus === "IN_PROGRESS" || lead.aiOutcome === "PENDING_CALL" || lead.aiOutcome === "NO_RESPONSE";

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(lead, "OVERVIEW")}
                    >
                      {/* 1. LEAD (Avatar, Name, Hot, Dot, Email) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1769AA] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {lead.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  lead.priority === "Urgent" ? "bg-rose-500 animate-pulse" : lead.priority === "Due Today" ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                              />
                              <p className="font-extrabold text-slate-900 text-xs truncate tracking-tight group-hover:text-[#1769AA] transition-colors">
                                {lead.name}
                              </p>
                              {lead.hotLead && (
                                <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-black shrink-0">
                                  🔥
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{lead.email || "No email"}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. CONTACT (Phone & Quick Call/WhatsApp) */}
                      <td className="py-3.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-slate-700">{lead.phone}</span>
                          <button
                            type="button"
                            title="Call Candidate"
                            onClick={() => handleCallStudent(lead)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="WhatsApp Candidate"
                            onClick={() => handleWhatsAppStudent(lead)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 3. COURSE INTERESTED */}
                      <td className="py-3.5 px-3 align-middle">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200 text-[11px] whitespace-nowrap shadow-2xs inline-block">
                          {lead.course}
                        </span>
                      </td>

                      {/* 4. SOURCE (Omnichannel Badges) */}
                      <td className="py-3.5 px-3 align-middle">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-flex items-center gap-1 whitespace-nowrap shadow-2xs ${src.bg}`}>
                          <span>{src.icon}</span>
                          <span>{src.label}</span>
                        </span>
                      </td>

                      {/* 5. AI RESPONSE (Compact Quote / Pending) */}
                      <td className="py-3.5 px-4 align-middle max-w-[280px]" onClick={(e) => { e.stopPropagation(); handleOpenDetails(lead, "AI_CALL"); }}>
                        {isPendingAi ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 whitespace-nowrap shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Pending AI Call
                          </span>
                        ) : (
                          <div className="space-y-0.5 group/ai">
                            <p className="text-[11px] font-medium text-slate-700 italic truncate group-hover/ai:text-[#1769AA]">
                              “{lead.aiSummaryShort || lead.latestResponse || "AI conversation logged"}”
                            </p>
                            <span className="text-[9.5px] font-bold text-[#1769AA] hover:underline inline-flex items-center gap-0.5 cursor-pointer">
                              <Bot className="w-2.5 h-2.5" /> View Transcript & Audio
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 6. STATUS (Clean Stage Badge) */}
                      <td className="py-3.5 px-3 align-middle">
                        {(() => {
                          const stg = getStageBadge(lead.stage);
                          return (
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${stg.bg}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{stg.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* 7. AI SCORE */}
                      <td className="py-3.5 px-2 align-middle text-center whitespace-nowrap">
                        {isPendingAi ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          <div>
                            <span className="text-xs font-black text-slate-900">{lead.aiScore || 85}%</span>
                            <div className="text-[9px] text-amber-400 leading-none">
                              {"★".repeat(lead.starRating || 4)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 8. COUNSELLOR */}
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {(lead.assignedCounsellor || "Priya")[0]}
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">
                            {lead.assignedCounsellor || "Priya Singh"}
                          </span>
                        </div>
                      </td>

                      {/* 9. NEXT FOLLOW-UP */}
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block whitespace-nowrap shadow-2xs ${
                            lead.nextFollowUp.includes("Today")
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : lead.nextFollowUp.includes("Tomorrow")
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : lead.nextFollowUp.includes("Closed")
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {lead.nextFollowUp}
                        </span>
                      </td>

                      {/* 10. ACTIONS */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenFollowUp(lead)}
                            className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-7.5 px-2.5 text-[11px] rounded-lg shadow-2xs gap-1 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Phone className="w-3 h-3" /> Follow Up
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-semibold bg-white rounded-xl shadow-xl border border-slate-100 p-1">
                              <DropdownMenuItem
                                onClick={() => handleOpenDetails(lead, "OVERVIEW")}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#1769AA]" /> View Full Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenDetails(lead, "AI_CALL")}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <Bot className="w-3.5 h-3.5 text-emerald-600" /> AI Call & Transcript
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenAssignModal(lead)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Assign Counsellor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleWhatsAppStudent(lead)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-green-600" /> Send WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleOpenLostModal(lead)}
                                className="cursor-pointer gap-2 py-2 text-rose-600 hover:bg-rose-50"
                              >
                                <X className="w-3.5 h-3.5" /> Mark as Lost
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
        </div>
      </Card>

      {/* ─── 5. SCHEDULE FOLLOW-UP POPUP / MODAL ─── */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto z-50">
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

          {followUpLead && (
            <form onSubmit={handleSaveFollowUp} className="space-y-4.5 pt-2 text-xs">
              {/* 1. Candidate Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1769AA] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                      {followUpLead.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {followUpLead.name}
                      </h4>
                      <p className="text-slate-500 font-mono text-[11px] font-medium flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {followUpLead.phone}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-blue-50 text-[#1769AA] border border-blue-200 font-bold text-[11px] px-2.5 py-1 shrink-0 self-start sm:self-auto">
                    {followUpLead.course}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Lead Source</span>
                    <span className="font-bold text-slate-700">{followUpLead.source}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">AI Score / Status</span>
                    <span className="font-bold text-emerald-700">{followUpLead.aiScore || 85}% • {followUpLead.aiOutcome || "Qualified"}</span>
                  </div>
                </div>
              </div>

              {/* 2. Follow-up Type Selector */}
              <div className="space-y-1.5">
                <Label className="text-slate-800 font-bold text-xs">Follow-up Type *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "Phone Call", label: "Phone Call", icon: Phone },
                    { id: "WhatsApp", label: "WhatsApp", icon: MessageSquare },
                    { id: "Meeting", label: "Meeting / Demo", icon: Laptop },
                    { id: "Other", label: "Other", icon: CalendarDays },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSel = followUpType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setFollowUpType(t.id as any);
                          if (t.id === "WhatsApp") setFollowUpChannel("WHATSAPP");
                          else if (t.id === "Phone Call") setFollowUpChannel("PHONE");
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                          isSel
                            ? "bg-blue-50/80 border-[#1769AA] text-[#1769AA] shadow-xs font-bold ring-1 ring-[#1769AA]"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Schedule Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-800 font-bold text-xs">Follow-up Date *</Label>
                  <Input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-9.5 text-xs rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-800 font-bold text-xs">Follow-up Time *</Label>
                  <select
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full h-9.5 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                  >
                    <option value="10:00 AM">10:00 AM (Morning)</option>
                    <option value="11:00 AM">11:00 AM (Morning)</option>
                    <option value="12:00 PM">12:00 PM (Noon)</option>
                    <option value="02:30 PM">02:30 PM (Afternoon)</option>
                    <option value="04:00 PM">04:00 PM (Evening)</option>
                    <option value="05:30 PM">05:30 PM (Evening)</option>
                  </select>
                </div>
              </div>

              {/* 4. Reminder Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  checked={setReminderAlert}
                  onChange={(e) => setSetReminderAlert(e.target.checked)}
                  className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
                />
                <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-[#1769AA]" />
                  Create reminder alert on Counsellor Dashboard & WhatsApp
                </span>
              </label>

              {/* 5. Follow-up Notes */}
              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Follow-up Notes / Discussion Agenda</Label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Call to discuss installment options and confirm Saturday demo session seat..."
                  className="w-full min-h-[70px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                />
              </div>

              {/* Shortcut: Not Interested? Mark as Lost */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenLostModal(followUpLead)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Not Interested? Mark as Lost
                </button>
              </div>

              {/* Dialog Footer Actions */}
              <DialogFooter className="pt-2 flex items-center justify-end gap-2.5">
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
                  Schedule Follow-up
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 6. MARK AS LOST CONFIRMATION POPUP ─── */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-50">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-rose-700 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 inline-flex">
                <AlertTriangle className="h-5 w-5" />
              </span>
              Mark Lead as Lost
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Marking this lead as lost will close the active pipeline while preserving full interaction logs.
            </p>
          </DialogHeader>

          {lostLead && (
            <form onSubmit={handleConfirmLost} className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-rose-900 font-bold">
                Candidate: {lostLead.name} ({lostLead.phone}) • {lostLead.course}
              </div>

              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Primary Lost Reason *</Label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Not Interested">Not Interested in Course</option>
                  <option value="Course Fee">Course Fee / Budget Constraints</option>
                  <option value="Joined Another Institute">Joined Another Institute</option>
                  <option value="No Response">No Response after multiple attempts</option>
                  <option value="Invalid Contact">Invalid Contact / Wrong Number</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Remarks / Feedback (Optional)</Label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Enter details or candidate feedback..."
                  className="w-full min-h-[65px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
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

      {/* ─── 7. ASSIGN COUNSELLOR POPUP ─── */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-50">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-[#0A2540] flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                <UserCheck className="h-5 w-5" />
              </span>
              Assign Lead to Counsellor
            </DialogTitle>
          </DialogHeader>

          {assignLead && (
            <form onSubmit={handleSaveAssignment} className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-bold">
                {assignLead.name} ({assignLead.phone}) • {assignLead.course}
              </div>

              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Select Counsellor *</Label>
                <select
                  value={selectedCounsellor}
                  onChange={(e) => setSelectedCounsellor(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                >
                  <option value="Priya Singh">Priya Singh (Digital Marketing & Design)</option>
                  <option value="Ramesh Kumar">Ramesh Kumar (Full Stack & Python)</option>
                  <option value="Deepak Joshi">Deepak Joshi (Data Science & AI)</option>
                  <option value="Ananya Sharma">Ananya Sharma (General Admissions)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Assignment Remarks</Label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Notes for the assigned counsellor..."
                  className="w-full min-h-[65px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-800 outline-none"
                />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer h-9.5 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
                >
                  <Check className="h-4 w-4" />
                  Save Assignment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 8. ADD NEW LEAD MODAL ─── */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-50">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-[#0A2540] flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                <UserPlus className="h-5 w-5" />
              </span>
              Add New Lead
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Record a new student enquiry and optionally initiate an instant AI qualification voice call.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-800 font-bold text-xs">Candidate Full Name *</Label>
              <Input
                required
                placeholder="e.g. Aman Sharma"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Phone Number *</Label>
                <Input
                  required
                  placeholder="9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Email Address</Label>
                <Input
                  type="email"
                  placeholder="aman@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Course Interested *</Label>
                <select
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800"
                >
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Python Programming">Python / AI</option>
                  <option value="Java Full Stack">Java Full Stack</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-800 font-bold text-xs">Lead Source *</Label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value as LeadSource)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800"
                >
                  <option value="Website">🌐 Website Form</option>
                  <option value="Meta Ads">📱 Meta / Facebook Ads</option>
                  <option value="Google Ads">🔎 Google Ads</option>
                  <option value="Instagram">📱 Instagram Campaign</option>
                  <option value="WhatsApp">📲 WhatsApp Inbound</option>
                  <option value="Walk-in">🚶 Center Walk-in</option>
                  <option value="Direct Call">📞 Direct Call</option>
                  <option value="Referral">👥 Student Referral</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <input
                type="checkbox"
                checked={formTriggerAi}
                onChange={(e) => setFormTriggerAi(e.target.checked)}
                className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
              />
              <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#1769AA]" />
                Trigger automated Sarvam AI voice qualification call immediately
              </span>
            </label>

            <div className="space-y-1">
              <Label className="text-slate-800 font-bold text-xs">Initial Enquiry Notes</Label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Candidate enquired about fees and batch timings..."
                className="w-full min-h-[60px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-800"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddLeadModal(false)}
                className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer h-9.5 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
              >
                <Check className="h-4 w-4" /> Save & Launch Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 9. LEAD DETAILS INSPECTION POPUP MODAL ─── */}
      <Dialog open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <DialogContent className="max-w-2xl sm:max-w-3xl bg-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col z-50">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                  <FileText className="h-5 w-5 stroke-[2.5]" />
                </span>
                Lead Profile & AI Qualification
              </DialogTitle>
            </div>

            {activeLead && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#1769AA] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    {activeLead.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate tracking-tight">
                        {activeLead.name}
                      </h4>
                      {activeLead.hotLead && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black">
                          🔥 Hot Lead
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black">
                        Stage: {activeLead.stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-mono text-[11px] font-medium flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {activeLead.phone}</span>
                      <span>•</span>
                      <span className="font-sans font-bold text-slate-600">
                        {getSourceBadge(activeLead.source).icon} {getSourceBadge(activeLead.source).label}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge className="bg-blue-50 text-[#1769AA] border border-blue-200 font-bold text-[11px] px-3 py-1 shrink-0">
                  {activeLead.course}
                </Badge>
              </div>
            )}

            {/* Segmented Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setDetailsTab("OVERVIEW")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  detailsTab === "OVERVIEW"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Overview & Profile
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("AI_CALL")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  detailsTab === "AI_CALL"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                AI Audio & Transcript
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("TIMELINE")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  detailsTab === "TIMELINE"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Activity Timeline
              </button>
            </div>
          </div>

          {/* Modal Body Content */}
          {activeLead && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {detailsTab === "OVERVIEW" && (
                <>
                  {/* AI Qualification Score & Outcome */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">AI Voice Outcome</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> {activeLead.aiOutcome || "Qualified"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 block mb-0.5">AI Score</span>
                      <span className="text-xl font-black text-slate-900">{activeLead.aiScore || 85}%</span>
                      <div className="text-xs text-amber-400 font-bold">
                        {"★".repeat(activeLead.starRating || 4)}{"☆".repeat(5 - (activeLead.starRating || 4))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Narrative */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1769AA]" /> AI Generated Summary
                    </Label>
                    <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/80 text-slate-700 font-medium leading-relaxed shadow-2xs">
                      {activeLead.aiDetailedSummary || activeLead.aiSummaryShort || "Candidate was contacted via automated Sarvam AI voice agent."}
                    </div>
                  </div>

                  {/* Key Discussion Points */}
                  <div className="space-y-2">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Discussion Points
                    </Label>
                    <div className="space-y-2">
                      {(activeLead.keyHighlights || activeLead.keyDiscussionPoints || [
                        `Interested in ${activeLead.course}`,
                        `Lead Origin: ${activeLead.source}`,
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

                  {/* Metadata */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5">
                    <Label className="text-slate-800 font-bold text-xs block mb-1">Lead Telephony Details</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11.5px]">
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Call Time</span>
                        <span className="font-bold text-slate-800">{activeLead.callDate || "Today"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Duration</span>
                        <span className="font-bold text-slate-800">{activeLead.callDuration || "2m 15s"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Counsellor</span>
                        <span className="font-bold text-slate-800">{activeLead.assignedCounsellor || "Priya Singh"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Next Touchpoint</span>
                        <span className="font-bold text-slate-800">{activeLead.nextFollowUp}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {detailsTab === "AI_CALL" && (
                <>
                  {/* Waveform Audio Player */}
                  <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-extrabold text-xs text-slate-200">Sarvam AI Call Audio</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{activeLead.callDuration || "02:15"}</span>
                    </div>

                    <div className="flex items-center gap-1 h-10 px-2 bg-slate-800/80 rounded-xl overflow-hidden">
                      {[30, 45, 75, 90, 60, 40, 85, 95, 70, 50, 80, 100, 65, 45, 90, 80, 55, 35, 70, 90, 60, 40, 75, 85, 50, 30].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i < 10 ? "bg-emerald-400" : isPlayingAudio ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                          }`}
                        />
                      ))}
                    </div>

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
                          <p className="text-[11px] font-mono font-bold text-slate-300">01:24 / {activeLead.callDuration || "02:15"}</p>
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

                  {/* Transcript Dialogue */}
                  <div className="space-y-3">
                    <Label className="text-slate-800 font-bold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[#1769AA]" /> Voice Agent Dialogue Transcript
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-normal">Hindi / English Telephony</span>
                    </Label>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {(activeLead.transcript && activeLead.transcript.length > 0 ? activeLead.transcript : [
                        {
                          speaker: "AI_AGENT" as const,
                          name: "Aadya AI Agent",
                          time: "00:02",
                          text: `Namaste ${activeLead.name}! Main Aadya Institute of Technical Studies se bol rahi hoon. Aapne hamare ${activeLead.course} training program ke liye inquiry kiya tha?`
                        },
                        {
                          speaker: "STUDENT" as const,
                          name: activeLead.name,
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
                          name: activeLead.name,
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
                          className={`p-3 rounded-2xl text-xs space-y-1 ${
                            msg.speaker === "AI_AGENT" || msg.speaker === "AI"
                              ? "bg-blue-50/70 border border-blue-100 text-slate-800 mr-4"
                              : "bg-slate-100/80 border border-slate-200/70 text-slate-900 ml-4"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                              {msg.speaker === "AI_AGENT" || msg.speaker === "AI" ? (
                                <span className="text-[#1769AA] font-black">🤖 {msg.name || msg.speakerName || "Aadya AI Agent"}</span>
                              ) : (
                                <span className="text-slate-800 font-black">👤 {msg.name || msg.speakerName || activeLead.name}</span>
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

              {detailsTab === "TIMELINE" && (
                <div className="space-y-3">
                  <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1769AA]" /> Activity & Interaction History
                  </Label>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {(activeLead.attemptsHistory || [
                      {
                        attemptNo: 1,
                        mode: "PHONE",
                        timestamp: "Today, 10:45 AM",
                        response: activeLead.latestResponse || "Initial enquiry captured",
                        notes: `Enquiry from ${activeLead.source}`,
                        nextFollowUp: activeLead.nextFollowUp
                      }
                    ]).map((att, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[10.5px]">
                          <span className="text-[#1769AA] flex items-center gap-1">
                            {att.mode === "AI_VOICE" ? "🤖 AI Voice Call" : att.mode === "WHATSAPP" ? "📲 WhatsApp Touchpoint" : "📞 Counsellor Call"}
                          </span>
                          <span className="font-mono text-slate-400">{att.timestamp}</span>
                        </div>
                        <p className="font-bold text-slate-800">{att.response}</p>
                        {att.notes && <p className="text-slate-600 font-medium text-[11px]">{att.notes}</p>}
                        {att.nextFollowUp && (
                          <p className="text-[10.5px] text-indigo-600 font-bold mt-0.5">
                            Next Follow-up: {att.nextFollowUp}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Bottom Actions */}
          {activeLead && (
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDetailsDrawer(false);
                  handleOpenLostModal(activeLead);
                }}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl h-9.5"
              >
                Mark as Lost
              </Button>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDetailsDrawer(false);
                    handleCallStudent(activeLead);
                  }}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer h-9.5 px-4 gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Call Student
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowDetailsDrawer(false);
                    handleOpenFollowUp(activeLead);
                  }}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
                >
                  <CalendarDays className="w-4 h-4" />
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
