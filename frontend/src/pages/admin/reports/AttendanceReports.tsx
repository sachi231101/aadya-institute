import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAttendanceReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
import { useFacultyList } from "@/hooks/useFaculty";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import type {
  AttendanceAttentionItem,
  AttendanceReportParams,
} from "@/services/reports.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PAGE_SIZE = 10;
const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#2563EB", "#8b5cf6"];
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-[#2563EB]";

const AttentionCard = ({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: AttendanceAttentionItem[];
  icon: React.ElementType;
  tone: string;
}) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${tone}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No items need attention.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-100 bg-slate-50/80 px-2.5 py-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
              {item.meta && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.meta}</p>}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export const AttendanceReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const reportParams: AttendanceReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(courseId ? { courseId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(facultyId ? { facultyId } : {}),
      ...(sessionType ? { sessionType } : {}),
    }),
    [branchFilter, dateFrom, dateTo, courseId, batchId, facultyId, sessionType]
  );

  const { data, isLoading, isError, refetch } = useAttendanceReport(reportParams);
  const { courses } = useCourses({ status: "ACTIVE" });
  const { batches } = useBatches({
    ...(courseId ? { courseId } : {}),
    status: "ACTIVE",
  });
  const { data: facultyResponse } = useFacultyList({ limit: 100, status: "ACTIVE" });
  const facultyList = facultyResponse?.data || [];

  const summary = data?.summary || {
    totalSessions: 0,
    avgAttendanceRate: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    atRiskStudents: 0,
    discontinuationRiskCount: 0,
  };

  const filteredStudents = useMemo(() => {
    const list = data?.students || [];
    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.batchName.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q)
    );
  }, [data?.students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setDateFrom("");
    setDateTo("");
    setCourseId("");
    setBatchId("");
    setFacultyId("");
    setSessionType("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!filteredStudents.length) {
      alert("No attendance data available to export.");
      return;
    }
    downloadCsv(
      "Attendance_Report",
      filteredStudents.map((s, idx) => ({
        "#": idx + 1,
        "Roll Code": s.studentCode,
        Student: s.name,
        Branch: s.branchName,
        Course: s.courseName,
        Batch: s.batchName,
        "Attendance %": `${s.attendancePercentage}%`,
        Present: s.presentCount,
        Absent: s.absentCount,
        Leave: s.leaveCount,
        "Consecutive Theory Absences": s.consecutiveTheoryAbsences,
        "Risk Flag": s.riskFlag,
      }))
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 text-text-muted">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Loading attendance analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load attendance reports</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Student Attendance Reports
          </h2>
          <p className="text-sm text-slate-500">
            Branch-scoped attendance analytics, risk flags, and session coverage.
          </p>
        </div>
        <Button variant="outline" className="h-9 text-xs shrink-0" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
            {isAdmin && (
              <select
                className={SELECT_CLASS}
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Branches</option>
                {branches.map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs"
              placeholder="To"
            />
            <select
              className={SELECT_CLASS}
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setBatchId("");
                setCurrentPage(1);
              }}
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Faculty</option>
              {facultyList.map((f: { id: string; user?: { name?: string }; employeeCode?: string }) => (
                <option key={f.id} value={f.id}>
                  {f.user?.name || f.employeeCode || f.id}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={sessionType}
              onChange={(e) => {
                setSessionType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Session Types</option>
              <option value="THEORY">Theory</option>
              <option value="PRACTICAL">Practical</option>
            </select>
            <Button variant="outline" className="h-9 text-xs" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { label: "Sessions", value: summary.totalSessions, icon: CalendarDays, color: "text-[#2563EB]", bg: "bg-blue-50" },
          { label: "Avg Rate", value: `${summary.avgAttendanceRate}%`, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Present", value: summary.presentCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Absent", value: summary.absentCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Leave", value: summary.leaveCount, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "At Risk", value: summary.atRiskStudents, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Discontinuation", value: summary.discontinuationRiskCount, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm xl:col-span-2">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-[#2563EB]" /> Monthly Attendance Trend
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip />
                <Area type="monotone" dataKey="attendanceRate" stroke="#2563EB" fill="#2563EB33" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <PieChartIcon className="w-4 h-4 text-[#2563EB]" /> Status Distribution
            </h3>
            {(data?.statusDistribution || []).every((s) => s.count === 0) ? (
              <p className="text-xs text-slate-400 text-center py-16">No attendance records.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data?.statusDistribution || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, percent }) =>
                      `${status} ${Math.round((percent || 0) * 100)}%`
                    }
                  >
                    {(data?.statusDistribution || []).map((entry, idx) => (
                      <Cell key={entry.status} fill={entry.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Course-wise Attendance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.courseBreakdown || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="courseName" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="attendanceRate" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Faculty-wise Attendance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.facultyBreakdown || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="facultyName" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="attendanceRate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {(!branchFilter && (data?.branchBreakdown || []).length > 1) && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Branch-wise Attendance
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.branchBreakdown || []).map((b) => (
                  <TableRow key={b.branchName}>
                    <TableCell className="text-xs font-medium">{b.branchName}</TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700">{b.attendanceRate}%</TableCell>
                    <TableCell className="text-xs">{b.sessions}</TableCell>
                    <TableCell className="text-xs">{b.presentCount}</TableCell>
                    <TableCell className="text-xs">{b.absentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Batch-wise Attendance</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.batchBreakdown || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-slate-400 py-6">
                    No batch attendance data.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.batchBreakdown || []).map((b) => (
                  <TableRow key={b.batchName}>
                    <TableCell className="text-xs font-medium">{b.batchName}</TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700">{b.attendanceRate}%</TableCell>
                    <TableCell className="text-xs">{b.sessions}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Needs Attention</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttentionCard
            title="Consecutive Absences"
            items={data?.needsAttention?.consecutiveAbsences || []}
            icon={ShieldAlert}
            tone="bg-red-50 text-red-600"
          />
          <AttentionCard
            title="Low Attendance (<75%)"
            items={data?.needsAttention?.lowAttendance || []}
            icon={AlertTriangle}
            tone="bg-amber-50 text-amber-600"
          />
          <AttentionCard
            title="Unmarked Sessions"
            items={data?.needsAttention?.unmarkedSessions || []}
            icon={ClipboardList}
            tone="bg-blue-50 text-blue-600"
          />
        </div>
      </div>

      {/* Student directory */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2 justify-between">
            <h3 className="text-sm font-bold text-slate-900 self-center">Student Attendance Directory</h3>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search student, roll, batch..."
                className="pl-8 pr-8 h-8 text-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Student</TableHead>
                  <TableHead className="text-xs">Branch</TableHead>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs">Attendance</TableHead>
                  <TableHead className="text-xs">P / A / L</TableHead>
                  <TableHead className="text-xs">Streak</TableHead>
                  <TableHead className="text-xs">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-slate-400">
                      No students found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((s, idx) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-slate-500">
                        {(safePage - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono text-[11px] font-bold text-[#2563EB] block">
                            {s.studentCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{s.branchName}</TableCell>
                      <TableCell className="text-xs">{s.courseName}</TableCell>
                      <TableCell className="text-xs">{s.batchName}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">
                        {s.attendancePercentage}%
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {s.presentCount}/{s.absentCount}/{s.leaveCount}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {s.consecutiveTheoryAbsences}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.riskFlag === "Triggered"
                              ? "destructive"
                              : s.riskFlag === "At Risk"
                                ? "secondary"
                                : "success"
                          }
                          className="text-[10px]"
                        >
                          {s.riskFlag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-800">
                {filteredStudents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredStudents.length)}
              </span>{" "}
              of <span className="font-bold text-slate-800">{filteredStudents.length}</span>
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-slate-600">
                  {safePage}/{totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
