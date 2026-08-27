import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Check, 
  X, 
  Clock, 
  Users, 
  Calendar, 
  MapPin, 
  Video, 
  Download, 
  Upload, 
  ChevronDown, 
  Bell, 
  Code2,
  ArrowRight,
  Save
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useQuery } from "@tanstack/react-query";
import { classSessionsApi } from "../../services/class-sessions.api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

interface StudentRecord {
  id: string;
  studentId: string;
  name: string;
  avatar: string;
  email: string;
  status: AttendanceStatus;
  remarks: string;
  isSelected: boolean;
}

export const FacultyMarkAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const { user } = useAuthStore();
  const facultyName = user?.name || "Faculty Member";
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: sessionAttendanceRes, isLoading: sessionLoading } = useQuery({
    queryKey: ["class-session-attendance", sessionId],
    queryFn: () => classSessionsApi.getAttendance(sessionId),
    enabled: Boolean(sessionId),
  });

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedPopupOpen, setIsSavedPopupOpen] = useState(false);

  React.useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setSaveError("Open attendance from My Classes with a valid sessionId. Saving without a session is disabled.");
      return;
    }

    const roster = sessionAttendanceRes?.data?.students;
    if (Array.isArray(roster) && roster.length > 0) {
      setStudents(
        roster.map((s: any) => {
          const name = s.name || "Student";
          const rawStatus = s.status as string | null;
          const status: AttendanceStatus =
            rawStatus === "ABSENT" ? "ABSENT" : rawStatus === "LEAVE" ? "EXCUSED" : "PRESENT";
          return {
            id: s.studentId || s.id,
            studentId: s.studentCode || `STU-${String(s.studentId || s.id).slice(0, 4)}`,
            name,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            email: s.email || "",
            status,
            remarks: s.remarks || "",
            isSelected: true,
          };
        })
      );
      setSaveError(null);
      return;
    }

    if (!sessionLoading) {
      setStudents([]);
    }
  }, [sessionAttendanceRes, sessionId, sessionLoading]);

  // Real status counts based on active batch enrollment
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const presentCount = students.filter(s => s.status === "PRESENT").length;
    const absentCount = students.filter(s => s.status === "ABSENT").length;
    const excusedCount = students.filter(s => s.status === "EXCUSED").length;

    return {
      total: totalStudents,
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
    };
  }, [students]);

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === id ? { ...student, status: newStatus } : student
      )
    );
  };

  const handleRemarkChange = (id: string, remark: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === id ? { ...student, remarks: remark } : student
      )
    );
  };

  const handleToggleSelect = (id: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === id ? { ...student, isSelected: !student.isSelected } : student
      )
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setStudents(prev => prev.map(s => ({ ...s, isSelected: checked })));
  };

  const handleSaveAttendance = async () => {
    if (!sessionId) {
      setSaveError("Open attendance from a class session (sessionId required). Go to My Classes and open a session.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await classSessionsApi.saveAttendance(
        sessionId,
        students.map((s) => ({
          studentId: s.id,
          status: s.status === "EXCUSED" ? "LEAVE" : s.status,
          remarks: s.remarks || undefined,
        }))
      );
      setIsSavedPopupOpen(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || err?.message || "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ─── 1. TOP HEADER & GREETING ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Hello, {facultyName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Take attendance and start your class session.
          </p>
        </div>

        {/* Top Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Date Selector Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">Mon, 18 Aug 2026</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
            </button>
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
              5
            </span>
          </div>

          {/* Profile Badge */}
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
              RK
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">{facultyName}</span>
              <span className="text-[10px] font-medium text-slate-400 block leading-tight">Faculty</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. CLASS HEADER CARD & 4-STEP PROGRESS INDICATOR ────────────────── */}
      <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Class Information */}
            <div className="flex items-start sm:items-center gap-4">
              {/* Class Icon */}
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5B50EC] shrink-0 shadow-2xs">
                <Code2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Full Stack Web Development
                  </h2>
                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200/60 font-bold text-xs px-2.5 py-0.5 rounded-md">
                    DM-01
                  </Badge>
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>09:00 AM – 11:00 AM</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mon, 18 Aug 2026</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Room 301, Main Block</span>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 font-semibold text-[11px] px-2 py-0.5 rounded-md">
                    Campus
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right: 4-Step Progress Indicator */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 overflow-x-auto pb-1 lg:pb-0">
              {/* Step 1: Attendance (Completed) */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Attendance</span>
                </div>
              </div>

              {/* Connecting Line 1 */}
              <div className="w-6 sm:w-8 h-0.5 bg-slate-200 shrink-0" />

              {/* Step 2: Class Session (Active Stage) */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-600 block leading-tight">Class Session</span>
                </div>
              </div>

              {/* Connecting Line 2 */}
              <div className="w-6 sm:w-8 h-0.5 bg-slate-200 shrink-0" />

              {/* Step 3: Class Content */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <div className="text-left">
                  <span className="text-xs font-medium text-slate-400 block leading-tight">Class Content</span>
                </div>
              </div>

              {/* Connecting Line 3 */}
              <div className="w-6 sm:w-8 h-0.5 bg-slate-200 shrink-0" />

              {/* Step 4: Complete Class */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs font-semibold">
                  4
                </div>
                <div className="text-left">
                  <span className="text-xs font-medium text-slate-400 block leading-tight">Complete Class</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. MARK ATTENDANCE TABLE SECTION ────────────────────────────────── */}
      <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Top Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Metric Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#1769AA]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Mark Attendance</h3>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Total Students: {stats.total}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Present: {stats.present}
                </Badge>
                <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Absent: {stats.absent}
                </Badge>
                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Excused: {stats.excused}
                </Badge>
              </div>
            </div>

            {/* Import / Export Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold gap-1.5 hover:bg-slate-50 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold gap-1.5 hover:bg-slate-50 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </Button>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#5B50EC] focus:ring-[#5B50EC] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No students enrolled in this batch yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Admitted students assigned to this batch will appear here automatically.</p>
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={student.isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="rounded border-slate-300 text-[#5B50EC] focus:ring-[#5B50EC] cursor-pointer"
                        />
                      </td>

                      {/* Index */}
                      <td className="py-3.5 px-3 font-semibold text-slate-400">{idx + 1}</td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">{student.studentId}</td>

                      {/* Student Avatar + Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 rounded-full border border-slate-200">
                            <AvatarImage src={student.avatar} alt={student.name} />
                            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-slate-900 text-xs">{student.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-medium text-slate-500">{student.email}</td>

                      {/* Status Toggle Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "PRESENT")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              student.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "ABSENT")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              student.status === "ABSENT"
                                ? "bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>

                          {/* Excused Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "EXCUSED")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              student.status === "EXCUSED"
                                ? "bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Excused</span>
                          </button>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        {student.status === "EXCUSED" || student.status === "ABSENT" ? (
                          <div className="relative">
                            <Input
                              type="text"
                              value={student.remarks}
                              onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                              placeholder="Add remarks (optional)..."
                              className="h-8 text-xs bg-slate-50 border-slate-200 rounded-lg pr-7"
                            />
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={student.remarks}
                            onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                            placeholder="Add remarks (optional)..."
                            className="h-8 text-xs bg-transparent border-slate-200 rounded-lg"
                          />
                        )}
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Student Counter */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span>Showing {students.length} Students in Active Batch</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">{students.length} / {students.length} Students Marked</span>
              <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── BOTTOM STICKY ACTION BAR ───────────────────────────────── */}
      <div className="sticky bottom-4 z-20 p-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl flex flex-col gap-3 shadow-lg">
        {saveError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {saveError}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-black text-slate-900 block leading-tight">
              {students.length} Students in Session Roster
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              {sessionId
                ? "Attendance saves to the selected class session."
                : "Open this page from My Classes with a sessionId."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveAttendance}
              disabled={isSaving || !sessionId || students.length === 0}
              className="bg-white hover:bg-slate-50 text-[#1769AA] border-[#1769AA] text-xs font-bold h-11 px-5 rounded-xl shadow-2xs gap-2 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4 text-[#1769AA]" />
              <span>{isSaving ? "Saving..." : "Save Attendance"}</span>
            </Button>

            <Button
              onClick={() => {
                if (!sessionId) {
                  setSaveError("Open attendance from My Classes with a valid sessionId first.");
                  return;
                }
                navigate(`/faculty/class-session?id=${encodeURIComponent(sessionId)}&mode=live`, {
                  state: { live: true },
                });
              }}
              disabled={!sessionId}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-black h-11 px-6 rounded-xl shadow-md gap-2.5 transition-all hover:scale-[1.02] cursor-pointer group disabled:opacity-50 disabled:hover:scale-100"
            >
              <Video className="h-4 w-4 fill-white/20 stroke-[2.2]" />
              <span>Save & Go Live</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── ATTENDANCE SAVED CONFIRMATION POPUP MODAL ───────────────── */}
      <Dialog open={isSavedPopupOpen} onOpenChange={setIsSavedPopupOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border-slate-200/90 shadow-2xl">
          <DialogHeader className="text-center sm:text-center space-y-3">
            {/* Animated Check Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100/90 border-4 border-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in-75 duration-300">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Attendance Successfully Saved!
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                Student attendance records have been successfully saved for{" "}
                <span className="text-slate-900 font-bold">Full Stack Web Development (Batch DM-01)</span>.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Status Stats */}
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                ✓ {stats.present} Present
              </span>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold">
                ✕ {stats.absent} Absent
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
                ◷ {stats.excused} Excused
              </span>
            </div>
          </div>

          {/* SINGLE PROMINENT ACTION BUTTON: Go Online & Take Classes */}
          <div className="pt-2">
            <Button
              onClick={() => {
                setIsSavedPopupOpen(false);
                navigate("/faculty/class-session?mode=live", { state: { live: true } });
              }}
              className="w-full bg-[#1769AA] hover:bg-[#125890] text-white py-4 h-auto rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4 fill-white/20 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-sm font-black tracking-tight block leading-tight">
                  Go Online & Take Classes
                </span>
                <span className="text-[10px] font-medium text-blue-100 block leading-tight">
                  Start your live online class
                </span>
              </div>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
