import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileCheck,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useExaminationsReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import type {
  ExaminationAttentionItem,
  ExaminationsReportParams,
} from "@/services/reports.api";
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
  items: ExaminationAttentionItem[];
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

export const ExaminationReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";

  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [examPage, setExamPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const reportParams: ExaminationsReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [branchFilter, statusFilter, courseFilter, dateFrom, dateTo]
  );

  const { data, isLoading, isError, refetch } = useExaminationsReport(reportParams);

  const summary = data?.summary || {
    totalExams: 0,
    publishedExams: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
  };

  const examBreakdown = data?.examBreakdown || [];
  const scoreDistribution = data?.scoreDistribution || [];
  const courseBreakdown = data?.courseBreakdown || [];
  const studentResults = data?.studentResults || [];
  const needsAttention = data?.needsAttention || {
    lowPassRate: [],
    zeroAttempts: [],
    pendingEvaluation: [],
  };
  const courseOptions = data?.filterOptions?.courses || [];

  const filteredExams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return examBreakdown;
    return examBreakdown.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.courseName || "").toLowerCase().includes(q) ||
        (e.branchName || "").toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)
    );
  }, [examBreakdown, searchTerm]);

  const filteredResults = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return studentResults;
    return studentResults.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.examName.toLowerCase().includes(q) ||
        (r.branchName || "").toLowerCase().includes(q)
    );
  }, [studentResults, searchTerm]);

  const examPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const safeExamPage = Math.min(examPage, examPages);
  const paginatedExams = filteredExams.slice(
    (safeExamPage - 1) * PAGE_SIZE,
    safeExamPage * PAGE_SIZE
  );

  const resultPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const safeResultPage = Math.min(resultPage, resultPages);
  const paginatedResults = filteredResults.slice(
    (safeResultPage - 1) * PAGE_SIZE,
    safeResultPage * PAGE_SIZE
  );

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setStatusFilter("");
    setCourseFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setExamPage(1);
    setResultPage(1);
  };

  const handleExportExams = () => {
    if (!filteredExams.length) {
      alert("No exam report data available to export.");
      return;
    }
    downloadCsv(
      "Examination_Exam_Breakdown",
      filteredExams.map((e) => ({
        Exam: e.title,
        Status: e.status,
        Course: e.courseName || "",
        Branch: e.branchName || "",
        Attempts: e.attempts,
        "Avg Score %": e.avgScore,
        "Pass Rate %": e.passRate,
        "Start At": e.startAt || "",
      }))
    );
  };

  const handleExportResults = () => {
    if (!filteredResults.length) {
      alert("No student results available to export.");
      return;
    }
    downloadCsv(
      "Examination_Student_Results",
      filteredResults.map((r) => ({
        Exam: r.examName,
        "Student Code": r.studentCode,
        Student: r.studentName,
        Branch: r.branchName || "",
        Attempt: r.attemptNumber,
        Score: r.score ?? "",
        "Total Marks": r.totalMarks ?? "",
        "Percentage %": r.percentage ?? "",
        Passed: r.passed == null ? "" : r.passed ? "Yes" : "No",
        Submitted: r.submittedAt || "",
      }))
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Aggregating examination performance metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load examination reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve exam analytics from backend.</p>
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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Examination Reports</h2>
          <p className="text-sm text-text-secondary">
            Track exam coverage, score distribution, pass rates, and student results by branch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            onClick={handleExportExams}
          >
            <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
            Export Exams CSV
          </Button>
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            onClick={handleExportResults}
          >
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Export Results CSV
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {isAdmin && (
              <select
                className={SELECT_CLASS}
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setExamPage(1);
                  setResultPage(1);
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
                setExamPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {["DRAFT", "PUBLISHED", "SCHEDULED", "LIVE", "ENDED", "COMPLETED", "ARCHIVED", "CANCELLED"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
            <select
              className={SELECT_CLASS}
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setExamPage(1);
              }}
            >
              <option value="">All Courses</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              className="h-9 text-xs"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setExamPage(1);
              }}
            />
            <Input
              type="date"
              className="h-9 text-xs"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setExamPage(1);
              }}
            />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-8 text-xs"
                placeholder="Search exams or students..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setExamPage(1);
                  setResultPage(1);
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
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Exams", value: summary.totalExams, icon: ClipboardList, tone: "bg-blue-50 text-[#2563EB]" },
          { label: "Published+", value: summary.publishedExams, icon: FileCheck, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Completed Attempts", value: summary.totalAttempts, icon: Users, tone: "bg-violet-50 text-violet-600" },
          { label: "Avg Score", value: `${summary.avgScore}%`, icon: Award, tone: "bg-amber-50 text-amber-600" },
          { label: "Pass Rate", value: `${summary.passRate}%`, icon: CheckCircle2, tone: "bg-teal-50 text-teal-600" },
        ].map((m) => (
          <Card key={m.label} className="border-border/50 bg-bg-secondary shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${m.tone}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">{m.label}</p>
                <h3 className="text-2xl font-bold text-text-primary">{m.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AttentionCard
          title="Low Pass Rate"
          items={needsAttention.lowPassRate}
          icon={AlertTriangle}
          tone="bg-red-50 text-red-700"
        />
        <AttentionCard
          title="Zero Attempts"
          items={needsAttention.zeroAttempts}
          icon={ClipboardList}
          tone="bg-amber-50 text-amber-700"
        />
        <AttentionCard
          title="Pending Evaluation"
          items={needsAttention.pendingEvaluation}
          icon={FileCheck}
          tone="bg-slate-100 text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#2563EB]" />
              Score Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Completed attempt percentages across score bands.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {scoreDistribution.some((b) => b.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Attempts" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No completed attempts to chart yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              Course Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Exams and attempt outcomes grouped by course.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Exams</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg</TableHead>
                  <TableHead>Pass</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseBreakdown.length > 0 ? (
                  courseBreakdown.map((c) => (
                    <TableRow key={c.courseName}>
                      <TableCell className="text-xs font-medium">{c.courseName}</TableCell>
                      <TableCell className="text-xs">{c.exams}</TableCell>
                      <TableCell className="text-xs">{c.attempts}</TableCell>
                      <TableCell className="text-xs">{c.avgScore}%</TableCell>
                      <TableCell className="text-xs font-semibold">{c.passRate}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-xs">
                      No course breakdown available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#2563EB]" />
            Exam Directory
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {filteredExams.length} exams
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExams.length > 0 ? (
                paginatedExams.map((e) => (
                  <TableRow key={e.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-semibold text-slate-900">{e.title}</TableCell>
                    <TableCell className="text-xs text-slate-600">{e.courseName || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-600">{e.branchName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "LIVE" ? "success" : "secondary"}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold">{e.attempts}</TableCell>
                    <TableCell className="text-xs">{e.avgScore}%</TableCell>
                    <TableCell className="text-xs font-semibold">{e.passRate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-400 text-xs">
                    No exams found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredExams.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {safeExamPage} of {examPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeExamPage <= 1}
                  onClick={() => setExamPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeExamPage >= examPages}
                  onClick={() => setExamPage((p) => Math.min(examPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Student Results
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {filteredResults.length} results
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.length > 0 ? (
                paginatedResults.map((r) => (
                  <TableRow key={r.attemptId} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">{r.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{r.studentCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.examName}</TableCell>
                    <TableCell className="text-xs text-slate-600">{r.branchName || "—"}</TableCell>
                    <TableCell className="text-xs">#{r.attemptNumber}</TableCell>
                    <TableCell className="text-xs">
                      {r.score != null && r.totalMarks != null
                        ? `${r.score}/${r.totalMarks}`
                        : r.score ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {r.percentage != null ? `${Math.round(r.percentage)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.passed == null ? (
                        <Badge variant="secondary">—</Badge>
                      ) : (
                        <Badge variant={r.passed ? "success" : "destructive"}>
                          {r.passed ? "Pass" : "Fail"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-400 text-xs">
                    No completed student results for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredResults.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {safeResultPage} of {resultPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeResultPage <= 1}
                  onClick={() => setResultPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeResultPage >= resultPages}
                  onClick={() => setResultPage((p) => Math.min(resultPages, p + 1))}
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
