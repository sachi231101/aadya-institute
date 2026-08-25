import React, { useMemo, useState } from "react";
import {
  Bot,
  Phone,
  PhoneCall,
  Users,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Search,
  X,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  MoreVertical,
  CalendarDays,
  Mail,
  MessageSquare,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
  FileText,
  VolumeX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLeadStore, type UnifiedLead, type LeadSource } from "@/store/lead.store";

interface AiTranscriptMessage {
  speaker: "AI" | "LEAD";
  speakerName: string;
  time: string;
  text: string;
}

interface AiCallingLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  sourceType: string;
  course: string;
  callStatus: "COMPLETED" | "IN_PROGRESS" | "NO_ANSWER" | "FAILED";
  attempt: number;
  aiOutcome: "INTERESTED" | "CALLBACK_REQUESTED" | "NEEDS_COUNSELLOR" | "NO_RESPONSE" | "NOT_INTERESTED";
  aiSummaryShort: string;
  aiSummaryDetailed: string;
  keyDiscussionPoints: string[];
  callDuration: string;
  callDurationSeconds: number;
  callTimestamp: string;
  callDate: string;
  campaign: string;
  aiScore: number; // 0 to 100
  starRating: number; // 1 to 5
  nextActionType: "CONTACT_NOW" | "CALL_BACK" | "ASSIGN_CONTACT" | "RETRY_CALL" | "MARK_LOST" | "FOLLOW_UP";
  nextActionLabel: string;
  nextActionSubtext?: string;
  hotLead?: boolean;
  callbackTime?: string;
  assignedCounsellor?: string;
  audioRecordingUrl?: string;
  transcript: AiTranscriptMessage[];
  pipelineStage: "NEW" | "CONTACTED" | "INTERESTED" | "FOLLOW_UP" | "CONVERTED" | "LOST";
}

const _INITIAL_AI_CALLING_LEADS: AiCallingLead[] = [];

