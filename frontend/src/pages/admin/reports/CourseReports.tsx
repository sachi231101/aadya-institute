import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  PieChart as PieChartIcon,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCourseReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import type { CourseAttentionItem, CourseReportParams } from "@/services/reports.api";
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
  items: CourseAttentionItem[];
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

export const CourseReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";

  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const reportParams: CourseReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [branchFilter, statusFilter]
  );

  const { data, isLoading, isError, refetch } = useCourseReport(reportParams);

  const summary = data?.summary || {
    totalCourses: 0,
    activeBatches: 0,
    avgBatchOccupancy: 0,
    totalModules: 0,
    totalEnrolledStudents: 0,
  };

  const courseEnrollmentComparison = data?.enrollmentComparison || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const courseList = data?.courses || [];
  const needsAttention = data?.needsAttention || {
    noModules: [],
    zeroEnrollment: [],
    overCapacity: [],
  };

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    courseList.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courseList]);

  const filteredCourses = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return courseList.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [courseList, searchTerm, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setStatusFilter("");
    setCategoryFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!filteredCourses.length) {
      alert("No course report data available to export.");
      return;
    }
    downloadCsv(
      "Course_Curriculum_Report",
      filteredCourses.map((c) => ({
        "Course Code": c.code,
        "Course Title": c.name,
        Category: c.category,
        Duration: `${c.durationMonths} Months`,
        Modules: c.modulesCount,
        Enrolled: c.enrolledStudents,
        Capacity: c.capacity ?? 0,
        Available: c.availableSeats ?? 0,
        "Occupancy %": c.occupancyPct ?? 0,
        Batches: c.batchesCount,
        "Active Batches": c.activeBatchesCount ?? 0,
        Status: c.status,
      }))
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Aggregating course popularity & curriculum occupancy metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load course reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time course analytics metrics from backend.</p>
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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Course & Curriculum Reports</h2>
          <p className="text-sm text-text-secondary">
            Evaluate course popularity, batch occupancy, and curriculum coverage by branch.
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
          Export Course CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <select
              className={SELECT_CLASS}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-8 text-xs"
                placeholder="Search code or title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#2563EB]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Courses</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalCourses}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.activeBatches}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Occupancy</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.avgBatchOccupancy}%</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-violet-50 text-violet-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Enrolled</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {summary.totalEnrolledStudents ?? 0}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Modules</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalModules}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AttentionCard
          title="No Modules"
          items={needsAttention.noModules}
          icon={Layers}
          tone="bg-amber-50 text-amber-700"
        />
        <AttentionCard
          title="Zero Enrollment"
          items={needsAttention.zeroEnrollment}
          icon={Users}
          tone="bg-slate-100 text-slate-700"
        />
        <AttentionCard
          title="Over Capacity"
          items={needsAttention.overCapacity}
          icon={AlertTriangle}
          tone="bg-red-50 text-red-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#2563EB]" />
              Enrollment vs Seat Capacity
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Active enrollments vs batch seat capacity in the selected branch scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {courseEnrollmentComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseEnrollmentComparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                    <XAxis dataKey="course" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" />
                    <Tooltip
                      cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 6 }}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                    <Bar dataKey="students" fill="#2563EB" radius={[4, 4, 0, 0]} name="Enrolled Students" />
                    <Bar dataKey="capacity" fill="#64748b" radius={[4, 4, 0, 0]} name="Max Capacity" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No course enrollment data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Courses by Category
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribution of courses across curriculum categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No category data available.
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.category}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#2563EB]" />
            Course Performance Directory
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {filteredCourses.length} courses
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-900">Course Code & Title</TableHead>
                <TableHead className="font-semibold text-slate-900">Category</TableHead>
                <TableHead className="font-semibold text-slate-900">Duration</TableHead>
                <TableHead className="font-semibold text-slate-900">Modules</TableHead>
                <TableHead className="font-semibold text-slate-900">Enrolled</TableHead>
                <TableHead className="font-semibold text-slate-900">Capacity</TableHead>
                <TableHead className="font-semibold text-slate-900">Occupancy</TableHead>
                <TableHead className="font-semibold text-slate-900">Batches</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourses.length > 0 ? (
                paginatedCourses.map((course) => (
                  <TableRow key={course.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs font-bold text-[#2563EB] block">
                          {course.code}
                        </span>
                        <span className="font-medium text-slate-900 text-xs">{course.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{course.category}</TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {course.durationMonths} Months
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{course.modulesCount}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">
                      {course.enrolledStudents}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{course.capacity ?? 0}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {course.occupancyPct ?? 0}%
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {course.batchesCount}
                      {typeof course.activeBatchesCount === "number"
                        ? ` (${course.activeBatchesCount} active)`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                        {course.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-400 text-xs">
                    No course records found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredCourses.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
