import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HelpCircle,
  Users,
  Phone,
  CheckCircle2,
  GraduationCap,
  XCircle,
  Plus,
  Search,
  Download,
  Upload,
  Calendar,
  MessageSquare,
  Mail,
  FileText,
  MapPin,
  Clock,
  Laptop,
  Eye,
  X,
  AlertTriangle,
  LayoutList,
  Columns3,
  CalendarCheck
} from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
import { useAuthStore } from "../../../store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── TYPES & MOCK/SEED DATA MATCHING THE REFERENCE IMAGE ───────────────────

export type LeadPriority = "Hot" | "Warm" | "Cold";
export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Counselling"
  | "Follow-up"
  | "Demo"
  | "Admission"
  | "Converted"
  | "Lost";

export interface EnrichedLead {
  id: string;
  enquiryNo: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  altCourse?: string;
  source: "Google Ads" | "Instagram" | "Website" | "Referral" | "Meta Ads" | "Walk-in" | "Other";
  status: LeadStatus;
  priority: LeadPriority;
  nextFollowUp: string;
  nextFollowUpType?: "Call" | "WhatsApp" | "Demo" | "In-Person";
  lastContact: string;
  enquiryDate: string;
  assignedCounselor: string;
  leadScore: number;
  location: string;
  qualification: string;
  sourceMasterId?: string;
  qualificationMasterId?: string;
  passingYear: string;
  preferredMode: "Offline" | "Online" | "Hybrid";
  preferredTime: "Morning" | "Evening" | "Weekend";
  notesList: { id: string; author: string; date: string; time: string; text: string }[];
  timeline: { id: string; date: string; time: string; text: string; mode: string }[];
  documents?: { id: string; name: string; size: string }[];
  lostReason?: string;
}

import { useLeads, useCreateLead, useUpdateLead } from "../../../hooks/useLeads";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { MasterSelect } from "@/components/common/MasterSelect";
import { getMasterLabel } from "@/utils/master.utils";

