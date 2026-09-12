import React, { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Clock,
  Wallet,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { useFeeStudents, useFeeStats } from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FeeStudentRow } from "@/types/fee.types";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PendingFees } from "./PendingFees";
import { CollectFeeModal } from "./CollectFeeModal";
import { FeeToastBanner, useFeeToast } from "./FeeToast";

const statusVariant = (status: FeeStudentRow["status"]) => {
  if (status === "Overdue") return "destructive" as const;
  if (status === "Paid") return "success" as const;
  return "outline" as const;
};

export const StudentFees: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();
  const { toast, showToast, clearToast } = useFeeToast();

  const tab = searchParams.get("tab") === "pending" ? "pending" : "students";
  const dueWithinDaysParam = searchParams.get("dueWithinDays");
  const dueWithinDays =
    dueWithinDaysParam && Number.isFinite(Number(dueWithinDaysParam))
      ? Number(dueWithinDaysParam)
      : undefined;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [collectStudent, setCollectStudent] = useState<FeeStudentRow | null>(null);

  const { data: statsData } = useFeeStats();
  const stats = statsData?.data;

  const { data, isLoading, isError, refetch } = useFeeStudents({
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const rows = data?.data?.data || [];
  const totalStudents = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;
  const totalFees = (stats?.totalCollected ?? 0) + (stats?.totalPendingDues ?? 0);

  const setTab = (next: string, extras?: { dueWithinDays?: number }) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "pending") nextParams.set("tab", "pending");
    else nextParams.delete("tab");
    if (extras?.dueWithinDays != null) {
      nextParams.set("dueWithinDays", String(extras.dueWithinDays));
    } else {
      nextParams.delete("dueWithinDays");
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Student Fees</h2>
          <p className="text-sm text-text-secondary">
            Find a student, collect dues, and send reminders from one workspace.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setTab("pending")}>
          <CreditCard className="h-4 w-4" /> Collect dues
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalStudents}</p>
              <p className="text-xs text-text-secondary">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatMoney(totalFees)}</p>
              <p className="text-xs text-text-secondary">Total Fees</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatMoney(stats?.totalCollected ?? 0)}</p>
              <p className="text-xs text-text-secondary">Collected</p>
            </div>
          </CardContent>
        </Card>
        <button type="button" className="text-left" onClick={() => setTab("pending")}>
          <Card className="border-border/50 h-full hover:border-amber-300 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatMoney(stats?.totalPendingDues ?? 0)}</p>
                <p className="text-xs text-text-secondary">Outstanding</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button type="button" className="text-left" onClick={() => setTab("pending")}>
          <Card className="border-border/50 h-full hover:border-red-300 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatMoney(stats?.overdueDues ?? 0)}</p>
                <p className="text-xs text-text-secondary">Overdue</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button
          type="button"
          className="text-left"
          onClick={() => setTab("pending", { dueWithinDays: 7 })}
        >
          <Card className="border-border/50 h-full hover:border-blue-300 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatMoney(stats?.dueThisWeek ?? 0)}</p>
                <p className="text-xs text-text-secondary">
                  Due this week
                  {(stats?.dueThisWeekCount ?? 0) > 0
                    ? ` · ${stats?.dueThisWeekCount}`
                    : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatMoney(stats?.todayCollected ?? 0)}</p>
              <p className="text-xs text-text-secondary">Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="pending">Pending dues</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search by name, code, phone, or admission no..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 px-3 border rounded-md text-sm min-w-[160px]"
                >
                  <option value="ALL">All statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                  <option value="None">None</option>
                </select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Next due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-red-600">
                        <AlertCircle className="w-5 h-5 inline mr-2" />
                        Failed to load.
                        <Button variant="link" onClick={() => refetch()}>
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-text-secondary">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`${basePath}/fees/students/${row.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs font-mono text-text-secondary">
                            {row.studentCode}
                            {row.admissionNo ? ` · ${row.admissionNo}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{row.courseName || "—"}</TableCell>
                        <TableCell>{row.batchName || "—"}</TableCell>
                        <TableCell className="font-medium">{formatMoney(row.totalFee)}</TableCell>
                        <TableCell className="text-emerald-700">{formatMoney(row.amountPaid)}</TableCell>
                        <TableCell className="font-bold text-red-700">
                          {formatMoney(row.balance)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {row.nextDueDate ? formatOrgDate(row.nextDueDate) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {row.balance > 0 && (
                              <PermissionGate itemKey="fees.pending" mode="write">
                                <Button
                                  size="sm"
                                  onClick={() => setCollectStudent(row)}
                                >
                                  Collect
                                </Button>
                              </PermissionGate>
                            )}
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`${basePath}/fees/students/${row.id}`}>
                                Profile
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-between items-center text-sm">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingFees embedded initialDueWithinDays={dueWithinDays} />
        </TabsContent>
      </Tabs>

      {collectStudent && (
        <CollectFeeModal
          mode="student"
          student={{
            id: collectStudent.id,
            name: collectStudent.name,
            admissionNo: collectStudent.admissionNo,
            outstanding: collectStudent.balance,
          }}
          onClose={() => setCollectStudent(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            void refetch();
          }}
        />
      )}

      <FeeToastBanner toast={toast} onClose={clearToast} />
    </div>
  );
};
