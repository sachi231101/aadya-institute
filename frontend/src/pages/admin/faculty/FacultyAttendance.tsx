import React, { useState } from "react";
import {
  Clock,
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { useFacultyStore } from "../../../store/faculty.store";
import type { AttendanceStatus } from "../../../types/faculty.types";
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
  const { facultyList, attendanceRecords, markAttendance } = useFacultyStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(facultyList[0]?.id || "");
  const [logStatus, setLogStatus] = useState<AttendanceStatus>("PRESENT");
  const [checkInTime, setCheckInTime] = useState<string>("09:30 AM");
  const [checkOutTime, setCheckOutTime] = useState<string>("05:30 PM");
  const [logNotes, setLogNotes] = useState<string>("");

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.facultyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || record.status === statusFilter;
    const matchesDate = !selectedDate || record.date === selectedDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const leaveCount = attendanceRecords.filter((r) => r.status === "LEAVE").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "ABSENT").length;

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const faculty = facultyList.find((f) => f.id === selectedFacultyId);
    if (!faculty) return;

    markAttendance({
      facultyId: faculty.id,
      facultyName: faculty.name,
      date: selectedDate,
      status: logStatus,
      checkIn: logStatus === "PRESENT" ? checkInTime : undefined,
      checkOut: logStatus === "PRESENT" ? checkOutTime : undefined,
      notes: logNotes,
    });

    setLogNotes("");
    setShowLogModal(false);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="success">Present</Badge>;
      case "LEAVE":
        return <Badge variant="warning">On Leave</Badge>;
      case "ABSENT":
        return <Badge variant="destructive">Absent</Badge>;
      case "HALF_DAY":
        return <Badge variant="secondary">Half Day</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Faculty Attendance</h2>
          <p className="text-sm text-text-secondary">
            Monitor daily check-ins, check-outs, leave logs, and attendance history.
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
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Present Today</p>
              <h3 className="text-2xl font-bold text-text-primary">{presentCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">On Approved Leave</p>
              <h3 className="text-2xl font-bold text-text-primary">{leaveCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Absent</p>
              <h3 className="text-2xl font-bold text-text-primary">{absentCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Punctuality Score</p>
              <h3 className="text-2xl font-bold text-text-primary">96.5%</h3>
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

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Search faculty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-bg-secondary border-border/50"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary w-full sm:w-auto"
              >
                <option value="ALL">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-text-secondary">Faculty Name</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Date</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Status</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Check-In</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Check-Out</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Notes / Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                      <TableCell className="font-medium text-text-primary">
                        {record.facultyName}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-text-secondary">
                        {record.date}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {record.checkIn || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {record.checkOut || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted italic max-w-xs truncate">
                        {record.notes || "No remarks"}
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
                No logs match your selected date or search parameters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate("");
                  setSearchTerm("");
                  setStatusFilter("ALL");
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
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facultyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status *</label>
                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value as AttendanceStatus)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="PRESENT">Present</option>
                  <option value="LEAVE">On Leave</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              {logStatus === "PRESENT" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Check-In Time</label>
                    <Input
                      type="text"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Check-Out Time</label>
                    <Input
                      type="text"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <Input
                  type="text"
                  placeholder="e.g. Conducted evening workshop"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>

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
                  Save Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
