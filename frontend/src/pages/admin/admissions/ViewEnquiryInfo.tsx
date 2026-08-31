import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Clock,
  CalendarCheck,
  Bot,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Send,
  Loader2,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { EnrichedLead } from "./Enquiries";

interface ViewEnquiryInfoProps {
  lead: EnrichedLead;
  onBack: () => void;
  onAddNote: (text: string) => void;
  onScheduleFollowUp: (data: {
    channel: string;
    outcome: string;
    nextDate: string;
    notes: string;
  }) => void;
  onRequestAiCall: (leadId: string) => Promise<void>;
  onCreateApplication: (lead: EnrichedLead) => void;
  onDirectAdmission: (lead: EnrichedLead) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getSourceBadge: (source: string) => React.ReactNode;
  getPriorityDot: (priority: string) => React.ReactNode;
  getInitials: (name: string) => string;
}

export const ViewEnquiryInfo: React.FC<ViewEnquiryInfoProps> = ({
  lead,
  onBack,
  onAddNote,
  onScheduleFollowUp,
  onRequestAiCall,
  onCreateApplication,
  onDirectAdmission,
  getStatusBadge,
  getSourceBadge,
  getPriorityDot,
  getInitials,
}) => {
  const [activeTab, setActiveTab] = useState<
    "Profile" | "Course" | "Timeline" | "Follow-ups" | "AI Call" | "Notes"
  >("Profile");

  // Follow-up form state
  const [fuChannel, setFuChannel] = useState("Phone Call");
  const [fuOutcome, setFuOutcome] = useState("Connected");
  const [fuDate, setFuDate] = useState("");
  const [fuNotes, setFuNotes] = useState("");

  // Notes form state
  const [noteInput, setNoteInput] = useState("");

  // AI Call Requesting state
  const [isCalling, setIsCalling] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSaveFollowUp = () => {
    if (!fuNotes.trim() && !fuDate) return;
    onScheduleFollowUp({
      channel: fuChannel,
      outcome: fuOutcome,
      nextDate: fuDate,
      notes: fuNotes,
    });
    setFuNotes("");
    setFuDate("");
  };

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    onAddNote(noteInput.trim());
    setNoteInput("");
  };

  const handleAiCallClick = async () => {
    setIsCalling(true);
    try {
      await onRequestAiCall(lead.id);
    } finally {
      setTimeout(() => setIsCalling(false), 2000);
    }
  };

  const hasAiCall =
    lead.status === "Interested" ||
    lead.status === "Counselling" ||
    lead.leadScore >= 75 ||
    (lead.timeline && lead.timeline.some((t) => t.mode?.includes("AI") || t.text?.includes("AI")));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200 font-sans antialiased text-foreground">
      {/* ─── 1. TOP BREADCRUMB & HEADER ACTION BAR ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-lg border-border text-foreground hover:bg-muted/50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
              >
                ← Back to Enquiries
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Enquiry Details
              </h1>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {lead.enquiryNo}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Complete CRM enquiry information, counselling history & qualification workflow.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onCreateApplication(lead)}
            className="h-9 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>+ Create Application</span>
          </Button>

          <Button
            onClick={() => onDirectAdmission(lead)}
            variant="outline"
            className="h-9 px-3.5 text-xs font-bold border-border bg-card text-foreground hover:bg-muted/50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <span>Direct Admission</span>
          </Button>

          <Button
            onClick={handleAiCallClick}
            disabled={isCalling}
            className="h-9 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isCalling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Ringing AI...</span>
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5" />
                <span>Trigger AI Call</span>
              </>
            )}
          </Button>

          <Button
            onClick={() => window.open(`https://wa.me/91${lead.phone}`, "_blank")}
            variant="outline"
            className="h-9 px-3 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. COMPACT SUMMARY HEADER ──────────────────────────────────── */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Avatar, Name, Phone, Email */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-border shrink-0 bg-primary/10 text-primary font-bold text-lg">
                <AvatarFallback className="bg-primary/10 text-primary font-extrabold">
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {lead.name}
                  </h2>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {lead.enquiryNo}
                  </span>
                  {getStatusBadge(lead.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{lead.phone}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-foreground truncate max-w-[240px]">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{lead.email}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{lead.location || "Bengaluru"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:border-l lg:border-border lg:pl-5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Priority</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {getPriorityDot(lead.priority)}
                  <span className="text-xs font-bold text-foreground">{lead.priority}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Lead Score</p>
                <p className="text-xs font-extrabold text-amber-500 mt-1">
                  {lead.leadScore}/100 🔥
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Counsellor</p>
                <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-[120px]">
                  {lead.assignedCounselor || "Priya Singh"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Next Follow-up</p>
                <p className="text-xs font-bold text-primary mt-1 truncate max-w-[130px]">
                  {lead.nextFollowUp || "Not Set"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. HORIZONTAL TAB NAVIGATION ──────────────────────────────── */}
      <div className="border-b border-border bg-muted/30 p-1.5 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { key: "Profile", icon: User, label: "Profile" },
            { key: "Course", icon: GraduationCap, label: "Course" },
            { key: "Timeline", icon: Clock, label: "Timeline" },
            { key: "Follow-ups", icon: CalendarCheck, label: "Follow-ups" },
            { key: "AI Call", icon: Bot, label: "AI Call" },
            { key: "Notes", icon: FileText, label: "Notes" },
          ].map(({ key, icon: Icon, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-card text-primary shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. ACTIVE TAB CONTENT ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* TAB 1: PROFILE (LANDSCAPE TWO-COLUMN) */}
        {activeTab === "Profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT COLUMN: Student Information */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Student Information
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                    Identity
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Full Legal Name</span>
                  <span className="text-foreground font-bold text-sm mt-0.5 block">{lead.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Primary Mobile Number</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Alternative Mobile Number</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.altCourse ? lead.phone : "Not Provided"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Email Address</span>
                  <span className="text-foreground font-medium mt-0.5 block truncate">{lead.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Gender</span>
                  <span className="text-foreground font-medium mt-0.5 block">Not Provided</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Date of Birth</span>
                  <span className="text-foreground font-medium mt-0.5 block">Not Provided</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Highest Qualification</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.qualification || "Graduate"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Passing Year</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.passingYear || "2024"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">City / Location</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.location || "Bengaluru, Karnataka"}</span>
                </div>
              </CardContent>
            </Card>

            {/* RIGHT COLUMN: Enquiry Information */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Enquiry Information
                  </span>
                  {getSourceBadge(lead.source)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Course Interested</span>
                  <span className="text-primary font-bold text-sm mt-0.5 block">{lead.course}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Alternative Course</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.altCourse || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Lead Source</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Enquiry Date</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.enquiryDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Lead Priority</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {getPriorityDot(lead.priority)}
                    <span className="font-semibold text-foreground">{lead.priority}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Lead Stage / Status</span>
                  <div className="mt-0.5">
                    {getStatusBadge(lead.status)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Assigned Counsellor</span>
                  <span className="text-foreground font-semibold mt-0.5 block">{lead.assignedCounselor || "Priya Singh"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Preferred Timing</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.preferredTime || "Morning (09:00 AM – 11:00 AM)"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Next Follow-up Date</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5 block flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {lead.nextFollowUp || "Not Scheduled"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: COURSE (STRUCTURED LANDSCAPE) */}
        {activeTab === "Course" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Primary Course & Curriculum
                  </span>
                  <Badge variant="outline" className="text-[10px]">Academic Track</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Primary Course Interested</span>
                  <span className="text-foreground font-bold text-sm mt-0.5 block text-primary">{lead.course}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Alternative Course</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.altCourse || "None Specified"}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Course Duration</span>
                    <span className="text-foreground font-semibold mt-0.5 block">6 Months Full-Time</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Course Category</span>
                    <span className="text-foreground font-semibold mt-0.5 block">Design & Technology</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Schedule, Timing & Mode
                  </span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                    Flexible Batches
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Preferred Timing</span>
                    <span className="text-foreground font-semibold mt-0.5 block">{lead.preferredTime || "Morning Batch (09:00 AM – 11:00 AM)"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Preferred Start Date</span>
                    <span className="text-foreground font-semibold mt-0.5 block">Next Upcoming Batch</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Learning / Delivery Mode</span>
                  <span className="text-foreground font-medium mt-0.5 block">{lead.preferredMode || "Classroom / Offline Mode"}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Counsellor Recommendation</span>
                  <p className="text-foreground font-medium text-xs mt-1">
                    Recommended for Intensive Practical Track + Live Industry Project Portfolio.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: TIMELINE (CHRONOLOGICAL FULL WIDTH) */}
        {activeTab === "Timeline" && (
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Chronological Enquiry Activity History
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {lead.timeline?.length || 0} event(s) recorded
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 relative pl-6 border-l-2 border-border/80">
                {lead.timeline && lead.timeline.length > 0 ? (
                  lead.timeline.map((item, idx) => (
                    <div key={item.id || idx} className="relative space-y-1">
                      <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-foreground text-xs">
                            {item.mode || "Activity"} — {item.text.split(":")[0]}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono font-medium">
                            {item.date} • {item.time}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs italic">
                    No timeline history recorded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: FOLLOW-UPS (LANDSCAPE TWO-COLUMN) */}
        {activeTab === "Follow-ups" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: Previous Follow-ups */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    Previous Follow-ups & History
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Logs
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {lead.notesList && lead.notesList.length > 0 ? (
                    lead.notesList.map((n) => (
                      <div key={n.id} className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">{n.author}</span>
                          <span className="text-muted-foreground font-mono">{n.date}, {n.time}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{n.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                      No previous follow-up notes found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: Schedule New Follow-up Form */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Schedule New Follow-up
                  </span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    Action
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Follow-up Channel
                    </label>
                    <select
                      value={fuChannel}
                      onChange={(e) => setFuChannel(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Phone Call">Phone Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Center Visit">Center Visit / Walk-in</option>
                      <option value="Demo Class">Demo Class</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Interaction Outcome
                    </label>
                    <select
                      value={fuOutcome}
                      onChange={(e) => setFuOutcome(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Connected">Connected</option>
                      <option value="No Answer">No Answer</option>
                      <option value="Callback Requested">Callback Requested</option>
                      <option value="Interested">Interested</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Needs More Information">Needs More Information</option>
                      <option value="Ready for Admission">Ready for Admission</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Next Follow-up Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={fuDate}
                    onChange={(e) => setFuDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Follow-up Notes & Discussion
                  </label>
                  <textarea
                    value={fuNotes}
                    onChange={(e) => setFuNotes(e.target.value)}
                    placeholder="Log discussion notes, objections, fee discussions, or agreed next steps..."
                    className="w-full border border-border rounded-xl p-2.5 text-xs bg-background text-foreground min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleSaveFollowUp}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs cursor-pointer shadow-xs"
                >
                  Save Follow-up & Next Action
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: AI CALL (OPTIONAL VOICE QUALIFICATION) */}
        {activeTab === "AI Call" && (
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">AI Voice Qualification Agent (Sarvam AI)</h3>
                    <p className="text-xs text-muted-foreground">
                      Autonomous conversational qualification call (OPTIONAL — Manual Trigger Only)
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleAiCallClick}
                  disabled={isCalling}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCalling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Requesting Call...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>[ Request AI Call ]</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {hasAiCall ? (
                <div className="space-y-4 text-xs">
                  {/* Top 3 Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">AI Qualification Score</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {lead.leadScore}/100 🔥
                      </span>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Interest Level</span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                        {lead.priority === "Hot" ? "🔥 Hot Lead" : lead.priority === "Warm" ? "⚡ Warm Lead" : "❄️ Cold Lead"}
                      </span>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Call Status</span>
                      <span className="text-xl font-black text-primary mt-1 block">
                        Completed (02m 15s)
                      </span>
                    </div>
                  </div>

                  {/* Audio Player & Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-3.5">
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-indigo-500" />
                        <span>Call Recording Audio</span>
                      </h4>

                      {/* Simulated audio player */}
                      <div className="p-3 bg-card rounded-lg border border-border flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                        >
                          {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-indigo-600 transition-all ${isPlayingAudio ? "w-2/3 animate-pulse" : "w-1/4"}`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{isPlayingAudio ? "01:14" : "00:00"}</span>
                            <span>02:15</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-foreground text-xs mb-1">AI Executive Summary</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          Candidate expressed genuine interest in <strong>{lead.course}</strong>. Asked detailed questions regarding weekend vs weekday batch timings and confirmed willingness to attend in-person counselling demo session.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-foreground text-xs mb-1">Recommended Next Action</h4>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                          Share Course Syllabus & Schedule In-Person Counselling Demo
                        </Badge>
                      </div>
                    </div>

                    {/* Transcript */}
                    <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-2.5 flex flex-col">
                      <h4 className="font-bold text-foreground text-xs flex items-center justify-between">
                        <span>Call Transcript</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Auto-transcribed by Sarvam AI</span>
                      </h4>
                      <div className="flex-1 max-h-[260px] overflow-y-auto space-y-2.5 p-3 bg-card rounded-lg border border-border text-[11px] leading-relaxed">
                        <p>
                          <strong className="text-indigo-600 dark:text-indigo-400">AI Agent:</strong> Hello! Am I speaking with {lead.name}? Calling from Aadya Institute regarding your enquiry on {lead.course}.
                        </p>
                        <p>
                          <strong className="text-emerald-600 dark:text-emerald-400">Candidate:</strong> Yes, hello. Yes, I had submitted an enquiry yesterday.
                        </p>
                        <p>
                          <strong className="text-indigo-600 dark:text-indigo-400">AI Agent:</strong> Wonderful! Are you interested in classroom training at our center or online mode?
                        </p>
                        <p>
                          <strong className="text-emerald-600 dark:text-emerald-400">Candidate:</strong> I prefer classroom training, preferably morning batches. Could you send the fee structure?
                        </p>
                        <p>
                          <strong className="text-indigo-600 dark:text-indigo-400">AI Agent:</strong> Certainly! Our senior counsellor will share the full syllabus and fee plan on your WhatsApp number right away.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center bg-muted/20 rounded-xl border border-dashed border-border space-y-3">
                  <Bot className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div>
                    <h4 className="font-bold text-foreground text-sm">No AI Call has been requested for this enquiry.</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                      AI Calling is completely optional. Click <strong>[ Request AI Call ]</strong> above whenever you want the Sarvam AI voice agent to qualify this lead automatically.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 6: NOTES (COUNSELLOR & INTERNAL NOTES) */}
        {activeTab === "Notes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Add Note Section */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Add Counsellor Note
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5">
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Type internal remarks, candidate preferences, special conditions, or follow-up feedback..."
                  className="w-full border border-border rounded-xl p-3 text-xs bg-background text-foreground min-h-[140px] focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <Button
                  onClick={handleSaveNote}
                  disabled={!noteInput.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs cursor-pointer shadow-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>+ Save Note</span>
                </Button>
              </CardContent>
            </Card>

            {/* Previous Notes List */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Previous Notes ({lead.notesList?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {lead.notesList && lead.notesList.length > 0 ? (
                    lead.notesList.map((n) => (
                      <div key={n.id} className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">{n.author}</span>
                          <span className="text-muted-foreground font-mono">{n.date}, {n.time}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{n.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                      No internal notes recorded yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ─── 5. BOTTOM STICKY ACTION BAR ──────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = `tel:${lead.phone}`)}
            className="h-9 px-3 text-xs font-bold border-border text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-500" />
            <span>Call</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://wa.me/91${lead.phone}`, "_blank")}
            className="h-9 px-3 text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = `mailto:${lead.email}`)}
            className="h-9 px-3 text-xs font-bold border-border text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>Email</span>
          </Button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("Follow-ups")}
            className="h-9 px-3.5 text-xs font-bold border-border text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-primary" />
            <span>+ Schedule Follow-up</span>
          </Button>

          <Button
            size="sm"
            onClick={() => onCreateApplication(lead)}
            className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>+ Create Application</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDirectAdmission(lead)}
            className="h-9 px-4 text-xs font-bold border-border bg-card text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer shadow-2xs"
          >
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <span>Direct Admission</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
