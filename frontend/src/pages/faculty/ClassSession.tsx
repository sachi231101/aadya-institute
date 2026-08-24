import React, { useState, useMemo, useEffect } from "react";
import { 
  ArrowLeft,
  Check, 
  X, 
  Clock, 
  Users, 
  Video, 
  ChevronDown, 
  ArrowRight,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  MessageSquare,
  PhoneOff,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: "1",
    studentId: "STU-001",
    name: "Aarav Sharma",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
    email: "aarav.sharma@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "2",
    studentId: "STU-002",
    name: "Ananya Patel",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    email: "ananya.patel@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "3",
    studentId: "STU-003",
    name: "Rohan Verma",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
    email: "rohan.verma@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "4",
    studentId: "STU-004",
    name: "Ishita Gupta",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    email: "ishita.gupta@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "5",
    studentId: "STU-005",
    name: "Kavya Nair",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    email: "kavya.nair@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "6",
    studentId: "STU-006",
    name: "Vikram Malhotra",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    email: "vikram.malhotra@aadya.in",
    status: "PRESENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "39",
    studentId: "STU-039",
    name: "Virat Kohli",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80",
    email: "virat.kohli@aadya.in",
    status: "ABSENT",
    remarks: "Unexcused",
    isSelected: false,
  },
  {
    id: "40",
    studentId: "STU-040",
    name: "Hardik Pandya",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    email: "hardik.pandya@aadya.in",
    status: "ABSENT",
    remarks: "",
    isSelected: false,
  },
  {
    id: "41",
    studentId: "STU-041",
    name: "Smriti Mandhana",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    email: "smriti.mandhana@aadya.in",
    status: "EXCUSED",
    remarks: "Medical Leave",
    isSelected: false,
  },
  {
    id: "42",
    studentId: "STU-042",
    name: "Rishabh Pant",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    email: "rishabh.pant@aadya.in",
    status: "ABSENT",
    remarks: "Family Emergency",
    isSelected: false,
  },
];

