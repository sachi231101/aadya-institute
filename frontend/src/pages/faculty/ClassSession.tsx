import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, Check, X, Clock, Users, Video, BookOpen,
  Save, Play, Square, FileText, Download,
  CheckCircle2, AlertCircle, ExternalLink, Copy, CheckCheck
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

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
type SessionState = "ATTENDANCE_PENDING" | "ATTENDANCE_SAVED" | "CLASS_IN_PROGRESS" | "CLASS_COMPLETED";

interface EnrolledStudent {
  id: string;
  studentId: string;
  name: string;
  initials: string;
  avatar: string;
  status: AttendanceStatus;
}

const INITIAL_STUDENTS_LIST: EnrolledStudent[] = [
  { id: "1", studentId: "STU001", name: "Rahul Sharma", initials: "RS", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "2", studentId: "STU002", name: "Sneha Patil", initials: "SP", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "3", studentId: "STU003", name: "Amit Kumar", initials: "AK", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80", status: "ABSENT" },
  { id: "4", studentId: "STU004", name: "Pooja Nair", initials: "PN", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "5", studentId: "STU005", name: "Vikram Singh", initials: "VS", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "6", studentId: "STU006", name: "Mohammed Danish", initials: "MD", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "7", studentId: "STU007", name: "Kavya R", initials: "KR", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "8", studentId: "STU008", name: "Arjun S", initials: "AS", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "9", studentId: "STU009", name: "Ria Deshmukh", initials: "RD", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80", status: "ABSENT" },
  { id: "10", studentId: "STU010", name: "Siddharth Rao", initials: "SR", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "11", studentId: "STU011", name: "Ananya Hegde", initials: "AH", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
  { id: "12", studentId: "STU012", name: "Karan Mehta", initials: "KM", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80", status: "PRESENT" },
];

export const FacultyClassSession: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addRecording, addSessionHistory, sessionHistories } = useSessionStore();

  // Class Session Meta Parameters
  const courseName = searchParams.get("course") || "Java Programming";
  const batchCode = searchParams.get("batch") || "Batch C";
  const roomNo = searchParams.get("room") || "Room 301";
  const scheduledTime = searchParams.get("time") || "09:00 AM - 10:00 AM";
  const scheduledDate = searchParams.get("date") || "Mon, 18 Aug 2026";
  const facultyName = user?.name || "Ramesh Kumar";

  // Google Meet Config
  const meetId = useMemo(() => {
    const cleanCourse = courseName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    const cleanBatch = batchCode.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    return `aady-${cleanBatch}-${cleanCourse}`;
  }, [courseName, batchCode]);

  const googleMeetUrl = `https://meet.google.com/${meetId}`;

  // Tab State
  const [activeTab, setActiveTab] = useState<"attendance" | "class_session" | "session_history">("attendance");

  // Workflow State
  const [sessionState, setSessionState] = useState<SessionState>("ATTENDANCE_PENDING");
  const [moduleTopic] = useState("Object-Oriented Programming");
  const [students, setStudents] = useState<EnrolledStudent[]>(INITIAL_STUDENTS_LIST);
  const [searchQuery, setSearchQuery] = useState("");

  // Live Timers
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<string | null>(null);

  // Modals & UI States
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);

  // Notes
  const [classNotesText, setClassNotesText] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([
    "Covered inheritance syntax and method overriding examples.",
    "Homework: Complete OOP exercises from Module 3 by Friday."
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionState === "CLASS_IN_PROGRESS") {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const attendanceCounts = useMemo(() => {
    const present = students.filter((s) => s.status === "PRESENT").length;
    const absent = students.filter((s) => s.status === "ABSENT").length;
    const late = students.filter((s) => s.status === "LATE").length;
    return { present, absent, late, total: students.length };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const handleToggleAttendance = (id: string, status: AttendanceStatus) => {
    if (sessionState !== "ATTENDANCE_PENDING") return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  // 1. Save Attendance Action
  const handleSaveAttendance = () => {
    setSessionState("ATTENDANCE_SAVED");
    triggerToast("✓ Attendance saved successfully! You can now start the live class.");
  };

  // 2. Start Class with Google Meet Action
  const handleStartClassWithGoogleMeet = () => {
    if (sessionState !== "ATTENDANCE_SAVED") return;

    // Start class inside Aadya Portal
    setSessionState("CLASS_IN_PROGRESS");
    const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSessionStartTime(currentTimeStr);
    setActiveTab("class_session");

    // Open Google Meet in a new browser tab
    window.open(googleMeetUrl, "_blank", "noopener,noreferrer");

    triggerToast("⚡ Live class started! Google Meet session connected.");
  };

  // 3. Open Google Meet Window
  const handleOpenGoogleMeet = () => {
    window.open(googleMeetUrl, "_blank", "noopener,noreferrer");
    triggerToast("🔗 Opening Google Meet session...");
  };

  // 4. Copy Google Meet Link
  const handleCopyMeetLink = () => {
    navigator.clipboard.writeText(googleMeetUrl);
    setCopiedMeetLink(true);
    triggerToast("✓ Google Meet link copied to clipboard.");
    setTimeout(() => setCopiedMeetLink(false), 3000);
  };

  // 5. Open End Class Confirmation Modal
  const handleOpenEndConfirm = () => {
    setShowEndConfirmModal(true);
  };

  // 6. Confirm End Class -> Finalize session, save history & link Google Meet recording
  const handleConfirmEndClass = () => {
    setShowEndConfirmModal(false);
    setSessionState("CLASS_COMPLETED");
    const endTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSessionEndTime(endTimeStr);

    const recDurationMins = Math.max(1, Math.round(secondsElapsed / 60));
    const recId = `rec-${Date.now()}`;

    // 1. Save Completed Session History
    addSessionHistory({
      id: `hist-${Date.now()}`,
      course: courseName,
      batch: batchCode,
      module: moduleTopic,
      facultyName: facultyName,
      date: scheduledDate,
      startTime: sessionStartTime || "09:02 AM",
      endTime: endTimeStr,
      duration: `${recDurationMins} min`,
      presentCount: attendanceCounts.present,
      absentCount: attendanceCounts.absent,
      totalCount: attendanceCounts.total,
      meetUrl: googleMeetUrl,
      meetId: meetId,
      notes: savedNotes,
      recordingId: recId,
    });

    // 2. Automatically associate Google Meet Recording with session
    const newRecording = {
      id: recId,
      course: courseName,
      batch: batchCode,
      batchName: `${courseName} (${batchCode})`,
      module: moduleTopic,
      facultyName: facultyName,
      date: scheduledDate,
      rawDate: new Date().toISOString().split("T")[0],
      time: scheduledTime,
      duration: `${recDurationMins} min`,
      studentsCount: attendanceCounts.present,
      thumbnailBg: "bg-gradient-to-br from-[#0A2540] via-slate-900 to-blue-950",
      topics: [moduleTopic, "Google Meet Live Session", "OOP Principles"],
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      viewsCount: 0,
      status: "Available" as const,
      expiresAt: "2026-09-24",
      meetUrl: googleMeetUrl,
      meetId: meetId,
      startTime: sessionStartTime || "09:02 AM",
      endTime: endTimeStr,
      source: "Google Meet" as const,
    };

    addRecording(newRecording);
    triggerToast("🏁 Class session ended. Google Meet recording linked to student & faculty desks.");
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
    <div className="p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      {/* ─── TOP NAVIGATION & HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/faculty/classes")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Classes
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
              {courseName}
            </h1>
            <Badge
              className={`text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                sessionState === "CLASS_IN_PROGRESS"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                  : sessionState === "CLASS_COMPLETED"
                  ? "bg-slate-100 text-slate-700 border-slate-300"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {sessionState === "CLASS_IN_PROGRESS"
                ? "CLASS IN PROGRESS"
                : sessionState === "CLASS_COMPLETED"
                ? "CLASS COMPLETED"
                : "READY TO START"}
            </Badge>

            {sessionState === "CLASS_IN_PROGRESS" && (
              <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-extrabold px-3 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Google Meet Live
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">
              {batchCode}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              {roomNo}
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {scheduledDate} • {scheduledTime}
            </span>
          </div>
        </div>

        {/* Live Class Duration Timer Card */}
        {sessionState === "CLASS_IN_PROGRESS" && (
          <div className="p-3.5 px-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Class Duration</p>
              <p className="text-xl font-mono font-black text-slate-900 leading-none mt-0.5">
                {formatTimer(secondsElapsed)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMsg && (
        <div className="p-3.5 px-4 rounded-2xl bg-blue-50 border border-blue-200 text-[#1769AA] flex items-center justify-between gap-2 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-[#1769AA] shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-blue-700 hover:text-blue-950 p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
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
          <Users className="w-4 h-4" /> Attendance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("class_session")}
          className={`py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "class_session"
              ? "border-[#1769AA] text-[#1769AA]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Class Session
          {sessionState === "CLASS_IN_PROGRESS" && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
          <Clock className="w-4 h-4" /> Session History
        </button>
      </div>

      {/* ─── MAIN 2-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT MAIN PANEL (2 COLUMNS) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: ATTENDANCE */}
          {activeTab === "attendance" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-5">
              {/* Top Banner when attendance is saved */}
              {sessionState === "ATTENDANCE_SAVED" && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-950">✓ Attendance saved successfully!</h4>
                      <p className="text-xs text-emerald-700 font-medium">You can now start the live class.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <Button
                      type="button"
                      onClick={handleStartClassWithGoogleMeet}
                      className="bg-[#1769AA] hover:bg-[#125890] text-white font-extrabold h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 fill-current" /> Start Class
                    </Button>
                    <p className="text-[10px] text-emerald-800 font-medium">
                      Your Google Meet session will open when you start the class.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Take Student Attendance</h2>
                  <p className="text-xs text-slate-500 font-medium">Mark students as Present or Absent for this scheduled class session.</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-bold px-3 py-1 w-fit">
                  {students.length} Total Students
                </Badge>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name or ID..."
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
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                    {filteredStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-7 h-7 rounded-xl border border-slate-200 shadow-2xs">
                              <AvatarImage src={st.avatar} />
                              <AvatarFallback className="bg-blue-100 text-[#1769AA] text-[10px] font-black">
                                {st.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-extrabold text-slate-900">{st.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">{st.studentId}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                            <button
                              type="button"
                              disabled={sessionState !== "ATTENDANCE_PENDING"}
                              onClick={() => handleToggleAttendance(st.id, "PRESENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                st.status === "PRESENT"
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <Check className="w-3 h-3" /> Present
                            </button>
                            <button
                              type="button"
                              disabled={sessionState !== "ATTENDANCE_PENDING"}
                              onClick={() => handleToggleAttendance(st.id, "ABSENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                st.status === "ABSENT"
                                  ? "bg-rose-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <X className="w-3 h-3" /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Attendance Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600" /> {attendanceCounts.present} Present
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                    <X className="w-4 h-4 text-rose-600" /> {attendanceCounts.absent} Absent
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <Users className="w-4 h-4 text-slate-500" /> {attendanceCounts.total} Total Students
                  </span>
                </div>

                {sessionState === "ATTENDANCE_PENDING" ? (
                  <Button
                    type="button"
                    onClick={handleSaveAttendance}
                    className="w-full sm:w-auto bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-10 px-6 rounded-xl shadow-md gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Attendance
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="w-4.5 h-4.5" /> Attendance Saved & Locked
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* TAB 2: ACTIVE CLASSROOM DASHBOARD */}
          {activeTab === "class_session" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
                    Active Classroom
                    {sessionState === "CLASS_IN_PROGRESS" ? (
                      <Badge className="bg-emerald-500 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> ● LIVE — Class in Progress
                      </Badge>
                    ) : sessionState === "CLASS_COMPLETED" ? (
                      <Badge className="bg-slate-200 text-slate-800 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                        COMPLETED
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                        READY TO START
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Topic / Module Being Taught: <strong className="text-slate-800 font-bold">{moduleTopic}</strong>
                  </p>
                </div>

                {sessionState === "CLASS_IN_PROGRESS" && (
                  <Button
                    type="button"
                    onClick={handleOpenGoogleMeet}
                    className="bg-[#00897B] hover:bg-[#00796B] text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs cursor-pointer"
                  >
                    <Video className="w-4 h-4" /> Open Google Meet
                  </Button>
                )}
              </div>

              {/* GOOGLE MEET ACTIVE CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-blue-50/80 border border-teal-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 shadow-sm flex items-center justify-center shrink-0">
                    {/* Google Meet Quad-Color Icon SVG */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 8.5V4.5C15 3.67 14.33 3 13.5 3H3.5C2.67 3 2 3.67 2 4.5V19.5C2 20.33 2.67 21 3.5 21H13.5C14.33 21 15 20.33 15 19.5V15.5L20.15 19.36C20.68 19.76 21.43 19.38 21.43 18.72V5.28C21.43 4.62 20.68 4.24 20.15 4.64L15 8.5Z" fill="#00832D"/>
                      <path d="M15 8.5L20.15 4.64C20.68 4.24 21.43 4.62 21.43 5.28V11L15 8.5Z" fill="#0066DA"/>
                      <path d="M21.43 11V18.72C21.43 19.38 20.68 19.76 20.15 19.36L15 15.5V8.5L21.43 11Z" fill="#E44134"/>
                      <path d="M15 15.5L20.15 19.36C20.68 19.76 21.43 19.38 21.43 18.72V15.5L15 15.5Z" fill="#FFBA00"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-teal-950">Live class is active</h4>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                        Connected
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Google Meet ID: <span className="font-mono font-bold text-teal-900">{meetId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyMeetLink}
                    className="h-9 text-xs font-bold rounded-xl border-teal-200 bg-white hover:bg-teal-50 text-teal-900 gap-1.5 shadow-2xs cursor-pointer"
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

              {/* Stat Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-emerald-950 leading-none">{attendanceCounts.present}</p>
                    <p className="text-[10.5px] font-bold text-emerald-700 mt-1">Present</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                    <X className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-rose-950 leading-none">{attendanceCounts.absent}</p>
                    <p className="text-[10.5px] font-bold text-rose-700 mt-1">Absent</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1769AA] text-white flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-black text-slate-900 leading-none">{formatTimer(secondsElapsed)}</p>
                    <p className="text-[10.5px] font-bold text-blue-800 mt-1">Class Duration</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none">{attendanceCounts.total}</p>
                    <p className="text-[10.5px] font-bold text-slate-600 mt-1">Total Enrolled</p>
                  </div>
                </div>
              </div>

              {/* Class Activity Timeline */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Class Activity Timeline</h3>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">09:00 AM — Class session initialized</p>
                      <p className="text-slate-500 text-[11px]">Session created for {courseName} - {batchCode} in {roomNo}.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">09:01 AM — Attendance saved</p>
                      <p className="text-slate-500 text-[11px]">{attendanceCounts.present} Present, {attendanceCounts.absent} Absent.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">09:02 AM — Google Meet session started</p>
                      <p className="text-slate-500 text-[11px]">Live meeting link: {googleMeetUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-extrabold text-slate-900">09:02 AM — Class is now live</p>
                      <p className="text-slate-500 text-[11px]">Classroom session active and live duration timer running.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Class Session Actions */}
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
            </Card>
          )}

          {/* TAB 3: SESSION HISTORY */}
          {activeTab === "session_history" && (
            <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Session History Logs</h2>
                  <p className="text-xs text-slate-500 font-medium">Historical class sessions & Google Meet meetings for {batchCode}.</p>
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
                <p className="text-[11px] font-bold text-slate-400 uppercase">Module / Topic</p>
                <p className="font-semibold text-slate-700 mt-0.5">{moduleTopic}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Faculty</p>
                <p className="font-bold text-slate-800 mt-0.5">{facultyName}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Students</p>
                <p className="font-extrabold text-slate-900 mt-0.5">{attendanceCounts.total}</p>
              </div>
            </div>
          </Card>

          {/* Card 2: After Saving Attendance (Class Start Lock Card) */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Attendance Summary (Saved)</h3>
              <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                Once attendance is saved, you can start the class.
              </p>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2 py-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-lg font-extrabold text-emerald-600 leading-none">{attendanceCounts.present}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Present</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-lg font-extrabold text-rose-600 leading-none">{attendanceCounts.absent}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Absent</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-lg font-extrabold text-slate-400 leading-none">0</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Late</p>
              </div>
            </div>

            {/* Start Class Button with Helper Text */}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleStartClassWithGoogleMeet}
                disabled={sessionState === "ATTENDANCE_PENDING" || sessionState === "CLASS_COMPLETED"}
                className={`w-full font-extrabold h-11 text-xs rounded-xl shadow-md gap-2 cursor-pointer transition-all ${
                  sessionState === "ATTENDANCE_SAVED"
                    ? "bg-[#1769AA] hover:bg-[#125890] text-white shadow-blue-500/20"
                    : sessionState === "CLASS_IN_PROGRESS"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {sessionState === "CLASS_IN_PROGRESS" ? "Class In Progress" : "▶ Start Class"}
              </Button>
              <p className="text-[10.5px] text-slate-500 text-center font-medium leading-tight">
                Your Google Meet session will open when you start the class.
              </p>
            </div>
          </Card>

          {/* Card 3: Google Meet Live Indicator Card */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Google Meet Session</h3>
            {sessionState === "CLASS_IN_PROGRESS" ? (
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" /> Meeting Active
                  </p>
                  <p className="text-[10.5px] text-teal-700 font-mono mt-0.5">
                    {meetId}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs font-semibold">
                Google Meet link is pre-configured and will launch on class start.
              </div>
            )}
          </Card>

          {/* Card 4: Class Session Actions */}
          <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Class Session Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(true)}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="text-[10.5px] font-bold text-slate-700 leading-tight">Add Class Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowViewStudentsModal(true)}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
              >
                <Users className="w-5 h-5 text-emerald-600" />
                <span className="text-[10.5px] font-bold text-slate-700 leading-tight">View Students</span>
              </button>

              <button
                type="button"
                onClick={() => triggerToast("✓ Attendance report downloaded as PDF.")}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5 text-[#1769AA]" />
                <span className="text-[10.5px] font-bold text-slate-700 leading-tight">Download Attendance</span>
              </button>
            </div>
          </Card>

          {/* Card 5: Important Guidance Box */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
            <p className="font-extrabold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Important
            </p>
            <p className="text-[11px] font-medium text-slate-700">
              Please end the class after completing the session. This will link the Google Meet recording and record session history.
            </p>
          </div>
        </div>
      </div>

      {/* ─── END CLASS CONFIRMATION MODAL ─── */}
      <Dialog open={showEndConfirmModal} onOpenChange={setShowEndConfirmModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Square className="w-5 h-5 text-rose-600 fill-current" /> End this class session?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              The Aadya Portal class session will be completed. Make sure the Google Meet session is ended.
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
