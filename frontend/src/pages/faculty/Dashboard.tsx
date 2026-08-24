import React from "react";
import { FacultyTimetable } from "@/pages/admin/faculty/FacultyTimetable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassStatus } from "@/types/schedule.types";

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
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Code2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();

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
            <Calendar size={16} /> Class Timetable
          </Button>
          <Button 
            onClick={() => navigate("/faculty/students/attendance")}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 transition-colors"
          >
            <UserCheck size={16} /> Mark Today's Attendance
          </Button>
        </div>
      </div>

      <InstallDashboardBanner />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Batches</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{batches.length}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Active Teaching Batches
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <BookOpen className="h-6 w-6" />
    <div className="p-4 sm:p-6 max-w-[1680px] mx-auto space-y-6">
      {/* Today's Scheduled Active Class Banner */}
      <Card className="bg-gradient-to-r from-blue-900 to-[#1769AA] text-white border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Code2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-white/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                  Today's Next Class
                </Badge>
                <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 border-0 font-extrabold text-[11px] px-2 py-0.5">
                  DM-01
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Full Stack Web Development
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-blue-100 font-medium">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 09:00 AM – 11:00 AM</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Mon, 18 Aug 2026</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Room 301, Main Block</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => navigate("/faculty/class-session")}
            className="bg-white text-[#1769AA] hover:bg-blue-50 font-black text-xs px-6 py-3 h-auto rounded-xl shadow-md gap-2 shrink-0 cursor-pointer"
          >
            <span>Open Class Session & Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Main Timetable View */}
      <FacultyTimetable />
    </div>
  );
};

