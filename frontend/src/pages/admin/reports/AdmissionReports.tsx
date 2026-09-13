import React, { useState, useMemo, useRef } from "react";
import {
  GraduationCap,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  WalletCards,
  Files,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { useAdmissionsReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import { CourseChips } from "@/components/common/CourseChips";
import type {
  AdmissionAttentionItem,
  AdmissionsReportParams,
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

const STATUS_BADGE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  CONFIRMED: { label: "Confirmed", variant: "default", className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  ACTIVE: { label: "Active", variant: "default", className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  PROVISIONAL: { label: "Provisional", variant: "secondary", className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" },
  PENDING: { label: "Pending", variant: "secondary", className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" },
  COMPLETED: { label: "Completed", variant: "outline", className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100" },
  CANCELLED: { label: "Cancelled", variant: "destructive", className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100" },
};

const PIE_COLORS = ["#2563EB", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#14b8a6"];

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-[#2563EB]";

const formatReportDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const triggerDownload = (content: string, type: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const AttentionCard = ({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: AdmissionAttentionItem[];
  icon: React.ElementType;
  tone: string;
}) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <span className={`rounded-md p-1.5 ${tone}`}><Icon className="h-4 w-4" /></span>
          {title}
        </h4>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No items need attention.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <div className="flex justify-between gap-2 text-xs font-semibold text-slate-800">
                <span className="truncate">{item.label}</span>
                {typeof item.count === "number" && <span>{item.count}</span>}
              </div>
              {item.meta && <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.meta}</p>}
            </div>
          ))}
          {items.length > 5 && <p className="text-center text-[11px] text-slate-500">+{items.length - 5} more</p>}
        </div>
      )}
    </CardContent>
  </Card>
);

export const AdmissionReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";
  const { courses } = useCourses();
  const { batches } = useBatches();
  const { options: academicYearOptions } = useMasterDropdown("academicyear");
  const { options: leadSourceOptions } = useMasterDropdown("leadsource");
  const { data: counsellorsResponse } = useUsers({
    role: "COUNSELLOR",
    status: "ACTIVE",
    limit: 100,
  });
  const counsellors = counsellorsResponse?.data || [];
  const [filters, setFilters] = useState<Omit<AdmissionsReportParams, "branchId">>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [trendMode, setTrendMode] = useState<"monthly" | "yearly">("monthly");
  const printableRef = useRef<HTMLDivElement>(null);
  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;
  const reportParams = useMemo(
    () => ({ ...filters, branchId: branchFilter }),
    [branchFilter, filters]
  );
  const { data, isLoading, isError, refetch } = useAdmissionsReport(reportParams);

  const updateFilter = (
    key: keyof Omit<AdmissionsReportParams, "branchId">,
    value: string
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      ...(key === "courseId" ? { batchId: undefined } : {}),
    }));
    setCurrentPage(1);
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setCurrentPage(1);
    setSearchTerm("");
    setFilters((current) => ({ ...current, batchId: undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    if (isAdmin) setSelectedBranchId("ALL");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const filteredBatches = useMemo(
    () =>
      batches.filter((batch) => {
        const matchesCourse =
          !filters.courseId ||
          batch.courseId === filters.courseId ||
          batch.batchCourses?.some((item) => item.courseId === filters.courseId);
        const matchesBranch =
          !branchFilter || !batch.branchId || batch.branchId === branchFilter;
        return matchesCourse && matchesBranch;
      }),
    [batches, branchFilter, filters.courseId]
  );

  const summary = data?.summary || {
    totalAdmissions: 0,
    confirmedAdmissions: 0,
    provisionalAdmissions: 0,
    cancelledAdmissions: 0,
    conversionRate: 0,
  };

  const courseBreakdown = data?.courseBreakdown || [];
  const branchBreakdown = data?.branchBreakdown || [];
  const counsellorBreakdown = data?.counsellorBreakdown || [];
  const leadSourceBreakdown = data?.leadSourceBreakdown || [];
  const batchBreakdown = data?.batchBreakdown || [];
  const funnel = data?.funnel || [];
  const trendData = useMemo(
    () =>
      trendMode === "monthly"
        ? (data?.monthlyTrend || []).map((item) => ({
            period: item.month,
            admissions: item.admissions,
          }))
        : (data?.yearlyTrend || []).map((item) => ({
            period: item.year,
            admissions: item.admissions,
          })),
    [data?.monthlyTrend, data?.yearlyTrend, trendMode]
  );

  const recentAdmissions = useMemo(
    () => data?.recentAdmissions || [],
    [data?.recentAdmissions]
  );

  const filteredAdmissions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return recentAdmissions;
    return recentAdmissions.filter((admission) => {
      const searchable = [
        admission.admissionNo,
        admission.studentName,
        admission.courseName,
        admission.branchName,
        admission.batchName,
        admission.counsellorName,
        admission.leadSource,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [recentAdmissions, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAdmissions.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAdmissions = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredAdmissions.slice(start, start + PAGE_SIZE);
  }, [filteredAdmissions, safeCurrentPage]);
  const startRecord = filteredAdmissions.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(safeCurrentPage * PAGE_SIZE, filteredAdmissions.length);

  // Pagination items
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | "...")[] = [1];
    if (safeCurrentPage > 3) items.push("...");
    for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
      items.push(i);
    }
    if (safeCurrentPage < totalPages - 2) items.push("...");
    items.push(totalPages);
    return items;
  }, [totalPages, safeCurrentPage]);

  const exportRows = useMemo(
    () =>
      filteredAdmissions.map((admission) => ({
        "Admission No": admission.admissionNo || "—",
        Student: admission.studentName || "—",
        Course:
          admission.courses?.map((course) => course.name).join(", ") ||
          admission.courseName ||
          "—",
        Branch: admission.branchName || "—",
        Batch: admission.batchName || "Unallocated",
        Counsellor: admission.counsellorName || "—",
        "Lead Source": admission.leadSource || "—",
        Status: admission.status || "—",
        Date: formatReportDate(admission.admissionDate || admission.createdAt),
      })),
    [filteredAdmissions]
  );

  const handleCsvExport = () => {
    if (!exportRows.length) {
      alert("No admission data available to export.");
      return;
    }
    downloadCsv("Admission_Report", exportRows);
  };

  const handleExcelExport = () => {
    if (!exportRows.length) {
      alert("No admission data available to export.");
      return;
    }
    const headers = Object.keys(exportRows[0]);
    const rows = exportRows.map((row) =>
      headers.map((header) => String(row[header as keyof typeof row] ?? ""))
    );
    const metadata = [
      ["Aadya Institute - Full Admission Report"],
      [`Generated: ${new Date().toLocaleString("en-IN")}`],
      [`Total admissions: ${summary.totalAdmissions}`],
      [],
    ];
    const content = [...metadata, headers, ...rows]
      .map((row) => row.join("\t"))
      .join("\n");
    triggerDownload(
      content,
      "application/vnd.ms-excel;charset=utf-8;",
      `Admission_Report_${new Date().toISOString().slice(0, 10)}.xls`
    );
  };

  const handlePrint = () => {
    printableRef.current?.scrollIntoView({ block: "start" });
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_MAP[status] || { label: status, variant: "outline" as const, className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100" };
    return (
      <Badge variant={config.variant} className={`text-xs font-medium px-2 py-0.5 ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // ─── LOADING ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-muted-foreground space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Aggregating admission analytics across branches...</p>
      </div>
    );
  }

  // ─── ERROR ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Failed to load admission reports</h3>
        <p className="text-xs text-muted-foreground">Unable to retrieve real-time admission analytics from backend.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ─── 1. HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#2563EB]" />
            Admission Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Admissions trends, course breakdown, branch distribution, and recent entries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleCsvExport}>
            <Download className="mr-2 h-4 w-4 text-emerald-600" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4 text-purple-600" /> PDF / Print
          </Button>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm print:hidden">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter className="h-4 w-4 text-[#2563EB]" /> Report Filters
            </h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {isAdmin && (
              <label className="space-y-1 text-[11px] font-semibold text-slate-500">
                Branch
                <select
                  value={selectedBranchId}
                  onChange={(event) => handleBranchChange(event.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Academic Year
              <select value={filters.academicYear || ""} onChange={(event) => updateFilter("academicYear", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Academic Years</option>
                {academicYearOptions.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              From Date
              <Input type="date" value={filters.dateFrom || ""} max={filters.dateTo} onChange={(event) => updateFilter("dateFrom", event.target.value)} className="h-9 text-xs" />
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              To Date
              <Input type="date" value={filters.dateTo || ""} min={filters.dateFrom} onChange={(event) => updateFilter("dateTo", event.target.value)} className="h-9 text-xs" />
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Course
              <select value={filters.courseId || ""} onChange={(event) => updateFilter("courseId", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Courses</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Batch
              <select value={filters.batchId || ""} onChange={(event) => updateFilter("batchId", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Batches</option>
                {filteredBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Status
              <select value={filters.status || ""} onChange={(event) => updateFilter("status", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Statuses</option>
                {["CONFIRMED", "ACTIVE", "PROVISIONAL", "PENDING", "COMPLETED", "CANCELLED"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Counsellor
              <select value={filters.counsellorId || ""} onChange={(event) => updateFilter("counsellorId", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Counsellors</option>
                {counsellors.map((counsellor) => <option key={counsellor.id} value={counsellor.id}>{counsellor.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-slate-500">
              Lead Source
              <select value={filters.leadSource || ""} onChange={(event) => updateFilter("leadSource", event.target.value)} className={SELECT_CLASS}>
                <option value="">All Lead Sources</option>
                {leadSourceOptions.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. SUMMARY KPIs ──────────────────────────────────────────── */}
      <div ref={printableRef} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total Admissions",
            value: summary.totalAdmissions,
            icon: FileText,
            color: "text-[#2563EB]",
            bg: "bg-blue-50",
          },
          {
            label: "Confirmed",
            value: summary.confirmedAdmissions,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Provisional",
            value: summary.provisionalAdmissions,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Cancelled",
            value: summary.cancelledAdmissions,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Conversion Rate",
            value: `${summary.conversionRate}%`,
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <h3 className="text-xl font-bold text-foreground">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── 3. CHARTS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Admissions Trend */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                Admission Trend
              </h3>
              <div className="flex rounded-md border bg-slate-50 p-0.5 print:hidden">
                {(["monthly", "yearly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTrendMode(mode)}
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize ${trendMode === mode ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {trendData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No trend data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="admissions" stroke="#2563EB" fill="#2563EB22" strokeWidth={2} name="Admissions" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Course Breakdown */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
              <BarChart3 className="w-4 h-4 text-[#2563EB]" />
              Admissions by Course
            </h3>
            {courseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No course data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={courseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="courseName" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} name="Admissions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch Breakdown — only when "All Branches" is selected */}
      {(!branchFilter && branchBreakdown.length > 1) && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
              <PieChartIcon className="w-4 h-4 text-[#2563EB]" />
              Admissions Distribution by Branch
            </h3>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={branchBreakdown}
                    dataKey="count"
                    nameKey="branchName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${String(name || "Branch")} (${((percent || 0) * 100).toFixed(0)}%)`
                    }
                    labelLine
                  >
                    {branchBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    formatter={(value, name) => [`${String(value)} admissions`, String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[
          {
            title: "Admissions by Counsellor",
            data: counsellorBreakdown.map((item) => ({
              label: item.counsellorName || item.name || "Unassigned",
              count: item.count,
            })),
            color: "#8b5cf6",
          },
          {
            title: "Admissions by Lead Source",
            data: leadSourceBreakdown.map((item) => ({
              label: item.leadSource || item.source || item.name || "Unknown",
              count: item.count,
            })),
            color: "#06b6d4",
          },
        ].map((breakdown) => (
          <Card key={breakdown.title} className="border-border/50 shadow-sm">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <BarChart3 className="h-4 w-4 text-[#2563EB]" /> {breakdown.title}
              </h3>
              {breakdown.data.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No breakdown data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={breakdown.data} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={115} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={breakdown.color} radius={[0, 4, 4, 0]} name="Admissions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <UsersRound className="h-4 w-4 text-[#2563EB]" /> Admission Funnel
            </h3>
            {funnel.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No funnel data available.</p>
            ) : (
              <div className="space-y-3">
                {funnel.map((item, index) => {
                  const maximum = Math.max(...funnel.map((entry) => entry.count), 1);
                  const width = Math.max(8, (item.count / maximum) * 100);
                  const previous = funnel[index - 1]?.count;
                  const conversion = previous ? Math.round((item.count / previous) * 100) : 100;
                  return (
                    <div key={item.stage}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.stage}</span>
                        <span className="text-slate-500">{item.count} · {conversion}%</span>
                      </div>
                      <div className="h-7 overflow-hidden rounded bg-slate-100">
                        <div
                          className="flex h-full items-center justify-end rounded bg-gradient-to-r from-blue-500 to-indigo-600 px-2 text-[10px] font-bold text-white"
                          style={{ width: `${width}%` }}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4 text-[#2563EB]" /> Batch Capacity
            </h3>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Admissions</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Occupied</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchBreakdown.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No batch data available.</TableCell></TableRow>
                  ) : batchBreakdown.map((batch) => (
                    <TableRow key={batch.batchId || batch.batchName}>
                      <TableCell className="font-medium">{batch.batchName}</TableCell>
                      <TableCell className="text-right">{batch.count}</TableCell>
                      <TableCell className="text-right">{batch.capacity}</TableCell>
                      <TableCell className="text-right">{batch.occupied}</TableCell>
                      <TableCell className={`text-right font-semibold ${batch.available === 0 ? "text-red-600" : "text-emerald-600"}`}>{batch.available}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <AlertCircle className="h-4 w-4 text-amber-600" /> Needs Attention
          </h3>
          <p className="text-xs text-muted-foreground">Admissions requiring operational follow-up.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AttentionCard title="Provisional" items={data?.needsAttention?.provisional || []} icon={Clock} tone="bg-amber-100 text-amber-700" />
          <AttentionCard title="Pending Fees" items={data?.needsAttention?.pendingFees || []} icon={WalletCards} tone="bg-red-100 text-red-700" />
          <AttentionCard title="Missing Documents" items={data?.needsAttention?.missingDocuments || []} icon={Files} tone="bg-purple-100 text-purple-700" />
          <AttentionCard title="Unallocated Batches" items={data?.needsAttention?.unallocatedBatches || []} icon={UserRoundX} tone="bg-blue-100 text-blue-700" />
        </div>
      </section>

      {/* ─── 4. ADMISSIONS TABLE ──────────────────────────────────────── */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <GraduationCap className="w-4 h-4 text-[#2563EB]" />
              Recent Admissions
              <Badge variant="secondary" className="text-xs ml-1">{filteredAdmissions.length}</Badge>
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search admissions..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white border-slate-200 shadow-sm rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563EB]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Counsellor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAdmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {searchTerm ? "No admissions match your search." : "No recent admissions found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAdmissions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.admissionNo || "—"}</TableCell>
                      <TableCell className="font-medium">{a.studentName || "—"}</TableCell>
                      <TableCell>
                        <CourseChips courses={a.courses || []} fallback={a.courseName || "—"} />
                      </TableCell>
                      <TableCell className="text-sm">{a.branchName || "—"}</TableCell>
                      <TableCell className="text-sm">{a.batchName || <span className="text-amber-600">Unallocated</span>}</TableCell>
                      <TableCell className="text-sm">
                        <div>{a.counsellorName || "—"}</div>
                        {a.leadSource && <div className="text-[10px] text-muted-foreground">{a.leadSource}</div>}
                      </TableCell>
                      <TableCell>{getStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatReportDate(a.admissionDate || a.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredAdmissions.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <span className="text-xs text-muted-foreground">
                Showing {startRecord}–{endRecord} of {filteredAdmissions.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {paginationItems.map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === safeCurrentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(item as number)}
                      className={`h-8 w-8 p-0 text-xs ${item === safeCurrentPage ? "bg-[#2563EB] text-white" : ""}`}
                    >
                      {item}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