export const FacultyClassSession: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const facultyName = user?.name || "Ramesh Kumar";

  const isLiveDirect = searchParams.get("mode") === "live" || (location.state as any)?.live;
  const [currentStep, setCurrentStep] = useState<number>(isLiveDirect ? 3 : 2); // 1: Details, 2: Attendance, 3: Take Class (Live Online Class), 4: Complete
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(Boolean(isLiveDirect));
  const [isSavedPopupOpen, setIsSavedPopupOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("mode") === "live" || (location.state as any)?.live) {
      setCurrentStep(3);
      setAttendanceSaved(true);
    }
  }, [searchParams, location.state]);

  // Live class session states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (currentStep === 3) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Status counts
  const stats = useMemo(() => {
    const presentCount = students.filter(s => s.status === "PRESENT").length;
    const absentCount = students.filter(s => s.status === "ABSENT").length;
    const excusedCount = students.filter(s => s.status === "EXCUSED").length;
    
    return {
      total: 42,
      present: 36 + presentCount,
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

  const handleSaveAttendance = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setAttendanceSaved(true);
      setIsSavedPopupOpen(true);
    }, 450);
  };

  const handleSaveAndGoLive = () => {
    setAttendanceSaved(true);
    setCurrentStep(3); // Immediately navigate to live online class
  };

  const handleEndClass = () => {
    setCurrentStep(4); // Move to Step 4: Complete
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
      {/* ─── 1. TOP HEADER & BREADCRUMB ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/faculty/dashboard")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Schedule</span>
          </button>

          <span className="text-[10px] font-extrabold text-[#5B50EC] tracking-widest uppercase block">
            CLASS SESSION
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Full Stack Web Development
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium mt-1">
            <span className="font-bold text-slate-700">Batch: DM-01</span>
            <span className="text-slate-300">•</span>
            <span>18 Aug 2026</span>
            <span className="text-slate-300">•</span>
            <span>09:00 AM – 11:00 AM</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700">Faculty: <strong className="text-slate-900">{facultyName}</strong></span>
          </div>
        </div>

        {/* Status Badge on Right */}
        <div className="flex items-center gap-3">
          {currentStep === 3 ? (
            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE IN SESSION</span>
            </Badge>
          ) : currentStep === 4 ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <Check className="w-3.5 h-3.5" />
              <span>COMPLETED</span>
            </Badge>
          ) : (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>SCHEDULED</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ─── 2. CLASS PROGRESS STEPPER ───────────────────────────────────────── */}
      <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
            {/* Step 1: Class Details (Completed) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-xs font-bold text-slate-800">1 Class Details</span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px]" />

            {/* Step 2: Mark Attendance */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                attendanceSaved || currentStep > 2
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : currentStep === 2
                  ? "bg-[#5B50EC] text-white shadow-2xs ring-4 ring-indigo-50"
                  : "bg-slate-100 border border-slate-300 text-slate-600"
              }`}>
                {attendanceSaved || currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
              </div>
              <span className={`text-xs font-bold ${
                currentStep === 2 ? "text-[#5B50EC]" : attendanceSaved ? "text-slate-800" : "text-slate-500"
              }`}>
                2 Mark Attendance
              </span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px]" />

            {/* Step 3: Take Class */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep === 3
                  ? "bg-[#5B50EC] text-white shadow-2xs ring-4 ring-indigo-50"
                  : currentStep > 3
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 border border-slate-200 text-slate-400"
              }`}>
                {currentStep > 3 ? <Check className="w-4 h-4 stroke-[3]" /> : "3"}
              </div>
              <span className={`text-xs font-bold ${
                currentStep === 3 ? "text-[#5B50EC]" : currentStep > 3 ? "text-slate-800" : "text-slate-400"
              }`}>
                3 Take Class
              </span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px]" />

            {/* Step 4: Complete */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 4
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-100 border border-slate-200 text-slate-400"
              }`}>
                {currentStep === 4 ? <Check className="w-4 h-4 stroke-[3]" /> : "4"}
              </div>
              <span className={`text-xs font-bold ${
                currentStep === 4 ? "text-emerald-700" : "text-slate-400"
              }`}>
                4 Complete
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── STAGE 2: MARK ATTENDANCE TABLE ──────────────────────────────────── */}
      {currentStep <= 2 && (
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header / Summary Badges */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1769AA]" />
                  <span>Mark Attendance</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Mark attendance for students enrolled in Batch DM-01.
                </p>
              </div>

              {/* 4 Summary Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Total Students: {stats.total}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  ✓ Present: {stats.present}
                </Badge>
                <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  ✕ Absent: {stats.absent}
                </Badge>
                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                  ◷ Excused: {stats.excused}
                </Badge>
              </div>
            </div>

            {/* Student Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-[#5B50EC] focus:ring-[#5B50EC] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.map((student, idx) => {
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

                        {/* Student Name with Avatar */}
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

                        {/* Student ID */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">{student.studentId}</td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-medium text-slate-500">{student.email}</td>

                        {/* Status Toggle Buttons */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Present */}
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

                            {/* Absent */}
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

                            {/* Excused */}
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
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── BOTTOM STICKY ACTION BAR ───────────────────────────────── */}
            <div className="sticky bottom-4 z-20 p-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              {/* Left Side: Count & Helper Text */}
              <div>
                <span className="text-sm font-black text-slate-900 block leading-tight">
                  42 / 42 Students Marked
                </span>
                <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                  All attendance changes are ready to be saved.
                </span>
              </div>

              {/* Right Side: Exactly Two Buttons */}
              <div className="flex items-center gap-3">
                {/* Save Attendance Button */}
                <Button
                  variant="outline"
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                  className="bg-white hover:bg-slate-50 text-[#1769AA] border-[#1769AA] text-xs font-bold h-11 px-5 rounded-xl shadow-2xs gap-2 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4 text-[#1769AA]" />
                  <span>{isSaving ? "Saving..." : "Save Attendance"}</span>
                </Button>

                {/* Save & Go Live Button */}
                <Button
                  onClick={handleSaveAndGoLive}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-black h-11 px-6 rounded-xl shadow-md gap-2.5 transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <Video className="h-4 w-4 fill-white/20 stroke-[2.2]" />
                  <span>Save & Go Live</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STAGE 3: LIVE ONLINE CLASSROOM INTERFACE ────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-400">
          {/* Live Header Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Full Stack Web Development</span>
                  <Badge className="bg-rose-500 text-white border-0 text-[10px] font-black px-2 py-0.5">
                    ● LIVE
                  </Badge>
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Session Timer: <strong className="text-white font-bold text-sm">{formatTimer(sessionSeconds)}</strong> • Batch DM-01
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>39 Students Connected</span>
              </div>
              <Button
                onClick={handleEndClass}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold gap-2 shadow-xs cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Class</span>
              </Button>
            </div>
          </div>

          {/* Live Video Stage / Presentation Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 h-[480px] relative overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-xl">
              {/* Faculty Main Cam Preview */}
              <div className="w-32 h-32 rounded-full bg-blue-600/20 border-4 border-blue-500/40 flex items-center justify-center text-white mb-4 animate-pulse">
                <Avatar className="w-28 h-28">
                  <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" />
                  <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">RK</AvatarFallback>
                </Avatar>
              </div>

              <h3 className="text-white font-bold text-base">Ramesh Kumar (Host)</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md">
                Live lecture broadcast in progress. Your screen, video, and audio are streaming to 39 connected students.
              </p>

              {/* Bottom In-Call Controls */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl">
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-2.5 rounded-xl text-white transition-colors cursor-pointer ${
                    isMicOn ? "bg-slate-700 hover:bg-slate-600" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  title={isMicOn ? "Mute Mic" : "Unmute Mic"}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`p-2.5 rounded-xl text-white transition-colors cursor-pointer ${
                    isCameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`p-2.5 rounded-xl text-white transition-colors cursor-pointer ${
                    isScreenSharing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                  title="Share Screen"
                >
                  <ScreenShare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`p-2.5 rounded-xl text-white transition-colors cursor-pointer ${
                    isChatOpen ? "bg-[#5B50EC]" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                  title="Toggle Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Side: Participant Stream / Chat */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between h-[480px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800">Connected Students (39)</h4>
                  <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-bold">
                    Active
                  </Badge>
                </div>

                <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[320px] pr-1">
                  {students
                    .filter(s => s.status === "PRESENT")
                    .map(student => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold text-slate-700">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                          <Mic className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400 font-medium">Session recorded automatically</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAGE 4: CLASS COMPLETED ────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm animate-in zoom-in-95 duration-400">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Class Session Completed Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Full Stack Web Development (Batch DM-01) attendance, session logs, and class recordings have been finalized.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/faculty/dashboard")}
              className="bg-[#1769AA] hover:bg-[#125890] text-white px-6 py-2.5 rounded-xl font-bold text-xs"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      )}

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
                setCurrentStep(3); // Go directly to Live Online Class
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
