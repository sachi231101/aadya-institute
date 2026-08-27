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

// Multi-subject Attendance matrix datasets matching the exact layout in the screenshot
const SUBJECTS_DATA: SubjectAttendanceData[] = [
  {
    id: "core-java",
    name: "Core Java",
    attended: 34,
    total: 72,
    missed: 38,
    matrix: [
      {
        month: "Jun",
        days: {
          15: "A", 16: "A", 17: "A", 18: "P", 19: "P", 24: "P", 25: "A", 26: "P", 27: "P", 28: "P", 30: "A",
        },
      },
      {
        month: "July",
        days: {
          1: "P", 2: "A", 3: "A", 4: "A", 7: "P", 8: "A", 10: "P", 11: "P",
          14: "P", 15: "P", 16: "P", 17: "P", 18: "P", 19: "P", 22: "A", 23: "P",
          24: "P", 25: "P", 26: "P", 29: "P", 30: "P", 31: "P",
        },
      },
      {
        month: "Aug",
        days: {
          1: "P", 5: "P", 7: "P", 8: "A", 11: "A", 12: "A", 14: "P",
          18: "A", 19: "P", 20: "P", 21: "P", 25: "A", 26: "P", 28: "P", 29: "A", 30: "A",
        },
      },
      {
        month: "Sep",
        days: {
          1: "P", 2: "P", 3: "A", 4: "A", 5: "A", 8: "P", 9: "A", 10: "A", 11: "A", 12: "A",
          15: "A", 16: "A", 17: "A", 18: "A", 19: "A", 22: "A", 23: "A", 24: "A", 25: "A", 26: "A",
          29: "A", 30: "A", 31: "A",
        },
      },
      {
        month: "Oct",
        days: {
          3: "A", 4: "A",
        },
      },
    ],
  },
  {
    id: "programming",
    name: "Programming",
    attended: 48,
    total: 60,
    missed: 12,
    matrix: [
      {
        month: "Jun",
        days: { 10: "P", 11: "P", 12: "P", 15: "P", 16: "P", 18: "P", 19: "P", 24: "P", 25: "P", 26: "P" },
      },
      {
        month: "July",
        days: { 1: "P", 2: "P", 3: "P", 4: "P", 7: "P", 8: "P", 10: "P", 11: "P", 14: "P", 15: "P", 16: "P", 22: "A", 23: "P", 24: "P", 25: "P" },
      },
      {
        month: "Aug",
        days: { 1: "P", 5: "P", 7: "P", 8: "P", 11: "P", 12: "P", 14: "P", 18: "A", 19: "P", 20: "P", 21: "P" },
      },
      {
        month: "Sep",
        days: { 1: "P", 2: "P", 3: "P", 4: "P", 8: "P", 9: "A", 10: "A", 15: "P", 16: "P", 17: "P" },
      },
      {
        month: "Oct",
        days: { 1: "P", 2: "P", 3: "P" },
      },
    ],
  },
  {
    id: "sql",
    name: "SQL",
    attended: 38,
    total: 45,
    missed: 7,
    matrix: [
      {
        month: "Jun",
        days: { 14: "P", 15: "P", 16: "P", 20: "P", 21: "P", 22: "P", 27: "P", 28: "P" },
      },
      {
        month: "July",
        days: { 2: "P", 3: "P", 5: "P", 9: "P", 10: "P", 12: "P", 16: "P", 17: "P", 23: "A", 24: "P", 30: "P" },
      },
      {
        month: "Aug",
        days: { 3: "P", 4: "P", 6: "P", 10: "P", 11: "P", 13: "P", 17: "P", 18: "P", 24: "A", 25: "P" },
      },
      {
        month: "Sep",
        days: { 1: "P", 2: "P", 7: "P", 8: "A", 14: "P", 15: "P", 21: "P", 22: "A" },
      },
      {
        month: "Oct",
        days: { 2: "P", 5: "P" },
      },
    ],
  },
  {
    id: "adv-java",
    name: "Advanced Java",
    attended: 28,
    total: 40,
    missed: 12,
    matrix: [
      {
        month: "July",
        days: { 10: "P", 11: "P", 14: "P", 15: "P", 17: "P", 18: "P", 24: "P", 25: "P" },
      },
      {
        month: "Aug",
        days: { 1: "P", 5: "P", 7: "P", 8: "A", 12: "P", 14: "P", 19: "P", 20: "A", 26: "P" },
      },
      {
        month: "Sep",
        days: { 2: "P", 3: "A", 8: "P", 9: "A", 10: "A", 16: "P", 17: "P", 23: "A", 24: "P" },
      },
      {
        month: "Oct",
        days: { 1: "P", 3: "A" },
      },
    ],
  },
  {
    id: "soft-skills",
    name: "Soft Skills",
    attended: 20,
    total: 22,
    missed: 2,
    matrix: [
      {
        month: "Jun",
        days: { 18: "P", 25: "P" },
      },
      {
        month: "July",
        days: { 2: "P", 9: "P", 16: "P", 23: "P", 30: "P" },
      },
      {
        month: "Aug",
        days: { 6: "P", 13: "P", 20: "P", 27: "A" },
      },
      {
        month: "Sep",
        days: { 3: "P", 10: "P", 17: "P", 24: "P" },
      },
      {
        month: "Oct",
        days: { 1: "P" },
      },
    ],
  },
  {
    id: "html-css",
    name: "HTML & CSS",
    attended: 30,
    total: 32,
    missed: 2,
    matrix: [
      {
        month: "Jun",
        days: { 1: "P", 2: "P", 3: "P", 4: "P", 5: "P", 8: "P", 9: "P", 10: "P" },
      },
      {
        month: "July",
        days: { 1: "P", 2: "P", 6: "P", 7: "P", 8: "P", 9: "P", 13: "P", 14: "P" },
      },
      {
        month: "Aug",
        days: { 3: "P", 4: "P", 5: "P", 10: "P", 11: "A" },
      },
    ],
  },
  {
    id: "python",
    name: "Python",
    attended: 24,
    total: 30,
    missed: 6,
    matrix: [
      {
        month: "July",
        days: { 15: "P", 16: "P", 22: "P", 23: "P", 29: "P", 30: "P" },
      },
      {
        month: "Aug",
        days: { 5: "P", 6: "P", 12: "P", 13: "A", 19: "P", 20: "P", 26: "P", 27: "P" },
      },
      {
        month: "Sep",
        days: { 2: "P", 3: "P", 9: "A", 10: "A", 16: "P", 17: "P", 23: "P", 24: "P" },
      },
      {
        month: "Oct",
        days: { 1: "A", 2: "P" },
      },
    ],
  },
];

