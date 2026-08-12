import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar as CalendarIcon, CheckCircle2, Loader2, AlertCircle, Plus, GraduationCap } from "lucide-react";
import { useAttendanceRoster, useMarkAttendance, useBulkMarkAttendance } from "../../../hooks/useStudents";
import { useBranches } from "../../../hooks/useBranches";
import { AttendanceStatus } from "../../../constants/status";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const StudentAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch branches for dropdown
  const { data: branchResponse } = useBranches();
  const branches = branchResponse?.data ?? [];

  // Fetch roster containing all students for selected date & branch
  const { data: rosterResponse, isLoading, isError, error } = useAttendanceRoster({
    date,
    branchId: branchFilter || undefined,
    limit: 100,
  });

  const roster = rosterResponse?.data ?? [];
  const markMutation = useMarkAttendance();
  const bulkMarkMutation = useBulkMarkAttendance();

  // Apply search filter
  const filteredRoster = roster.filter(
    (item) =>
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkStatus = (classSessionId: string, studentId: string, status: AttendanceStatus) => {
    markMutation.mutate({
      classSessionId,
      studentId,
      status,
    });
  };

  const handleMarkAllPresent = () => {
    if (filteredRoster.length === 0) return;

    const entries = filteredRoster.map((item) => ({
      classSessionId: item.classSessionId,
      studentId: item.studentId,
      status: AttendanceStatus.PRESENT as AttendanceStatus,
    }));

    bulkMarkMutation.mutate({ entries });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Attendance Sheet</h2>
          <p className="text-sm text-text-secondary">
            View and mark daily attendance for students by branch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="text-text-primary border-border/50"
            onClick={handleMarkAllPresent}
            disabled={bulkMarkMutation.isPending || filteredRoster.length === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Mark All Present
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
              <CalendarIcon className="h-5 w-5 text-accent-primary" />
              Daily Student Roster
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
              {/* Branch Selector */}
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-border/50 bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Date Selector */}
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-bg-secondary border-border/50 w-full sm:w-auto"
              />

              {/* Search Bar */}
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Search student..."
                  className="pl-9 bg-bg-secondary border-border/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
              <span className="ml-3 text-text-secondary">Loading attendance roster...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-60" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load attendance roster</h3>
              <p className="text-text-secondary max-w-sm mx-auto">
                {(error as any)?.response?.data?.message || "An unexpected error occurred. Please try again."}
              </p>
            </div>
          ) : filteredRoster.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[120px] font-semibold text-text-secondary">Student ID</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Student Name</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Branch</TableHead>
                    <TableHead className="w-[400px] font-semibold text-text-secondary text-center">Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoster.map((item) => {
                    const currentStatus = item.status;
                    return (
                      <TableRow key={item.studentId} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                        <TableCell className="font-medium text-text-muted text-xs">
                          {item.studentCode}
                        </TableCell>
                        <TableCell className="font-medium text-text-primary">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {item.branchName}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center gap-1 sm:gap-2">
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.PRESENT ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.PRESENT ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(item.classSessionId, item.studentId, AttendanceStatus.PRESENT as AttendanceStatus)}
                              disabled={markMutation.isPending}
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.ABSENT ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.ABSENT ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:text-red-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(item.classSessionId, item.studentId, AttendanceStatus.ABSENT as AttendanceStatus)}
                              disabled={markMutation.isPending}
                            >
                              Absent
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.LATE ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.LATE ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'hover:bg-yellow-50 hover:text-yellow-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(item.classSessionId, item.studentId, AttendanceStatus.LATE as AttendanceStatus)}
                              disabled={markMutation.isPending}
                            >
                              Late
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.EXCUSED ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.EXCUSED ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50 hover:text-blue-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(item.classSessionId, item.studentId, AttendanceStatus.EXCUSED as AttendanceStatus)}
                              disabled={markMutation.isPending}
                            >
                              Excused
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No students found</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                {searchTerm
                  ? `No students match "${searchTerm}" for this date.`
                  : "There are currently no students in this branch. Add a new student to start taking attendance."}
              </p>
              <Button
                className="bg-accent-primary hover:bg-accent-secondary text-white"
                onClick={() => navigate("/admin/students/add")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