export const Enquiries: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { fetchCourses } = useCourseStore();

  const rolePrefix = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const { data: leadsResponse, isLoading: isLoadingLeads } = useLeads({ limit: 100 });
  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLead();
  const { options: leadSourceOptions } = useMasterDropdown("leadsource");
  const { options: educationOptions } = useMasterDropdown("education");
  const { options: timeslotOptions } = useMasterDropdown("timeslot");

  const apiLeads = useMemo(() => {
    const rawList = leadsResponse?.data ?? [];
    return rawList.map((l: any): EnrichedLead => ({
      id: l.id,
      enquiryNo: l.leadCode || `ENQ-${l.id.slice(0, 6)}`,
      name: l.name || "Anonymous Lead",
      phone: l.phone || "N/A",
      email: l.email || "N/A",
      course: l.course?.name || "Full Stack Web Development",
      altCourse: undefined,
      source: (l.source as any) || "Website",
      status: (l.status === "ENROLLED" ? "Converted" : l.status === "LOST" ? "Lost" : l.status === "CONTACTED" ? "Contacted" : l.status === "INTERESTED" ? "Interested" : "New") as LeadStatus,
      priority: (l.priority === "HIGH" ? "Hot" : l.priority === "LOW" ? "Cold" : "Warm") as LeadPriority,
      nextFollowUp: l.followUps?.[0]?.scheduledAt ? new Date(l.followUps[0].scheduledAt).toLocaleDateString() : "No follow-up set",
      nextFollowUpType: "Call",
      lastContact: l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : "Recently",
      enquiryDate: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently",
      assignedCounselor: l.assignedTo?.name || "Unassigned",
      leadScore: l.score || 75,
      location: l.city ? `${l.city}, ${l.state || "India"}` : "Bengaluru, Karnataka",
      qualification: l.qualification || "Graduate",
      passingYear: l.passingYear || "2024",
      preferredMode: "Offline",
      preferredTime: "Morning",
      notesList: (l.notes || []).map((n: any) => ({
        id: n.id,
        author: n.user?.name || "Counsellor",
        date: new Date(n.createdAt).toLocaleDateString(),
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: n.content || n.text || "",
      })),
      timeline: (l.activities || []).map((a: any) => ({
        id: a.id,
        date: new Date(a.createdAt).toLocaleDateString(),
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: a.description || a.action || "Activity logged",
        mode: a.type || "System",
      })),
    }));
  }, [leadsResponse]);

  const [leads, setLeads] = useState<EnrichedLead[]>([]);

  useEffect(() => {
    setLeads(apiLeads);
  }, [apiLeads]);

  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"Overview" | "Timeline" | "Notes" | "Documents">("Overview");

  // Filter States
  const [activeTab, setActiveTab] = useState<string>("All Enquiries");
  const [viewMode, setViewMode] = useState<"List" | "Pipeline">("List");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [counselorFilter, setCounselorFilter] = useState("All Counsellors");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");

  // Selection & Bulk Actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [leadToMarkLost, setLeadToMarkLost] = useState<EnrichedLead | null>(null);
  const [lostReasonChoice, setLostReasonChoice] = useState("Joined another institute");

  // Form states for New Enquiry
  const [newFormName, setNewFormName] = useState("");
  const [newFormPhone, setNewFormPhone] = useState("");
  const [newFormEmail, setNewFormEmail] = useState("");
  const [newFormCourse, setNewFormCourse] = useState("Digital Marketing");
  const [newFormSourceMasterId, setNewFormSourceMasterId] = useState("");
  const [newFormPriority, setNewFormPriority] = useState<LeadPriority>("Hot");
  const [newFormLocation, setNewFormLocation] = useState("Bangalore, Karnataka");
  const [newFormQualificationMasterId, setNewFormQualificationMasterId] = useState("");
  const [newFormNotes, setNewFormNotes] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<EnrichedLead | null>(null);

  // ZenoxERP-aligned additional enquiry fields
  const [newFormEnquiryDate, setNewFormEnquiryDate] = useState(new Date().toISOString().split("T")[0]);
  const [newFormAltPhone, setNewFormAltPhone] = useState("");
  const [newFormGender, setNewFormGender] = useState("Male");
  const [newFormDob, setNewFormDob] = useState("");
  const [newFormParentName, setNewFormParentName] = useState("");
  const [newFormParentPhone, setNewFormParentPhone] = useState("");
  const [newFormLeadStage, setNewFormLeadStage] = useState<LeadStatus>("New");
  const [newFormCounsellor, setNewFormCounsellor] = useState(user?.name || "Priya Singh");
  const [newFormNextFollowupDate, setNewFormNextFollowupDate] = useState("");
  const [newFormFollowupSlotMasterId, setNewFormFollowupSlotMasterId] = useState("");
  const [newFormWhatsappWelcome, setNewFormWhatsappWelcome] = useState(true);

  // Follow-up Interaction Modal
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [fuInteractionDate, setFuInteractionDate] = useState(new Date().toISOString().split("T")[0]);
  const [fuContactMode, setFuContactMode] = useState("Phone Call");
  const [fuCallOutcome, setFuCallOutcome] = useState("Connected - Highly Interested");
  const [fuStageProgression, setFuStageProgression] = useState<LeadStatus>("Follow-up");
  const [fuLostReason, setFuLostReason] = useState("Fee too high");
  const [fuNextDate, setFuNextDate] = useState("");
  const [fuTimeSlotMasterId, setFuTimeSlotMasterId] = useState("");
  const [fuNotes, setFuNotes] = useState("");
  const [fuWhatsappReminder, setFuWhatsappReminder] = useState(false);

  // New Note state in Drawer
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    if (fetchCourses) fetchCourses();
  }, []);

  // Check for duplicates on Phone/Email typing
  useEffect(() => {
    if (!newFormPhone && !newFormEmail) {
      setDuplicateWarning(null);
      return;
    }
    const found = leads.find(
      (l) =>
        (newFormPhone && l.phone === newFormPhone) ||
        (newFormEmail && l.email.toLowerCase() === newFormEmail.toLowerCase())
    );
    setDuplicateWarning(found || null);
  }, [newFormPhone, newFormEmail, leads]);

  // Tab Counts
  const followupsDueCount = leads.filter((l) => l.nextFollowUp.includes("Today") || l.status === "Follow-up").length;
  const counsellingScheduledCount = leads.filter((l) => l.status === "Counselling" || l.status === "Demo").length;

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Tab filter
      if (activeTab === "My Enquiries" && lead.assignedCounselor !== (user?.name || "Priya Singh")) return false;
      if (activeTab === "Follow-ups Due" && !lead.nextFollowUp.includes("Today") && lead.status !== "Follow-up") return false;
      if (activeTab === "Counselling Scheduled" && lead.status !== "Counselling" && lead.status !== "Demo") return false;
      if (activeTab === "Converted" && lead.status !== "Converted") return false;
      if (activeTab === "Lost Leads" && lead.status !== "Lost") return false;

      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matches =
          lead.name.toLowerCase().includes(query) ||
          lead.phone.includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.course.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Dropdown filters
      if (sourceFilter !== "All Sources") {
        const label = getMasterLabel(leadSourceOptions, sourceFilter);
        if (lead.source !== label && (lead as { sourceMasterId?: string }).sourceMasterId !== sourceFilter) {
          return false;
        }
      }
      if (statusFilter !== "All Statuses" && lead.status !== statusFilter) return false;
      if (courseFilter !== "All Courses" && lead.course !== courseFilter) return false;
      if (counselorFilter !== "All Counsellors" && lead.assignedCounselor !== counselorFilter) return false;
      if (priorityFilter !== "All Priority" && lead.priority !== priorityFilter) return false;

      return true;
    });
  }, [leads, activeTab, searchTerm, sourceFilter, statusFilter, courseFilter, counselorFilter, priorityFilter, user]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSourceFilter("All Sources");
    setStatusFilter("All Statuses");
    setCourseFilter("All Courses");
    setCounselorFilter("All Counsellors");
    setPriorityFilter("All Priority");
    setActiveTab("All Enquiries");
  };

  // Add Lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName || !newFormPhone) return;

    const newEnq: EnrichedLead = {
      id: `enq-${Date.now()}`,
      enquiryNo: `ENQ-000${leads.length + 260}`,
      name: newFormName,
      phone: newFormPhone,
      email: newFormEmail || `${newFormName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      course: newFormCourse,
      source: (getMasterLabel(leadSourceOptions, newFormSourceMasterId) as any) || "Website",
      sourceMasterId: newFormSourceMasterId || undefined,
      status: "New",
      priority: newFormPriority,
      nextFollowUp: "Tomorrow, 10:00 AM",
      nextFollowUpType: "Call",
      lastContact: "Just now",
      enquiryDate: "Today",
      assignedCounselor: user?.name || "Priya Singh",
      leadScore: newFormPriority === "Hot" ? 85 : newFormPriority === "Warm" ? 65 : 45,
      location: newFormLocation,
      qualification: getMasterLabel(educationOptions, newFormQualificationMasterId) || "Graduate",
      qualificationMasterId: newFormQualificationMasterId || undefined,
      passingYear: "2024",
      preferredMode: "Offline",
      preferredTime: "Morning",
      notesList: newFormNotes
        ? [
            {
              id: `note-${Date.now()}`,
              author: user?.name || "Priya Singh",
              date: "Today",
              time: "Just now",
              text: newFormNotes,
            },
          ]
        : [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          date: "Today",
          time: "Just now",
          text: `Enquiry logged from ${getMasterLabel(leadSourceOptions, newFormSourceMasterId) || "source"}.`,
          mode: "Enquiry",
        },
      ],
    };

    setLeads([newEnq, ...leads]);
    setSelectedLead(newEnq);
    setShowAddModal(false);
    // Reset all form fields
    setNewFormName("");
    setNewFormPhone("");
    setNewFormEmail("");
    setNewFormNotes("");
    setNewFormAltPhone("");
    setNewFormGender("Male");
    setNewFormDob("");
    setNewFormQualificationMasterId("");
    setNewFormSourceMasterId("");
    setNewFormParentName("");
    setNewFormParentPhone("");
    setNewFormLeadStage("New");
    setNewFormCounsellor(user?.name || "Priya Singh");
    setNewFormNextFollowupDate("");
    setNewFormFollowupSlotMasterId("");
    setNewFormWhatsappWelcome(true);
    setNewFormEnquiryDate(new Date().toISOString().split("T")[0]);
    setDuplicateWarning(null);
  };

  // Log Follow-up Interaction
  const handleLogFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !fuNotes) return;
    const newTimeline = {
      id: `tl-${Date.now()}`,
      date: "Today",
      time: "Just now",
      text: `[${fuContactMode}] ${fuCallOutcome} — ${fuNotes}`,
      mode: fuContactMode,
    };
    const updatedLead = {
      ...selectedLead,
      status: fuStageProgression,
      nextFollowUp: fuNextDate || selectedLead.nextFollowUp,
      timeline: [newTimeline, ...(selectedLead.timeline || [])],
    };
    setSelectedLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
    setShowFollowupModal(false);
    setFuNotes("");
    setFuNextDate("");
  };

  // Mark as Lost Handler
  const handleConfirmLost = () => {
    if (!leadToMarkLost) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadToMarkLost.id
          ? { ...l, status: "Lost", priority: "Cold", lostReason: lostReasonChoice }
          : l
      )
    );
    if (selectedLead?.id === leadToMarkLost.id) {
      setSelectedLead({ ...selectedLead, status: "Lost", priority: "Cold", lostReason: lostReasonChoice });
    }
    setShowLostModal(false);
    setLeadToMarkLost(null);
  };

  // Add Note Handler in Drawer
  const handleAddNote = () => {
    if (!newNoteText || !selectedLead) return;
    const newNote = {
      id: `note-${Date.now()}`,
      author: user?.name || "Priya Singh",
      date: "Today",
      time: "Just now",
      text: newNoteText,
    };
    const updatedLead = {
      ...selectedLead,
      notesList: [newNote, ...(selectedLead.notesList || [])],
    };
    setSelectedLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
    setNewNoteText("");
  };

  // Register Student from Lead Action
  const handleRegisterStudent = (lead: EnrichedLead) => {
    navigate(`${rolePrefix}/students/add`, {
      state: {
        fromEnquiry: true,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        courseName: lead.course,
        qualification: lead.qualification,
        location: lead.location,
      },
    });
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = "ID,Name,Phone,Email,Course,Source,Status,Priority,NextFollowUp,AssignedTo\n";
    const rows = filteredLeads
      .map(
        (l) =>
          `"${l.enquiryNo}","${l.name}","${l.phone}","${l.email}","${l.course}","${l.source}","${l.status}","${l.priority}","${l.nextFollowUp}","${l.assignedCounselor}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student_enquiries_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Status Badge Helper
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "New":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[10px]">New</Badge>;
      case "Contacted":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200 font-semibold text-[10px]">Contacted</Badge>;
      case "Interested":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">Interested</Badge>;
      case "Counselling":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">Counselling</Badge>;
      case "Follow-up":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">Follow-up</Badge>;
      case "Demo":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold text-[10px]">Demo</Badge>;
      case "Admission":
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200 font-semibold text-[10px]">Admission</Badge>;
      case "Converted":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">Converted</Badge>;
      case "Lost":
        return <Badge className="bg-red-50 text-red-700 border-red-200 font-semibold text-[10px]">Lost</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 font-semibold text-[10px]">{status}</Badge>;
    }
  };

  // Source Badge Helper
  const getSourceBadge = (source: EnrichedLead["source"]) => {
    switch (source) {
      case "Google Ads":
        return <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">Google Ads</span>;
      case "Instagram":
        return <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">Instagram</span>;
      case "Website":
        return <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">Website</span>;
      case "Referral":
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Referral</span>;
      case "Meta Ads":
        return <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">Meta Ads</span>;
      case "Walk-in":
        return <span className="bg-cyan-50 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-200">Walk-in</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{source}</span>;
    }
  };

  // Priority Dot Helper
  const getPriorityDot = (p: LeadPriority) => {
    if (p === "Hot") return <span className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]"><span className="h-2 w-2 rounded-full bg-red-500" /> Hot</span>;
    if (p === "Warm") return <span className="flex items-center gap-1.5 font-semibold text-slate-700 text-[11px]"><span className="h-2 w-2 rounded-full bg-amber-500" /> Warm</span>;
    return <span className="flex items-center gap-1.5 font-medium text-slate-600 text-[11px]"><span className="h-2 w-2 rounded-full bg-blue-500" /> Cold</span>;
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 md:p-6 max-w-[1750px] w-full mx-auto space-y-5 bg-[#f8fafc] min-h-screen">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
            Student Enquiries
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage prospective student leads, follow-up schedules, and admission conversions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-3.5 py-2 rounded-xl shadow-xs gap-1.5 h-10 text-xs transition-all"
          >
            <Upload className="h-4 w-4 text-slate-500" /> Import Leads
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-3.5 py-2 rounded-xl shadow-xs gap-1.5 h-10 text-xs transition-all"
          >
            <Download className="h-4 w-4 text-slate-500" /> Export
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold px-4.5 py-2 rounded-xl shadow-sm gap-2 h-10 text-xs transition-all"
          >
            <Plus className="h-4 w-4" /> Add New Enquiry
          </Button>
        </div>
      </div>

      {/* ─── 2. TOP 6 COMPACT KPI CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Enquiries */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Enquiries</p>
              <h3 className="text-xl font-black text-[#0A2540] mt-0.5 tracking-tight">256</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">All time</p>
            </div>
          </div>
        </Card>

        {/* Card 2: New Enquiries */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">New Enquiries</p>
              <h3 className="text-xl font-black text-[#0A2540] mt-0.5 tracking-tight">24</h3>
              <p className="text-[10px] font-bold text-emerald-600 mt-0.5">This week <span className="text-[9px]">↑ 12%</span></p>
            </div>
          </div>
        </Card>

        {/* Card 3: Follow-ups Due */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
              <Phone className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Follow-ups Due</p>
              <h3 className="text-xl font-black text-amber-600 mt-0.5 tracking-tight">18</h3>
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">Due today <span className="text-[9px]">↑ 8%</span></p>
            </div>
          </div>
        </Card>

        {/* Card 4: Conversion Rate */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Conversion Rate</p>
              <h3 className="text-xl font-black text-[#0A2540] mt-0.5 tracking-tight">18.7%</h3>
              <p className="text-[10px] font-bold text-purple-600 mt-0.5">This month <span className="text-[9px]">↑ 5%</span></p>
            </div>
          </div>
        </Card>

        {/* Card 5: Admissions Converted */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Admissions Converted</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5 tracking-tight">24</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">This month</p>
            </div>
          </div>
        </Card>

        {/* Card 6: Lost Leads */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/60">
              <XCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Lost Leads</p>
              <h3 className="text-xl font-black text-red-600 mt-0.5 tracking-tight">12</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">This month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── 3. SEARCH & FILTERS BAR ─── */}
      <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, phone, email, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl"
            />
          </div>

          {/* Compact Dropdown Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            {/* All Sources */}
            <MasterSelect
              entityType="leadsource"
              value={sourceFilter === "All Sources" ? "" : sourceFilter}
              onChange={(id) => setSourceFilter(id || "All Sources")}
              placeholder="All Sources"
              className="h-8 min-w-[140px] mt-0 rounded-lg text-xs"
            />

            {/* All Statuses */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Counselling">Counselling</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Demo">Demo</option>
              <option value="Admission">Admission</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>

            {/* All Courses */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Courses">All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Science">Data Science</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Python Programming">Python Programming</option>
              <option value="Full Stack Development">Full Stack Development</option>
            </select>

            {/* All Counsellors */}
            <select
              value={counselorFilter}
              onChange={(e) => setCounselorFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Counsellors">All Counsellors</option>
              <option value="Priya Singh">Priya Singh</option>
              <option value="Rahul Kumar">Rahul Kumar</option>
              <option value="Sneha Patil">Sneha Patil</option>
              <option value="Arjun Reddy">Arjun Reddy</option>
            </select>

            {/* Follow-up Date */}
            <div className="flex items-center h-8 px-2.5 border border-slate-200 rounded-lg text-slate-600 bg-white gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Follow-up Date</span>
            </div>

            {/* All Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Priority">All Priority</option>
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[#1769AA] hover:underline font-bold text-xs ml-auto"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 4. TABS & VIEW TOGGLE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-1">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { label: "All Enquiries", count: null },
            { label: "My Enquiries", count: null },
            { label: "Follow-ups Due", count: followupsDueCount, badgeColor: "bg-red-500 text-white" },
            { label: "Counselling Scheduled", count: counsellingScheduledCount, badgeColor: "bg-amber-500 text-white" },
            { label: "Converted", count: null },
            { label: "Lost Leads", count: null },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-3 py-2 rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 font-bold ${
                activeTab === tab.label
                  ? "border-[#1769AA] text-[#1769AA] bg-blue-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${tab.badgeColor || "bg-slate-200 text-slate-700"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setViewMode("List")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "List"
                ? "bg-blue-50 text-[#1769AA] shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> List View
          </button>
          <button
            onClick={() => setViewMode("Pipeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "Pipeline"
                ? "bg-blue-50 text-[#1769AA] shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" /> Pipeline View
          </button>
        </div>
      </div>

      {/* ─── 5. WORKSPACE CONTAINER (TABLE / PIPELINE + DETAIL DRAWER) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Main Content Area */}
        <div className={selectedLead ? "lg:col-span-7 xl:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
          {viewMode === "List" ? (
            <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 text-[11px] uppercase tracking-wider whitespace-nowrap">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                          onChange={handleSelectAll}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 font-bold">Lead</th>
                      <th className="py-3 px-3 font-bold">Interested Course</th>
                      <th className="py-3 px-2 font-bold text-center">Source</th>
                      <th className="py-3 px-2 font-bold text-center">Status</th>
                      <th className="py-3 px-2 font-bold text-center">Priority</th>
                      <th className="py-3 px-3 font-bold">Next Follow-up</th>
                      <th className="py-3 px-3 font-bold">Last Contact</th>
                      <th className="py-3 px-3 font-bold text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => {
                        const isSelected = selectedLead?.id === lead.id;
                        const isChecked = selectedLeadIds.includes(lead.id);

                        return (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`hover:bg-blue-50/40 transition-colors cursor-pointer whitespace-nowrap ${
                              isSelected ? "bg-blue-50/70 font-medium" : ""
                            }`}
                          >
                            <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectOne(lead.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                              />
                            </td>

                            {/* Lead Name & Info */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                                  {getInitials(lead.name)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-[13px] leading-tight">{lead.name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {lead.phone} • {lead.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Course */}
                            <td className="py-3.5 px-3 font-semibold text-slate-700">
                              {lead.course}
                            </td>

                            {/* Source */}
                            <td className="py-3.5 px-2 text-center">
                              {getSourceBadge(lead.source)}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-2 text-center">
                              {getStatusBadge(lead.status)}
                            </td>

                            {/* Priority */}
                            <td className="py-3.5 px-2 text-center">
                              <div className="inline-flex items-center justify-center">
                                {getPriorityDot(lead.priority)}
                              </div>
                            </td>

                            {/* Next Follow-up */}
                            <td className="py-3.5 px-3 text-slate-600 font-medium text-[11px]">
                              {lead.nextFollowUp !== "—" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  {lead.nextFollowUp}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Last Contact */}
                            <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                              {lead.lastContact}
                            </td>

                            {/* Actions: Call, WhatsApp, View */}
                            <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => (window.location.href = `tel:${lead.phone}`)}
                                  className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                                  title="Call Lead"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `https://wa.me/91${lead.phone}?text=${encodeURIComponent(
                                        `Hello ${lead.name}, greetings from Aadya Institute!`
                                      )}`,
                                      "_blank"
                                    )
                                  }
                                  className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                                  title="WhatsApp Lead"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLead(lead)}
                                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-xs"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                          No matching enquiries found. Try adjusting your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>

              {/* Bottom Pagination & Bulk Toolbar */}
              <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">
                    {selectedLeadIds.length} row(s) selected
                  </span>

                  {selectedLeadIds.length > 0 && (
                    <select className="h-7 px-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 text-[11px] font-bold">
                      <option value="">Bulk Actions ⌵</option>
                      <option value="status">Change Status</option>
                      <option value="priority">Change Priority</option>
                      <option value="counselor">Assign Counsellor</option>
                      <option value="export">Export Selected</option>
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-500 font-medium sm:ml-auto">
                  <span>Rows per page</span>
                  <select className="h-7 px-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 text-[11px]">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                      &lt;
                    </button>
                    <button className="h-6 w-6 rounded bg-[#1769AA] text-white font-bold flex items-center justify-center">
                      1
                    </button>
                    <button className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      2
                    </button>
                    <button className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      3
                    </button>
                    <span className="px-1 text-slate-400">...</span>
                    <button className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      26
                    </button>
                    <button className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            /* ─── PIPELINE KANBAN VIEW ─── */
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
              {[
                { stage: "New", color: "bg-blue-500" },
                { stage: "Contacted", color: "bg-sky-500" },
                { stage: "Interested", color: "bg-emerald-500" },
                { stage: "Counselling", color: "bg-purple-500" },
                { stage: "Follow-up", color: "bg-amber-500" },
                { stage: "Demo", color: "bg-yellow-500" },
                { stage: "Admission", color: "bg-teal-500" },
                { stage: "Converted", color: "bg-emerald-700" },
              ].map((col) => {
                const stageLeads = leads.filter((l) => l.status === col.stage);
                return (
                  <div key={col.stage} className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200/60 min-w-[240px] space-y-3">
                    <div className="flex items-center justify-between font-bold text-xs text-slate-700 pb-1 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${col.color}`} />
                        <span className="uppercase">{col.stage}</span>
                      </div>
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] text-slate-500 font-bold">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-slate-900 text-xs">{lead.name}</h4>
                            {getPriorityDot(lead.priority)}
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">{lead.course}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                            <span>{lead.source}</span>
                            <span className="text-slate-600 font-semibold">{lead.nextFollowUp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 6. LEAD DETAIL SIDE PANEL (DRAWER) ─── */}
        {selectedLead && (
          <div className="lg:col-span-4 bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden sticky top-6">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200">
                    {getInitials(selectedLead.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{selectedLead.name}</h3>
                      {getStatusBadge(selectedLead.status)}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {selectedLead.phone} • {selectedLead.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                <span>Enquiry ID: <strong className="text-slate-800">{selectedLead.enquiryNo}</strong></span>
                <span>Lead Score: <strong className="text-amber-600">{selectedLead.leadScore} 🔥</strong></span>
              </div>

              {/* Drawer Tabs */}
              <div className="grid grid-cols-4 gap-1 border-b border-slate-100 pt-2 text-center text-xs font-bold">
                {(["Overview", "Timeline", "Notes", "Documents"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDrawerTab(tab)}
                    className={`pb-2 border-b-2 transition-all ${
                      activeDrawerTab === tab
                        ? "border-[#1769AA] text-[#1769AA]"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-4 text-xs max-h-[calc(100vh-320px)] overflow-y-auto">
              
              {activeDrawerTab === "Overview" && (
                <>
                  {/* Card 1: Student Information */}
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Student Information</span>
                      <button className="text-[#1769AA] hover:underline text-[11px]">Edit</button>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400"><MapPin className="h-3.5 w-3.5" /> Location</span>
                        <span className="font-semibold text-slate-800">{selectedLead.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400"><GraduationCap className="h-3.5 w-3.5" /> Qualification</span>
                        <span className="font-semibold text-slate-800">{selectedLead.qualification}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="h-3.5 w-3.5" /> Passing Year</span>
                        <span className="font-semibold text-slate-800">{selectedLead.passingYear}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400"><Laptop className="h-3.5 w-3.5" /> Preferred Mode</span>
                        <span className="font-semibold text-slate-800">{selectedLead.preferredMode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400"><Clock className="h-3.5 w-3.5" /> Preferred Time</span>
                        <span className="font-semibold text-slate-800">{selectedLead.preferredTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Enquiry Information */}
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Enquiry Information</span>
                      <button className="text-[#1769AA] hover:underline text-[11px]">Edit</button>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Interested Course</span>
                        <span className="font-bold text-slate-900">{selectedLead.course}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Alternative Course</span>
                        <span className="font-semibold text-slate-800">{selectedLead.altCourse || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Source</span>
                        {getSourceBadge(selectedLead.source)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Enquiry Date</span>
                        <span className="font-semibold text-slate-800">{selectedLead.enquiryDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assigned Counselor</span>
                        <span className="font-semibold text-slate-800">{selectedLead.assignedCounselor}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Priority</span>
                        {getPriorityDot(selectedLead.priority)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Status</span>
                        {getStatusBadge(selectedLead.status)}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Next Follow-up */}
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Next Follow-up</span>
                      <button className="text-[#1769AA] hover:underline text-[11px]">Edit</button>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-bold text-slate-900 text-xs">{selectedLead.nextFollowUp}</span>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        Scheduled
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Follow-up Type: <strong className="text-slate-700">{selectedLead.nextFollowUpType || "Call"}</strong>
                    </p>
                  </div>

                  {/* Quick Actions Strip */}
                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-slate-800 text-[11px]">Quick Actions</p>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => (window.location.href = `tel:${selectedLead.phone}`)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex flex-col items-center gap-1 group"
                      >
                        <Phone className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-slate-600 group-hover:text-emerald-700">Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          window.open(`https://wa.me/91${selectedLead.phone}`, "_blank")
                        }
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex flex-col items-center gap-1 group"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-slate-600 group-hover:text-emerald-700">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => (window.location.href = `mailto:${selectedLead.email}`)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-1 group"
                      >
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="text-[10px] font-semibold text-slate-600 group-hover:text-blue-700">Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeadToMarkLost(selectedLead);
                          setShowLostModal(true);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all flex flex-col items-center gap-1 group"
                      >
                        <CalendarCheck className="h-4 w-4 text-purple-600" />
                        <span className="text-[10px] font-semibold text-slate-600 group-hover:text-purple-700">Schedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDrawerTab("Notes")}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all flex flex-col items-center gap-1 group"
                      >
                        <FileText className="h-4 w-4 text-amber-600" />
                        <span className="text-[10px] font-semibold text-slate-600 group-hover:text-amber-700">Add Note</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TIMELINE TAB */}
              {activeDrawerTab === "Timeline" && (
                <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
                  {selectedLead.timeline && selectedLead.timeline.length > 0 ? (
                    selectedLead.timeline.map((item) => (
                      <div key={item.id} className="relative space-y-1">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#1769AA] ring-4 ring-blue-50" />
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px]">{item.date} — {item.time}</span>
                            <span className="text-[10px] text-[#1769AA] font-bold">{item.mode}</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-1">{item.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No timeline entries yet.</p>
                  )}
                </div>
              )}

              {/* NOTES TAB */}
              {activeDrawerTab === "Notes" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold text-xs">Add Counsellor Note</Label>
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Type details about this interaction..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white min-h-[70px]"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      className="w-full bg-[#1769AA] hover:bg-[#125890] text-white font-bold"
                    >
                      + Save Note
                    </Button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h5 className="font-bold text-slate-800 text-xs">Previous Notes ({selectedLead.notesList?.length || 0})</h5>
                    {selectedLead.notesList && selectedLead.notesList.length > 0 ? (
                      selectedLead.notesList.map((n) => (
                        <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-700">{n.author}</span>
                            <span>{n.date}, {n.time}</span>
                          </div>
                          <p className="text-slate-700 text-xs">{n.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">No notes added yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeDrawerTab === "Documents" && (
                <div className="space-y-3">
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700 text-xs">Upload Student Document / Form</p>
                    <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Register Student Button at Bottom */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                onClick={() => handleRegisterStudent(selectedLead)}
                className="w-full bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-11 rounded-xl shadow-sm gap-2 text-xs transition-all"
              >
                <GraduationCap className="h-4.5 w-4.5" /> Register Student
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: ADD NEW ENQUIRY (WITH DUPLICATE DETECTION) — ZENOX-ALIGNED ─── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#1769AA]" />
              New Student Enquiry Registration
            </DialogTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">Complete enquiry intake form aligned with ZenoxERP standards</p>
          </DialogHeader>

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Possible duplicate enquiry found!</p>
                <p className="text-[11px] mt-0.5">
                  <strong>{duplicateWarning.name}</strong> ({duplicateWarning.phone}) is already registered in <em>{duplicateWarning.course}</em> with status <strong>{duplicateWarning.status}</strong>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateLead} className="space-y-4 pt-2 text-xs">
            {/* Section: Enquiry Date & Student Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Enquiry Date *</Label>
                <Input
                  type="date"
                  value={newFormEnquiryDate}
                  onChange={(e) => setNewFormEnquiryDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-700 font-semibold">Student Full Name *</Label>
                <Input
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* Section: Contact Info */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Contact Phone *</Label>
                <Input
                  value={newFormPhone}
                  onChange={(e) => setNewFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Alternative Mobile</Label>
                <Input
                  value={newFormAltPhone}
                  onChange={(e) => setNewFormAltPhone(e.target.value)}
                  placeholder="Parent / Secondary"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Email Address</Label>
                <Input
                  type="email"
                  value={newFormEmail}
                  onChange={(e) => setNewFormEmail(e.target.value)}
                  placeholder="rahul@gmail.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Section: Demographics */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Gender *</Label>
                <select
                  value={newFormGender}
                  onChange={(e) => setNewFormGender(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  value={newFormDob}
                  onChange={(e) => setNewFormDob(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Education / Qualification</Label>
                <MasterSelect
                  entityType="education"
                  value={newFormQualificationMasterId}
                  onChange={setNewFormQualificationMasterId}
                  placeholder="Select qualification"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* Section: Parent / Guardian */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Parent / Guardian Name</Label>
                <Input
                  value={newFormParentName}
                  onChange={(e) => setNewFormParentName(e.target.value)}
                  placeholder="Father / Guardian"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Parent Contact No</Label>
                <Input
                  value={newFormParentPhone}
                  onChange={(e) => setNewFormParentPhone(e.target.value)}
                  placeholder="9845012345"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">City / Location</Label>
                <Input
                  value={newFormLocation}
                  onChange={(e) => setNewFormLocation(e.target.value)}
                  placeholder="Bangalore, Karnataka"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Section: Course & Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Course Interested *</Label>
                <select
                  value={newFormCourse}
                  onChange={(e) => setNewFormCourse(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Python Programming">Python Programming</option>
                  <option value="Full Stack Development">Full Stack Development</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Lead Source *</Label>
                <MasterSelect
                  entityType="leadsource"
                  value={newFormSourceMasterId}
                  onChange={setNewFormSourceMasterId}
                  placeholder="Select Lead Source"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* Section: Lead Classification */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Lead Type / Priority</Label>
                <select
                  value={newFormPriority}
                  onChange={(e: any) => setNewFormPriority(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white font-bold"
                >
                  <option value="Hot">🔥 Hot (Immediate)</option>
                  <option value="Warm">⚡ Warm (Considering)</option>
                  <option value="Cold">❄️ Cold (Exploring)</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Lead Stage *</Label>
                <select
                  value={newFormLeadStage}
                  onChange={(e: any) => setNewFormLeadStage(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="New">New Enquiry</option>
                  <option value="Follow-up">Followup In-Progress</option>
                  <option value="Demo">Demo Class Booked</option>
                  <option value="Admission">Ready for Admission</option>
                  <option value="Lost">Dropped / Lost</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Assigned Counsellor *</Label>
                <select
                  value={newFormCounsellor}
                  onChange={(e) => setNewFormCounsellor(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="Priya Singh">Priya Singh</option>
                  <option value="Rahul Kumar">Rahul Kumar</option>
                  <option value="Sneha Patil">Sneha Patil</option>
                  <option value="Arjun Reddy">Arjun Reddy</option>
                </select>
              </div>
            </div>

            {/* Section: Follow-up Scheduling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Next Follow-up Date *</Label>
                <Input
                  type="date"
                  value={newFormNextFollowupDate}
                  onChange={(e) => setNewFormNextFollowupDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Follow-up Time Slot</Label>
                <MasterSelect
                  entityType="timeslot"
                  value={newFormFollowupSlotMasterId}
                  onChange={setNewFormFollowupSlotMasterId}
                  placeholder="Select time slot"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* Section: Notes & WhatsApp */}
            <div>
              <Label className="text-slate-700 font-semibold">Counsellor Remarks / Notes</Label>
              <textarea
                value={newFormNotes}
                onChange={(e) => setNewFormNotes(e.target.value)}
                placeholder="Candidate enquired about fees and weekend batch timings..."
                className="w-full mt-1 border border-slate-200 rounded-xl p-2.5 text-xs min-h-[55px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={newFormWhatsappWelcome}
                onChange={(e) => setNewFormWhatsappWelcome(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA]"
              />
              <Label className="text-slate-600 font-medium text-[11px]">Send WhatsApp Welcome Message automatically</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold">
                Save & Add Enquiry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: LOG FOLLOW-UP INTERACTION ─── */}
      <Dialog open={showFollowupModal} onOpenChange={setShowFollowupModal}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#1769AA]" />
              Log Follow-up Interaction — {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogFollowup} className="space-y-3.5 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Interaction Date *</Label>
                <Input type="date" value={fuInteractionDate} onChange={(e) => setFuInteractionDate(e.target.value)} className="mt-1" required />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Contact Mode *</Label>
                <select value={fuContactMode} onChange={(e) => setFuContactMode(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white">
                  <option value="Phone Call">📞 Phone Call</option>
                  <option value="WhatsApp Chat">💬 WhatsApp Chat</option>
                  <option value="Campus Visit">🏢 Campus Visit / Meeting</option>
                  <option value="Email">📧 Email</option>
                  <option value="Demo Class">🎓 Demo Class</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Call Outcome / Response *</Label>
                <select value={fuCallOutcome} onChange={(e) => setFuCallOutcome(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white">
                  <option value="Connected - Highly Interested">Connected - Highly Interested</option>
                  <option value="Connected - Needs Time">Connected - Needs Time</option>
                  <option value="Connected - Fee Constraint">Connected - Fee Constraint</option>
                  <option value="Call Back Requested">Call Back Requested</option>
                  <option value="Ringing - No Response">Ringing - No Response</option>
                  <option value="Switched Off">Switched Off / Not Reachable</option>
                  <option value="Wrong Number">Wrong Number</option>
                  <option value="Attended Demo">Attended Demo</option>
                  <option value="Ready for Admission">Ready for Admission</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Stage Progression *</Label>
                <select value={fuStageProgression} onChange={(e: any) => setFuStageProgression(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white">
                  <option value="New">New</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Demo">Demo Scheduled</option>
                  <option value="Admission">Ready for Admission</option>
                  <option value="Converted">Admitted / Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>

            {fuStageProgression === "Lost" && (
              <div>
                <Label className="text-slate-700 font-semibold">Lost Reason *</Label>
                <select value={fuLostReason} onChange={(e) => setFuLostReason(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white">
                  <option value="Fee too high">Course Fee Too High</option>
                  <option value="Location / Distance">Location / Distance Far</option>
                  <option value="Timing Not Suitable">Timing Not Suitable</option>
                  <option value="Joined Competitor">Joined Competitor Institute</option>
                  <option value="Financial Emergency">Financial Emergency</option>
                  <option value="Higher Studies">Decided Higher Studies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {fuStageProgression !== "Converted" && fuStageProgression !== "Lost" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Next Follow-up Date</Label>
                  <Input type="date" value={fuNextDate} onChange={(e) => setFuNextDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Follow-up Time Slot</Label>
                  <MasterSelect
                    entityType="timeslot"
                    value={fuTimeSlotMasterId}
                    onChange={setFuTimeSlotMasterId}
                    placeholder="Select time slot"
                    className="mt-1 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-slate-700 font-semibold">Detailed Conversation Notes *</Label>
              <textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} placeholder="Summary of interaction..." className="w-full mt-1 border border-slate-200 rounded-xl p-2.5 text-xs min-h-[65px]" required />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={fuWhatsappReminder} onChange={(e) => setFuWhatsappReminder(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#1769AA]" />
              <Label className="text-slate-600 font-medium text-[11px]">Trigger WhatsApp Reminder to Student</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowFollowupModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold">Save Follow-up</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: MARK LEAD AS LOST (WITH REASON) ─── */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Mark Lead as Lost — {leadToMarkLost?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2 text-xs">
            <p className="text-slate-500">
              Please specify the primary reason why this prospective student was marked as lost for reporting purposes:
            </p>
            <div>
              <Label className="text-slate-700 font-semibold">Lost Reason *</Label>
              <select
                value={lostReasonChoice}
                onChange={(e) => setLostReasonChoice(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-xs bg-white font-medium"
              >
                <option value="Fee too high">Fee too high / Budget constraint</option>
                <option value="Joined another institute">Joined another institute</option>
                <option value="Not interested">Not interested in course</option>
                <option value="Course unavailable">Course / batch timing unavailable</option>
                <option value="Timing issue">Schedule / timing clash</option>
                <option value="Location issue">Location / distance issue</option>
                <option value="No response">No response after multiple attempts</option>
                <option value="Postponed">Postponed for future batch</option>
                <option value="Other">Other reason</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowLostModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmLost} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Confirm Mark as Lost
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: IMPORT LEADS ─── */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#1769AA]" />
              Import Student Enquiries (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
              <Upload className="h-8 w-8 text-[#1769AA] mx-auto" />
              <p className="font-bold text-slate-800">Select CSV file with lead data</p>
              <p className="text-[11px] text-slate-400">Supported columns: Name, Phone, Email, Course, Source</p>
              <input type="file" accept=".csv" className="hidden" id="csv-upload-input" />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("csv-upload-input")?.click()}
                className="mt-2 text-xs font-semibold"
              >
                Choose File
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowImportModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
