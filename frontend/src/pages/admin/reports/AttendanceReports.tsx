import React from "react";
import { Loader2, AlertCircle, Users } from "lucide-react";
import { useAttendanceReport } from "@/hooks/useReports";
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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const AttendanceReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useAttendanceReport();
  const summary = data?.summary || { totalSessions: 0, avgAttendanceRate: 0, presentCount: 0, absentCount: 0, leaveCount: 0 };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  if (isError) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Attendance Reports</h2>
        <p className="text-sm text-text-secondary">Institute-wide attendance analytics and branch breakdown.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Sessions", value: summary.totalSessions },
          { label: "Avg Rate", value: `${summary.avgAttendanceRate}%` },
          { label: "Present", value: summary.presentCount },
          { label: "Absent", value: summary.absentCount },
          { label: "At Risk", value: data?.atRiskStudents ?? 0 },
        ].map((m) => (
          <Card key={m.label}><CardContent className="p-4"><p className="text-xs text-text-secondary">{m.label}</p><h3 className="text-2xl font-bold">{m.value}</h3></CardContent></Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="attendanceRate" stroke="#1769AA" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Branch Breakdown</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.branchBreakdown || []).map((b) => (
                <TableRow key={b.branchName}>
                  <TableCell>{b.branchName}</TableCell>
                  <TableCell>{b.attendanceRate}%</TableCell>
                  <TableCell>{b.sessions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
