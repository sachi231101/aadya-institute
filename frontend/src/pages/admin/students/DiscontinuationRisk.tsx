import React from "react";
import { AlertTriangle, UserX, MessageSquare, Phone, CheckCircle2, ShieldAlert } from "lucide-react";
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
  const { data: riskResponse, isLoading, isError, error } = useQuery({
    queryKey: ["discontinuation-risk", selectedBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedBranchId !== "ALL") params.branchId = selectedBranchId;
      // #region agent log
      fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'C',location:'DiscontinuationRisk.tsx:queryFn',message:'Calling discontinuation-risk API',data:{selectedBranchId,params},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const response = await api.get("/attendance/discontinuation-risk", { params });
      return response.data;
    },
  });

  const riskStudents = riskResponse?.data || [];

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'C',location:'DiscontinuationRisk.tsx:state',message:'Discontinuation risk page state',data:{isLoading,isError,errStatus:(error as any)?.response?.status,errMsg:(error as any)?.response?.data?.message||(error as any)?.message,riskCount:riskStudents.length},timestamp:Date.now()})}).catch(()=>{});
  }, [isLoading, isError, riskStudents.length]);
  // #endregion

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          Discontinuation Risk
        </h1>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">
          Students with 2+ consecutive theory-class absences (approved leave excluded)
        </p>
      </div>

      {/* Alert Banner */}
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Auto-Discontinuation Rule</p>
          <p className="text-xs text-rose-700/90 dark:text-rose-300/90 mt-1 leading-relaxed">
            If a student misses <strong className="text-rose-900 dark:text-rose-200 font-black">3 consecutive theory classes</strong>, the discontinuation workflow is triggered.
            Approved leave does NOT count as absent.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Critical Risk</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {riskStudents.filter((s: any) => (s.consecutiveAbsences || 0) >= 3).length}
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">3+ consecutive absences</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-rose-600 dark:text-rose-400">
              <UserX className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Warning Risk</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {riskStudents.filter((s: any) => (s.consecutiveAbsences || 0) === 2).length}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">2 consecutive absences</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total At Risk</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{riskStudents.length}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Students requiring review</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 rounded-2xl text-primary dark:text-sky-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Table */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="font-bold text-xs text-foreground">Student</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Batch</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Consecutive Absences</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Last Present</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Risk Level</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium text-xs">
                    Loading student risk records...
                  </TableCell>
                </TableRow>
              ) : riskStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-black text-foreground">No students at discontinuation risk</h4>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      All enrolled students currently maintain regular attendance standards.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                riskStudents.map((student: any) => {
                  const absences = student.consecutiveAbsences || 0;
                  const isCritical = absences >= 3;
                  return (
                    <TableRow key={student.id} className={`border-b border-border/70 hover:bg-muted/30 transition-colors ${isCritical ? "bg-rose-500/5" : ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs ${isCritical ? "bg-rose-600" : "bg-amber-500"}`}>
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{student.name}</p>
                            <p className="text-[11px] text-muted-foreground font-medium">{student.phone || student.studentCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">{student.batchName || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-base font-black ${isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {absences}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {student.lastPresentDate
                          ? new Date(student.lastPresentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-bold ${
                          isCritical
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {isCritical ? "🔴 CRITICAL" : "🟡 WARNING"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 text-xs font-bold gap-1 border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer">
                            <MessageSquare size={12} className="text-emerald-500" /> WhatsApp
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs font-bold gap-1 border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer">
                            <Phone size={12} className="text-primary" /> Call
                          </Button>
                          {isCritical && (
                            <Button variant="destructive" size="sm" className="h-7 text-xs font-bold shadow-xs cursor-pointer">
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
