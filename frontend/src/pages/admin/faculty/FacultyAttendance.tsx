import React, { useState, useMemo } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  UserCheck,
  PlusCircle,
  Layers,
  MapPin
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBranches } from "@/hooks/useBranches";
import { useFacultyList, useFacultyAttendance, useMarkFacultyAttendance } from "@/hooks/useFaculty";
import { useBranchStore } from "@/store/branch.store";
import type { FacultyAttendanceRecord } from "@/types/faculty.types";

export const FacultyAttendance: React.FC = () => {
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modals state
  const [selectedRecordForView, setSelectedRecordForView] = useState<FacultyAttendanceRecord | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [logFacultyId, setLogFacultyId] = useState<string>("");
  const [logClassSessionId, setLogClassSessionId] = useState<string>("");
  const [logLoginAt, setLogLoginAt] = useState<string>("");
  const [logLogoutAt, setLogLogoutAt] = useState<string>("");
  const [logError, setLogError] = useState<string | null>(null);

  // Queries
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  const { data: facultyResponse } = useFacultyList({
    branchId: selectedBranchId !== "ALL" ? selectedBranchId : undefined,
    limit: 100,
  });
  const facultyMembers = facultyResponse?.data || [];

  const attendanceQueryParams = {
    branchId: selectedBranchId !== "ALL" ? selectedBranchId : undefined,
    facultyId: selectedFacultyId !== "ALL" ? selectedFacultyId : undefined,
    date: selectedDate || undefined,
    page: currentPage,
    limit: itemsPerPage,
  };

  const {
    data: attendanceResponse,
    isLoading,
    isError,
    refetch,
  } = useFacultyAttendance(attendanceQueryParams);

  const markAttendanceMutation = useMarkFacultyAttendance();

  const attendanceRecords = attendanceResponse?.data || [];
  const totalRecords = attendanceResponse?.meta?.total || attendanceRecords.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

  // Filter records locally by search query if present
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return attendanceRecords;
    const q = searchQuery.toLowerCase();
    return attendanceRecords.filter((rec) => {
      const name = rec.faculty?.user?.name?.toLowerCase() || "";
      const code = rec.faculty?.employeeCode?.toLowerCase() || "";
      const batchName = rec.classSession?.batch?.name?.toLowerCase() || "";
      const batchCode = rec.classSession?.batch?.code?.toLowerCase() || "";
      const courseName = rec.classSession?.batch?.course?.name?.toLowerCase() || "";
      return (
        name.includes(q) ||
        code.includes(q) ||
        batchName.includes(q) ||
        batchCode.includes(q) ||
        courseName.includes(q)
      );
    });
  }, [attendanceRecords, searchQuery]);

  // Summary Metrics
  const kpis = useMemo(() => {
    const total = attendanceRecords.length;
    const loggedIn = attendanceRecords.filter((r) => r.loginAt !== null).length;
    const completed = attendanceRecords.filter((r) => r.loginAt !== null && r.logoutAt !== null).length;
    const compliancePct = total > 0 ? Math.round((loggedIn / total) * 100) : 100;

    return {
      total,
      loggedIn,
      completed,
      compliancePct,
    };
  }, [attendanceRecords]);

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setSelectedFacultyId("ALL");
    setCurrentPage(1);
  };

  const handleLogAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logFacultyId || !logClassSessionId) {
      setLogError("Please provide both Faculty ID and Class Session ID.");
      return;
    }

    try {
      setLogError(null);
      await markAttendanceMutation.mutateAsync({
        facultyId: logFacultyId,
        classSessionId: logClassSessionId,
        loginAt: logLoginAt ? new Date(logLoginAt).toISOString() : undefined,
        logoutAt: logLogoutAt ? new Date(logLogoutAt).toISOString() : undefined,
      });
      setIsLogModalOpen(false);
      setLogFacultyId("");
      setLogClassSessionId("");
      setLogLoginAt("");
      setLogLogoutAt("");
      refetch();
    } catch (err: any) {
      setLogError(err?.response?.data?.message || "Failed to log faculty attendance.");
    }
  };

  const formatTimeDisplay = (isoStr: string | null) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1680px] mx-auto space-y-6 min-h-screen relative overflow-x-hidden animate-in fade-in duration-300">
      {/* ─── HEADER & BREADCRUMB ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <span>Faculty</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary font-bold">Attendance & Session Auditing</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Faculty Attendance Log
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5">
            Real-time audit log of faculty session logins, logouts, classroom presence, and teaching hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setLogError(null);
              setIsLogModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md gap-1.5 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Log Session Presence
          </Button>
        </div>
      </div>

      {/* ─── SUMMARY KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Scheduled</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{kpis.total}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Class sessions on date</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 flex items-center justify-center text-primary dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Logged In</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.loggedIn}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Faculty verified in class</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sessions Completed</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{kpis.completed}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Logout recorded</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Session Compliance</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{kpis.compliancePct}%</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Attendance verification</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search faculty, code, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-muted/30 border-border"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs rounded-xl bg-muted/30 border-border font-medium cursor-pointer"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full h-9 px-3 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
            >
              <option value="ALL">🌐 All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div>
            <select
              value={selectedFacultyId}
              onChange={(e) => {
                setSelectedFacultyId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
            >
              <option value="ALL">All Instructors ({facultyMembers.length})</option>
              {facultyMembers.map((f: any) => (
                <option key={f.id} value={f.id}>
                  👨‍🏫 {f.user?.name || f.name} ({f.employeeCode || "FA"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ─── ATTENDANCE RECORDS TABLE ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pl-6">Faculty</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Branch & Location</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Batch & Course</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Scheduled Timing</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Login / Logout</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pr-6 text-center">Audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-xs font-medium">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    Loading real-time faculty attendance records...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-rose-500 text-xs font-medium">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
                    Failed to fetch attendance logs from database.
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 flex items-center justify-center mx-auto mb-3 text-primary dark:text-sky-400 shadow-2xs">
                      <Clock className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-black text-foreground">No Attendance Records Found</h4>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      No session attendance has been logged for {selectedDate ? formatDateDisplay(selectedDate) : "the selected filters"}.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((rec) => {
                  const facultyName = rec.faculty?.user?.name || "Faculty Member";
                  const facultyCode = rec.faculty?.employeeCode || "FA";
                  const branchName = rec.faculty?.branch?.name || "Aadya Branch";
                  const batchName = rec.classSession?.batch?.name || "Cohort";
                  const batchCode = rec.classSession?.batch?.code || "";
                  const courseName = rec.classSession?.batch?.course?.name || "Curriculum";
                  const room = rec.classSession?.roomNo || "Room 101";

                  const isLoggedIn = rec.loginAt !== null;
                  const isLoggedOut = rec.logoutAt !== null;

                  let statusBadge = (
                    <Badge variant="outline" className="bg-slate-500/10 text-muted-foreground border-border text-[11px] font-bold">
                      Not Logged
                    </Badge>
                  );

                  if (isLoggedIn && isLoggedOut) {
                    statusBadge = (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold">
                        Completed
                      </Badge>
                    );
                  } else if (isLoggedIn) {
                    statusBadge = (
                      <Badge variant="outline" className="bg-blue-500/10 text-primary dark:text-sky-400 border-blue-500/20 text-[11px] font-bold">
                        Active (In Class)
                      </Badge>
                    );
                  }

                  return (
                    <TableRow key={rec.id} className="border-b border-border/70 hover:bg-muted/30 transition-colors text-xs">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                            {facultyName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{facultyName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{facultyCode}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <p className="font-semibold text-foreground">{branchName}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {room}
                        </p>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <p className="font-bold text-foreground">{batchName}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{courseName}</p>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="font-medium text-foreground">
                          {rec.classSession?.startTime} – {rec.classSession?.endTime}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {formatDateDisplay(rec.classSession?.scheduledDate)}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="text-xs font-mono font-medium text-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">In:</span> {formatTimeDisplay(rec.loginAt)}
                        </div>
                        <div className="text-xs font-mono font-medium text-muted-foreground">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Out:</span> {formatTimeDisplay(rec.logoutAt)}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">{statusBadge}</TableCell>

                      <TableCell className="pr-6 py-3.5 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecordForView(rec)}
                          className="h-7 px-3 text-xs border-border bg-card text-foreground hover:bg-primary hover:text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 bg-muted/20 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Showing {filteredRecords.length} of {totalRecords} records
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs border-border"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>
            <span className="text-xs font-bold text-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs border-border"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── VIEW DETAILS DIALOG ─── */}
      <Dialog open={!!selectedRecordForView} onOpenChange={(open) => !open && setSelectedRecordForView(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Faculty Attendance Audit Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detailed breakdown of session presence and system verification.
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForView && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-muted/30 p-3 rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Faculty Name:</span>
                  <span className="font-bold text-foreground">{selectedRecordForView.faculty?.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Employee Code:</span>
                  <span className="font-mono text-foreground font-bold">{selectedRecordForView.faculty?.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Branch:</span>
                  <span className="text-foreground font-medium">{selectedRecordForView.faculty?.branch?.name || "Main Branch"}</span>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Batch:</span>
                  <span className="font-bold text-foreground">{selectedRecordForView.classSession?.batch?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Course:</span>
                  <span className="text-foreground">{selectedRecordForView.classSession?.batch?.course?.name || "Curriculum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Scheduled Date:</span>
                  <span className="font-mono text-foreground">{formatDateDisplay(selectedRecordForView.classSession?.scheduledDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Scheduled Hours:</span>
                  <span className="font-mono text-foreground">
                    {selectedRecordForView.classSession?.startTime} – {selectedRecordForView.classSession?.endTime}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Login Timestamp:</span>
                  <span className="font-mono text-foreground font-bold">
                    {selectedRecordForView.loginAt ? new Date(selectedRecordForView.loginAt).toLocaleString("en-IN") : "Not Logged"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Logout Timestamp:</span>
                  <span className="font-mono text-foreground font-bold">
                    {selectedRecordForView.logoutAt ? new Date(selectedRecordForView.logoutAt).toLocaleString("en-IN") : "In Progress / Not Logged"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedRecordForView(null)}
              className="text-xs font-bold border-border"
            >
              Close Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MANUAL LOG PRESENCE DIALOG ─── */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Log Faculty Presence for Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually record or correct faculty login and logout timestamps.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogAttendanceSubmit} className="space-y-4 py-2">
            {logError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold border border-destructive/20">
                {logError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Select Faculty Member *</label>
              <select
                value={logFacultyId}
                onChange={(e) => setLogFacultyId(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs font-medium text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Choose Instructor...</option>
                {facultyMembers.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || f.name} ({f.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Class Session ID *</label>
              <Input
                type="text"
                placeholder="Paste class session cuid..."
                value={logClassSessionId}
                onChange={(e) => setLogClassSessionId(e.target.value)}
                required
                className="h-9 text-xs rounded-xl bg-muted/30 border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Login Time</label>
                <Input
                  type="datetime-local"
                  value={logLoginAt}
                  onChange={(e) => setLogLoginAt(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Logout Time</label>
                <Input
                  type="datetime-local"
                  value={logLogoutAt}
                  onChange={(e) => setLogLogoutAt(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLogModalOpen(false)}
                className="text-xs font-bold border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={markAttendanceMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-bold"
              >
                {markAttendanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Presence
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
