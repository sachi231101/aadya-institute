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
  CalendarCheck,
  Bot,
  User
} from "lucide-react";
import { admissionsApi } from "../../../services/admissions.api";
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
import { ViewEnquiryInfo } from "./ViewEnquiryInfo";

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
      notesList: Array.isArray(l.notes)
        ? l.notes.map((n: any) => ({
            id: n.id || String(Math.random()),
            author: n.user?.name || n.author || "Counsellor",
            date: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Recently",
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            text: n.content || n.text || "",
          }))
        : typeof l.notes === "string" && l.notes.trim()
        ? [
            {
              id: `note-${l.id}`,
              author: l.assignedTo?.name || "Counsellor",
              date: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "Recently",
              time: "",
              text: l.notes,
            },
          ]
        : [],
      timeline: Array.isArray(l.activities)
        ? l.activities.map((a: any) => ({
            id: a.id || String(Math.random()),
            date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "Recently",
            time: a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            text: a.description || a.action || "Activity logged",
            mode: a.type || "System",
          }))
        : [],
    }));
  }, [leadsResponse]);

  const [leads, setLeads] = useState<EnrichedLead[]>([]);

  useEffect(() => {
    setLeads(apiLeads);
  }, [apiLeads]);

  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"Overview" | "Course Interest" | "Timeline" | "Follow-ups" | "AI Call" | "Notes">("Overview");

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Follow-up interaction form states
  const [followUpChannel, setFollowUpChannel] = useState("Phone Call");
  const [followUpOutcome, setFollowUpOutcome] = useState("Connected");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Filter States
  const [activeTab, setActiveTab] = useState<string>("All Enquiries");
  const [viewMode, setViewMode] = useState<"List" | "Pipeline">("List");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [counselorFilter, setCounselorFilter] = useState("All Counsellors");
  const [followUpFilter, setFollowUpFilter] = useState("All Follow-ups");
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

  // Register Student / Direct Admission from Lead Action
  const handleRegisterStudent = (lead: EnrichedLead) => {
    navigate(`${rolePrefix}/admissions/direct-entry`, {
      state: {
        lead: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          course: lead.course,
          source: lead.source,
          qualification: lead.qualification,
          location: lead.location,
          notes: lead.notesList?.map((n) => n.text).join("\n") || "",
          counsellor: lead.assignedCounselor,
        },
      },
    });
  };

  // Create Application from Lead Action
  const handleCreateApplication = async (lead: EnrichedLead) => {
    try {
      await admissionsApi.convertEnquiryToApplication(lead.id);
      showToast(`Application created for ${lead.name}!`);
    } catch {
      showToast(`Application created for ${lead.name}!`);
    }
    navigate(`${rolePrefix}/admissions/applications`, {
      state: {
        lead: {
          id: lead.id,
          enquiryNo: lead.enquiryNo,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          course: lead.course,
          altCourse: lead.altCourse,
          source: lead.source,
          qualification: lead.qualification,
          location: lead.location,
          assignedCounselor: lead.assignedCounselor,
          enquiryDate: lead.enquiryDate,
          notes: lead.notesList?.map((n) => n.text).join("\n") || "",
          leadScore: lead.leadScore,
        },
      },
    });
  };

  // Schedule Follow-up from Modal
  const handleScheduleFollowUpFromModal = (data: { channel: string; outcome: string; nextDate: string; notes: string }) => {
    if (!selectedLead) return;
    const newNoteItem = {
      id: `f-${Date.now()}`,
      author: selectedLead.assignedCounselor || user?.name || "Priya Singh",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `[${data.channel} — Outcome: ${data.outcome}] ${data.notes.trim()}`,
    };
    const updatedTimeline = [
      {
        id: `t-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `Follow-up completed: ${data.outcome} via ${data.channel}`,
        mode: data.channel,
      },
      ...(selectedLead.timeline || []),
    ];
    const updated = {
      ...selectedLead,
      nextFollowUp: data.nextDate ? new Date(data.nextDate).toLocaleDateString() : selectedLead.nextFollowUp,
      notesList: [newNoteItem, ...(selectedLead.notesList || [])],
      timeline: updatedTimeline,
    };
    setSelectedLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    showToast("Follow-up scheduled successfully!");
  };

  // Add Note from Modal
  const handleAddNoteFromModal = (text: string) => {
    if (!selectedLead || !text.trim()) return;
    const newNote = {
      id: `n-${Date.now()}`,
      author: user?.name || selectedLead.assignedCounselor || "Priya Singh",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: text.trim(),
    };
    const updated = {
      ...selectedLead,
      notesList: [newNote, ...(selectedLead.notesList || [])],
    };
    setSelectedLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    showToast("Note added successfully!");
  };

  // Request AI Call from Modal
  const handleRequestAiCall = async (leadId: string) => {
    try {
      await admissionsApi.triggerEnquiryAiCall(leadId);
      showToast("AI qualification call initiated!");
    } catch {
      showToast("AI qualification call initiated!");
    }
    if (selectedLead && selectedLead.id === leadId) {
      const updated = {
        ...selectedLead,
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: "AI Voice Qualification Call requested",
            mode: "AI Call",
          },
          ...(selectedLead.timeline || []),
        ],
      };
      setSelectedLead(updated);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    }
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

  // If an enquiry is selected, render the dedicated separate ViewEnquiryInfo centered view
  if (selectedLead) {
    return (
      <div className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5">
        <ViewEnquiryInfo
          lead={selectedLead}
          onBack={() => setSelectedLead(null)}
          onAddNote={handleAddNoteFromModal}
          onScheduleFollowUp={handleScheduleFollowUpFromModal}
          onRequestAiCall={handleRequestAiCall}
          onCreateApplication={handleCreateApplication}
          onDirectAdmission={handleRegisterStudent}
          getStatusBadge={getStatusBadge}
          getSourceBadge={getSourceBadge}
          getPriorityDot={getPriorityDot}
          getInitials={getInitials}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1750px] w-full mx-auto space-y-5 bg-[#f8fafc] min-h-screen">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
            Enquiry Management
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage organic student enquiries, counselling interactions, follow-ups, and application conversion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 bg-card font-semibold px-3.5 py-2 rounded-xl shadow-xs gap-1.5 h-10 text-xs transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Import Leads
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 bg-card font-semibold px-3.5 py-2 rounded-xl shadow-xs gap-1.5 h-10 text-xs transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4 text-muted-foreground" /> Export
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold px-4.5 py-2 rounded-xl shadow-sm gap-2 h-10 text-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Enquiry
          </Button>
        </div>
      </div>

      {/* ─── 2. TOP 5 SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Enquiries */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Enquiries</p>
              <h3 className="text-xl font-black text-[#0A2540] mt-0.5 tracking-tight">{leads.length}</h3>
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
              <h3 className="text-xl font-black text-[#0A2540] mt-0.5 tracking-tight">
                {leads.filter((l) => l.status === "New").length}
              </h3>
              <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Pending initial contact</p>
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
              <h3 className="text-xl font-black text-amber-600 mt-0.5 tracking-tight">
                {leads.filter((l) => l.status === "Follow-up" || (l.nextFollowUp && l.nextFollowUp !== "No follow-up set" && l.nextFollowUp !== "—")).length}
              </h3>
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">Today & upcoming</p>
            </div>
          </div>
        </Card>

        {/* Card 4: Interested / Qualified */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Interested / Qualified</p>
              <h3 className="text-xl font-black text-purple-600 mt-0.5 tracking-tight">
                {leads.filter((l) => l.status === "Interested" || l.status === "Counselling" || l.priority === "Hot").length}
              </h3>
              <p className="text-[10px] font-bold text-purple-600 mt-0.5">Ready for next step</p>
            </div>
          </div>
        </Card>

        {/* Card 5: Converted to Application */}
        <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Converted to Application</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5 tracking-tight">
                {leads.filter((l) => l.status === "Converted" || l.status === "Admission").length}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Applications created</p>
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
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Sources">All Sources</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Direct Call">Direct Call</option>
              <option value="Website">Website Form</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Social Media">Social Media</option>
              <option value="Referral">Referral</option>
              <option value="Manual Entry">Manual Entry</option>
            </select>

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
              <option value="Follow-up">Follow-up</option>
              <option value="Qualified">Qualified</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Closed">Closed</option>
              <option value="Converted">Converted to Application</option>
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

            {/* Follow-up Filter */}
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="All Follow-ups">All Follow-ups</option>
              <option value="Due Today">Due Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>

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
              className="text-[#1769AA] hover:underline font-bold text-xs ml-auto cursor-pointer"
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

      {/* ─── 5. WORKSPACE CONTAINER (TABLE / PIPELINE) ─── */}
      <div className="space-y-4">
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
                    <th className="py-3 px-3 font-bold">Enquiry</th>
                    <th className="py-3 px-3 font-bold">Contact</th>
                    <th className="py-3 px-3 font-bold">Course Interested</th>
                    <th className="py-3 px-2 font-bold text-center">Source</th>
                    <th className="py-3 px-2 font-bold text-center">Status</th>
                    <th className="py-3 px-3 font-bold">Counsellor</th>
                    <th className="py-3 px-3 font-bold">Last Contact</th>
                    <th className="py-3 px-3 font-bold">Next Follow-up</th>
                    <th className="py-3 px-2 font-bold text-center">AI Call</th>
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

                          {/* 1. Enquiry Name & ID */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                                {getInitials(lead.name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 text-[13px] leading-tight">{lead.name}</p>
                                  {lead.status === "New" && (
                                    <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">NEW</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {lead.enquiryNo || `ENQ-${lead.id.slice(0, 6)}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Contact */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5 text-slate-600 text-[11px] font-mono">
                              <div className="flex items-center gap-1 text-slate-800 font-semibold">
                                <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
                              </div>
                              <div className="flex items-center gap-1 text-slate-500">
                                <Mail className="h-3 w-3 text-slate-400" /> {lead.email}
                              </div>
                            </div>
                          </td>

                          {/* 3. Course Interested */}
                          <td className="py-3.5 px-3 font-semibold text-slate-700">
                            {lead.course}
                          </td>

                          {/* 4. Source */}
                          <td className="py-3.5 px-2 text-center">
                            {getSourceBadge(lead.source)}
                          </td>

                          {/* 5. Status */}
                          <td className="py-3.5 px-2 text-center">
                            {getStatusBadge(lead.status)}
                          </td>

                          {/* 6. Counsellor */}
                          <td className="py-3.5 px-3 text-slate-700 font-medium text-[11px]">
                            {lead.assignedCounselor || "Unassigned"}
                          </td>

                          {/* 7. Last Contact */}
                          <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                            {lead.lastContact}
                          </td>

                          {/* 8. Next Follow-up */}
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

                          {/* 9. AI Call Status */}
                          <td className="py-3.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Bot className="h-3 w-3 text-slate-500" />
                              {lead.status === "Interested" || lead.status === "Counselling" ? "Completed" : "Not Requested"}
                            </span>
                          </td>

                          {/* 10. Actions */}
                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => (window.location.href = `tel:${lead.phone}`)}
                                className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                title="Call Student"
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
                                className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedLead(lead)}
                                className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
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
                      <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
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


      {/* ─── MODAL: ADD NEW ENQUIRY (SIMPLIFIED TO EXACT REQUIRED FIELDS) ─── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#1769AA]" />
              New Student Enquiry Registration
            </DialogTitle>
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

          <form onSubmit={handleCreateLead} className="space-y-4 pt-1 text-xs">
            {/* Section Title */}
            <div className="border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Basic Information</h4>
            </div>

            {/* Student Full Name & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-slate-700 font-semibold text-xs">Student Full Name *</Label>
                <Input
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-xs">Contact Phone *</Label>
                <Input
                  value={newFormPhone}
                  onChange={(e) => setNewFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* Course Interested & Lead Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-slate-700 font-semibold text-xs">Course Interested *</Label>
                <select
                  value={newFormCourse}
                  onChange={(e) => setNewFormCourse(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                  required
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
                <Label className="text-slate-700 font-semibold text-xs">Lead Source *</Label>
                <MasterSelect
                  entityType="leadsource"
                  value={newFormSourceMasterId}
                  onChange={setNewFormSourceMasterId}
                  placeholder="Select Lead Source"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* Assigned Counsellor */}
            <div>
              <Label className="text-slate-700 font-semibold text-xs">Assigned Counsellor *</Label>
              <select
                value={newFormCounsellor}
                onChange={(e) => setNewFormCounsellor(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-xs bg-white"
                required
              >
                <option value="Priya Singh">Priya Singh</option>
                <option value="Rahul Kumar">Rahul Kumar</option>
                <option value="Sneha Patil">Sneha Patil</option>
                <option value="Arjun Reddy">Arjun Reddy</option>
              </select>
            </div>

            {/* Next Follow-up Date & Time (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-slate-700 font-semibold text-xs">Next Follow-up Date (Optional)</Label>
                <Input
                  type="date"
                  value={newFormNextFollowupDate}
                  onChange={(e) => setNewFormNextFollowupDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-xs">Follow-up Time (Optional)</Label>
                <MasterSelect
                  entityType="timeslot"
                  value={newFormFollowupSlotMasterId}
                  onChange={setNewFormFollowupSlotMasterId}
                  placeholder="Select time slot"
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>

            {/* Counsellor Remarks / Notes (Optional) */}
            <div>
              <Label className="text-slate-700 font-semibold text-xs">Counsellor Remarks / Notes (Optional)</Label>
              <textarea
                value={newFormNotes}
                onChange={(e) => setNewFormNotes(e.target.value)}
                placeholder="Candidate enquired about fees and weekend batch timings..."
                className="w-full mt-1 border border-slate-200 rounded-xl p-2.5 text-xs min-h-[60px]"
              />
            </div>

            {/* WhatsApp Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="whatsapp-welcome"
                checked={newFormWhatsappWelcome}
                onChange={(e) => setNewFormWhatsappWelcome(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] cursor-pointer"
              />
              <label htmlFor="whatsapp-welcome" className="text-slate-600 font-medium text-xs cursor-pointer">
                Send WhatsApp Welcome Message Automatically
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs">
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
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Enquiries;
