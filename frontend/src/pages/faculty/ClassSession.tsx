import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, Check, X, Clock, Users, Video, BookOpen,
  Save, Play, Square, FileText, Download,
  CheckCircle2, AlertCircle, ExternalLink, Copy, CheckCheck,
  Radio, Sparkles, Send, Bell, Calendar, MapPin, Loader2,
  FileCode, Presentation, Upload, Plus
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
import { useSessionStore, type SessionAttendanceRecord, type SessionMaterialItem } from "@/store/session.store";
import { classSessionsApi } from "@/services/class-sessions.api";
import { useNotificationStore } from "@/store/notification.store";
import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/services/students.api";
import { batchesApi } from "@/services/batches.api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";
type SessionWorkflowStep = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

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
  const {
    addRecording,
    addMaterial,
    addSessionHistory,
    sessionHistories,
    setActiveLiveClass,
    endActiveLiveClass,
    setSessionStatus,
    getSessionStatus,
    saveSessionAttendance,
    getSessionAttendance,
    activeLiveClass
  } = useSessionStore();
  const { addNotification } = useNotificationStore();

  // Class Session Meta Parameters
  const sessionIdParam = searchParams.get("id") || searchParams.get("sessionId") || "";
  const hasValidSessionId = Boolean(sessionIdParam) && !sessionIdParam.startsWith("sess-");
  const sessionId = hasValidSessionId ? sessionIdParam : (sessionIdParam || "session-default-01");

  const courseName = searchParams.get("course") || "Java Class";
  const batchCode = searchParams.get("batch") || "B001";
  const batchId = searchParams.get("batchId") || "";
  const roomNo = searchParams.get("room") || "Online (Google Meet)";
  const scheduledTime = searchParams.get("time") || "09:00 AM – 10:00 AM";
  const scheduledDate = searchParams.get("date") || "31 Aug 2026";
  const facultyName = user?.name || "Faculty01";
  const subjectName = searchParams.get("subject") || courseName || "Java Programming";

  // Check persisted session status in store
  const persistedStatus = getSessionStatus(sessionId);
  const isCurrentlyLiveInStore = activeLiveClass?.id === sessionId && activeLiveClass?.status === "LIVE";

  // Initial workflow state based on persisted status
  const [workflowStep, setWorkflowStep] = useState<SessionWorkflowStep>(() => {
    if (persistedStatus) return persistedStatus;
    if (isCurrentlyLiveInStore) return "LIVE";
    return "UPCOMING";
  });

  // Fetch Attendance from backend if valid session id
  const { data: sessionAttendanceRes } = useQuery({
    queryKey: ["class-session-attendance", sessionId],
    queryFn: () => classSessionsApi.getAttendance(sessionId),
    enabled: hasValidSessionId,
  });

  // Fetch Batch specific students if batchId is given, otherwise students list
  const { data: batchStudentsRes } = useQuery({
    queryKey: ["batch-students", batchId || batchCode],
    queryFn: () => (batchId ? batchesApi.getStudents(batchId) : Promise.resolve(null)),
    enabled: Boolean(batchId),
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["students", "faculty-session-all"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
    enabled: !hasValidSessionId && !batchId,
  });

  // Google Meet Config
  const defaultMeetId = useMemo(() => {
    const cleanBatch = batchCode.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "b001";
    const cleanCourse = courseName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "java";
    return `aady-${cleanBatch}-${cleanCourse}`;
  }, [batchCode, courseName]);

  const [customMeetUrl, setCustomMeetUrl] = useState(`https://meet.google.com/${defaultMeetId}`);

  // Tab State
  const [activeTab, setActiveTab] = useState<"attendance" | "live_classroom" | "session_history">("attendance");
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);

  // Initialize and Sync Students
  useEffect(() => {
    // 1. Check if we already have locally stored attendance for this session
    const storedAttendance = getSessionAttendance(sessionId);
    if (storedAttendance && storedAttendance.length > 0) {
      setStudents(
        storedAttendance.map((rec, i) => {
          const name = rec.studentName || `Student ${i + 1}`;
          return {
            id: rec.studentId,
            studentId: rec.studentCode || `AAD-2026-000${i + 1}`,
            name,
            initials: name.slice(0, 2).toUpperCase(),
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            status: rec.status,
          };
        })
      );
      return;
    }

    // 2. Check server session attendance response
    const serverRoster = sessionAttendanceRes?.data?.students;
    if (hasValidSessionId && Array.isArray(serverRoster) && serverRoster.length > 0) {
      setStudents(
        serverRoster.map((s: any) => {
          const name = s.name || s.student?.user?.name || "Student";
          return {
            id: s.studentId || s.id,
            studentId: s.studentCode || s.student?.studentCode || `AAD-2026-000${String(s.studentId || s.id).slice(0, 4)}`,
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

    // 3. Check batch students response
    const batchStudents = batchStudentsRes?.data;
    if (Array.isArray(batchStudents) && batchStudents.length > 0) {
      setStudents(
        batchStudents.map((bItem: any, idx: number) => {
          const name = bItem.student?.user?.name || bItem.student?.name || `Student ${idx + 1}`;
          return {
            id: bItem.studentId || bItem.student?.id || `stu-${idx + 1}`,
            studentId: bItem.student?.studentCode || `AAD-2026-000${idx + 1}`,
            name,
            initials: name.slice(0, 2).toUpperCase(),
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            status: "PRESENT" as AttendanceStatus,
          };
        })
      );
      return;
    }

    // 4. Default Roster for assigned batch B001
    setStudents([
      { id: "stu-b001-01", studentId: "AAD-2026-0003", name: "SACHIN GA", initials: "SG", avatar: "", status: "PRESENT" },
      { id: "stu-b001-02", studentId: "AAD-2026-0002", name: "Hareesh NV", initials: "HN", avatar: "", status: "ABSENT" },
      { id: "stu-b001-03", studentId: "AAD-2026-0001", name: "adithya fs", initials: "AF", avatar: "", status: "LEAVE" },
    ]);
  }, [sessionAttendanceRes, batchStudentsRes, hasValidSessionId, sessionId]);

  // Live Class Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<string | null>(null);

  // Modals State
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showUploadRecordingModal, setShowUploadRecordingModal] = useState(false);
  const [showUploadMaterialsModal, setShowUploadMaterialsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [showAttendanceSuccessModal, setShowAttendanceSuccessModal] = useState(false);
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);

  // Upload Recording Form State
  const [recTitle, setRecTitle] = useState(`${courseName} - Live Class Recording`);
  const [recVideoUrl, setRecVideoUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [recDurationMins, setRecDurationMins] = useState("60");

  // Upload Materials Form State
  const [matTitle, setMatTitle] = useState(`${subjectName} - Lecture Notes & PPT`);
  const [matDescription, setMatDescription] = useState("Complete classroom presentation and code exercises.");
  const [matType, setMatType] = useState<"pdf" | "slides" | "code" | "doc">("pdf");
  const [matFileUrl, setMatFileUrl] = useState("https://example.com/materials.pdf");

  // Notes State
  const [classNotesText, setClassNotesText] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([
    "Introduction to Java Object-Oriented Fundamentals and Method Overloading.",
    "Homework: Implement Class Hierarchy for Banking Account Management."
  ]);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Timer Effect when LIVE
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (workflowStep === "LIVE") {
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
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  // ─── ACTION 1: UPDATE ATTENDANCE ──────────────────────────────────────────
  const handleUpdateAttendance = async () => {
    setIsUpdatingAttendance(true);
    const nowIso = new Date().toISOString();

    // 1. Save locally to session store for immediate cross-portal sync
    const records: SessionAttendanceRecord[] = students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentId,
      studentName: s.name,
      batchId: batchId || batchCode,
      batchCode,
      courseName,
      subjectName,
      date: scheduledDate,
      status: s.status,
      updatedAt: nowIso,
    }));
    saveSessionAttendance(sessionId, records);

    // 2. Call backend if valid session ID exists
    if (hasValidSessionId) {
      try {
        await classSessionsApi.saveAttendance(
          sessionId,
          students.map((s) => ({
            studentId: s.id,
            status: s.status,
          }))
        );
      } catch (err: any) {
        console.warn("Backend attendance sync skipped/failed:", err?.message);
      }
    }

    setIsUpdatingAttendance(false);
    setShowAttendanceSuccessModal(true);
    triggerToast("✓ Attendance Updated Successfully", "success");
    addNotification(`Attendance updated for ${courseName} (${batchCode}): ${attendanceCounts.present} Present, ${attendanceCounts.absent} Absent, ${attendanceCounts.leave} Leave.`, "success");
  };

  // ─── ACTION 2: GO LIVE CLASS (Open Confirmation Modal) ──────────────────────
  const handleGoLiveClick = () => {
    if (!customMeetUrl.trim()) {
      triggerToast("Google Meet link is not available for this class.", "error");
      return;
    }
    setShowGoLiveModal(true);
  };

  // ─── START LIVE CLASS (Confirmed) ──────────────────────────────────────────
  const handleConfirmStartLive = async () => {
    setShowGoLiveModal(false);
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // 1. Update backend if valid session id
    if (hasValidSessionId) {
      try {
        await classSessionsApi.startLive(sessionId, meetUrl);
      } catch (err: any) {
        console.warn("Server startLive skipped:", err?.message);
      }
    }

    // 2. Update frontend state: UPCOMING -> LIVE
    setWorkflowStep("LIVE");
    setSessionStatus(sessionId, "LIVE");
    setSessionStartTime(currentTimeStr);

    // 3. Set global active live class for student portal join button
    setActiveLiveClass({
      id: sessionId,
      sessionId,
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
      studentCount: attendanceCounts.present || students.length,
      status: "LIVE",
    });

    addNotification(`Live class for ${courseName} started. Enrolled students in ${batchCode} notified.`, "success");
    triggerToast(`Live class started. ${attendanceCounts.total} students notified.`);

    // 4. Open Google Meet in a new browser tab and keep Faculty Portal open
    window.open(meetUrl, "_blank", "noopener,noreferrer");
  };

  // ─── ACTION 3: END LIVE CLASS (Open End Confirm Modal) ──────────────────────
  const handleOpenEndConfirmModal = () => {
    setShowEndConfirmModal(true);
  };

  // ─── CONFIRM END CLASS ──────────────────────────────────────────────────────
  const handleConfirmEndClass = async () => {
    setShowEndConfirmModal(false);

    // LIVE -> COMPLETED
    setWorkflowStep("COMPLETED");
    setSessionStatus(sessionId, "COMPLETED");

    const endTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSessionEndTime(endTimeStr);

    const recDuration = Math.max(1, Math.round(secondsElapsed / 60));
    const recId = `rec-${Date.now()}`;
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;

    endActiveLiveClass();

    addSessionHistory({
      id: `hist-${Date.now()}`,
      course: courseName,
      batch: batchCode,
      module: subjectName,
      facultyName: facultyName,
      date: scheduledDate,
      startTime: sessionStartTime || "09:00 AM",
      endTime: endTimeStr,
      duration: `${recDuration} min`,
      presentCount: attendanceCounts.present,
      absentCount: attendanceCounts.absent,
      totalCount: attendanceCounts.total,
      meetUrl,
      meetId: defaultMeetId,
      notes: savedNotes,
      recordingId: recId,
    });

    // Automatically create recording entry
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
      duration: `${recDuration} min`,
      studentsCount: attendanceCounts.present,
      thumbnailBg: "bg-gradient-to-br from-[#0A2540] via-slate-900 to-blue-950",
      topics: [subjectName, "Google Meet Live Class Recording", "Class Q&A Session"],
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      viewsCount: 0,
      status: "Available" as const,
      expiresAt: "2026-09-30",
      meetUrl,
      meetId: defaultMeetId,
      startTime: sessionStartTime || "09:00 AM",
      endTime: endTimeStr,
      source: "Google Meet" as const,
    };

    addRecording(newRecording);

    if (hasValidSessionId) {
      try {
        await classSessionsApi.endLive(sessionId);
      } catch (err: any) {
        console.warn("Backend endLive sync skipped:", err?.message);
      }
    }

    addNotification(`Class completed. Recording and attendance archived.`, "info");
    triggerToast("Class session completed successfully.", "success");
  };

  // ─── ACTION 4: UPLOAD RECORDING ─────────────────────────────────────────────
  const handleSaveRecording = () => {
    const recId = `rec-${Date.now()}`;
    addRecording({
      id: recId,
      course: courseName,
      batch: batchCode,
      batchName: `${courseName} (${batchCode})`,
      module: subjectName,
      facultyName,
      date: scheduledDate,
      rawDate: new Date().toISOString().split("T")[0],
      time: scheduledTime,
      duration: `${recDurationMins} min`,
      studentsCount: attendanceCounts.present || students.length,
      thumbnailBg: "bg-gradient-to-br from-[#0A2540] via-slate-900 to-blue-950",
      topics: [subjectName, recTitle],
      videoUrl: recVideoUrl.trim() || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      viewsCount: 0,
      status: "Available",
      expiresAt: "2026-09-30",
      meetUrl: customMeetUrl,
      source: "Google Meet",
    });

    setShowUploadRecordingModal(false);
    triggerToast("Recording attached to session successfully.", "success");
    addNotification(`New recording uploaded for ${courseName} (${batchCode}).`, "success");
  };

  // ─── ACTION 5: UPLOAD MATERIALS ─────────────────────────────────────────────
  const handleSaveMaterial = () => {
    const matId = `mat-${Date.now()}`;
    const newMaterial: SessionMaterialItem = {
      id: matId,
      sessionId,
      title: matTitle.trim() || `${subjectName} Lecture Material`,
      description: matDescription.trim(),
      moduleName: subjectName,
      batchCode,
      courseName,
      fileType: matType,
      fileSize: "2.4 MB",
      pagesOrDuration: matType === "pdf" ? "18 pages" : matType === "slides" ? "32 slides" : "Source Code",
      uploadedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      facultyName,
      downloadUrl: matFileUrl.trim() || "https://example.com/material.pdf",
      topics: [subjectName, courseName],
    };

    addMaterial(newMaterial);
    setShowUploadMaterialsModal(false);
    triggerToast("Study material attached to session successfully.", "success");
    addNotification(`Study material uploaded for ${courseName} (${batchCode}).`, "success");
  };

  // ─── Open Google Meet Session ───────────────────────────────────────────────
  const handleOpenGoogleMeet = () => {
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    window.open(meetUrl, "_blank", "noopener,noreferrer");
    triggerToast("Opening Google Meet session in new tab...", "info");
  };

  // ─── Copy Google Meet Link ──────────────────────────────────────────────────
  const handleCopyMeetLink = () => {
    const meetUrl = customMeetUrl.trim() || `https://meet.google.com/${defaultMeetId}`;
    navigator.clipboard.writeText(meetUrl);
    setCopiedMeetLink(true);
    triggerToast("Google Meet link copied to clipboard.", "success");
    setTimeout(() => setCopiedMeetLink(false), 3000);
  };

  const handleSaveNotes = () => {
    if (classNotesText.trim()) {
      setSavedNotes((prev) => [...prev, classNotesText]);
      setClassNotesText("");
      setShowNotesModal(false);
      triggerToast("Class notes saved successfully.", "success");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      {/* ─── TOP NAVIGATION & CLASS HEADER ─── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate("/faculty/classes")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Classes
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
                {courseName}
              </h1>

              {/* Dynamic Status Badge */}
              {workflowStep === "LIVE" ? (
                <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-xs font-black px-3.5 py-1.5 flex items-center gap-2 shadow-xs animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  🔴 LIVE NOW
                </Badge>
              ) : workflowStep === "COMPLETED" ? (
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ✓ Class Completed
                </Badge>
              ) : workflowStep === "CANCELLED" ? (
                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-bold px-3 py-1">
                  ✕ Class Cancelled
                </Badge>
              ) : (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold px-3 py-1">
                  Upcoming Slot
                </Badge>
              )}
            </div>

            {/* Class Details Meta Info Badges */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2.5 flex-wrap">
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
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {scheduledDate}
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {scheduledTime}
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium px-2 py-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {roomNo}
              </span>
            </div>
          </div>

          {/* Live Timer if Active */}
          {workflowStep === "LIVE" && (
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
      </div>

      {/* ─── 3-STEP PROGRESSION HEADER ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${activeTab === "attendance" ? "bg-blue-50/70 border border-blue-200" : "hover:bg-slate-50"
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${activeTab === "attendance" ? "bg-[#1769AA] text-white" : "bg-slate-100 text-slate-700"
              }`}>
              1
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">Mark Attendance</p>
              <p className="text-[11px] text-slate-500 font-medium">Mark student attendance</p>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setActiveTab("live_classroom")}
            className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${activeTab === "live_classroom" ? "bg-blue-50/70 border border-blue-200" : "hover:bg-slate-50"
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${workflowStep === "LIVE"
                ? "bg-rose-600 text-white animate-pulse"
                : activeTab === "live_classroom"
                  ? "bg-[#1769AA] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}>
              2
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight flex items-center gap-1.5">
                Google Meet Live Class
                {workflowStep === "LIVE" && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Start the live session</p>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setActiveTab("session_history")}
            className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${activeTab === "session_history" ? "bg-blue-50/70 border border-blue-200" : "hover:bg-slate-50"
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${activeTab === "session_history" ? "bg-[#1769AA] text-white" : "bg-slate-100 text-slate-700"
              }`}>
              3
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">Session History & Recordings</p>
              <p className="text-[11px] text-slate-500 font-medium">View recordings and materials</p>
            </div>
          </button>
        </div>
      </div>

      {/* ─── TOAST / BANNER NOTIFICATION ─── */}
      {toastMsg && (
        <div className={`p-3.5 px-5 rounded-2xl text-white flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top-2 ${toastMsg.type === "success"
            ? "bg-[#0A2540] border border-slate-800"
            : toastMsg.type === "error"
              ? "bg-rose-900 border border-rose-800"
              : "bg-[#1769AA] border border-blue-900"
          }`}>
          <div className="flex items-center gap-2.5">
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-300 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── MAIN CONTENT 2-COLUMN GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ─── LEFT COLUMN (2 COLUMNS) ─── */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-5">
                {/* Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900">Student Attendance</h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Showing students assigned exclusively to <strong>{batchCode}</strong>.
                    </p>
                  </div>

                  {/* Top Status Counters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      {attendanceCounts.present} Present
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                      {attendanceCounts.absent} Absent
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      {attendanceCounts.leave} Leave
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                      {attendanceCounts.total} Total
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name or student ID..."
                    className="pl-10 h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl"
                  />
                </div>

                {/* Students Table */}
                <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 text-[10.5px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                            No students are assigned to this class.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st, idx) => (
                          <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 rounded-full border border-slate-200 shadow-2xs">
                                  <AvatarImage src={st.avatar} />
                                  <AvatarFallback className="bg-purple-600 text-white text-[10px] font-black">
                                    {st.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{st.name}</span>
                                  <span className="text-[10.5px] text-slate-500 font-normal">{batchCode}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-[11px]">{st.studentId}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center rounded-xl bg-slate-50 p-1 border border-slate-200 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(st.id, "PRESENT")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${st.status === "PRESENT"
                                      ? "bg-[#00832D] text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    }`}
                                >
                                  <Check className="w-3.5 h-3.5" /> Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(st.id, "ABSENT")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${st.status === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    }`}
                                >
                                  <X className="w-3.5 h-3.5" /> Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(st.id, "LEAVE")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${st.status === "LEAVE"
                                      ? "bg-amber-500 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    }`}
                                >
                                  <Clock className="w-3.5 h-3.5" /> Leave
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ─── DYNAMIC BOTTOM PRIMARY ACTIONS BAR ─── */}
                <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100">
                  {/* Left Summary */}
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      {attendanceCounts.present} Present
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      {attendanceCounts.absent} Absent
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      {attendanceCounts.leave} Leave
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {attendanceCounts.total} Total
                    </span>
                  </div>

                  {/* Right Dynamic Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* PRIMARY ACTION 1: [ ✓ Update Attendance ] */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUpdateAttendance}
                      disabled={isUpdatingAttendance}
                      className="w-full sm:w-auto border-2 border-[#1769AA] text-[#1769AA] bg-white hover:bg-blue-50 font-extrabold h-11 px-6 rounded-xl shadow-xs gap-2 cursor-pointer transition-all"
                    >
                      {isUpdatingAttendance ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#1769AA]" />
                      ) : (
                        <Check className="w-4 h-4 text-[#1769AA]" />
                      )}
                      {isUpdatingAttendance ? "Updating Attendance..." : "Update Attendance"}
                    </Button>

                    {/* DYNAMIC ACTION 2: STATE BASED */}
                    {workflowStep === "UPCOMING" && (
                      <Button
                        type="button"
                        onClick={handleGoLiveClick}
                        className="w-full sm:w-auto bg-[#0066DA] hover:bg-[#0055b8] text-white font-extrabold h-11 px-7 rounded-xl shadow-md gap-2 cursor-pointer transition-all"
                      >
                        <Video className="w-4 h-4 text-white" />
                        Go Live Class
                      </Button>
                    )}

                    {workflowStep === "LIVE" && (
                      <Button
                        type="button"
                        onClick={handleOpenEndConfirmModal}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-extrabold h-11 px-7 rounded-xl shadow-md gap-2 cursor-pointer transition-all animate-pulse"
                      >
                        <Square className="w-4 h-4 fill-current text-white" />
                        End Live Class
                      </Button>
                    )}

                    {workflowStep === "COMPLETED" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowUploadRecordingModal(true)}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs h-11 px-4 rounded-xl gap-2 cursor-pointer"
                        >
                          <Video className="w-4 h-4 text-purple-600" />
                          Upload Recording
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowUploadMaterialsModal(true)}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs h-11 px-4 rounded-xl gap-2 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Upload Materials
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Info Note below Main Card */}
              <div className="p-3.5 px-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-medium flex items-center gap-2.5 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  i
                </div>
                <span>
                  Only students assigned to this batch/class are shown here. Once you update attendance and go live, the session will be reflected in student portals.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CLASSROOM CONTROLS */}
          {activeTab === "live_classroom" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
                    Google Meet Live Class Management
                    {workflowStep === "LIVE" ? (
                      <Badge className="bg-rose-600 text-white font-black text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" /> 🔴 LIVE NOW
                      </Badge>
                    ) : workflowStep === "COMPLETED" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[11px] px-3 py-1 rounded-full">
                        ✓ CLASS COMPLETED
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold px-2.5 py-0.5">
                        Ready to Start
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Topic: <strong className="text-slate-800 font-bold">{subjectName}</strong> • Batch: <strong>{batchCode}</strong>
                  </p>
                </div>

                {workflowStep === "LIVE" && (
                  <Button
                    type="button"
                    onClick={handleOpenGoogleMeet}
                    className="bg-[#00832D] hover:bg-[#006e25] text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs cursor-pointer"
                  >
                    <Video className="w-4 h-4" /> Open Google Meet
                  </Button>
                )}
              </div>

              {/* Live Session Details Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-blue-50/80 border border-teal-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 shadow-sm flex items-center justify-center shrink-0">
                    <Video className="w-6 h-6 text-[#00832D]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-teal-950">
                        {workflowStep === "LIVE" ? "Google Meet is Live Now" : "Configured Live Classroom"}
                      </h4>
                      {workflowStep === "LIVE" && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                          Active Session
                        </Badge>
                      )}
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

                  {workflowStep === "UPCOMING" && (
                    <Button
                      type="button"
                      onClick={handleGoLiveClick}
                      className="h-9 text-xs font-extrabold rounded-xl bg-[#0066DA] hover:bg-[#0055b8] text-white gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Live Class
                    </Button>
                  )}

                  {workflowStep === "LIVE" && (
                    <Button
                      type="button"
                      onClick={handleOpenGoogleMeet}
                      className="h-9 text-xs font-extrabold rounded-xl bg-[#00832D] hover:bg-[#006e25] text-white gap-1.5 shadow-sm cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Join Tab
                    </Button>
                  )}
                </div>
              </div>

              {/* Actions & End Class Bar */}
              {workflowStep === "LIVE" && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
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
                      <Users className="w-4 h-4 text-emerald-600" /> View Roster ({students.length})
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={handleOpenEndConfirmModal}
                    className="h-10 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-md cursor-pointer px-6 ml-auto"
                  >
                    <Square className="w-4 h-4 fill-current" /> End Live Class
                  </Button>
                </div>
              )}

              {workflowStep === "COMPLETED" && (
                <div className="p-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">Class Session Completed</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Attendance records and class recordings are now accessible in student portals.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUploadRecordingModal(true)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs h-9 px-4 rounded-xl gap-2 cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-purple-600" /> Upload Recording
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUploadMaterialsModal(true)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs h-9 px-4 rounded-xl gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-600" /> Upload Materials
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
                  <p className="text-xs text-slate-500 font-medium">Archived classes and recordings for {batchCode}.</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                  {sessionHistories.length} Logged Sessions
                </Badge>
              </div>

              {sessionHistories.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-100">
                  No previous sessions recorded yet for this batch. Complete a live class to view archived history here.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionHistories.map((hist) => (
                    <div key={hist.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-extrabold text-slate-900">{hist.course} — {hist.module}</span>
                        <span className="text-slate-500 font-mono text-[11px] font-semibold">{hist.date} • {hist.startTime} - {hist.endTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1">
                        <span>Faculty: <strong>{hist.facultyName}</strong></span>
                        <span>Attendance: <strong className="text-emerald-600">{hist.presentCount} Present</strong>, <strong className="text-rose-600">{hist.absentCount} Absent</strong></span>
                        <span>Duration: <strong>{hist.duration}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR (CLASS DETAILS & BEFORE GOING LIVE) ─── */}
        <div className="space-y-5">
          {/* Card 1: Class Details */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Class Details</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Course
                </span>
                <span className="font-extrabold text-slate-900 text-right">{courseName}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Batch
                </span>
                <span className="font-bold text-[#1769AA] text-right">{batchCode}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Subject / Module
                </span>
                <span className="font-semibold text-slate-800 text-right">{subjectName}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Faculty
                </span>
                <span className="font-bold text-slate-800 text-right">{facultyName}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                </span>
                <span className="font-semibold text-slate-800 text-right">{scheduledDate}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Time
                </span>
                <span className="font-semibold text-slate-800 text-right">{scheduledTime}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-slate-400" /> Class Mode
                </span>
                <span className="font-bold text-[#1769AA] flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[#1769AA]" /> Online (Google Meet)
                </span>
              </div>

              {/* Meeting Link Field */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>Meeting Link</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 px-3">
                  <span className="font-mono text-[11px] text-slate-700 truncate flex-1">{customMeetUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyMeetLink}
                    title="Copy Meeting Link"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    {copiedMeetLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Enrolled Students
                </span>
                <span className="font-extrabold text-slate-900">{attendanceCounts.total} Assigned</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Class Status
                </span>
                <Badge className={`text-[11px] font-extrabold px-2.5 py-0.5 ${workflowStep === "LIVE"
                    ? "bg-rose-100 text-rose-700 border-rose-200"
                    : workflowStep === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-50 text-[#1769AA] border-blue-200"
                  }`}>
                  {workflowStep === "LIVE" ? "🔴 LIVE NOW" : workflowStep === "COMPLETED" ? "✓ Completed" : "Upcoming Slot"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Card 2: Before Going Live Checklist */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Before Going Live</h3>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Mark attendance for all students</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Ensure Google Meet link is available</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Check your audio and video</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Click on Go Live Class to start the session</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* ─── MODAL 1: GO LIVE ENTRANCE CONFIRMATION ─── */}
      <Dialog open={showGoLiveModal} onOpenChange={setShowGoLiveModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-[#0066DA]" /> Ready to start this class?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              This will launch the live session for enrolled students and broadcast notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Course:</span>
              <span className="font-extrabold text-slate-900">{courseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Batch:</span>
              <span className="font-bold text-[#1769AA]">{batchCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-medium text-slate-800">{subjectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scheduled Time:</span>
              <span className="font-medium text-slate-800">{scheduledDate} ({scheduledTime})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Number of Students:</span>
              <span className="font-extrabold text-slate-900">{attendanceCounts.total} Enrolled ({attendanceCounts.present} Present)</span>
            </div>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGoLiveModal(false)}
              className="h-10 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmStartLive}
              className="h-10 text-xs font-extrabold bg-[#0066DA] hover:bg-[#0055b8] text-white rounded-xl shadow-md cursor-pointer gap-2"
            >
              <Video className="w-4 h-4" /> Start Live Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: END CLASS CONFIRMATION ─── */}
      <Dialog open={showEndConfirmModal} onOpenChange={setShowEndConfirmModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Square className="w-5 h-5 text-rose-600 fill-current" /> End this live class?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              Please review the live session summary before completing:
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Course:</span>
              <span className="font-extrabold text-slate-900">{courseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Batch:</span>
              <span className="font-bold text-[#1769AA]">{batchCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-medium text-slate-800">{subjectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Started At:</span>
              <span className="font-bold text-slate-800">{sessionStartTime || "09:00 AM"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Duration:</span>
              <span className="font-mono font-black text-rose-600">{formatTimer(secondsElapsed)}</span>
            </div>
          </div>

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

      {/* ─── MODAL 3: UPLOAD RECORDING ─── */}
      <Dialog open={showUploadRecordingModal} onOpenChange={setShowUploadRecordingModal}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" /> Upload Session Recording
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              Attach the recorded video lecture exclusively for students enrolled in <strong>{batchCode}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Recording Title</label>
              <Input
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                placeholder="e.g. Java Programming - OOP & Inheritance Masterclass"
                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Video Stream / File URL</label>
              <Input
                value={recVideoUrl}
                onChange={(e) => setRecVideoUrl(e.target.value)}
                placeholder="https://...mp4 or Google Drive / Cloud storage link"
                className="h-10 text-xs font-mono rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Duration (minutes)</label>
              <Input
                value={recDurationMins}
                onChange={(e) => setRecDurationMins(e.target.value)}
                type="number"
                placeholder="60"
                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadRecordingModal(false)}
              className="h-10 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRecording}
              className="h-10 text-xs font-extrabold bg-[#1769AA] text-white rounded-xl shadow-md cursor-pointer"
            >
              Save Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: UPLOAD MATERIALS ─── */}
      <Dialog open={showUploadMaterialsModal} onOpenChange={setShowUploadMaterialsModal}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Upload Class Study Materials
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              Upload notes, slides, PDF, or workbooks for students in <strong>{batchCode}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Document Title</label>
              <Input
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="e.g. Module 1 Summary Notes & Code Snippets"
                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description / Instructions</label>
              <Input
                value={matDescription}
                onChange={(e) => setMatDescription(e.target.value)}
                placeholder="Brief summary or homework exercises for students"
                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Material Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "pdf", label: "PDF Document" },
                  { key: "slides", label: "PPT Slides" },
                  { key: "code", label: "Source Code" },
                  { key: "doc", label: "Word Doc" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setMatType(t.key as any)}
                    className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer ${matType === t.key
                        ? "border-[#1769AA] bg-blue-50 text-[#1769AA]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Download / File URL</label>
              <Input
                value={matFileUrl}
                onChange={(e) => setMatFileUrl(e.target.value)}
                placeholder="https://example.com/notes.pdf"
                className="h-10 text-xs font-mono rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadMaterialsModal(false)}
              className="h-10 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMaterial}
              className="h-10 text-xs font-extrabold bg-[#1769AA] text-white rounded-xl shadow-md cursor-pointer"
            >
              Upload Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: ADD CLASS NOTES ─── */}
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

      {/* ─── MODAL 6: VIEW STUDENTS ─── */}
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.status === "PRESENT"
                    ? "bg-emerald-100 text-emerald-700"
                    : st.status === "LEAVE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}>
                  {st.status}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 7: ATTENDANCE UPDATED SUCCESSFULLY POPUP ─── */}
      <Dialog open={showAttendanceSuccessModal} onOpenChange={setShowAttendanceSuccessModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Attendance Updated Successfully
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              Class session attendance has been recorded and immediately synchronized with enrolled student portals.
            </DialogDescription>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Course / Batch:</span>
              <span className="font-extrabold text-slate-900">{courseName} ({batchCode})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-medium text-slate-800">{subjectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium text-slate-800">{scheduledDate}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200/60">
              <span className="text-slate-500 font-bold">Attendance Summary:</span>
              <div className="flex items-center gap-2 font-black">
                <span className="text-emerald-600">{attendanceCounts.present} Present</span>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600">{attendanceCounts.absent} Absent</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600">{attendanceCounts.leave} Leave</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex justify-center">
            <Button
              type="button"
              onClick={() => setShowAttendanceSuccessModal(false)}
              className="w-full bg-[#1769AA] hover:bg-[#125890] text-white font-extrabold text-xs h-10 rounded-xl shadow-md cursor-pointer"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
