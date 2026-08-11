import React, { useState } from "react";
import { Search, Save, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { useStudentStore } from "../../../store/student.store";
import { useAttendanceStore } from "../../../store/attendance.store";
import { AttendanceStatus } from "../../../constants/status";
import { useNotificationStore } from "../../../store/notification.store";

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
  const { students } = useStudentStore();
  const { getAttendanceForDate, markAttendance, markBulkAttendance } = useAttendanceStore();
  const { addNotification } = useNotificationStore();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState<string>("branch-1"); // Default to main campus
  const [searchTerm, setSearchTerm] = useState("");

  const todaysAttendance = getAttendanceForDate(date);

  // Filter students based on branch and search term
  const filteredStudents = students.filter(
    (student) =>
      student.branchId === branchFilter &&
      (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMarkStatus = (studentId: string, status: AttendanceStatus) => {
    markAttendance(studentId, status, date);
  };

  const handleMarkAllPresent = () => {
    const studentIds = filteredStudents.map(s => s.id);
    markBulkAttendance(studentIds, AttendanceStatus.PRESENT, date);
    addNotification(`Marked ${studentIds.length} students as Present`, "success");
  };

  const getStudentStatus = (studentId: string): AttendanceStatus | undefined => {
    return todaysAttendance.find(a => a.studentId === studentId)?.status;
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
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Mark All Present
          </Button>
          <Button 
            className="bg-accent-primary hover:bg-accent-secondary text-white"
            onClick={() => addNotification("Attendance sheet saved successfully!", "success")}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
              <CalendarIcon className="h-5 w-5 text-accent-primary" />
              Daily Roster
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
              {/* Branch Selector */}
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-border/50 bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="branch-1">Main Campus (Bengaluru)</option>
                <option value="branch-2">North Campus</option>
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
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[100px] font-semibold text-text-secondary">Code</TableHead>
                    <TableHead className="font-semibold text-text-secondary">Student Name</TableHead>
                    <TableHead className="w-[400px] font-semibold text-text-secondary text-center">Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const currentStatus = getStudentStatus(student.id);
                    return (
                      <TableRow key={student.id} className="border-border/50 hover:bg-bg-secondary/50 transition-colors">
                        <TableCell className="font-medium text-text-muted text-xs">
                          {student.studentCode}
                        </TableCell>
                        <TableCell className="font-medium text-text-primary">
                          {student.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center gap-1 sm:gap-2">
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.PRESENT ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.PRESENT ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(student.id, AttendanceStatus.PRESENT)}
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.ABSENT ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.ABSENT ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:text-red-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(student.id, AttendanceStatus.ABSENT)}
                            >
                              Absent
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.LATE ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.LATE ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'hover:bg-yellow-50 hover:text-yellow-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(student.id, AttendanceStatus.LATE)}
                            >
                              Late
                            </Button>
                            <Button
                              type="button"
                              variant={currentStatus === AttendanceStatus.EXCUSED ? "default" : "outline"}
                              size="sm"
                              className={`h-8 px-3 text-xs ${currentStatus === AttendanceStatus.EXCUSED ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50 hover:text-blue-600 border-border/50'}`}
                              onClick={() => handleMarkStatus(student.id, AttendanceStatus.EXCUSED)}
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
              <CalendarIcon className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No students found</h3>
              <p className="text-text-secondary max-w-sm mx-auto mb-6">
                No students match your current filters for this branch.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
