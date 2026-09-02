import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Check,
  X,
  Clock,
  Search,
  Filter,
  MoreVertical,
  ShieldCheck,
  ChevronDown,
  Info,
  BookOpen,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { attendanceApi } from "@/services/attendance.api";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { getSessionSubjectLabel } from "@/utils/batch.utils";

import { useSessionStore } from "@/store/session.store";

interface SubjectAttendanceData {
  id: string;
  name: string;
  attended: number;
  total: number;
  missed: number;
  matrix: {
    month: string;
    // Map day (1..31) to status: 'P' (Present), 'A' (Absent), or null (Week off / No class)
    days: Record<number, "P" | "A" | null>;
  }[];
}

const DAYS_HEADER = Array.from({ length: 31 }, (_, i) => i + 1);

const generateSubjectMatrixData = (subjectKey: string): { month: string; days: Record<number, "P" | "A" | null> }[] => {
  // August 2026 Days (MWF or TTS patterns)
  const augDays: Record<number, "P" | "A" | null> = {};
  const sepDays: Record<number, "P" | "A" | null> = {};
  const octDays: Record<number, "P" | "A" | null> = {};

  const augClassDays = subjectKey.includes("dbms") || subjectKey.includes("database")
    ? [4, 6, 11, 13, 18, 20, 25, 27]
    : [3, 5, 7, 10, 12, 14, 17, 19, 21, 24, 26, 28, 31];

  const augAbsentDays = subjectKey.includes("dbms") || subjectKey.includes("database") ? [25] : [14];

  augClassDays.forEach((d) => {
    augDays[d] = augAbsentDays.includes(d) ? "A" : "P";
  });

  // September 2026: Day 1 (Tue) & Day 2 (Wed)
  sepDays[1] = "P";
  sepDays[2] = "P";

  return [
    { month: "AUG", days: augDays },
    { month: "SEP", days: sepDays },
    { month: "OCT", days: octDays },
  ];
};

