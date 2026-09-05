import React, { useMemo } from "react";
import { Loader2, AlertCircle, GraduationCap } from "lucide-react";
import { useAdmissionsReport } from "@/hooks/useReports";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CourseChips } from "@/components/common/CourseChips";
import { groupAdmissionsByStudent } from "@/utils/admission-package.utils";

export const AdmissionReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useAdmissionsReport();
  const summary = data?.summary || { totalAdmissions: 0, confirmedAdmissions: 0, provisionalAdmissions: 0, cancelledAdmissions: 0, conversionRate: 0 };

  const recentGrouped = useMemo(() => {
    const rows = (data?.recentAdmissions || []).map((a) => ({
      id: a.id,
      admissionNo: a.admissionNo,
      studentId: (a as { studentId?: string }).studentId,
      studentName: a.studentName,
      phone: "",
      courseId: a.id,
      courseName: a.courseName,
      branchName: a.branchName,
      status: a.status,
      sortAt: a.createdAt || null,
    }));
    return groupAdmissionsByStudent(rows);
  }, [data?.recentAdmissions]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  if (isError) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Admission Reports</h2>
        <p className="text-sm text-text-secondary">Admissions trends, course breakdown, and recent entries.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: summary.totalAdmissions },
          { label: "Confirmed", value: summary.confirmedAdmissions },
          { label: "Provisional", value: summary.provisionalAdmissions },
          { label: "Cancelled", value: summary.cancelledAdmissions },
          { label: "Conversion", value: `${summary.conversionRate}%` },
        ].map((m) => (
          <Card key={m.label}><CardContent className="p-4"><p className="text-xs text-text-secondary">{m.label}</p><h3 className="text-2xl font-bold">{m.value}</h3></CardContent></Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Monthly Admissions Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="admissions" stroke="#1769AA" fill="#1769AA33" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Recent Admissions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentGrouped.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-text-secondary">No recent admissions.</TableCell></TableRow>
              ) : (
                recentGrouped.map((a) => (
                  <TableRow key={a.studentId || a.admissionIds?.join("-") || a.id}>
                    <TableCell className="font-mono">{a.admissionNo}</TableCell>
                    <TableCell>{a.studentName}</TableCell>
                    <TableCell>
                      <CourseChips courses={a.courses} fallback={a.courseName || "—"} />
                    </TableCell>
                    <TableCell>{a.branchName}</TableCell>
                    <TableCell>{a.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
