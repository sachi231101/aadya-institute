import React, { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  UserCheck,
  AlertTriangle,
  Filter,
  Check,
  Search,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentClassAttendanceRecord {
  id: string;
  date: string;
  timeSlot: string;
  topic: string;
  courseName: string;
  batchCode: string;
  facultyName: string;
  facultyAvatar?: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
  remarks: string;
  markedAt: string;
}

const MOCK_STUDENT_ATTENDANCE_LOG: StudentClassAttendanceRecord[] = [
  {
    id: "att-1",
    date: "20-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Search Engine Optimization (SEO) Masterclass",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Active classroom participation",
    markedAt: "20 Aug 2026, 11:05 AM",
  },
  {
    id: "att-2",
    date: "19-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Google Analytics 4 Setup & Event Tracking",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Verified Attendance",
    markedAt: "19 Aug 2026, 11:00 AM",
  },
  {
    id: "att-3",
    date: "18-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Keyword Research & Competitor Gap Analysis",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "EXCUSED",
    remarks: "Medical Leave Approved",
    markedAt: "18 Aug 2026, 09:45 AM",
  },
  {
    id: "att-4",
    date: "17-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Introduction to Search Engine Marketing (SEM)",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Present on time",
    markedAt: "17 Aug 2026, 11:02 AM",
  },
  {
    id: "att-5",
    date: "15-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Digital Marketing Landscape & Strategy Framework",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Present",
    markedAt: "15 Aug 2026, 11:00 AM",
  },
  {
    id: "att-6",
    date: "14-08-2026",
    timeSlot: "02:00 PM - 03:30 PM",
    topic: "Social Media Advertising (Meta & LinkedIn Ads)",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Priya Sharma",
    facultyAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Present",
    markedAt: "14 Aug 2026, 03:35 PM",
  },
  {
    id: "att-7",
    date: "12-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Content Marketing Fundamentals & Copywriting",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "ABSENT",
    remarks: "Absent without prior notice",
    markedAt: "12 Aug 2026, 11:10 AM",
  },
  {
    id: "att-8",
    date: "10-08-2026",
    timeSlot: "09:30 AM - 11:00 AM",
    topic: "Program Induction & Academy Rules",
    courseName: "Digital Marketing",
    batchCode: "DM-01",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Attended orientation",
    markedAt: "10 Aug 2026, 11:00 AM",
  },
];

export const StudentAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const studentName = user?.name || "Rahul Verma";

  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const records = MOCK_STUDENT_ATTENDANCE_LOG;

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesSearch =
        !searchTerm ||
        rec.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.date.includes(searchTerm);
      const matchesStatus = statusFilter === "ALL" || rec.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // Statistics
  const totalClasses = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const excusedCount = records.filter((r) => r.status === "EXCUSED").length;

  const attendancePercentage =
    totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(2) : "0.00";

  // Radial SVG calculation (radius = 38, circumference ≈ 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (parseFloat(attendancePercentage) / 100) * circumference;

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Date,Time Slot,Topic,Course,Batch,Faculty Instructor,Status,Faculty Remarks,Marked At\n";
    const rows = records
      .map(
        (r) =>
          `"${r.date}","${r.timeSlot}","${r.topic}","${r.courseName}","${r.batchCode}","${r.facultyName}","${r.status}","${r.remarks}","${r.markedAt}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Attendance_Report_${studentName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1680px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* ─── 1. PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              My Attendance Desk
            </h1>
            <ShieldCheck className="h-5 w-5 text-[#6366F1]" />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View your verified daily attendance records, presence rate, and faculty feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-bold h-9 px-3.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export My Attendance
          </Button>
        </div>
      </div>

      {/* ─── 2. SUMMARY KPI ROW ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Classes */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Classes
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalClasses}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Scheduled Sessions</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl text-[#6366F1]">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Attended (Present) */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Present
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{presentCount}</h3>
                <span className="text-xs font-black text-emerald-600">
                  {((presentCount / totalClasses) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Attended Classes</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Absent
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{absentCount}</h3>
                <span className="text-xs font-black text-rose-600">
                  {((absentCount / totalClasses) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">Unexcused Misses</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Excused Leave */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Excused
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{excusedCount}</h3>
                <span className="text-xs font-black text-amber-600">
                  {((excusedCount / totalClasses) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Approved Leaves</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Overall Percentage Ring */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl col-span-2 md:col-span-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Attendance Rate
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{attendancePercentage}%</h3>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                <Check className="h-3 w-3" /> Compliant (&gt;75%)
              </span>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-100"
                  strokeWidth="9"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-500 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-800">
                  {Math.round(parseFloat(attendancePercentage))}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. ACADEMY POLICY NOTICE ──────────────────────────────────── */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-xs font-black text-emerald-950">
              Attendance Status: In Good Standing ({attendancePercentage}%)
            </h5>
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
              You meet the Aadya Institute minimum 75% attendance criteria. 0 consecutive absences recorded.
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 self-start sm:self-auto">
          Active &amp; Certified
        </Badge>
      </div>

      {/* ─── 4. SEARCH & STATUS FILTER BAR ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search class topic or instructor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] outline-none shadow-2xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "ALL"
                ? "bg-[#6366F1] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({totalClasses})
          </button>
          <button
            onClick={() => setStatusFilter("PRESENT")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "PRESENT"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Present ({presentCount})
          </button>
          <button
            onClick={() => setStatusFilter("ABSENT")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "ABSENT"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Absent ({absentCount})
          </button>
          <button
            onClick={() => setStatusFilter("EXCUSED")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "EXCUSED"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Excused ({excusedCount})
          </button>
        </div>
      </div>

      {/* ─── 5. ATTENDANCE LOG TABLE ───────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Verified Class Attendance History
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Every class session marked by your batch faculty instructors.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-bold text-xs text-slate-600">Date &amp; Time</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Class Topic &amp; Module</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Batch &amp; Course</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Faculty Instructor</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-center">Status</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Faculty Remarks</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-right">Marked At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No attendance records found matching current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((rec) => (
                  <TableRow key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    {/* Date & Time */}
                    <TableCell>
                      <span className="font-black text-slate-900 text-xs block">{rec.date}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{rec.timeSlot}</span>
                    </TableCell>

                    {/* Class Topic */}
                    <TableCell>
                      <span className="font-bold text-slate-800 text-xs block max-w-xs truncate">
                        {rec.topic}
                      </span>
                    </TableCell>

                    {/* Batch */}
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px] text-blue-700 bg-blue-50 border-blue-200">
                        {rec.batchCode}
                      </Badge>
                    </TableCell>

                    {/* Faculty Instructor */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={rec.facultyAvatar} />
                          <AvatarFallback className="text-[9px]">
                            {rec.facultyName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-700">{rec.facultyName}</span>
                      </div>
                    </TableCell>

                    {/* Status Pill */}
                    <TableCell className="text-center">
                      {rec.status === "PRESENT" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                          <Check className="h-3 w-3" /> Present
                        </span>
                      )}
                      {rec.status === "ABSENT" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                          <XCircle className="h-3 w-3" /> Absent
                        </span>
                      )}
                      {rec.status === "EXCUSED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3" /> Excused
                        </span>
                      )}
                    </TableCell>

                    {/* Remarks */}
                    <TableCell>
                      <span className="text-xs text-slate-600 font-medium">
                        {rec.remarks || "—"}
                      </span>
                    </TableCell>

                    {/* Marked At */}
                    <TableCell className="text-right text-[11px] font-mono text-slate-400">
                      {rec.markedAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