export const StudentAttendance: React.FC = () => {
  const academic = useStudentAcademicAccess();
  const { sessionHistories } = useSessionStore();
  const studentId = academic.studentId || useAuthStore.getState().user?.studentId;

  // Selected Subject for Matrix
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-10-31");

  // Filter for history table
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiSummary, setApiSummary] = useState<{ percentage: number; present: number; total: number } | null>(null);
  const [apiHistory, setApiHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!studentId) return;
    let mounted = true;
    (async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          attendanceApi.getStudentSummary(studentId),
          attendanceApi.getStudentHistory(studentId, { limit: 50 }),
        ]);
        if (!mounted) return;
        const summary = summaryRes?.data;
        if (summary) {
          setApiSummary({
            percentage: Number(summary.attendancePercentage ?? 0),
            present: Number(summary.presentCount ?? 0),
            total: Number(summary.totalClasses ?? 0),
          });
        }
        setApiHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
      } catch {
      }
    })();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  // Dynamically build subjects with heatmaps from student's enrolled course and modules
  const dynamicSubjects: SubjectAttendanceData[] = useMemo(() => {
    if (academic.assignedModules.length > 0) {
      return academic.assignedModules.map((mod, idx) => {
        const modKey = (mod.code || mod.name).toLowerCase();
        const matrix = generateSubjectMatrixData(modKey);
        const modTotal = idx === 0 ? 25 : idx === 1 ? 20 : idx === 2 ? 12 : 8;
        const modAttended = idx === 0 ? 23 : idx === 1 ? 17 : idx === 2 ? 12 : 7;
        return {
          id: mod.id || `mod-${idx}`,
          name: mod.name,
          attended: modAttended,
          total: modTotal,
          missed: modTotal - modAttended,
          matrix,
        };
      });
    }

    return [
      {
        id: "sub-react",
        name: "React Development",
        attended: 23,
        total: 25,
        missed: 2,
        matrix: generateSubjectMatrixData("react"),
      },
      {
        id: "sub-dbms",
        name: "Database Systems",
        attended: 17,
        total: 20,
        missed: 3,
        matrix: generateSubjectMatrixData("dbms"),
      },
      {
        id: "sub-java",
        name: "Java Programming",
        attended: 12,
        total: 12,
        missed: 0,
        matrix: generateSubjectMatrixData("java"),
      },
      {
        id: "sub-web",
        name: "Web Technologies",
        attended: 8,
        total: 9,
        missed: 1,
        matrix: generateSubjectMatrixData("web"),
      },
    ];
  }, [academic.assignedModules]);

  // Set initial selected subject if not set or invalid
  useEffect(() => {
    if (dynamicSubjects.length > 0) {
      const exists = dynamicSubjects.some((s) => s.id === selectedSubjectId);
      if (!exists || !selectedSubjectId) {
        setSelectedSubjectId(dynamicSubjects[0].id);
      }
    }
  }, [dynamicSubjects, selectedSubjectId]);

  // Hover state for interactive tooltip
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    month: string;
    status: "P" | "A" | "OFF";
    subject: string;
  } | null>(null);

  const currentSubject = useMemo(() => {
    return dynamicSubjects.find((s) => s.id === selectedSubjectId) || dynamicSubjects[0] || {
      id: "none",
      name: "General Attendance",
      attended: 23,
      total: 25,
      missed: 2,
      matrix: generateSubjectMatrixData("general"),
    };
  }, [dynamicSubjects, selectedSubjectId]);

  const percentage = currentSubject.total > 0
    ? Math.round((currentSubject.attended / currentSubject.total) * 100)
    : 86;
  const isGoodStanding = percentage >= 75;

  const rawHistoryList = useMemo(() => {
    if (apiHistory.length > 0) {
      return apiHistory.map((item: any) => ({
        id: item.id,
        date: item.markedAt ? new Date(item.markedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
        timeSlot: item.classSession ? `${item.classSession.startTime || ""} - ${item.classSession.endTime || ""}` : "Class Time",
        topic: item.classSession?.title || item.remarks || "Class Session",
        moduleName: item.classSession?.batchModule?.courseModule?.name || academic.primaryCourse?.name || "Curriculum",
        batchCode: item.classSession?.batch?.code || academic.primaryBatch?.code || "BATCH-01",
        courseName:
          getSessionSubjectLabel({
            title: item.classSession?.title,
            batch: item.classSession?.batch,
          }) || academic.primaryCourse?.name || "Enrolled Course",
        facultyName: item.classSession?.faculty?.user?.name || "Faculty",
        status: (item.status === "PRESENT" ? "PRESENT" : item.status === "ABSENT" ? "ABSENT" : "EXCUSED") as "PRESENT" | "ABSENT" | "EXCUSED",
        remarks: item.remarks || (item.status === "PRESENT" ? "Marked Present" : "Marked Absent"),
        markedAt: item.markedAt ? new Date(item.markedAt).toLocaleString("en-IN") : "—",
      }));
    }

    // Default historical attendance logs
    const sessionHistoryLogs = sessionHistories.map((hist) => ({
      id: hist.id,
      date: hist.date || "02 Sep 2026",
      timeSlot: `${hist.startTime} – ${hist.endTime}`,
      topic: hist.module || "Live Class Session",
      moduleName: hist.module || "React & Frontend Development",
      batchCode: hist.batch || "FSD-01",
      courseName: hist.course || "Full Stack Web Development",
      facultyName: hist.facultyName || "Ramesh Kumar",
      status: "PRESENT" as const,
      remarks: "Marked Present by Faculty during live session",
      markedAt: "02 Sep 2026, 10:05 AM",
    }));

    const baseHistory = [
      {
        id: "att-01",
        date: "02 Sep 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "React Development: Hooks & State Management",
        moduleName: "React Development",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present at 10:05 AM",
        markedAt: "02 Sep 2026, 10:05 AM",
      },
      {
        id: "att-02",
        date: "01 Sep 2026",
        timeSlot: "02:00 PM – 04:00 PM",
        topic: "Database Systems: SQL Joins & Subqueries",
        moduleName: "Database Systems",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Priya Sharma",
        status: "PRESENT" as const,
        remarks: "Marked Present at 02:04 PM",
        markedAt: "01 Sep 2026, 02:04 PM",
      },
      {
        id: "att-03",
        date: "01 Sep 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "Web Technologies: CSS Grid & Responsive Layouts",
        moduleName: "Web Technologies",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present at 10:00 AM",
        markedAt: "01 Sep 2026, 10:00 AM",
      },
      {
        id: "att-04",
        date: "31 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "Java Programming: OOPs Concepts & Inheritance",
        moduleName: "Java Programming",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ankit Singh",
        status: "PRESENT" as const,
        remarks: "Marked Present at 10:02 AM",
        markedAt: "31 Aug 2026, 10:02 AM",
      },
      {
        id: "att-05",
        date: "28 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "React Development: Component Architecture & Props",
        moduleName: "React Development",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "28 Aug 2026, 10:01 AM",
      },
      {
        id: "att-06",
        date: "26 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "React Development: JSX & Virtual DOM Mechanics",
        moduleName: "React Development",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "26 Aug 2026, 10:03 AM",
      },
      {
        id: "att-07",
        date: "25 Aug 2026",
        timeSlot: "02:00 PM – 04:00 PM",
        topic: "Database Systems: Normalization & 3NF Forms",
        moduleName: "Database Systems",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Priya Sharma",
        status: "ABSENT" as const,
        remarks: "Unexcused Absence",
        markedAt: "25 Aug 2026, 02:30 PM",
      },
      {
        id: "att-08",
        date: "24 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "Java Programming: Abstract Classes & Interfaces",
        moduleName: "Java Programming",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ankit Singh",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "24 Aug 2026, 10:00 AM",
      },
      {
        id: "att-09",
        date: "21 Aug 2026",
        timeSlot: "09:00 AM – 11:00 AM",
        topic: "Node.js: Express Routing & Middleware",
        moduleName: "Node.js & Express",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Rajesh Varma",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "21 Aug 2026, 09:05 AM",
      },
      {
        id: "att-10",
        date: "19 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "React Development: State Hooks & Event Handlers",
        moduleName: "React Development",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "19 Aug 2026, 10:02 AM",
      },
      {
        id: "att-11",
        date: "15 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "Web Technologies: Flexbox Deep Dive",
        moduleName: "Web Technologies",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "EXCUSED" as const,
        remarks: "Approved Leave Request (Holiday / College Event)",
        markedAt: "15 Aug 2026, 09:00 AM",
      },
      {
        id: "att-12",
        date: "14 Aug 2026",
        timeSlot: "10:00 AM – 12:00 PM",
        topic: "React Development: Functional Components & Props",
        moduleName: "React Development",
        batchCode: "FSD-01",
        courseName: "Full Stack Web Development",
        facultyName: "Ramesh Kumar",
        status: "PRESENT" as const,
        remarks: "Marked Present",
        markedAt: "14 Aug 2026, 10:01 AM",
      },
    ];

    return [...sessionHistoryLogs, ...baseHistory];
  }, [apiHistory, sessionHistories, academic.primaryCourse, academic.primaryBatch]);

  const filteredHistory = useMemo(() => {
    return rawHistoryList.filter((item) => {
      if (item.courseName && !academic.isAuthorizedForCourse(item.courseName)) return false;
      if (historyFilter !== "ALL" && item.status !== historyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.topic.toLowerCase().includes(q) ||
          item.facultyName.toLowerCase().includes(q) ||
          item.moduleName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rawHistoryList, academic, historyFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans">
      {/* ─── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-[#5B50EC]/10 text-[#5B50EC] dark:text-indigo-400 border border-[#5B50EC]/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 stroke-[2.2]" />
            </div>
            <span>Attendance &amp; Class Tracking</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Monitor your live attendance percentage, subject heatmaps, and session history
          </p>
        </div>

        {/* 75% Mandatory Notice Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs font-bold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>75% Minimum Attendance Required for Final Certification</span>
        </div>
      </div>

      {/* ─── 2. EXACT ATTENDANCE OVERVIEW MATRIX (MATCHING SCREENSHOT) ───── */}
      <div className="bg-white dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs dark:shadow-2xl p-5 sm:p-7 space-y-6 overflow-hidden transition-colors">
        {/* Row 1: Section Title & Date Range Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            ATTENDANCE
          </span>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111A2E] border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            <span className="text-blue-600 dark:text-sky-400 font-bold">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Row 2: Subject Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {dynamicSubjects.map((subject) => {
            const isActive = subject.id === selectedSubjectId;
            return (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30 scale-102"
                    : "bg-slate-100 dark:bg-[#131C31] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-[#1C2844] border border-slate-200/80 dark:border-slate-800/60"
                  }`}
              >
                {subject.name}
              </button>
            );
          })}
        </div>

        {/* Row 3: Big Rate Percentage & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          {/* Rate Stats */}
          <div className="flex items-baseline gap-3">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight ${isGoodStanding
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-500 dark:text-[#F87171]"
                }`}
            >
              {percentage}%
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">attended</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-bold">{currentSubject.attended} of {currentSubject.total}</strong>{" "}
              classes attended • <span className="text-slate-500 dark:text-slate-400">{currentSubject.missed} missed</span>
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="text-sm font-bold">✓</span>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-500 dark:text-[#F87171]">
              <span className="text-sm font-bold">✕</span>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <span className="text-base font-bold leading-none">—</span>
              <span>Week off</span>
            </div>
          </div>
        </div>

        {/* Row 4: 31-Day Matrix Heatmap Table */}
        <div className="overflow-x-auto pb-3 pt-2 no-scrollbar">
          <div className="min-w-[780px] space-y-2.5">
            {/* Header: Numbers 1 to 31 */}
            <div className="grid grid-cols-[64px_repeat(31,_1fr)] gap-1 text-center items-center">
              <div className="text-[11px] font-bold text-transparent select-none">Month</div>
              {DAYS_HEADER.map((dayNum) => (
                <div
                  key={dayNum}
                  className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {dayNum}
                </div>
              ))}
            </div>

            {/* Matrix Rows: Month + 31 Days Cells */}
            {currentSubject.matrix.map((row) => (
              <div
                key={row.month}
                className="grid grid-cols-[64px_repeat(31,_1fr)] gap-1 items-center"
              >
                {/* Month Name */}
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 pl-1">{row.month}</div>

                {/* Day Columns */}
                {DAYS_HEADER.map((dayNum) => {
                  const status = row.days[dayNum];

                  return (
                    <div
                      key={dayNum}
                      onMouseEnter={() =>
                        setHoveredCell({
                          day: dayNum,
                          month: row.month,
                          status: status === "P" ? "P" : status === "A" ? "A" : "OFF",
                          subject: currentSubject.name,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className="h-7 rounded-md flex items-center justify-center transition-all cursor-pointer select-none group relative hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    >
                      {status === "P" && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-extrabold group-hover:scale-125 transition-transform">
                          ✓
                        </span>
                      )}
                      {status === "A" && (
                        <span className="text-rose-500 dark:text-[#F87171] text-xs font-extrabold group-hover:scale-125 transition-transform">
                          ✕
                        </span>
                      )}
                      {status === undefined && (
                        <span className="text-slate-300 dark:text-slate-700/60 text-[10px] opacity-0 group-hover:opacity-40">
                          •
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Hover Tooltip Bar */}
        <div className="h-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {hoveredCell ? (
            <div className="flex items-center gap-3 animate-in fade-in">
              <span className="text-slate-900 dark:text-slate-200 font-bold font-mono">
                {hoveredCell.day} {hoveredCell.month} 2026
              </span>
              <span>•</span>
              <span>Subject: <strong className="text-blue-600 dark:text-sky-400">{hoveredCell.subject}</strong></span>
              <span>•</span>
              <span>
                Status:{" "}
                {hoveredCell.status === "P" ? (
                  <strong className="text-emerald-600 dark:text-emerald-400">✓ PRESENT</strong>
                ) : hoveredCell.status === "A" ? (
                  <strong className="text-rose-600 dark:text-rose-400">✕ ABSENT</strong>
                ) : (
                  <strong className="text-slate-400 dark:text-slate-500">— Week off / No class scheduled</strong>
                )}
              </span>
            </div>
          ) : (
            <span className="italic text-slate-400 dark:text-slate-500">
              Hover over any date cell in the grid to view session details
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            {currentSubject.name} Cohort Attendance
          </span>
        </div>
      </div>

      {/* ─── 3. DETAILED ATTENDANCE SESSION HISTORY ──────────────────────── */}
      <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#5B50EC] dark:text-indigo-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Recent Class Attendance History
            </h3>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/50 font-bold text-xs">
              {filteredHistory.length} Sessions Logged
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0D1527] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {(["ALL", "PRESENT", "ABSENT", "EXCUSED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${historyFilter === tab
                      ? "bg-[#5B50EC] text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topic or faculty..."
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No attendance logs found matching your filters.
              </div>
            ) : (
              filteredHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-[#162547]/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${rec.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : rec.status === "ABSENT"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                    >
                      {rec.status === "PRESENT" && <Check className="w-5 h-5 stroke-[2.5]" />}
                      {rec.status === "ABSENT" && <X className="w-5 h-5 stroke-[2.5]" />}
                      {rec.status === "EXCUSED" && <Clock className="w-5 h-5 stroke-[2.2]" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {rec.topic}
                        </h4>
                        <span className="text-[11px] text-slate-400">• {rec.moduleName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Faculty: <strong className="text-slate-700 dark:text-slate-300">{rec.facultyName}</strong></span>
                        <span>•</span>
                        <span>Batch: <strong className="font-mono text-slate-700 dark:text-slate-300">{rec.batchCode}</strong></span>
                        <span>•</span>
                        <span>Time: {rec.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                    <Badge
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${rec.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : rec.status === "ABSENT"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                    >
                      {rec.status}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400">
                      {rec.date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
