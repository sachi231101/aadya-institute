import React from "react";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { useExaminationsReport } from "@/hooks/useReports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading, isError, refetch } = useExaminationsReport();

  const summary = data?.summary || { totalExams: 0, publishedExams: 0, totalAttempts: 0, avgScore: 0, passRate: 0 };
  const examBreakdown = data?.examBreakdown || [];
  const scoreDistribution = data?.scoreDistribution || [];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load exam results.
        <Button variant="link" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Exam Results</h2>
        <p className="text-sm text-text-secondary">Examination performance overview and score distribution.</p>
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
            <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Score Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
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
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-text-secondary">No exam data.</TableCell></TableRow>
                ) : (
                  examBreakdown.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.attempts}</TableCell>
                      <TableCell>{e.avgScore}%</TableCell>
                      <TableCell><Badge variant="outline">{e.passRate}%</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
