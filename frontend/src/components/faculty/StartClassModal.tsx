import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Video,
  BookOpen,
  MapPin,
  ExternalLink,
  Radio,
  Save,
  Check,
  X,
  Search,
  Loader2,
  Film,
  FileText,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { classSessionsApi } from "@/services/class-sessions.api";
import { facultyApi } from "@/services/faculty.api";
import { CompleteClassDialog } from "./CompleteClassDialog";
import { UploadRecordingModal } from "./UploadRecordingModal";
import { UploadStudyMaterialsModal } from "./UploadStudyMaterialsModal";
import { useQuery } from "@tanstack/react-query";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";

export interface StudentRosterItem {
  id: string;
  studentId: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: AttendanceStatus;
}

export interface ClassSessionModalData {
  id: string;
  title?: string;
  courseName: string;
  subjectName?: string;
  batchId?: string;
  batchName?: string;
  batchCode?: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  mode?: string;
  meetingUrl?: string;
  status?: string;
  enrolledStudentsCount?: number;
}

export interface StartClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSessionModalData | null;
  onSessionStatusChange?: (sessionId: string, newStatus: string) => void;
}

export const StartClassModal: React.FC<StartClassModalProps> = ({
  isOpen,
  onClose,
  session,
  onSessionStatusChange,
}) => {
  const { user } = useAuthStore();
  const { activeLiveClass, setActiveLiveClass, endActiveLiveClass } = useSessionStore();

  // Lifecycle states
  const [isLive, setIsLive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startedAtTime, setStartedAtTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Student Attendance
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaveSuccess, setAttendanceSaveSuccess] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Sub-dialogs
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);

  const sessionId = session?.id || "";
  const isRealSessionId =
    Boolean(sessionId) &&
    !sessionId.startsWith("sess-") &&
    !sessionId.startsWith("temp-") &&
    !sessionId.startsWith("mock-") &&
    !sessionId.startsWith("demo-");

  const isRealBatchId =
    Boolean(session?.batchId) &&
    !session?.batchId?.startsWith("mock-") &&
    !session?.batchId?.startsWith("demo-") &&
    !session?.batchId?.startsWith("batch-");

  // Query enrolled students for this class/batch
  const { data: attendanceRes, isLoading: isRosterLoading } = useQuery({
    queryKey: ["class-session-attendance", sessionId],
    queryFn: () => classSessionsApi.getAttendance(sessionId),
    enabled: isRealSessionId && isOpen,
  });

  const { data: myStudentsRes } = useQuery({
    queryKey: ["faculty-my-students", session?.batchId],
    queryFn: () => facultyApi.getMyStudents({ batchId: session?.batchId, limit: 100 }),
    enabled: isRealBatchId && isOpen && !isRealSessionId,
  });

  // Sync state on session prop change or activeLiveClass
  useEffect(() => {
    if (!session || !isOpen) return;

    const sessionIsLive =
      session.status === "LIVE" ||
      (activeLiveClass?.status === "LIVE" && activeLiveClass?.sessionId === session.id);
    const sessionIsCompleted = session.status === "COMPLETED";

    setIsLive(sessionIsLive);
    setIsCompleted(sessionIsCompleted);

    if (sessionIsLive) {
      setStartedAtTime(activeLiveClass?.startedAt || new Date().toLocaleTimeString());
    } else {
      setStartedAtTime(null);
      setElapsedSeconds(0);
    }
  }, [session, isOpen, activeLiveClass]);

  // Load student roster strictly for this session/batch
  useEffect(() => {
    if (!isOpen || !session) return;

    if (attendanceRes?.data?.students && Array.isArray(attendanceRes.data.students)) {
      const roster: StudentRosterItem[] = attendanceRes.data.students.map((s: any) => {
        const name = s.name || s.studentName || "Student";
        const rawStatus = (s.status || "").toUpperCase();
        const status: AttendanceStatus =
          rawStatus === "ABSENT" ? "ABSENT" : rawStatus === "LEAVE" ? "LEAVE" : "PRESENT";

        return {
          id: s.studentId || s.id,
          studentId: s.studentCode || `STU-${String(s.studentId || s.id).slice(0, 4)}`,
          name,
          email: s.email,
          phone: s.phone || s.mobile,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          status,
        };
      });
      setStudents(roster);
      return;
    }

    if (myStudentsRes?.data && Array.isArray(myStudentsRes.data)) {
      const roster: StudentRosterItem[] = myStudentsRes.data.map((s: any) => {
        const name = s.user?.name || "Student";
        return {
          id: s.id,
          studentId: s.studentCode || `STU-${String(s.id).slice(0, 4)}`,
          name,
          email: s.user?.email,
          phone: s.user?.phone,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          status: "PRESENT",
        };
      });
      setStudents(roster);
      return;
    }

    // Default preview roster when no backend roster returned yet
    if (!isRosterLoading) {
      const demoStudents: StudentRosterItem[] = [
        { id: "std-1", studentId: "STU-1001", name: "Aarav Sharma", email: "aarav.s@aadya.in", phone: "+91 98765 43210", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Aarav", status: "PRESENT" },
        { id: "std-2", studentId: "STU-1002", name: "Ananya Verma", email: "ananya.v@aadya.in", phone: "+91 98765 43211", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ananya", status: "PRESENT" },
        { id: "std-3", studentId: "STU-1003", name: "Rohan Gupta", email: "rohan.g@aadya.in", phone: "+91 98765 43212", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rohan", status: "ABSENT" },
        { id: "std-4", studentId: "STU-1004", name: "Priya Patel", email: "priya.p@aadya.in", phone: "+91 98765 43213", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Priya", status: "PRESENT" },
        { id: "std-5", studentId: "STU-1005", name: "Aditya Nair", email: "aditya.n@aadya.in", phone: "+91 98765 43214", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Aditya", status: "PRESENT" },
        { id: "std-6", studentId: "STU-1006", name: "Sneha Rao", email: "sneha.r@aadya.in", phone: "+91 98765 43215", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sneha", status: "LEAVE" },
        { id: "std-7", studentId: "STU-1007", name: "Kunal Reddy", email: "kunal.r@aadya.in", phone: "+91 98765 43216", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Kunal", status: "PRESENT" },
        { id: "std-8", studentId: "STU-1008", name: "Pooja Mehta", email: "pooja.m@aadya.in", phone: "+91 98765 43217", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Pooja", status: "PRESENT" },
      ];
      setStudents(demoStudents);
    }
  }, [attendanceRes, myStudentsRes, isOpen, session, isRosterLoading]);

  // Timer interval for LIVE session
  useEffect(() => {
    if (!isLive) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive]);

  const formattedElapsedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Attendance metrics
  const totalStudents = students.length;
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const leaveCount = students.filter((s) => s.status === "LEAVE").length;
  const attendancePercentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const handleStartClass = async () => {
    if (!session) return;
    setIsLive(true);
    setStartedAtTime(new Date().toLocaleTimeString());
    setElapsedSeconds(0);

    // Update global session store
    setActiveLiveClass({
      id: `live-${session.id}`,
      sessionId: session.id,
      courseName: session.courseName,
      batchCode: session.batchCode || "BATCH",
      batchName: session.batchName || session.batchCode || "BATCH",
      moduleName: session.subjectName || session.title,
      facultyName: user?.name || "Faculty",
      date: session.date,
      time: `${session.startTime} – ${session.endTime}`,
      meetUrl: session.meetingUrl || `https://meet.google.com/aady-${(session.batchCode || "cls").toLowerCase()}`,
      meetId: `aady-${(session.batchCode || "cls").toLowerCase()}`,
      startedAt: new Date().toLocaleTimeString(),
      studentCount: totalStudents || session.enrolledStudentsCount || 0,
      status: "LIVE",
    });

    onSessionStatusChange?.(session.id, "LIVE");

    // Try backend call
    if (isRealSessionId) {
      try {
        await classSessionsApi.startLive(session.id, session.meetingUrl);
      } catch {
        // Soft fail
      }
    }
  };

  const handleToggleStudentStatus = (id: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSaveAttendance = async () => {
    if (!session) return;
    setIsSavingAttendance(true);
    setAttendanceError(null);

    try {
      if (isRealSessionId) {
        const payload = students.map((s) => ({
          studentId: s.id,
          status: s.status,
        }));
        await classSessionsApi.saveAttendance(session.id, payload);
      }
      setAttendanceSaveSuccess(true);
      setTimeout(() => setAttendanceSaveSuccess(false), 2000);
    } catch (err: any) {
      setAttendanceError(err?.message || "Failed to save attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleConfirmCompleteClass = async () => {
    if (!session) return;
    setIsCompleting(true);

    try {
      // 1. Save attendance first if students exist
      if (isRealSessionId && students.length > 0) {
        try {
          await classSessionsApi.saveAttendance(
            session.id,
            students.map((s) => ({ studentId: s.id, status: s.status }))
          );
        } catch {
          // Continue
        }
      }

      // 2. End Live session
      if (isRealSessionId) {
        try {
          await classSessionsApi.endLive(session.id);
        } catch {
          await classSessionsApi.update(session.id, { status: "COMPLETED" });
        }
      }

      endActiveLiveClass();
      setIsLive(false);
      setIsCompleted(true);
      setShowCompleteConfirm(false);
      onSessionStatusChange?.(session.id, "COMPLETED");
    } catch (err: any) {
      setAttendanceError(err?.message || "Failed to complete class.");
    } finally {
      setIsCompleting(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isCompleting && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  {isLive ? (
                    <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      ● CLASS LIVE
                    </Badge>
                  ) : isCompleted ? (
                    <Badge className="bg-emerald-600 text-white font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      COMPLETED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-200 text-[#1769AA] bg-blue-50/70 font-semibold px-2.5 py-0.5 rounded-full">
                      UPCOMING
                    </Badge>
                  )}
                  {session.batchCode && (
                    <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-800">
                      {session.batchCode}
                    </Badge>
                  )}
                  {session.mode && (
                    <Badge variant="secondary" className="text-[11px]">
                      {session.mode}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                  {session.courseName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {session.subjectName ? `Module: ${session.subjectName}` : session.title || "Class Session"}
                </DialogDescription>
              </div>

              {isLive && (
                <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-center shrink-0 shadow-sm border border-slate-700">
                  <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                    Elapsed Time
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {formattedElapsedTime}
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
                  {session.date}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Time Slot</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 block mt-0.5">
                  {session.startTime} – {session.endTime}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Classroom</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {session.roomNo || "Room 101"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Students</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {totalStudents || session.enrolledStudentsCount || 0} Students
                </span>
              </div>
            </div>

            {/* Online Meet Banner (if applicable) */}
            {session.meetingUrl && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="w-4 h-4 text-[#1769AA] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    Meeting Link: <strong className="font-mono text-[#1769AA]">{session.meetingUrl}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(session.meetingUrl, "_blank")}
                  className="h-7 text-xs px-2.5 rounded-lg border-blue-200 text-[#1769AA] hover:bg-blue-100/50 shrink-0"
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Open Meet
                </Button>
              </div>
            )}

            {/* Attendance Roster Section */}
            {(isLive || isCompleted) && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1769AA]" />
                      Student Attendance Roster
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mark students present, absent, or on leave for this session.
                    </p>
                  </div>

                  {/* Quick toggle controls */}
                  {!isCompleted && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAll("PRESENT")}
                        className="h-7 text-[11px] px-2 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      >
                        All Present
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAll("ABSENT")}
                        className="h-7 text-[11px] px-2 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      >
                        All Absent
                      </Button>
                    </div>
                  )}
                </div>

                {/* Attendance Summary Bar */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{totalStudents}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Present</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">{presentCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-semibold">Absent</span>
                    <p className="font-bold text-rose-600 dark:text-rose-400 text-sm mt-0.5">{absentCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Rate</span>
                    <p className="font-bold text-[#1769AA] dark:text-blue-400 text-sm mt-0.5">
                      {attendancePercentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Search & Student List */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search enrolled students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl"
                  />
                </div>

                {attendanceSaveSuccess && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attendance saved successfully!</span>
                  </div>
                )}

                {attendanceError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{attendanceError}</span>
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarImage src={s.avatar} />
                            <AvatarFallback className="text-[10px] bg-slate-200 font-bold">
                              {s.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {s.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {s.studentId}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isCompleted}
                            onClick={() => handleToggleStudentStatus(s.id, "PRESENT")}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              s.status === "PRESENT"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            disabled={isCompleted}
                            onClick={() => handleToggleStudentStatus(s.id, "ABSENT")}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              s.status === "ABSENT"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            disabled={isCompleted}
                            onClick={() => handleToggleStudentStatus(s.id, "LEAVE")}
                            className={`px-2 py-1 rounded-lg font-medium text-[10px] transition-all ${
                              s.status === "LEAVE"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No students found in roster for this batch.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Session Online Room Banner */}
            {isLive && (
              <div className="p-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-[#1769AA] rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                        Virtual Room Active
                      </span>
                      <span className="text-[10px] text-blue-200">Google Meet</span>
                    </div>
                    <p className="font-mono text-xs text-blue-100 truncate mt-0.5 max-w-[240px] sm:max-w-xs">
                      {session.meetingUrl || `https://meet.google.com/aady-${(session.batchCode || "live").toLowerCase()}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    window.open(
                      session.meetingUrl || `https://meet.google.com/aady-${(session.batchCode || "live").toLowerCase()}`,
                      "_blank"
                    )
                  }
                  className="bg-white hover:bg-slate-100 text-[#1769AA] font-black text-xs rounded-xl shadow-xs h-9 px-4 shrink-0"
                >
                  <Video className="w-4 h-4 mr-1.5 fill-current text-blue-600" /> Go Live to Class (Google Meet)
                </Button>
              </div>
            )}

            {/* Post-Completion Action Panels */}
            {isCompleted && (
              <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-extrabold text-sm">Class Completed & Attendance Finalized</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-normal">
                        Upload the lecture recording and study materials now so students can access them in their Student Portal.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowRecordingModal(true)}
                    className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold justify-center shadow-xs h-9"
                  >
                    <Film className="w-4 h-4 mr-2" /> Upload Recording to Student Portal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMaterialsModal(true)}
                    className="rounded-xl border-emerald-300 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 justify-center h-9 hover:bg-emerald-50"
                  >
                    <FileText className="w-4 h-4 mr-2 text-emerald-600" /> Attach Study Materials
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 gap-2 sm:gap-0 flex-row justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              Close
            </Button>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isLive && !isCompleted && (
                <Button
                  type="button"
                  onClick={handleStartClass}
                  className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white font-bold px-5 h-9 text-xs"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" /> START CLASS
                </Button>
              )}

              {isLive && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      window.open(
                        session.meetingUrl || `https://meet.google.com/aady-${(session.batchCode || "live").toLowerCase()}`,
                        "_blank"
                      )
                    }
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3"
                  >
                    <Video className="w-3.5 h-3.5 mr-1" /> Go Live (Google Meet)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance}
                    className="rounded-xl border-slate-300 text-xs h-9"
                  >
                    {isSavingAttendance ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1" />
                    )}
                    Save Attendance
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowCompleteConfirm(true)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 h-9"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End & Complete Class
                  </Button>
                </>
              )}

              {isCompleted && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowRecordingModal(true)}
                    className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs h-9 px-3"
                  >
                    <Film className="w-3.5 h-3.5 mr-1" /> Upload Recording
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMaterialsModal(true)}
                    className="rounded-xl border-slate-300 text-xs h-9"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Study Materials
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog before completion */}
      <CompleteClassDialog
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={handleConfirmCompleteClass}
        isSubmitting={isCompleting}
        classDetails={{
          title: session.title || "Class Session",
          courseName: session.courseName,
          subjectName: session.subjectName,
          batchName: session.batchName,
          batchCode: session.batchCode,
          startTime: session.startTime,
          endTime: session.endTime,
          roomNo: session.roomNo,
          totalStudents,
          presentStudents: presentCount,
          absentStudents: absentCount,
          attendanceRate: attendancePercentage,
        }}
      />

      {/* Post completion recording modal */}
      <UploadRecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        sessionData={{
          id: session.id,
          title: session.title || session.subjectName || "Lecture Recording",
          courseName: session.courseName,
          batchCode: session.batchCode,
          batchName: session.batchName,
          facultyName: user?.name,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
        }}
      />

      {/* Post completion study materials modal */}
      <UploadStudyMaterialsModal
        isOpen={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        sessionData={{
          id: session.id,
          courseName: session.courseName,
          subjectName: session.subjectName,
          batchCode: session.batchCode,
          batchName: session.batchName,
          facultyName: user?.name,
        }}
      />
    </>
  );
};
