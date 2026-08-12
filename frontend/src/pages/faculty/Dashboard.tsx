import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  Search,
  Check,
  UserCheck,
  FileSpreadsheet
} from "lucide-react";
import { useStudentStore } from "@/store/student.store";
import { useCourseStore } from "@/store/course.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssignedStudentAttendance {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  batchName: string;
  course: string;
  attendanceStatus: "PRESENT" | "ABSENT" | "LEAVE";
  attendancePercentage: number;
  lastMarked: string;
  performanceGrade: "A+" | "A" | "B+" | "B";
}

const mockAssignedStudents: AssignedStudentAttendance[] = [
  { id: "STU-101", studentCode: "AAD-FS-011", name: "Aarav Sharma", email: "aarav.s@gmail.com", batchName: "FS-MARCH-2026-WD", course: "Full Stack Software Engineering", attendanceStatus: "PRESENT", attendancePercentage: 96, lastMarked: "Today, 09:30 AM", performanceGrade: "A+" },
  { id: "STU-102", studentCode: "AAD-FS-012", name: "Ananya Iyer", email: "ananya.iyer@gmail.com", batchName: "FS-MARCH-2026-WD", course: "Full Stack Software Engineering", attendanceStatus: "PRESENT", attendancePercentage: 92, lastMarked: "Today, 09:30 AM", performanceGrade: "A" },
  { id: "STU-103", studentCode: "AAD-DS-005", name: "Rohan Kulkarni", email: "rohan.k@gmail.com", batchName: "DS-AI-FEB-2026", course: "Data Science & AI Master", attendanceStatus: "ABSENT", attendancePercentage: 78, lastMarked: "Today, 09:30 AM", performanceGrade: "B+" },
  { id: "STU-104", studentCode: "AAD-DS-008", name: "Priya Nair", email: "priya.nair@gmail.com", batchName: "DS-AI-FEB-2026", course: "Data Science & AI Master", attendanceStatus: "PRESENT", attendancePercentage: 98, lastMarked: "Today, 09:30 AM", performanceGrade: "A+" },
  { id: "STU-105", studentCode: "AAD-CS-019", name: "Karthik Raja", email: "karthik.r@gmail.com", batchName: "CLOUD-DEVOPS-JAN", course: "Cloud DevOps Architecture", attendanceStatus: "LEAVE", attendancePercentage: 85, lastMarked: "Yesterday", performanceGrade: "B" },
];

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { students: globalStudents } = useStudentStore();
  const { batches } = useCourseStore();

  const [studentList, setStudentList] = useState<AssignedStudentAttendance[]>(mockAssignedStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("ALL");

  const handleToggleAttendance = (studentId: string, status: "PRESENT" | "ABSENT" | "LEAVE") => {
    setStudentList((prev) =>
      prev.map((stu) =>
        stu.id === studentId
          ? { ...stu, attendanceStatus: status, lastMarked: "Just now" }
          : stu
      )
    );
  };

  const filteredStudents = studentList.filter((stu) => {
    const matchesSearch =
      stu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stu.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stu.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch =
      selectedBatchFilter === "ALL" || stu.batchName === selectedBatchFilter;
    return matchesSearch && matchesBatch;
  });

  const presentCount = studentList.filter((s) => s.attendanceStatus === "PRESENT").length;
  const totalAssignedCount = studentList.length;
  const attendanceRate = Math.round((presentCount / totalAssignedCount) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-600" />
            Faculty Teaching Desk & Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Instructor Operations — Assigned Batches, Live Student Attendance & Performance Desk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/faculty/schedule/classes")}
            variant="outline"
            className="gap-2"
          >
            <Calendar size={16} /> View Schedule
          </Button>
          <Button 
            onClick={() => navigate("/faculty/students/attendance")}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 transition-colors"
          >
            <UserCheck size={16} /> Mark Today's Attendance
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Batches</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{batches.length || 3}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Active Teaching Batches
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Students</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{globalStudents.length || 48}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Across Active Modules
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Classes</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">2 Sessions</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Next: 02:00 PM</p>
            </div>
            <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Attendance Rate</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{attendanceRate}%</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {presentCount} / {totalAssignedCount} Present
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Students & Attendance Management Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="p-6 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              Assigned Students & Live Attendance Desk
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Review assigned students in your active batches and mark daily classroom attendance status.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white text-xs h-9"
              />
            </div>

            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Batches</option>
              <option value="FS-MARCH-2026-WD">FS-MARCH-2026-WD</option>
              <option value="DS-AI-FEB-2026">DS-AI-FEB-2026</option>
              <option value="CLOUD-DEVOPS-JAN">CLOUD-DEVOPS-JAN</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="font-semibold text-text-primary">Student Code & Name</TableHead>
                <TableHead className="font-semibold text-text-primary">Batch & Course</TableHead>
                <TableHead className="font-semibold text-text-primary">Attendance %</TableHead>
                <TableHead className="font-semibold text-text-primary">Today's Status</TableHead>
                <TableHead className="font-semibold text-text-primary text-right">Attendance Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No assigned students match your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((stu) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-700 block">{stu.studentCode}</span>
                        <span className="font-semibold text-slate-900 text-sm">{stu.name}</span>
                        <span className="text-xs text-muted-foreground block">{stu.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800 block">{stu.batchName}</span>
                      <span className="text-xs text-muted-foreground">{stu.course}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{stu.attendancePercentage}%</span>
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${stu.attendancePercentage >= 90 ? "bg-emerald-500" : stu.attendancePercentage >= 80 ? "bg-amber-500" : "bg-red-500"}`} 
                            style={{ width: `${stu.attendancePercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        stu.attendanceStatus === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          : stu.attendanceStatus === "ABSENT"
                          ? "bg-red-500/10 text-red-700 border-red-500/20"
                          : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      }>
                        {stu.attendanceStatus}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{stu.lastMarked}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant={stu.attendanceStatus === "PRESENT" ? "default" : "outline"}
                          className={`h-8 px-2.5 text-xs gap-1 ${
                            stu.attendanceStatus === "PRESENT" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          }`}
                          onClick={() => handleToggleAttendance(stu.id, "PRESENT")}
                        >
                          <Check className="h-3.5 w-3.5" /> Present
                        </Button>
                        <Button
                          size="sm"
                          variant={stu.attendanceStatus === "ABSENT" ? "default" : "outline"}
                          className={`h-8 px-2.5 text-xs gap-1 ${
                            stu.attendanceStatus === "ABSENT" ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-700 border-red-200 hover:bg-red-50"
                          }`}
                          onClick={() => handleToggleAttendance(stu.id, "ABSENT")}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={stu.attendanceStatus === "LEAVE" ? "default" : "outline"}
                          className={`h-8 px-2.5 text-xs gap-1 ${
                            stu.attendanceStatus === "LEAVE" ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700 border-amber-200 hover:bg-amber-50"
                          }`}
                          onClick={() => handleToggleAttendance(stu.id, "LEAVE")}
                        >
                          Leave
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Performance & Reports Preview Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-bg-tertiary/30 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-600" />
              Student Performance & Academic Reports
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/faculty/reports/students")}
              className="text-amber-700 hover:text-amber-800 gap-1"
            >
              View Complete Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-text-primary">Student Code & Name</TableHead>
              <TableHead className="font-semibold text-text-primary">Assigned Batch</TableHead>
              <TableHead className="font-semibold text-text-primary">Attendance Record</TableHead>
              <TableHead className="font-semibold text-text-primary">Performance Grade</TableHead>
              <TableHead className="font-semibold text-text-primary text-right">Academic Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAssignedStudents.map((stu) => (
              <TableRow key={`rep-${stu.id}`} className="hover:bg-slate-50/80 transition-colors">
                <TableCell>
                  <span className="font-mono text-xs font-bold text-amber-700 block">{stu.studentCode}</span>
                  <span className="font-medium text-text-primary text-xs">{stu.name}</span>
                </TableCell>
                <TableCell className="text-xs text-text-secondary font-medium">{stu.batchName}</TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-slate-800">{stu.attendancePercentage}% Attendance</span>
                </TableCell>
                <TableCell>
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold">
                    Grade {stu.performanceGrade}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigate("/faculty/reports/students")}
                    className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    View Report
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
