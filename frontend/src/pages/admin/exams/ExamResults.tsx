import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Search,
  Users,
  Eye,
} from "lucide-react";
import { useExaminationsReport } from "@/hooks/useReports";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export const ExamResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";

  const { data, isLoading, isError, refetch } = useExaminationsReport();
  const [searchTerm, setSearchTerm] = useState("");
  const [examFilter, setExamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const summary = data?.summary || {
    totalExams: 0,
    publishedExams: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
  };
  const examBreakdown = data?.examBreakdown || [];
  const scoreDistribution = data?.scoreDistribution || [];
  const studentResults = data?.studentResults || [];

  const filteredResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return studentResults.filter((row) => {
      if (examFilter !== "ALL" && row.examId !== examFilter) return false;
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.studentName.toLowerCase().includes(q) ||
        row.studentCode.toLowerCase().includes(q) ||
        (row.email || "").toLowerCase().includes(q) ||
        row.examName.toLowerCase().includes(q)
      );
    });
  }, [studentResults, searchTerm, examFilter, statusFilter]);

  const getStatusBadge = (status: string, passed: boolean | null) => {
    if (status === "COMPLETED") {
      return passed ? (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Passed</Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Failed</Badge>
      );
    }
    if (status === "TERMINATED") {
      return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Terminated</Badge>;
    }
    if (["EVALUATING", "SUBMITTED", "AUTO_SUBMITTED"].includes(status)) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Evaluating</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load exam results.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Exam Results</h2>
        <p className="text-sm text-text-secondary">
          Examination performance overview and individual student results.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Exams", value: summary.totalExams },
          { label: "Published", value: summary.publishedExams },
          { label: "Attempts", value: summary.totalAttempts },
          { label: "Avg Score", value: `${summary.avgScore}%` },
          { label: "Pass Rate", value: `${summary.passRate}%` },
        ].map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-text-secondary">{m.label}</p>
              <h3 className="text-2xl font-bold">{m.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Score Distribution
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1769AA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Exam Breakdown</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Pass Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-text-secondary">
                      No exam data.
                    </TableCell>
                  </TableRow>
                ) : (
                  examBreakdown.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.attempts}</TableCell>
                      <TableCell>{e.avgScore}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.passRate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1769AA]" />
              Student Results
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student, code, exam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <select
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="ALL">All Exams</option>
                {examBreakdown.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="EVALUATING">Evaluating</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-sm text-text-secondary">
                      No student examination results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((row) => (
                    <TableRow key={row.attemptId}>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{row.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.studentCode}
                          {row.email ? ` • ${row.email}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.examName}</TableCell>
                      <TableCell className="text-sm">#{row.attemptNumber}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {row.score !== null && row.score !== undefined ? (
                          <span>
                            {row.score}
                            {row.totalMarks != null ? ` / ${row.totalMarks}` : ""}
                            {row.percentage != null ? (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                ({row.percentage}%)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status, row.passed)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleString()
                          : row.startedAt
                            ? new Date(row.startedAt).toLocaleString()
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => navigate(`${basePath}/${row.examId}/attempts`)}
                        >
                          <Eye className="h-3 w-3" /> View Attempts
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