interface AttendanceRecord {
  id: string;
  date: string;
  timeSlot: string;
  topic: string;
  moduleName: string;
  batchCode: string;
  courseName: string;
  facultyName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
  remarks: string;
  markedAt: string;
}

const ATTENDANCE_HISTORY_DATA: AttendanceRecord[] = [
  {
    id: "att-1",
    date: "27 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "React Hooks, Context API & State Management",
    moduleName: "Frontend Development",
    batchCode: "FSD-01",
    courseName: "Full Stack Web Development",
    facultyName: "Dr. Vikram Seth",
    status: "PRESENT",
    remarks: "Active in live coding lab",
    markedAt: "27 Aug 2026, 11:05 AM",
  },
  {
    id: "att-2",
    date: "25 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "Component Lifecycle & Custom Hooks",
    moduleName: "Frontend Development",
    batchCode: "FSD-01",
    courseName: "Full Stack Web Development",
    facultyName: "Dr. Vikram Seth",
    status: "PRESENT",
    remarks: "Submitted exercise on time",
    markedAt: "25 Aug 2026, 11:02 AM",
  },
  {
    id: "att-3",
    date: "22 Aug 2026",
    timeSlot: "02:00 PM – 03:30 PM",
    topic: "Database Indexing & Complex Joins in PostgreSQL",
    moduleName: "Database Systems",
    batchCode: "FSD-01",
    courseName: "Full Stack Web Development",
    facultyName: "Ananya Iyer",
    status: "ABSENT",
    remarks: "Consecutive Absence #1",
    markedAt: "22 Aug 2026, 03:35 PM",
  },
  {
    id: "att-4",
    date: "20 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "Node.js Architecture & Express Routing",
    moduleName: "Backend Architecture",
    batchCode: "FSD-01",
    courseName: "Full Stack Web Development",
    facultyName: "Rohan Verma",
    status: "PRESENT",
    remarks: "Completed lab challenge",
    markedAt: "20 Aug 2026, 11:00 AM",
  },
  {
    id: "att-5",
    date: "18 Aug 2026",
    timeSlot: "02:00 PM – 03:30 PM",
    topic: "RESTful API Security & JWT Authorization",
    moduleName: "Backend Architecture",
    batchCode: "FSD-01",
    courseName: "Full Stack Web Development",
    facultyName: "Rohan Verma",
    status: "EXCUSED",
    remarks: "Medical leave approved by Center Manager",
    markedAt: "18 Aug 2026, 02:15 PM",
  },
];

const DAYS_HEADER = Array.from({ length: 31 }, (_, i) => i + 1);

export const StudentAttendance: React.FC = () => {
  // Selected Subject for Matrix
  const [selectedSubjectId, setSelectedSubjectId] = useState("core-java");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-10-31");

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Attendance.tsx:mount',message:'Student attendance page mount',data:{dataSource:'api-preferred',hasStudentId:!!(useAuthStore.getState().user?.studentId),callsApi:true},timestamp:Date.now()})}).catch(()=>{});
  }, []);
  // #endregion

  // Filter for history table
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiSummary, setApiSummary] = useState<{ percentage: number; present: number; total: number } | null>(null);
  const [apiHistory, setApiHistory] = useState<any[]>([]);

  useEffect(() => {
    const studentId = useAuthStore.getState().user?.studentId;
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
        // #region agent log
        fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Attendance.tsx:api',message:'Attendance API loaded',data:{pct:summary?.attendancePercentage,historyCount:(historyRes?.data||[]).length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Attendance.tsx:api-err',message:'Attendance API failed',data:{err:String(err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Hover state for interactive tooltip
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    month: string;
    status: "P" | "A" | "OFF";
    subject: string;
  } | null>(null);

  const currentSubject = useMemo(() => {
    return SUBJECTS_DATA.find((s) => s.id === selectedSubjectId) || SUBJECTS_DATA[0];
  }, [selectedSubjectId]);

  const percentage = apiSummary
    ? Math.round(apiSummary.percentage)
    : Math.round((currentSubject.attended / currentSubject.total) * 100);
  const isGoodStanding = percentage >= 75;

  const filteredHistory = useMemo(() => {
    return ATTENDANCE_HISTORY_DATA.filter((item) => {
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
  }, [historyFilter, searchQuery]);

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
          {SUBJECTS_DATA.map((subject) => {
            const isActive = subject.id === selectedSubjectId;
            return (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
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
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isGoodStanding
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
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    historyFilter === tab
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
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        rec.status === "PRESENT"
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
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                        rec.status === "PRESENT"
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