export const AiCallingQualification: React.FC = () => {
  // Centralized Leads from store
  const {
    leads,
    addLead,
    scheduleFollowUp: storeScheduleFollowUp,
    markAsLost: storeMarkAsLost,
    assignCounsellor: storeAssignCounsellor,
    retryAiCall: storeRetryAiCall,
  } = useLeadStore();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [responseFilter, setResponseFilter] = useState("ALL");
  const [campaignFilter, setCampaignFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("TODAY");

  // Drawer / Side Panel State
  const [activeLead, setActiveLead] = useState<UnifiedLead | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "RECORDING">("SUMMARY");

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Workflow Modals State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<UnifiedLead | null>(null);
  const [followUpChannel, setFollowUpChannel] = useState<"PHONE" | "WHATSAPP" | "EMAIL">("PHONE");
  const [followUpDate, setFollowUpDate] = useState("2026-08-25");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [setReminderAlert, setSetReminderAlert] = useState(true);
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Mark as Lost Modal State
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostLead, setLostLead] = useState<UnifiedLead | null>(null);
  const [lostReason, setLostReason] = useState("Joined Competitor Institute");
  const [lostNotes, setLostNotes] = useState("");

  // Assign to Counsellor Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLead, setAssignLead] = useState<UnifiedLead | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState("Priya Singh");
  const [assignNotes, setAssignNotes] = useState("");

  // Add New Lead Modal State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCourse, setNewLeadCourse] = useState("Digital Marketing");
  const [newLeadSource, setNewLeadSource] = useState<LeadSource>("Website");
  const [triggerImmediateCall, setTriggerImmediateCall] = useState(true);

  // Toast / Banner Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Dynamic KPI Calculations from all omnichannel leads
  const kpiStats = useMemo(() => {
    const total = leads.length;
    const completed = leads.filter((l) => l.callStatus === "COMPLETED").length;
    const interestedCount = leads.filter((l) => l.aiOutcome === "INTERESTED").length;
    const callbackCount = leads.filter((l) => l.aiOutcome === "CALLBACK_REQUESTED").length;
    const notInterestedCount = leads.filter((l) => l.aiOutcome === "NOT_INTERESTED").length;
    const noResponseCount = leads.filter(
      (l) => l.aiOutcome === "NO_RESPONSE" || l.callStatus === "NO_ANSWER"
    ).length;

    return {
      totalLeads: total,
      callsCompleted: completed,
      completionGrowth: `↑ ${total > 0 ? Math.round((completed / total) * 100) : 0}%`,
      interested: interestedCount,
      interestedGrowth: `↑ ${total > 0 ? Math.round((interestedCount / total) * 100) : 0}%`,
      callbackRequested: callbackCount,
      notInterested: notInterestedCount,
      noResponse: noResponseCount,
    };
  }, [leads]);

  // Filtered Leads across all omnichannel sources
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          lead.name.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          lead.course.toLowerCase().includes(q) ||
          lead.source.toLowerCase().includes(q) ||
          lead.aiSummaryShort.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Source Filter
      if (sourceFilter !== "ALL" && lead.source !== sourceFilter) {
        return false;
      }
      // Course Filter
      if (courseFilter !== "ALL" && lead.course !== courseFilter) {
        return false;
      }
      // AI Response Filter
      if (responseFilter !== "ALL" && lead.aiOutcome !== responseFilter) {
        return false;
      }
      // Campaign Filter
      if (campaignFilter !== "ALL" && lead.campaign !== campaignFilter) {
        return false;
      }
      return true;
    });
  }, [leads, searchTerm, sourceFilter, courseFilter, responseFilter, campaignFilter]);

  // Open Details Drawer
  const handleOpenDetails = (lead: UnifiedLead) => {
    setActiveLead(lead);
    setActiveTab("SUMMARY");
    setIsPlayingAudio(false);
    setShowDetailsDrawer(true);
  };

  // Open Follow-up Modal
  const handleOpenFollowUpModal = (lead: UnifiedLead) => {
    setFollowUpLead(lead);
    setFollowUpChannel("PHONE");
    setFollowUpDate("2026-08-25");
    setFollowUpTime("11:00 AM");
    setSetReminderAlert(true);
    setFollowUpNotes(lead.aiSummaryShort || "");
    setShowFollowUpModal(true);
  };

  // Apply Follow-up Preset
  const handleApplyPreset = (preset: "today_4pm" | "tomorrow_10am" | "tomorrow_2pm" | "in_2days") => {
    if (preset === "today_4pm") {
      setFollowUpDate("2026-08-24");
      setFollowUpTime("04:00 PM");
    } else if (preset === "tomorrow_10am") {
      setFollowUpDate("2026-08-25");
      setFollowUpTime("10:30 AM");
    } else if (preset === "tomorrow_2pm") {
      setFollowUpDate("2026-08-25");
      setFollowUpTime("02:30 PM");
    } else if (preset === "in_2days") {
      setFollowUpDate("2026-08-26");
      setFollowUpTime("11:00 AM");
    }
  };

  // Save Follow-up Modal
  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpLead) return;

    storeScheduleFollowUp(
      followUpLead.id,
      followUpChannel,
      followUpDate,
      followUpTime,
      followUpNotes
    );

    const formattedNext =
      followUpDate === "2026-08-24"
        ? `Today, ${followUpTime}`
        : followUpDate === "2026-08-25"
        ? `Tomorrow, ${followUpTime}`
        : `${followUpDate}, ${followUpTime}`;

    showToast(`✓ Follow-up scheduled for ${followUpLead.name} on ${formattedNext}!`);
    setShowFollowUpModal(false);
  };

  // Open Mark as Lost Modal
  const handleOpenLostModal = (lead: UnifiedLead) => {
    setLostLead(lead);
    setLostReason("Joined Competitor Institute");
    setLostNotes("");
    setShowFollowUpModal(false);
    setShowLostModal(true);
  };

  // Confirm Mark as Lost
  const handleConfirmLost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostLead) return;

    storeMarkAsLost(lostLead.id, lostReason, lostNotes);
    showToast(`✓ Lead ${lostLead.name} marked as Lost.`);
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

    storeAssignCounsellor(assignLead.id, selectedCounsellor, assignNotes);
    showToast(`✓ Lead ${assignLead.name} assigned to ${selectedCounsellor}!`);
    setShowAssignModal(false);
  };

  // Retry AI Call
  const handleRetryAiCall = (lead: UnifiedLead) => {
    storeRetryAiCall(lead.id);
    showToast(`📞 Initiating automated AI voice calling to ${lead.name} (${lead.phone})...`);
  };

  // Add New Lead Submit
  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;

    addLead({
      name: newLeadName.trim(),
      phone: newLeadPhone.trim(),
      email: `${newLeadName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      source: newLeadSource,
      course: newLeadCourse,
      triggerImmediateCall,
      notes: `Registered via AI Calling portal. Source: ${newLeadSource}`
    });

    setShowAddLeadModal(false);
    showToast(`✓ New lead ${newLeadName} created from ${newLeadSource} & AI calling queued!`);

    // Reset
    setNewLeadName("");
    setNewLeadPhone("");
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSourceFilter("ALL");
    setCourseFilter("ALL");
    setResponseFilter("ALL");
    setCampaignFilter("ALL");
    setDateFilter("TODAY");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-full space-y-4 sm:space-y-5 bg-[#f8fafc] min-h-screen text-slate-800">
      {/* ─── TOAST / BANNER NOTIFICATION ─── */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
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

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#1769AA] shrink-0 shadow-2xs">
            <Bot className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0A2540]">
                AI Calling & Voice Qualification
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#1769AA] border border-blue-200 text-[10.5px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1769AA] animate-pulse" />
                Live Telephony
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Automated AI voice calling campaigns, interest scoring & omnichannel telephony logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold px-4 py-2 rounded-xl shadow-xs gap-1.5 h-9.5 text-xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>Add New Lead</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. SUMMARY KPI CARDS (6 CARDS GRID) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Leads */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Total Leads</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.totalLeads}</h3>
            </div>
          </CardContent>
        </Card>

        {/* AI Calls Completed */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">AI Calls Completed</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.callsCompleted}</h3>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                {kpiStats.completionGrowth}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Interested */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Interested</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.interested}</h3>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                {kpiStats.interestedGrowth}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Callback Requested */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Callback Requested</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.callbackRequested}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Not Interested */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Not Interested</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertOctagon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.notInterested}</h3>
              <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                Closed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* No Response */}
        <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">No Response</span>
              <div className="w-7.5 h-7.5 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpiStats.noResponse}</h3>
              <span className="text-[9.5px] font-extrabold text-[#1769AA] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 cursor-pointer hover:bg-blue-100">
                Retry
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. SEARCH AND FILTERS BAR (WITH MULTI-SOURCE FILTER) ─── */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, course, source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-[#1769AA] transition-all font-medium text-slate-800 placeholder:text-slate-400 h-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Reset */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {/* Lead Source Dropdown */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8 text-[11px] bg-white border border-slate-200 rounded-lg px-2 font-semibold text-slate-700 focus:outline-none focus:border-[#1769AA] cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Lead Sources</option>
                <option value="Website">🌐 Website</option>
                <option value="Google Ads">🔍 Google Ads</option>
                <option value="Meta Ads">⚡ Meta Ads</option>
                <option value="Instagram">📱 Instagram</option>
                <option value="Referral">👥 Referral</option>
                <option value="Walk-in">🏢 Walk-in</option>
                <option value="Direct Call">📞 Direct Call</option>
              </select>

              {/* Course Dropdown */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-8 text-[11px] bg-white border border-slate-200 rounded-lg px-2 font-semibold text-slate-700 focus:outline-none focus:border-[#1769AA] cursor-pointer shadow-2xs"
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

              {/* AI Response Dropdown */}
              <select
                value={responseFilter}
                onChange={(e) => setResponseFilter(e.target.value)}
                className="h-8 text-[11px] bg-white border border-slate-200 rounded-lg px-2 font-semibold text-slate-700 focus:outline-none focus:border-[#1769AA] cursor-pointer shadow-2xs"
              >
                <option value="ALL">All AI Responses</option>
                <option value="INTERESTED">🟢 Interested</option>
                <option value="CALLBACK_REQUESTED">🟠 Callback Requested</option>
                <option value="NEEDS_COUNSELLOR">🔵 Needs Counsellor</option>
                <option value="NO_RESPONSE">⚪ No Response</option>
                <option value="NOT_INTERESTED">🔴 Not Interested</option>
              </select>

              {/* Campaign Dropdown */}
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="h-8 text-[11px] bg-white border border-slate-200 rounded-lg px-2 font-semibold text-slate-700 focus:outline-none focus:border-[#1769AA] cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Campaigns</option>
                <option value="August Admission Drive">August Admission Drive</option>
                <option value="Weekend Fast-Track">Weekend Fast-Track</option>
                <option value="Meta Ads Retargeting">Meta Ads Retargeting</option>
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 text-[11px] bg-white border border-slate-200 rounded-lg px-2 font-semibold text-slate-700 focus:outline-none focus:border-[#1769AA] cursor-pointer shadow-2xs"
              >
                <option value="TODAY">📅 Today (24 Aug)</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="ALL_TIME">All Time</option>
              </select>

              {/* Reset Button */}
              {(searchTerm || sourceFilter !== "ALL" || courseFilter !== "ALL" || responseFilter !== "ALL" || campaignFilter !== "ALL" || dateFilter !== "TODAY") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-8 text-[11px] font-black text-rose-600 hover:text-rose-700 px-2 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. AI CALLING LEADS TABLE (FULL SCREEN FIT, NO SCROLLING, NO CHECKBOX) ─── */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col className="w-[21%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[25%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100 text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 font-bold">Lead Details</th>
                <th className="py-2.5 px-2.5 font-bold">Interested In</th>
                <th className="py-2.5 px-2.5 font-bold">AI Call Status</th>
                <th className="py-2.5 px-3 font-bold">AI Response & Summary</th>
                <th className="py-2.5 px-2 font-bold">Call Info</th>
                <th className="py-2.5 px-2 font-bold text-center">AI Score</th>
                <th className="py-2.5 px-2 font-bold text-center">Next Action</th>
                <th className="py-2.5 px-2 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Bot className="h-8 w-8 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-bold text-xs text-slate-700">No AI Calling records found</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Try adjusting filters or adding a new enquiry.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 1. Lead Details */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1769AA] font-black flex items-center justify-center text-[10.5px] shrink-0 shadow-2xs">
                            {lead.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-slate-900 text-xs truncate tracking-tight group-hover:text-[#1769AA] transition-colors">
                                {lead.name}
                              </p>
                              {lead.hotLead && (
                                <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-black shrink-0">
                                  🔥 Hot
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[10px] text-slate-500 font-mono font-medium truncate">
                                {lead.phone}
                              </p>
                              <span className="text-slate-300 text-[9px]">•</span>
                              <span className="text-[9px] font-bold text-slate-600 truncate">
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
                                  : `📞 ${lead.source}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Interested In */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200/80 text-[10.5px] truncate max-w-full inline-block shadow-2xs">
                          {lead.course}
                        </span>
                      </td>

                      {/* 3. AI Call Status */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <div className="space-y-0.5">
                          {lead.callStatus === "COMPLETED" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" /> Completed
                            </span>
                          ) : lead.callStatus === "NO_ANSWER" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                              <X className="w-2.5 h-2.5 text-slate-400 stroke-[3]" /> No Answer
                            </span>
                          ) : lead.callStatus === "IN_PROGRESS" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 animate-pulse">
                              <Clock className="w-2.5 h-2.5 text-amber-600" /> In Progress
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> Call Failed
                            </span>
                          )}
                          <p className="text-[9px] text-slate-400 font-medium pl-0.5">
                            {lead.attempt === 1 ? "1st Attempt" : `${lead.attempt}nd Attempt`}
                          </p>
                        </div>
                      </td>

                      {/* 4. AI Response & Summary (Key Column) */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="space-y-0.5">
                          {/* Outcome Badge */}
                          {lead.aiOutcome === "INTERESTED" ? (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Interested
                            </span>
                          ) : lead.aiOutcome === "CALLBACK_REQUESTED" ? (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Callback Requested
                            </span>
                          ) : lead.aiOutcome === "NEEDS_COUNSELLOR" ? (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                              Needs Counsellor
                            </span>
                          ) : lead.aiOutcome === "NOT_INTERESTED" ? (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Not Interested
                            </span>
                          ) : (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              No Response
                            </span>
                          )}

                          {/* Short Quote / Summary */}
                          <p
                            className="text-[10.5px] text-slate-700 font-medium leading-snug truncate italic"
                            title={lead.aiSummaryShort}
                          >
                            “{lead.aiSummaryShort}”
                          </p>
                        </div>
                      </td>

                      {/* 5. Call Info */}
                      <td className="py-2.5 px-2 align-middle">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {lead.callDuration}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">
                            {lead.callTimestamp}
                          </p>
                        </div>
                      </td>

                      {/* 6. AI Score */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        {lead.aiScore > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-[11.5px] font-black text-slate-900 tracking-tight">
                              {lead.aiScore}%
                            </span>
                            <div className="text-[8.5px] text-amber-400 flex items-center justify-center">
                              {"★".repeat(lead.starRating)}{"☆".repeat(5 - lead.starRating)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs">—</span>
                        )}
                      </td>

                      {/* 7. Next Action */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        <div className="inline-flex flex-col items-center gap-0.5 max-w-full">
                          {lead.nextActionType === "CONTACT_NOW" ? (
                            <Button
                              type="button"
                              onClick={() => handleOpenAssignModal(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-extrabold text-[10px] border border-emerald-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Contact Now
                            </Button>
                          ) : lead.nextActionType === "CALL_BACK" ? (
                            <Button
                              type="button"
                              onClick={() => handleOpenFollowUpModal(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white font-extrabold text-[10px] border border-amber-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Call Back
                            </Button>
                          ) : lead.nextActionType === "ASSIGN_CONTACT" ? (
                            <Button
                              type="button"
                              onClick={() => handleOpenAssignModal(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-blue-50 hover:bg-[#1769AA] text-[#1769AA] hover:text-white font-extrabold text-[10px] border border-blue-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Assign & Contact
                            </Button>
                          ) : lead.nextActionType === "RETRY_CALL" ? (
                            <Button
                              type="button"
                              onClick={() => handleRetryAiCall(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-blue-50 hover:bg-[#1769AA] text-[#1769AA] hover:text-white font-extrabold text-[10px] border border-blue-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Retry AI Call
                            </Button>
                          ) : lead.nextActionType === "MARK_LOST" ? (
                            <Button
                              type="button"
                              onClick={() => handleOpenLostModal(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-extrabold text-[10px] border border-rose-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Mark as Lost
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => handleOpenFollowUpModal(lead)}
                              size="sm"
                              className="h-6.5 px-2 rounded-md bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white font-extrabold text-[10px] border border-amber-200 transition-all shadow-2xs cursor-pointer truncate"
                            >
                              Follow Up
                            </Button>
                          )}

                          {lead.nextActionSubtext && (
                            <span className="text-[8.5px] font-bold text-slate-400 truncate max-w-full">
                              {lead.nextActionSubtext}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Action (View Details + Menu) */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            onClick={() => handleOpenDetails(lead)}
                            size="sm"
                            className="h-6.5 px-2 rounded-md bg-blue-50 hover:bg-[#1769AA] text-[#1769AA] hover:text-white font-bold text-[10px] border border-blue-200/80 transition-all shadow-2xs cursor-pointer"
                          >
                            Details
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-6.5 h-6.5 rounded-md border border-slate-200/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="More Options"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200">
                              <DropdownMenuItem
                                onClick={() => handleOpenDetails(lead)}
                                className="text-xs font-semibold py-1.5 cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                View Full Transcript
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenFollowUpModal(lead)}
                                className="text-xs font-semibold py-1.5 cursor-pointer text-[#1769AA]"
                              >
                                <CalendarDays className="h-3.5 w-3.5 mr-2 text-[#1769AA]" />
                                Schedule Follow-up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenAssignModal(lead)}
                                className="text-xs font-semibold py-1.5 cursor-pointer"
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-2 text-purple-600" />
                                Assign Counsellor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRetryAiCall(lead)}
                                className="text-xs font-semibold py-1.5 cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-2 text-cyan-600" />
                                Trigger AI Re-call
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleOpenLostModal(lead)}
                                className="text-xs font-semibold py-1.5 text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-2 text-rose-600" />
                                Mark as Lost
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

        {/* ─── 5. TABLE PAGINATION FOOTER ─── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">1 – {filteredLeads.length}</strong> of <strong className="text-slate-800">96</strong> leads
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg bg-[#1769AA] text-white font-extrabold flex items-center justify-center shadow-xs"
            >
              1
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center cursor-pointer"
            >
              5
            </button>
            <span className="text-slate-400 px-1 font-bold">...</span>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center cursor-pointer"
            >
              14
            </button>
            <button
              type="button"
              className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Show:</span>
            <select className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none">
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ─── 6. AI CALL DETAILS CENTERED POPUP MODAL ─── */}
      <Dialog open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <DialogContent className="max-w-2xl sm:max-w-3xl bg-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col z-50">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                  <Bot className="h-5 w-5 stroke-[2.5]" />
                </span>
                AI Call Details & Qualification
              </DialogTitle>
            </div>

            {/* Lead Summary Card */}
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
                        ✓ AI Qualified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-mono text-[11px] font-medium flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {activeLead.phone}</span>
                      <span>•</span>
                      <span className="font-sans font-bold text-slate-600">
                        {activeLead.source === "Website"
                          ? "🌐 Website Form"
                          : activeLead.source === "Google Ads"
                          ? "🔍 Google Ads"
                          : activeLead.source === "Meta Ads"
                          ? "⚡ Meta Ads"
                          : activeLead.source === "Instagram"
                          ? "📱 Instagram"
                          : activeLead.source === "Referral"
                          ? "👥 Referral"
                          : activeLead.source === "Walk-in"
                          ? "🏢 Walk-in"
                          : `📞 ${activeLead.source}`}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge className="bg-blue-50 text-[#1769AA] border border-blue-200 font-bold text-[11px] px-3 py-1 shrink-0">
                  {activeLead.course}
                </Badge>
              </div>
            )}

            {/* Tabs: AI Call Summary / Call Recording */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab("SUMMARY")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === "SUMMARY"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                AI Call Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("RECORDING")}
                className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === "RECORDING"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Call Recording & Transcript
              </button>
            </div>
          </div>

          {/* Modal Body */}
          {activeLead && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {activeTab === "SUMMARY" ? (
                <>
                  {/* Call Outcome & AI Score */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Call Outcome</span>
                      {activeLead.aiOutcome === "INTERESTED" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Interested
                        </span>
                      ) : activeLead.aiOutcome === "CALLBACK_REQUESTED" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Callback Requested
                        </span>
                      ) : activeLead.aiOutcome === "NEEDS_COUNSELLOR" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" /> Needs Counsellor
                        </span>
                      ) : activeLead.aiOutcome === "NOT_INTERESTED" ? (
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
                      <span className="text-xl font-black text-slate-900">{activeLead.aiScore}%</span>
                      <div className="text-xs text-amber-400 font-bold">
                        {"★".repeat(activeLead.starRating)}{"☆".repeat(5 - activeLead.starRating)}
                      </div>
                    </div>
                  </div>

                  {/* AI Detailed Summary */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1769AA]" /> AI Generated Summary
                    </Label>
                    <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/80 text-slate-700 font-medium leading-relaxed shadow-2xs">
                      {activeLead.aiSummaryDetailed || activeLead.aiSummaryShort || "Candidate details recorded via AI voice qualification."}
                    </div>
                  </div>

                  {/* Key Discussion Points */}
                  <div className="space-y-2">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Discussion Points
                    </Label>
                    <div className="space-y-2">
                      {(activeLead.keyDiscussionPoints || activeLead.keyHighlights || [
                        `Interested in ${activeLead.course}`,
                        `Enquiry Source: ${activeLead.source}`,
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
                        <span className="font-bold text-slate-800">{activeLead.callDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Duration</span>
                        <span className="font-bold text-slate-800">{activeLead.callDuration}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Attempt Number</span>
                        <span className="font-bold text-slate-800">
                          {activeLead.attempt === 1 ? "1st Attempt" : `${activeLead.attempt}nd Attempt`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">AI Campaign</span>
                        <span className="font-bold text-slate-800 truncate block">{activeLead.campaign}</span>
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
                        <span className="font-extrabold text-xs text-slate-200">Sarvam AI Call Audio</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{activeLead.callDuration}</span>
                    </div>

                    {/* Waveform Visualization */}
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
                          <p className="text-[11px] font-mono font-bold text-slate-300">01:24 / {activeLead.callDuration}</p>
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
                        <FileText className="w-3.5 h-3.5 text-[#1769AA]" /> Dialogue Transcript ({(activeLead.transcript?.length || 0)} turns)
                      </span>
                      <span className="text-[10.5px] font-medium text-slate-400">AI Speech-to-Text</span>
                    </Label>

                    {(activeLead.transcript && activeLead.transcript.length > 0) ? (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {activeLead.transcript.map((msg, i) => (
                          <div
                            key={i}
                            className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                              msg.speaker === "AI" || msg.speaker === "AI_AGENT"
                                ? "bg-blue-50/50 border-blue-100 text-slate-800 mr-4"
                                : "bg-slate-50 border-slate-200 text-slate-900 ml-4"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10.5px] font-bold">
                              <span className={msg.speaker === "AI" || msg.speaker === "AI_AGENT" ? "text-[#1769AA] flex items-center gap-1" : "text-emerald-700"}>
                                {(msg.speaker === "AI" || msg.speaker === "AI_AGENT") && <Bot className="w-3 h-3" />}
                                {msg.speakerName || msg.name || (msg.speaker === "AI" || msg.speaker === "AI_AGENT" ? "Aadya AI Agent" : activeLead.name)}
                              </span>
                              <span className="text-slate-400 font-mono">{msg.time}</span>
                            </div>
                            <p className="font-medium">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <p className="font-semibold text-xs">No transcript recorded for unanswered call.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modal Bottom Actions */}
          {activeLead && (
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lead is qualified and ready for Counsellor follow-up.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  onClick={() => {
                    setShowDetailsDrawer(false);
                    handleOpenFollowUpModal(activeLead);
                  }}
                  variant="outline"
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer h-9.5 px-4"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Schedule Follow-up
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowDetailsDrawer(false);
                    handleOpenAssignModal(activeLead);
                  }}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold px-5 rounded-xl shadow-md gap-1.5 cursor-pointer h-9.5"
                >
                  <UserCheck className="w-4 h-4" />
                  Assign to Counsellor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 7. SCHEDULE FOLLOW-UP MODAL ─── */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                <CalendarDays className="h-5 w-5" />
              </span>
              Schedule Follow-up
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Set next follow-up touchpoint, reminders, and interaction notes for this candidate.
            </p>
          </DialogHeader>

          {followUpLead && (
            <form onSubmit={handleSaveFollowUp} className="space-y-4.5 pt-2 text-xs">
              {/* Candidate Info Pill */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{followUpLead.name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{followUpLead.phone} • {followUpLead.course}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[11px]">
                  AI: {followUpLead.aiOutcome}
                </Badge>
              </div>

              {/* Follow-up Type */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Follow-up Channel</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { key: "PHONE", label: "Phone Call", icon: Phone },
                    { key: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
                    { key: "EMAIL", label: "Email", icon: Mail },
                  ].map((m) => {
                    const IconComp = m.icon;
                    const isSelected = followUpChannel === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setFollowUpChannel(m.key as any)}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#1769AA] text-white border-[#1769AA] shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Reminder Presets */}
              <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1769AA]" /> Schedule Reminder
                  </Label>
                  <span className="text-[10.5px] font-medium text-slate-400">Quick presets</span>
                </div>

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
                      onClick={() => handleApplyPreset(p.id as any)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-[#1769AA] text-[10.5px] font-bold transition-all cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      ⚡ {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-600 mb-1 block">📅 Select Date</Label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="h-9.5 text-xs rounded-xl bg-white font-medium shadow-2xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-slate-600 mb-1 block">🕐 Select Time</Label>
                    <select
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="w-full h-9.5 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] shadow-2xs"
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={setReminderAlert}
                    onChange={(e) => setSetReminderAlert(e.target.checked)}
                    className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
                  />
                  <span className="text-[11.5px] font-bold text-slate-700">
                    Set reminder alert on Dashboard & schedule WhatsApp notification
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Follow-up Notes</Label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Add notes about discussion points or agenda for next call…"
                  className="w-full min-h-[80px] p-3 border border-slate-200 rounded-2xl text-xs bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] shadow-2xs"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenLostModal(followUpLead)}
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

      {/* ─── 8. MARK AS LOST CONFIRMATION MODAL ─── */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-100">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-black text-rose-700 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 inline-flex">
                <AlertTriangle className="h-5 w-5" />
              </span>
              Mark Lead as Lost
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Are you sure you want to mark <strong className="text-slate-800">{lostLead?.name}</strong> as lost? Active follow-up reminders will be closed.
            </p>
          </DialogHeader>

          {lostLead && (
            <form onSubmit={handleConfirmLost} className="space-y-4 pt-2 text-xs">
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

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Optional Remarks</Label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Add details about why candidate is marked as lost…"
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

      {/* ─── 9. ASSIGN TO COUNSELLOR MODAL ─── */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-black text-[#0A2540] flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 inline-flex">
                <UserCheck className="h-5 w-5" />
              </span>
              Assign Lead to Counsellor
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Select the academic counsellor who will own 1-on-1 counseling and admission follow-up for <strong className="text-slate-800">{assignLead?.name}</strong>.
            </p>
          </DialogHeader>

          {assignLead && (
            <form onSubmit={handleSaveAssignment} className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">{assignLead.name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{assignLead.phone} • {assignLead.course}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[10.5px]">
                  Score: {assignLead.aiScore}%
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Select Counsellor *</Label>
                <select
                  value={selectedCounsellor}
                  onChange={(e) => setSelectedCounsellor(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769AA] shadow-2xs"
                  required
                >
                  <option value="Priya Singh">Priya Singh (Digital Marketing & Design)</option>
                  <option value="Ramesh Kumar">Ramesh Kumar (Full Stack & Python)</option>
                  <option value="Deepak Joshi">Deepak Joshi (Data Science & AI)</option>
                  <option value="Ananya Sharma">Ananya Sharma (General Admissions)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs">Assignment Note (Optional)</Label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Special remarks for the counsellor..."
                  className="w-full min-h-[65px] p-3 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 shadow-2xs"
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
                  Confirm Assignment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 10. ADD NEW LEAD MODAL ─── */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-black text-[#0A2540] flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 inline-flex">
                <UserPlus className="h-5 w-5" />
              </span>
              Add New Lead for AI Calling
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Add a new student enquiry and immediately trigger or queue an AI voice qualification call.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateLeadSubmit} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-700 font-bold text-xs">Full Name *</Label>
              <Input
                required
                placeholder="e.g. Aniket Verma"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-bold text-xs">Phone Number *</Label>
              <Input
                required
                placeholder="e.g. 9876543219"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold text-xs">Course Interested *</Label>
                <select
                  value={newLeadCourse}
                  onChange={(e) => setNewLeadCourse(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800"
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

              <div className="space-y-1">
                <Label className="text-slate-700 font-bold text-xs">Enquiry Source *</Label>
                <select
                  value={newLeadSource}
                  onChange={(e) => setNewLeadSource(e.target.value as LeadSource)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800"
                >
                  <option value="Website">🌐 Website Form</option>
                  <option value="Google Ads">🔍 Google Ads</option>
                  <option value="Meta Ads">⚡ Meta Ads / Facebook</option>
                  <option value="Instagram">📱 Instagram Campaign</option>
                  <option value="Referral">👥 Student Referral</option>
                  <option value="Walk-in">🏢 Center Walk-in</option>
                  <option value="Direct Call">📞 Direct Call</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <input
                type="checkbox"
                checked={triggerImmediateCall}
                onChange={(e) => setTriggerImmediateCall(e.target.checked)}
                className="rounded border-slate-300 text-[#1769AA] accent-[#1769AA] h-4 w-4"
              />
              <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-[#1769AA]" />
                Trigger automated Sarvam AI voice call immediately
              </span>
            </label>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2.5">
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
                <Check className="h-4 w-4" />
                Add & Launch AI Call
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
