import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  RotateCcw,
  Search,
  Star,
  UserCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { useFacultyReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import type { FacultyAttentionItem, FacultyReportParams } from "@/services/reports.api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-[#2563EB]";

const AttentionCard = ({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: FacultyAttentionItem[];
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

export const FacultyReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";

  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const reportParams: FacultyReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [branchFilter, statusFilter]
  );

  const { data, isLoading, isError, refetch } = useFacultyReport(reportParams);

  const summary = data?.summary || {
    totalActiveFaculty: 0,
    avgStudentRating: 0,
    monthlyTeachingHours: 0,
    sessionCompliancePercentage: 0,
  };

  const facultyWorkloadData = data?.workload || [];
  const feedbackRatingData = data?.ratingDistribution || [];
  const facultyList = data?.faculty || [];
  const needsAttention = data?.needsAttention || {
    lowRating: [],
    lowAttendance: [],
    unassigned: [],
  };

  const filteredFaculty = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return facultyList;
    return facultyList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.facultyCode.toLowerCase().includes(q) ||
        f.specialization.toLowerCase().includes(q) ||
        f.branchName.toLowerCase().includes(q)
    );
  }, [facultyList, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredFaculty.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFaculty = filteredFaculty.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setStatusFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!filteredFaculty.length) {
      alert("No faculty report data available to export.");
      return;
    }
    downloadCsv(
      "Faculty_Performance_Report",
      filteredFaculty.map((f) => ({
        "Faculty Code": f.facultyCode,
        "Faculty Name": f.name,
        Branch: f.branchName,
        Specialization: f.specialization,
        "Assigned Cohorts": `${f.assignedBatchesCount} Batches`,
        Students: f.totalStudents,
        "Teaching Hours": `${f.teachingHours} hrs`,
        "Faculty Attendance %": f.facultyAttendancePct,
        "Student Attendance %": f.avgStudentAttendancePct,
        "Student Rating": f.avgRating,
        Status: f.status,
      }))
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Aggregating instructor workloads & feedback analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load faculty reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time faculty metrics from backend service.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Faculty Analytics & Reports</h2>
          <p className="text-sm text-text-secondary">
            Evaluate instructor workload, student feedback, attendance, and session compliance.
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
          Export Faculty CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
            <select
              className={SELECT_CLASS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <Button variant="outline" className="h-9 text-xs" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#2563EB]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Active Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalActiveFaculty}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Student Rating</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.avgStudentRating} / 5.0</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Teaching Hours</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.monthlyTeachingHours} hrs</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Session Compliance</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.sessionCompliancePercentage}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#2563EB]" />
              Faculty Workload (Hours)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Teaching hours delivered by instructors in scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {facultyWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facultyWorkloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#2563EB" radius={[4, 4, 0, 0]} name="Teaching Hours" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No workload data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-amber-500" />
              Student Feedback Rating Split
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Aggregated post-class student feedback ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
              {feedbackRatingData.some((r) => r.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feedbackRatingData}
                      dataKey="count"
                      nameKey="rating"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {feedbackRatingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No feedback rating distribution.
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {feedbackRatingData.map((item) => (
                <div key={item.rating} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.rating}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} Ratings</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Needs Attention</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttentionCard
            title="Low Student Ratings"
            items={needsAttention.lowRating}
            icon={AlertTriangle}
            tone="bg-amber-50 text-amber-600"
          />
          <AttentionCard
            title="Low Faculty Attendance"
            items={needsAttention.lowAttendance}
            icon={Clock}
            tone="bg-red-50 text-red-600"
          />
          <AttentionCard
            title="Unassigned Active Faculty"
            items={needsAttention.unassigned}
            icon={UserRoundX}
            tone="bg-blue-50 text-blue-600"
          />
        </div>
      </div>

      <Card className="border-border/50 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-[#2563EB]" />
            Faculty Performance Directory
          </CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, code, branch..."
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-900 text-xs">Faculty</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Branch</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Specialization</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Batches</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Hours</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Faculty Att %</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Student Att %</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Rating</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFaculty.length > 0 ? (
                  paginatedFaculty.map((faculty) => (
                    <TableRow key={faculty.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#2563EB] block">
                            {faculty.facultyCode}
                          </span>
                          <span className="font-medium text-slate-900 text-xs">{faculty.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{faculty.branchName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{faculty.specialization}</TableCell>
                      <TableCell className="text-xs text-slate-700 font-semibold">
                        {faculty.assignedBatchesCount}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{faculty.teachingHours}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        {faculty.facultyAttendancePct > 0 ? `${faculty.facultyAttendancePct}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {faculty.avgStudentAttendancePct > 0
                          ? `${faculty.avgStudentAttendancePct}%`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {faculty.avgRating > 0 ? `${faculty.avgRating} / 5` : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={faculty.status === "ACTIVE" ? "success" : "secondary"}>
                          {faculty.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-slate-400 text-xs">
                      No faculty records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-800">
                {filteredFaculty.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredFaculty.length)}
              </span>{" "}
              of <span className="font-bold text-slate-800">{filteredFaculty.length}</span>
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
