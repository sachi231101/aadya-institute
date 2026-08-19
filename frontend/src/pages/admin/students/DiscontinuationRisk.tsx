import React from "react";
import { AlertTriangle, UserX, MessageSquare, Phone, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useBranchStore } from "@/store/branch.store";

export const DiscontinuationRisk: React.FC = () => {
  const { selectedBranchId } = useBranchStore();

  // Fetch students with attendance risk
  const { data: riskResponse, isLoading } = useQuery({
    queryKey: ["discontinuation-risk", selectedBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedBranchId !== "ALL") params.branchId = selectedBranchId;
      const response = await api.get("/attendance/discontinuation-risk", { params });
      return response.data;
    },
  });

  const riskStudents = riskResponse?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          Discontinuation Risk
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Students with 2+ consecutive theory-class absences (approved leave excluded)
        </p>
      </div>

      {/* Alert Banner */}
      <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Auto-Discontinuation Rule</p>
          <p className="text-sm text-red-700 mt-0.5">
            If a student misses <strong>3 consecutive theory classes</strong>, the discontinuation workflow is triggered.
            Approved leave does NOT count as absent.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 shadow-sm bg-red-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {riskStudents.filter((s: any) => (s.consecutiveAbsences || 0) >= 3).length}
              </p>
              <p className="text-xs text-red-600 font-medium">Critical (3+ absences)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 shadow-sm bg-amber-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">
                {riskStudents.filter((s: any) => (s.consecutiveAbsences || 0) === 2).length}
              </p>
              <p className="text-xs text-amber-600 font-medium">Warning (2 absences)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{riskStudents.length}</p>
              <p className="text-xs text-text-secondary font-medium">Total At Risk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Batch</TableHead>
                <TableHead className="font-semibold">Consecutive Absences</TableHead>
                <TableHead className="font-semibold">Last Present</TableHead>
                <TableHead className="font-semibold">Risk Level</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-secondary">Loading...</TableCell>
                </TableRow>
              ) : riskStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No students at discontinuation risk</p>
                    <p className="text-xs text-text-secondary mt-1">All students have regular attendance</p>
                  </TableCell>
                </TableRow>
              ) : (
                riskStudents.map((student: any) => {
                  const absences = student.consecutiveAbsences || 0;
                  const isCritical = absences >= 3;
                  return (
                    <TableRow key={student.id} className={isCritical ? "bg-red-50/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isCritical ? "bg-red-500" : "bg-amber-500"}`}>
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-text-secondary">{student.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{student.batchName || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                          {absences}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {student.lastPresentDate
                          ? new Date(student.lastPresentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border font-semibold ${
                          isCritical ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {isCritical ? "🔴 CRITICAL" : "🟡 WARNING"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <MessageSquare size={12} /> WhatsApp
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Phone size={12} /> Call
                          </Button>
                          {isCritical && (
                            <Button variant="destructive" size="sm" className="h-7 text-xs">
                              Discontinue
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
