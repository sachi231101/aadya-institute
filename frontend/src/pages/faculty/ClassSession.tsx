import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, Check, X, Clock, Users, Video, BookOpen,
  Save, Play, Square, FileText, Download,
  CheckCircle2, AlertCircle, ExternalLink, Copy, CheckCheck,
  Radio, Sparkles, Send, Bell
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { classSessionsApi } from "@/services/class-sessions.api";
import { useNotificationStore } from "@/store/notification.store";

import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/services/students.api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";
type SessionWorkflowStep = "ATTENDANCE" | "CONFIRM_LIVE" | "LIVE_IN_PROGRESS" | "COMPLETED";

interface EnrolledStudent {
  id: string;
  studentId: string;
  name: string;
  initials: string;
  avatar: string;
  status: AttendanceStatus;
}

export const FacultyClassSession: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addRecording, addSessionHistory, sessionHistories, setActiveLiveClass, endActiveLiveClass } = useSessionStore();
  const { addNotification } = useNotificationStore();

  // Class Session Meta Parameters
  const sessionIdParam = searchParams.get("id") || searchParams.get("sessionId") || "";
  const hasValidSessionId = Boolean(sessionIdParam) && !sessionIdParam.startsWith("sess-");
  const sessionId = hasValidSessionId ? sessionIdParam : "";
  const courseName = searchParams.get("course") || "Digital Marketing";
  const batchCode = searchParams.get("batch") || "Digital Marketing – Batch A";
  const roomNo = searchParams.get("room") || "Online / Virtual";
  const scheduledTime = searchParams.get("time") || "10:00 AM – 11:00 AM";
  const scheduledDate = searchParams.get("date") || "Today, 25 Aug 2026";
  const facultyName = user?.name || "Ramesh Kumar";
  const subjectName = searchParams.get("subject") || "Search Engine Optimization & Google Ads";

  const { data: sessionAttendanceRes } = useQuery({
    queryKey: ["class-session-attendance", sessionId],
    queryFn: () => classSessionsApi.getAttendance(sessionId),
    enabled: hasValidSessionId,
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["students", "faculty-session-fallback"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
    enabled: !hasValidSessionId,
  });

  // Google Meet Config
  const defaultMeetId = useMemo(() => {
    const cleanBatch = batchCode.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "dm";
    const cleanCourse = courseName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "mkt";
    return `aady-${cleanBatch}-${cleanCourse}`;
  }, [batchCode, courseName]);

  const [meetLink, setMeetLink] = useState(`https://meet.google.com/${defaultMeetId}`);
  const [customMeetUrl, setCustomMeetUrl] = useState(`https://meet.google.com/${defaultMeetId}`);
  const [isMeetLinkEdited, setIsMeetLinkEdited] = useState(false);

  // Workflow State
  const [workflowStep, setWorkflowStep] = useState<SessionWorkflowStep>("ATTENDANCE");
  const [activeTab, setActiveTab] = useState<"attendance" | "live_classroom" | "session_history">("attendance");
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    const roster = sessionAttendanceRes?.data?.students;
    if (hasValidSessionId && Array.isArray(roster) && roster.length > 0) {
      setStudents(
        roster.map((s: any) => {
          const name = s.name || "Student";
          return {
            id: s.studentId || s.id,
            studentId: s.studentCode || `STU-${String(s.studentId || s.id).slice(0, 4)}`,
            name,
            initials: name.slice(0, 2).toUpperCase(),
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            status: (
              s.status === "ABSENT" ? "ABSENT" : s.status === "LEAVE" || s.status === "EXCUSED" ? "LEAVE" : "PRESENT"
            ) as AttendanceStatus,
          };
        })
      );
      return;
    }

    const rawStudents = studentsRes?.data || [];
    if (rawStudents.length > 0) {
      setStudents(
        rawStudents.map((s: any) => ({
          id: s.id,
          studentId: s.studentCode || `STU-${s.id.slice(0, 4)}`,
          name: s.user?.name || s.name || "Student",
          initials: (s.user?.name || s.name || "ST").slice(0, 2).toUpperCase(),
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.user?.name || s.name || "ST")}`,
          status: "PRESENT" as AttendanceStatus,
        }))
      );
    } else {
      setStudents([]);
    }
  }, [sessionAttendanceRes, studentsRes, hasValidSessionId]);

  // Live Class Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<string | null>(null);

  // Confirmation / Feedback Feedback State
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);

  // Status Notification Banners
  const [notificationFeedback, setNotificationFeedback] = useState<{
    attendanceSaved: boolean;
    liveStarted: boolean;
    notifiedCount: number;
  } | null>(null);

  // Notes
  const [classNotesText, setClassNotesText] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([
    "Introduction to SEO Fundamentals and Keyword Research Strategy.",
    "Homework: Complete On-Page optimization checklist for assigned demo site."
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Timer Effect when LIVE
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (workflowStep === "LIVE_IN_PROGRESS") {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workflowStep]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const attendanceCounts = useMemo(() => {
    const present = students.filter((s) => s.status === "PRESENT").length;
    const absent = students.filter((s) => s.status === "ABSENT").length;
    const leave = students.filter((s) => s.status === "LEAVE").length;
    return { present, absent, leave, total: students.length };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const handleToggleAttendance = (id: string, status: AttendanceStatus) => {
    if (workflowStep === "LIVE_IN_PROGRESS" || workflowStep === "COMPLETED") return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  // ─── STEP 1: Save Attendance & Go Live ──────────────────────────────────────
  const handleSaveAttendanceAndGoLive = async () => {
    if (!sessionId || sessionId.startsWith("sess-")) {
      triggerToast("Open attendance from a real class session. Invalid session id.");
      return;
    }
    try {
      await classSessionsApi.saveAttendance(
        sessionId,
        students.map((s) => ({
          studentId: s.id,
          status: s.status,
        }))
      );
      setWorkflowStep("CONFIRM_LIVE");
      triggerToast("Attendance saved. Confirm Google Meet link to launch class.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to save attendance. Please try again.";
      triggerToast(message);
    }
  };

  // ─── STEP 2: 🔴 Start Live Class ───────────────────────────────────────────
  const handleStartLiveClass = async () => {
    if (!sessionId || sessionId.startsWith("sess-")) {
      triggerToast("Cannot start live class without a valid session.");
      return;
    }

    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    try {
      await classSessionsApi.startLive(sessionId, meetUrl);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to start live class on server.";
      triggerToast(message);
      return;
    }

    setWorkflowStep("LIVE_IN_PROGRESS");
    setSessionStartTime(currentTimeStr);
    setActiveTab("live_classroom");

    setActiveLiveClass({
      id: sessionId,
      courseName,
      batchCode,
      batchName: batchCode,
      moduleName: subjectName,
      facultyName,
      date: scheduledDate,
      time: scheduledTime,
      meetUrl,
      meetId: defaultMeetId,
      startedAt: currentTimeStr,
      studentCount: attendanceCounts.present,
      status: "LIVE",
    });

    const notifiedCount = attendanceCounts.total;
    setNotificationFeedback({
      attendanceSaved: true,
      liveStarted: true,
      notifiedCount,
    });

    addNotification(`Live class for ${courseName} started. ${notifiedCount} students notified.`, "success");
    triggerToast(`Live class started. ${notifiedCount} students notified.`);
    window.open(meetUrl, "_blank", "noopener,noreferrer");
  };

  // ─── Open Google Meet Session ───────────────────────────────────────────────
  const handleOpenGoogleMeet = () => {
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    window.open(meetUrl, "_blank", "noopener,noreferrer");
    triggerToast("🔗 Opening Google Meet session in new tab...");
  };

  // ─── Copy Google Meet Link ──────────────────────────────────────────────────
  const handleCopyMeetLink = () => {
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    navigator.clipboard.writeText(meetUrl);
    setCopiedMeetLink(true);
    triggerToast("✓ Google Meet link copied to clipboard.");
    setTimeout(() => setCopiedMeetLink(false), 3000);
  };

  // ─── Open End Class Modal ───────────────────────────────────────────────────
  const handleOpenEndConfirm = () => {
    setShowEndConfirmModal(true);
  };

  // ─── Confirm End Class ──────────────────────────────────────────────────────
  const handleConfirmEndClass = async () => {
    setShowEndConfirmModal(false);
    setWorkflowStep("COMPLETED");
    const endTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSessionEndTime(endTimeStr);

    const recDurationMins = Math.max(1, Math.round(secondsElapsed / 60));
    const recId = `rec-${Date.now()}`;
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;

    // 1. End active live class in global store
    endActiveLiveClass();

    // 2. Add to Session History
    addSessionHistory({
      id: `hist-${Date.now()}`,
      course: courseName,
      batch: batchCode,
      module: subjectName,
      facultyName: facultyName,
      date: scheduledDate,
      startTime: sessionStartTime || "10:00 AM",
      endTime: endTimeStr,
      duration: `${recDurationMins} min`,
      presentCount: attendanceCounts.present,
      absentCount: attendanceCounts.absent,
      totalCount: attendanceCounts.total,
      meetUrl,
      meetId: defaultMeetId,
      notes: savedNotes,
      recordingId: recId,
    });

    // 3. Add Google Meet recording to video recordings archive
    const newRecording = {
      id: recId,
      course: courseName,
      batch: batchCode,
      batchName: `${courseName} (${batchCode})`,
      module: subjectName,
      facultyName: facultyName,
      date: scheduledDate,
      rawDate: new Date().toISOString().split("T")[0],
      time: scheduledTime,
      duration: `${recDurationMins} min`,
      studentsCount: attendanceCounts.present,
      thumbnailBg: "bg-gradient-to-br from-[#0A2540] via-slate-900 to-blue-950",
      topics: [subjectName, "Google Meet Live Class Recording", "Class Q&A Session"],
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      viewsCount: 0,
      status: "Available" as const,
      expiresAt: "2026-09-25",
      meetUrl,
      meetId: defaultMeetId,
      startTime: sessionStartTime || "10:00 AM",
      endTime: endTimeStr,
      source: "Google Meet" as const,
    };

    addRecording(newRecording);

    // 4. Call backend end-live endpoint
    try {
      await classSessionsApi.endLive(sessionId);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to end live class on server.";
      triggerToast(message);
      return;
    }

    addNotification(`Class completed. Recording is now available in Student & Faculty portals.`, "info");
    triggerToast("Class session completed. Recording saved.");
  };

  const handleSaveNotes = () => {
    if (classNotesText.trim()) {
      setSavedNotes((prev) => [...prev, classNotesText]);
      setClassNotesText("");
      setShowNotesModal(false);
      triggerToast("✓ Class notes saved successfully.");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      {/* ─── TOP NAVIGATION & CLASS HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/faculty/classes")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Classes
          </button>

          {!hasValidSessionId && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Open this page from My Classes with a real session id. Attendance and live class actions are blocked without one.
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
              {courseName}
            </h1>
            
            {/* Class Status Badge */}
            {workflowStep === "LIVE_IN_PROGRESS" ? (
              <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-xs font-black px-3.5 py-1.5 flex items-center gap-2 shadow-xs animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                🔴 LIVE NOW
              </Badge>
            ) : workflowStep === "COMPLETED" ? (
              <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-xs font-bold px-3 py-1">
                Class Completed
              </Badge>
            ) : workflowStep === "CONFIRM_LIVE" ? (
              <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-bold px-3 py-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Ready to Go Live
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold px-3 py-1">
                Upcoming Slot
              </Badge>
            )}
          </div>

          {/* Class Details Meta Info */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#1769AA] border border-blue-200 font-bold">
              Batch: {batchCode}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              Subject: {subjectName}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              Faculty: {facultyName}
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium px-2 py-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {scheduledDate} • {scheduledTime}
            </span>
          </div>
        </div>

        {/* Live Duration Timer Card during class */}
        {workflowStep === "LIVE_IN_PROGRESS" && (
          <div className="p-3.5 px-5 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Live Duration</p>
              <p className="text-2xl font-mono font-black text-slate-900 leading-none mt-0.5">
                {formatTimer(secondsElapsed)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── TOAST / CONFIRMATION FEEDBACK BANNER ─── */}
      {toastMsg && (
        <div className="p-4 px-5 rounded-2xl bg-[#0A2540] text-white border border-slate-800 flex items-center justify-between gap-3 text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── FEEDBACK SUCCESS BOX AFTER GOING LIVE ─── */}
      {notificationFeedback && workflowStep === "LIVE_IN_PROGRESS" && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <span>✓ Live Class Started</span>
                <span className="text-xs text-emerald-700 font-bold">•</span>
                <span>✓ Attendance Saved</span>
              </h4>
              <p className="text-xs text-emerald-800 font-medium">
                ✓ <strong>{notificationFeedback.notifiedCount} Students</strong> in <strong>{batchCode}</strong> have received instant in-app & push notifications with the Google Meet link.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleOpenGoogleMeet}
            className="bg-[#00832D] hover:bg-[#006e25] text-white font-extrabold text-xs h-10 px-5 rounded-xl gap-2 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Video className="w-4 h-4" /> Open Google Meet
          </Button>
        </div>
      )}

      {/* ─── TABS BAR ─── */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "attendance"
              ? "border-[#1769AA] text-[#1769AA]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" /> Step 1: Mark Attendance
          {workflowStep !== "ATTENDANCE" && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("live_classroom")}
          className={`py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "live_classroom"
              ? "border-[#1769AA] text-[#1769AA]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Video className="w-4 h-4" /> Step 2: Google Meet Live Class
          {workflowStep === "LIVE_IN_PROGRESS" && (
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("session_history")}
          className={`py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "session_history"
              ? "border-[#1769AA] text-[#1769AA]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" /> Session History & Recordings
        </button>
      </div>

      {/* ─── MAIN 2-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT MAIN PANEL (2 COLUMNS) ─── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: ATTENDANCE */}
          {activeTab === "attendance" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Mark Student Attendance</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Showing students assigned exclusively to <strong>{batchCode}</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1">
                    {attendanceCounts.present} Present
                  </Badge>
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold px-3 py-1">
                    {attendanceCounts.absent} Absent
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-bold px-3 py-1">
                    {attendanceCounts.total} Total
                  </Badge>
                </div>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name or student ID..."
                  className="pl-10 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              {/* Students Table */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-[10.5px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                    {filteredStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 rounded-xl border border-slate-200 shadow-2xs">
                              <AvatarImage src={st.avatar} />
                              <AvatarFallback className="bg-blue-100 text-[#1769AA] text-[10px] font-black">
                                {st.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-extrabold text-slate-900 block">{st.name}</span>
                              <span className="text-[10.5px] text-slate-500 font-normal">{batchCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">{st.studentId}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                            <button
                              type="button"
                              disabled={workflowStep === "LIVE_IN_PROGRESS" || workflowStep === "COMPLETED"}
                              onClick={() => handleToggleAttendance(st.id, "PRESENT")}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                st.status === "PRESENT"
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" /> Present
                            </button>
                            <button
                              type="button"
                              disabled={workflowStep === "LIVE_IN_PROGRESS" || workflowStep === "COMPLETED"}
                              onClick={() => handleToggleAttendance(st.id, "ABSENT")}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                st.status === "ABSENT"
                                  ? "bg-rose-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" /> Absent
                            </button>
                            <button
                              type="button"
                              disabled={workflowStep === "LIVE_IN_PROGRESS" || workflowStep === "COMPLETED"}
                              onClick={() => handleToggleAttendance(st.id, "LEAVE")}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                st.status === "LEAVE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" /> Leave
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Attendance Primary Action */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 flex-wrap">
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> {attendanceCounts.present} Present
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                    <X className="w-3.5 h-3.5" /> {attendanceCounts.absent} Absent
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> {attendanceCounts.leave} Leave
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <Users className="w-3.5 h-3.5 text-slate-500" /> {attendanceCounts.total} Enrolled
                  </span>
                </div>

                {workflowStep === "ATTENDANCE" ? (
                  <Button
                    type="button"
                    onClick={handleSaveAttendanceAndGoLive}
                    className="w-full sm:w-auto bg-[#1769AA] hover:bg-[#125890] text-white font-extrabold h-11 px-7 rounded-xl shadow-md gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Attendance & Go Live
                  </Button>
                ) : workflowStep === "CONFIRM_LIVE" ? (
                  <Button
                    type="button"
                    onClick={() => setActiveTab("live_classroom")}
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-black h-11 px-7 rounded-xl shadow-md gap-2 cursor-pointer animate-pulse"
                  >
                    <Radio className="w-4 h-4" /> Proceed to Start Live Class →
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="w-4.5 h-4.5" /> Attendance Saved & Locked
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* TAB 2: GOOGLE MEET LIVE CLASSROOM */}
          {activeTab === "live_classroom" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
                    Google Meet Live Class Management
                    {workflowStep === "LIVE_IN_PROGRESS" ? (
                      <Badge className="bg-rose-600 text-white font-black text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" /> 🔴 LIVE NOW
                      </Badge>
                    ) : workflowStep === "COMPLETED" ? (
                      <Badge className="bg-slate-200 text-slate-800 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                        COMPLETED
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                        READY TO GO LIVE
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Subject / Topic: <strong className="text-slate-800 font-bold">{subjectName}</strong>
                  </p>
                </div>

                {workflowStep === "LIVE_IN_PROGRESS" && (
                  <Button
                    type="button"
                    onClick={handleOpenGoogleMeet}
                    className="bg-[#00832D] hover:bg-[#006e25] text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs cursor-pointer"
                  >
                    <Video className="w-4 h-4" /> Open Google Meet
                  </Button>
                )}
              </div>

              {/* STEP 2 CONFIRMATION PANEL (BEFORE STARTING LIVE) */}
              {workflowStep !== "LIVE_IN_PROGRESS" && workflowStep !== "COMPLETED" && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-blue-50/50 to-slate-50 border border-amber-200 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 shadow-xs flex items-center justify-center shrink-0">
                      <Radio className="w-6 h-6 text-rose-600 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Step 2: Confirm Google Meet Link & Launch Class
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        Student attendance has been verified. Clicking <strong>Start Live Class</strong> will instantly notify all <strong>{attendanceCounts.total} students</strong> assigned to <strong>{batchCode}</strong> with the Google Meet join link.
                      </p>
                    </div>
                  </div>

                  {/* Google Meet URL Configuration Field */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Google Meet URL</span>
                      <span className="text-slate-400 font-normal lowercase">editable / confirmable</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={customMeetUrl}
                        onChange={(e) => setCustomMeetUrl(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="h-10 text-xs font-mono bg-white border-slate-300 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyMeetLink}
                        className="h-10 text-xs font-bold rounded-xl border-slate-300 bg-white hover:bg-slate-50 gap-1.5 shrink-0 cursor-pointer"
                      >
                        {copiedMeetLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedMeetLink ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  {/* Primary Start Live Action Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-200/60">
                    <p className="text-[11px] text-slate-500 font-medium">
                      ✓ Instant push & in-app notification will be broadcast to {batchCode} students.
                    </p>
                    <Button
                      type="button"
                      onClick={handleStartLiveClass}
                      className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-black text-sm h-11 px-8 rounded-xl shadow-lg shadow-rose-600/30 gap-2.5 cursor-pointer transform hover:scale-[1.02] transition-all"
                    >
                      <Radio className="w-5 h-5 animate-ping" /> 🔴 Start Live Class
                    </Button>
                  </div>
                </div>
              )}

              {/* DURING LIVE CLASS INTERFACE */}
              {workflowStep === "LIVE_IN_PROGRESS" && (
                <div className="space-y-5">
                  {/* Google Meet Active Session Bar */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-blue-50/80 border border-teal-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 shadow-sm flex items-center justify-center shrink-0">
                        {/* Google Meet Quad-Color Icon */}
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 8.5V4.5C15 3.67 14.33 3 13.5 3H3.5C2.67 3 2 3.67 2 4.5V19.5C2 20.33 2.67 21 3.5 21H13.5C14.33 21 15 20.33 15 19.5V15.5L20.15 19.36C20.68 19.76 21.43 19.38 21.43 18.72V5.28C21.43 4.62 20.68 4.24 20.15 4.64L15 8.5Z" fill="#00832D"/>
                          <path d="M15 8.5L20.15 4.64C20.68 4.24 21.43 4.62 21.43 5.28V11L15 8.5Z" fill="#0066DA"/>
                          <path d="M21.43 11V18.72C21.43 19.38 20.68 19.76 20.15 19.36L15 15.5V8.5L21.43 11Z" fill="#E44134"/>
                          <path d="M15 15.5L20.15 19.36C20.68 19.76 21.43 19.38 21.43 18.72V15.5L15 15.5Z" fill="#FFBA00"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-teal-950">Google Meet is Live Now</h4>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                            Active Session
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Meeting URL: <span className="font-mono font-bold text-teal-900">{customMeetUrl}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyMeetLink}
                        className="h-9 text-xs font-bold rounded-xl border-teal-200 bg-white hover:bg-teal-50 text-teal-900 gap-1.5 cursor-pointer"
                      >
                        {copiedMeetLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedMeetLink ? "Copied" : "Copy Link"}
                      </Button>

                      <Button
                        type="button"
                        onClick={handleOpenGoogleMeet}
                        className="h-9 text-xs font-extrabold rounded-xl bg-[#00832D] hover:bg-[#006e25] text-white gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Google Meet
                      </Button>
                    </div>
                  </div>

                  {/* Live Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-emerald-950 leading-none">{attendanceCounts.present}</p>
                        <p className="text-[10.5px] font-bold text-emerald-700 mt-1">Present</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                        <X className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-rose-950 leading-none">{attendanceCounts.absent}</p>
                        <p className="text-[10.5px] font-bold text-rose-700 mt-1">Absent</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1769AA] text-white flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-mono font-black text-slate-900 leading-none">{formatTimer(secondsElapsed)}</p>
                        <p className="text-[10.5px] font-bold text-blue-800 mt-1">Duration</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900 leading-none">{attendanceCounts.total}</p>
                        <p className="text-[10.5px] font-bold text-slate-600 mt-1">Total Enrolled</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & End Class Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenGoogleMeet}
                        className="h-10 text-xs font-bold rounded-xl border-slate-200 text-teal-800 hover:bg-teal-50 gap-2 cursor-pointer shadow-2xs"
                      >
                        <Video className="w-4 h-4 text-teal-600" /> Open Google Meet
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNotesModal(true)}
                        className="h-10 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-2 cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-4 h-4 text-indigo-600" /> Add Class Notes
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowViewStudentsModal(true)}
                        className="h-10 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-2 cursor-pointer shadow-2xs"
                      >
                        <Users className="w-4 h-4 text-emerald-600" /> View Students
                      </Button>
                    </div>

                    <Button
                      type="button"
                      onClick={handleOpenEndConfirm}
                      className="h-10 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-md cursor-pointer px-6 ml-auto"
                    >
                      <Square className="w-4 h-4 fill-current" /> End Class
                    </Button>
                  </div>
                </div>
              )}

              {/* COMPLETED CLASS STATE */}
              {workflowStep === "COMPLETED" && (
                <div className="p-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">Class Session Completed</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Attendance records and Google Meet recording have been saved. Students can view the recording in their Video Recordings desk.
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => navigate("/faculty/classes")}
                      className="bg-[#1769AA] text-white text-xs font-bold h-9 px-5 rounded-xl cursor-pointer"
                    >
                      Back to My Classes
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: SESSION HISTORY */}
          {activeTab === "session_history" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Session History & Recordings</h2>
                  <p className="text-xs text-slate-500 font-medium">Logged class sessions for {batchCode}.</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                  {sessionHistories.length} Logged Sessions
                </Badge>
              </div>

              <div className="space-y-3">
                {sessionHistories.map((hist) => (
                  <div key={hist.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{hist.course} — {hist.module}</span>
                        <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold">
                          Google Meet
                        </Badge>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px] font-semibold">{hist.date} • {hist.startTime} - {hist.endTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1">
                      <span>Faculty: <strong>{hist.facultyName}</strong></span>
                      <span>Attendance: <strong className="text-emerald-600">{hist.presentCount} Present</strong>, <strong className="text-rose-600">{hist.absentCount} Absent</strong></span>
                      <span>Duration: <strong>{hist.duration}</strong></span>
                    </div>

                    {hist.notes && hist.notes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                        <strong className="text-slate-800">Notes:</strong> {hist.notes.join("; ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR PANEL ─── */}
        <div className="space-y-6">
          {/* Card 1: Class Details */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Class Details</h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Course</p>
                <p className="font-extrabold text-slate-900 mt-0.5">{courseName}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Batch</p>
                <p className="font-bold text-[#1769AA] mt-0.5">{batchCode}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Subject / Module</p>
                <p className="font-semibold text-slate-700 mt-0.5">{subjectName}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Faculty</p>
                <p className="font-bold text-slate-800 mt-0.5">{facultyName}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Scheduled Slot</p>
                <p className="font-semibold text-slate-700 mt-0.5">{scheduledDate} ({scheduledTime})</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Enrolled Students</p>
                <p className="font-extrabold text-slate-900 mt-0.5">{attendanceCounts.total} Assigned</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Class Status</p>
                <p className="font-extrabold text-slate-900 mt-0.5">
                  {workflowStep === "LIVE_IN_PROGRESS" ? (
                    <span className="text-rose-600 font-black">🔴 LIVE NOW</span>
                  ) : workflowStep === "COMPLETED" ? (
                    <span className="text-slate-600">Completed</span>
                  ) : (
                    <span className="text-blue-600">Upcoming Slot</span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 2: Quick Google Meet Info */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Google Meet Session</h3>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Meeting ID</span>
                <span className="font-mono font-bold text-slate-800">{defaultMeetId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Notification Mode</span>
                <span className="font-bold text-emerald-600">Instant Broadcast</span>
              </div>
            </div>
          </Card>

          {/* Card 3: Class Session Quick Actions */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(true)}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="text-[10.5px] font-bold text-slate-700">Add Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowViewStudentsModal(true)}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-[10.5px] font-bold text-slate-700">View Roster</span>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── END CLASS CONFIRMATION MODAL ─── */}
      <Dialog open={showEndConfirmModal} onOpenChange={setShowEndConfirmModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Square className="w-5 h-5 text-rose-600 fill-current" /> End this live class session?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              This will change the class status to <strong>Completed</strong>, disable student join buttons, and archive the recording for student viewing.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEndConfirmModal(false)}
              className="h-10 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEndClass}
              className="h-10 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
            >
              End Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD CLASS NOTES MODAL ─── */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Add Class Notes & Homework
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <textarea
              rows={4}
              value={classNotesText}
              onChange={(e) => setClassNotesText(e.target.value)}
              placeholder="Enter lecture summary, homework assignment, or student tasks..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1769AA]/20 font-medium"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setShowNotesModal(false)} className="h-9 text-xs font-bold rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveNotes} className="h-9 text-xs font-bold bg-[#1769AA] text-white rounded-xl cursor-pointer">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW STUDENTS MODAL ─── */}
      <Dialog open={showViewStudentsModal} onOpenChange={setShowViewStudentsModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Enrolled Students ({students.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {students.map((st) => (
              <div key={st.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900">{st.name} ({st.studentId})</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {st.status}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
