import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Clock,
  Calendar,
  Plus,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Loader2
} from "lucide-react";
import { useFacultyAttendance, useMarkFacultyAttendance, useFacultyList } from "../../../hooks/useFaculty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const FacultyAttendance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "";

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>(initialFacultyId || "ALL");

  // Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [logFacultyId, setLogFacultyId] = useState<string>("");
  const [logClassSessionId, setLogClassSessionId] = useState<string>("");
  const [logLoginAt, setLogLoginAt] = useState<string>("");
  const [logLogoutAt, setLogLogoutAt] = useState<string>("");

  // Fetch data from backend
  const attendanceParams = {
    limit: 50,
    date: selectedDate || undefined,
    facultyId: selectedFacultyFilter !== "ALL" ? selectedFacultyFilter : undefined,
  };

  const { data: attendanceResponse, isLoading, isError } = useFacultyAttendance(attendanceParams);
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const markMutation = useMarkFacultyAttendance();

  const records = attendanceResponse?.data ?? [];
  const facultyList = facultyResponse?.data ?? [];

  const loggedInCount = records.filter((r) => r.loginAt).length;
  const loggedOutCount = records.filter((r) => r.logoutAt).length;

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logFacultyId || !logClassSessionId) return;

    try {
      await markMutation.mutateAsync({
        facultyId: logFacultyId,
        classSessionId: logClassSessionId,
        loginAt: logLoginAt || undefined,
        logoutAt: logLogoutAt || undefined,
      });

      setLogFacultyId("");
      setLogClassSessionId("");
      setLogLoginAt("");
      setLogLogoutAt("");
      setShowLogModal(false);
    } catch (error) {
      console.error("Failed to log attendance:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Faculty Attendance</h2>
          <p className="text-sm text-text-secondary">
            Monitor daily check-ins, check-outs, and attendance history for class sessions.
          </p>
        </div>

        <Button
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
          onClick={() => setShowLogModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Mark Faculty Attendance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Records</p>
              <h3 className="text-2xl font-bold text-text-primary">{attendanceResponse?.meta?.total ?? records.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Logged In</p>
              <h3 className="text-2xl font-bold text-text-primary">{loggedInCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Logged Out</p>
              <h3 className="text-2xl font-bold text-text-primary">{loggedOutCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Faculty Count</p>
              <h3 className="text-2xl font-bold text-text-primary">{facultyResponse?.meta?.total ?? 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Attendance Log Table Card */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
              <Clock className="h-5 w-5 text-[#1769AA]" />
              Attendance Log Records
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="h-4 w-4 text-text-muted" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-40 bg-bg-secondary border-border/50"
                />
              </div>

              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary w-full sm:w-60"
              >
                <option value="ALL">All Faculty</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.user.name} ({f.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
              <span className="ml-3 text-text-secondary">Loading attendance...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load attendance</h3>
              <p className="text-text-secondary max-w-sm mx-auto">Please try again later.</p>
            </div>
          ) : records.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-text-secondary">Faculty Name</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Date</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Batch / Session</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Login</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Logout</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Session Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                      <TableCell className="font-medium text-text-primary">
                        {record.faculty?.user?.name ?? "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-text-secondary">
                        {formatDate(record.classSession.scheduledDate)}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        <div className="flex flex-col">
                          <span className="font-medium">{record.classSession.batch?.name ?? "—"}</span>
                          <span className="text-xs text-text-muted font-mono">{record.classSession.batch?.code ?? ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {record.loginAt ? (
                          <Badge variant="success" className="text-xs">{formatTime(record.loginAt)}</Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {record.logoutAt ? (
                          <Badge variant="outline" className="text-xs">{formatTime(record.logoutAt)}</Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {record.classSession.startTime} – {record.classSession.endTime}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No attendance records found</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                No logs match your selected date or faculty filter.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate("");
                  setSelectedFacultyFilter("ALL");
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Marking Attendance */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#1769AA]" />
              Mark Faculty Attendance Log
            </h3>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Faculty *</label>
                <select
                  value={logFacultyId}
                  onChange={(e) => setLogFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  <option value="">Select a faculty member</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user.name} ({f.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Session ID *</label>
                <Input
                  type="text"
                  placeholder="Enter class session ID"
                  value={logClassSessionId}
                  onChange={(e) => setLogClassSessionId(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Login Time</label>
                  <Input
                    type="datetime-local"
                    value={logLoginAt}
                    onChange={(e) => setLogLoginAt(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Logout Time</label>
                  <Input
                    type="datetime-local"
                    value={logLogoutAt}
                    onChange={(e) => setLogLogoutAt(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {markMutation.isError && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                  Failed to log attendance. Please verify the class session ID.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                >
                  {markMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Log"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
