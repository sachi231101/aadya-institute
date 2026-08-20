import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Trash2,
  Layers,
  GraduationCap,
  TrendingUp,
  MapPin,
  X,
  ArrowLeft,
  Check,
  Lock,
  Lightbulb,
  MoreVertical,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { useBranches } from "@/hooks/useBranches";
import { useFacultyList } from "@/hooks/useFaculty";
import { useBatches } from "@/hooks/useBatches";
import { useCourses } from "@/hooks/useCourses";
import { useStudentStore } from "@/store/student.store";
import { useTimetableStore, type TimetableSlotItem } from "@/store/timetable.store";

// ─── TYPES & DATA STRUCTURES ───────────────────────────────────────────────

export type SlotAttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED" | "UNMARKED";

export interface BatchStudentItem {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  avatar?: string;
  status: SlotAttendanceStatus;
  remarks: string;
  leaveReason?: string;
}

const EXCUSED_REASONS = [
  "Medical Leave",
  "Personal Emergency",
  "Official Leave",
  "Family Reason",
  "Academic Event",
  "Other",
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const DAYS_OF_WEEK = [
  { key: "MON", label: "Mon", sub: "18 Aug", dateStr: "18 Aug 2026" },
  { key: "TUE", label: "Tue", sub: "19 Aug", dateStr: "19 Aug 2026" },
  { key: "WED", label: "Wed", sub: "20 Aug", dateStr: "20 Aug 2026" },
  { key: "THU", label: "Thu", sub: "21 Aug", dateStr: "21 Aug 2026" },
  { key: "FRI", label: "Fri", sub: "22 Aug", dateStr: "22 Aug 2026" },
  { key: "SAT", label: "Sat", sub: "23 Aug", dateStr: "23 Aug 2026" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Digital Marketing": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200/80", dot: "bg-purple-500" },
  "Design": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200/80", dot: "bg-amber-500" },
  "Data Analytics": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200/80", dot: "bg-emerald-500" },
  "Programming": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200/80", dot: "bg-blue-500" },
  "Others": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200/80", dot: "bg-slate-500" },
};

// ─── INITIAL MOCK BATCH STUDENTS ───────────────────────────────────────────

const GENERATE_MOCK_STUDENTS = (batchCode: string, count: number = 42): BatchStudentItem[] => {
  const sampleNames = [
    "Rahul Verma", "Priya Sharma", "Aman Kumar", "Neha Gupta", "Vikram Singh",
    "Sneha Reddy", "Rohit Das", "Ananya Roy", "Karan Johar", "Divya Patel",
    "Siddharth Rao", "Pooja Hegde", "Aditya Joshi", "Kavya Menon", "Rohan Nair",
    "Meera Pillai", "Gaurav Sen", "Tanvi Shah", "Arnav Malhotra", "Shreya Ghoshal",
    "Manish Paul", "Isha Ambani", "Tarun Tahiliani", "Deepika Padukone", "Ranveer Singh",
    "Varun Dhawan", "Alia Bhatt", "Kartik Aaryan", "Kiara Advani", "Ayushmann Khurrana",
    "Rajkummar Rao", "Shraddha Kapoor", "Tiger Shroff", "Kriti Sanon", "Vicky Kaushal",
    "Katrina Kaif", "Ranbir Kapoor", "Anushka Sharma", "Virat Kohli", "Hardik Pandya",
    "Smriti Mandhana", "Rishabh Pant"
  ];

  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150",
  ];

  return Array.from({ length: Math.min(count, sampleNames.length) }, (_, i) => {
    const name = sampleNames[i] || `Student ${i + 1}`;
    const codeNum = String(i + 1).padStart(3, "0");
    return {
      id: `stu-${batchCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i + 1}`,
      studentCode: `STU-${codeNum}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@aadya.in`,
      avatar: avatars[i % avatars.length],
      status: i < 36 ? "PRESENT" : i < 40 ? "ABSENT" : "EXCUSED",
      remarks: i === 40 ? "Medical Leave" : i === 41 ? "Family Emergency" : "",
      leaveReason: i === 40 ? "Medical Leave" : i === 41 ? "Family Emergency" : undefined,
    };
  });
};

const INITIAL_FACULTY = [
  {
    id: "FA-RAMESH",
    name: "Ramesh Kumar",
    employeeCode: "FA001",
    specialization: "Digital Marketing & SEO",
    branchId: "b-central",
    branchName: "Aadya Central Branch",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "Active",
  },
  {
    id: "FA002",
    name: "Priya Sharma",
    employeeCode: "FA002",
    specialization: "Digital Marketing",
    branchId: "b-ramamurthy",
    branchName: "Ramanagar Branch",
    avatar: "https://i.pravatar.cc/150?u=priya",
    status: "Active",
  },
  {
    id: "FA005",
    name: "Arjun Das",
    employeeCode: "FA005",
    specialization: "Graphic Design",
    branchId: "b-malleswaram",
    branchName: "Malleshwaram Branch",
    avatar: "https://i.pravatar.cc/150?u=arjun",
    status: "Active",
  },
  {
    id: "FA008",
    name: "Neha Reddy",
    employeeCode: "FA008",
    specialization: "Data Analytics",
    branchId: "b-central",
    branchName: "Jayanagar Branch",
    avatar: "https://i.pravatar.cc/150?u=neha",
    status: "Active",
  },
  {
    id: "FA001",
    name: "HM Adithya",
    employeeCode: "FA003",
    specialization: "MERN Full Stack",
    branchId: "b-central",
    branchName: "Bengaluru Central",
    avatar: "https://i.pravatar.cc/150?u=adithya",
    status: "Active",
  },
];

export const FacultyTimetable: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Role permissions
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes("ADMIN");
  const isBranchManager = userRoles.includes("CENTER_MANAGER");
  const isCounsellor = userRoles.includes("COUNSELLOR");
  const isFacultyOnly = userRoles.includes("FACULTY") && !isAdmin && !isBranchManager && !isCounsellor;
  const canEditTimetable = isAdmin || isBranchManager || isCounsellor;

  // Real Database hooks & Store
  const { classes: timetableClasses, updateClass } = useTimetableStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const { batches: allBatches } = useBatches();
  const { courses: allCourses } = useCourses();
  const { students: globalStudents, fetchStudents } = useStudentStore();

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<string>("MON");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // ─── ACTIVE CLASS ATTENDANCE DESK SESSION ─────────────────────────────────
  const [activeAttendanceSession, setActiveAttendanceSession] = useState<TimetableSlotItem | null>(null);
  const [sessionStudents, setSessionStudents] = useState<BatchStudentItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState<string>("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving">("saved");
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // When active attendance session changes, load students for that specific batch
  useEffect(() => {
    if (activeAttendanceSession) {
      const batchCode = activeAttendanceSession.batchCode;
      const count = activeAttendanceSession.studentCount || 42;
      const generated = GENERATE_MOCK_STUDENTS(batchCode, count);

      if (activeAttendanceSession.attendanceStatus === "COMPLETED" && activeAttendanceSession.attendanceSummary) {
        setSessionStudents(generated);
      } else {
        setSessionStudents(generated);
      }
      setSelectedStudentIds(new Set());
      setValidationWarning(null);
    }
  }, [activeAttendanceSession]);

  // Logged-in faculty identification
  const loggedInFaculty = useMemo(() => {
    if (!user) return INITIAL_FACULTY[0];
    const userName = (user.name || "").trim().toLowerCase();
    const userEmail = (user.email || "").trim().toLowerCase();

    const match = INITIAL_FACULTY.find(
      (f) =>
        f.id === (user as any).facultyId ||
        f.id === user.id ||
        f.name.toLowerCase() === userName ||
        f.name.toLowerCase().includes(userName) ||
        userName.includes(f.name.toLowerCase()) ||
        (userEmail && f.name.toLowerCase().includes(userEmail.split("@")[0].toLowerCase()))
    );

    return match || {
      id: user.id || "FA-RAMESH",
      name: user.name || "Ramesh Kumar",
      employeeCode: "FA001",
      specialization: "Digital Marketing Faculty",
      branchId: user.branchId || "b-central",
      branchName: "Aadya Central Branch",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
      status: "Active",
    };
  }, [user]);

  // Filtered Faculty List
  const facultyList = useMemo(() => {
    const apiFac = facultyResponse?.data || [];
    if (apiFac.length > 0) {
      const formatted = apiFac.map((f: any) => ({
        id: f.id,
        name: f.name || f.user?.name || "Faculty Member",
        employeeCode: f.employeeCode || `FA-${f.id.slice(-4).toUpperCase()}`,
        specialization: f.specialization || "Instructor",
        branchId: f.branchId || "b-central",
        branchName: f.branch?.name || "Aadya Central Branch",
        avatar: `https://i.pravatar.cc/150?u=${f.id}`,
        status: f.status || "Active",
      }));
      // Merge with initial faculty list ensuring Ramesh Kumar and others exist
      const existingNames = new Set(formatted.map((f: any) => f.name.toLowerCase()));
      const extras = INITIAL_FACULTY.filter((f) => !existingNames.has(f.name.toLowerCase()));
      return [...formatted, ...extras];
    }
    return INITIAL_FACULTY;
  }, [facultyResponse]);

  const filteredFaculty = useMemo(() => {
    if (isFacultyOnly) {
      return [loggedInFaculty];
    }
    return facultyList.filter((f) => {
      const matchBranch = selectedBranch === "ALL" || f.branchId === selectedBranch || f.branchName === selectedBranch;
      const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [facultyList, selectedBranch, searchQuery, isFacultyOnly, loggedInFaculty]);

  // Filtered Classes for Grid
  const filteredClasses = useMemo(() => {
    return timetableClasses.filter((c) => {
      const matchCourse = selectedCourse === "ALL" || c.courseName === selectedCourse || c.category === selectedCourse;
      const matchSearch =
        !searchQuery ||
        c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.facultyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBranch = selectedBranch === "ALL" || c.branchId === selectedBranch || c.branchName === selectedBranch;

      if (isFacultyOnly) {
        const facName = loggedInFaculty.name.toLowerCase();
        const matchesFac =
          c.facultyId === loggedInFaculty.id ||
          c.facultyName.toLowerCase() === facName ||
          c.facultyName.toLowerCase().includes(facName) ||
          facName.includes(c.facultyName.toLowerCase());
        return matchesFac && matchCourse && matchSearch;
      }
      return matchCourse && matchSearch && matchBranch;
    });
  }, [timetableClasses, selectedCourse, searchQuery, selectedBranch, isFacultyOnly, loggedInFaculty]);

  // Key KPI Summary Calculations
  const kpis = useMemo(() => {
    const totalFaculty = isFacultyOnly ? 1 : filteredFaculty.length;
    const totalClasses = filteredClasses.length;
    const uniqueBatches = new Set(filteredClasses.map((c) => c.batchCode)).size;
    const teachingHours = filteredClasses.length * 1.5;
    const totalStudents = filteredClasses.reduce((acc, curr) => acc + (curr.studentCount || 42), 0);

    return {
      totalFaculty,
      totalClasses,
      totalBatches: uniqueBatches,
      teachingHours: Math.round(teachingHours),
      totalStudents,
      avgAttendance: "94%",
    };
  }, [filteredFaculty, filteredClasses, isFacultyOnly]);

  // Dynamic Week Date Label
  const weekDateLabel = useMemo(() => {
    if (weekOffset === 0) return "18 Aug – 23 Aug 2026";
    if (weekOffset > 0) return `Week +${weekOffset} (Aug 2026)`;
    return `Week ${weekOffset} (Aug 2026)`;
  }, [weekOffset]);

  // ─── SLOT CLICK HANDLER: INTERACTIVE ATTENDANCE DESK ───────────────────────
  const handleSlotClick = (cls: TimetableSlotItem) => {
    setActiveAttendanceSession(cls);
  };

  const handleFreeSlotClick = (dayLabel: string, periodNum: number) => {
    setNotificationMsg(`No class is scheduled for Period ${periodNum} on ${dayLabel}.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // ─── ATTENDANCE DESK ACTIONS ───────────────────────────────────────────────

  const triggerAutoSave = () => {
    setAutoSaveState("saving");
    setTimeout(() => setAutoSaveState("saved"), 400);
  };

  const handleStudentStatusChange = (studentId: string, status: SlotAttendanceStatus) => {
    setSessionStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const remarks = status === "EXCUSED" && !s.remarks ? "Medical Leave" : status === "PRESENT" ? "" : s.remarks;
          return {
            ...s,
            status,
            remarks,
            leaveReason: status === "EXCUSED" ? s.leaveReason || "Medical Leave" : undefined,
          };
        }
        return s;
      })
    );
    setValidationWarning(null);
    triggerAutoSave();
  };

  const handleStudentRemarksChange = (studentId: string, remarks: string) => {
    setSessionStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remarks } : s))
    );
    triggerAutoSave();
  };

  const handleMarkAllPresent = () => {
    setSessionStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "PRESENT",
        remarks: "",
      }))
    );
    setValidationWarning(null);
    triggerAutoSave();
    setNotificationMsg("All students marked as Present.");
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleBulkStatusChange = (status: SlotAttendanceStatus) => {
    if (selectedStudentIds.size === 0) return;
    setSessionStudents((prev) =>
      prev.map((s) => (selectedStudentIds.has(s.id) ? { ...s, status } : s))
    );
    setSelectedStudentIds(new Set());
    setValidationWarning(null);
    triggerAutoSave();
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.size === filteredSessionStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredSessionStudents.map((s) => s.id)));
    }
  };

  // Save Attendance & Sync Timetable Slot
  const handleSaveAttendance = () => {
    const unmarked = sessionStudents.filter((s) => s.status === "UNMARKED");
    if (unmarked.length > 0) {
      setValidationWarning(`${unmarked.length} students have not been marked. Please complete attendance before saving.`);
      return;
    }

    const present = sessionStudents.filter((s) => s.status === "PRESENT").length;
    const absent = sessionStudents.filter((s) => s.status === "ABSENT").length;
    const excused = sessionStudents.filter((s) => s.status === "EXCUSED").length;

    if (activeAttendanceSession) {
      updateClass(activeAttendanceSession.id, {
        attendanceStatus: "COMPLETED",
        attendanceSummary: { present, absent, excused },
      });

      setActiveAttendanceSession((prev) =>
        prev
          ? {
              ...prev,
              attendanceStatus: "COMPLETED",
              attendanceSummary: { present, absent, excused },
            }
          : null
      );
    }

    setNotificationMsg(`✓ Attendance saved successfully for ${activeAttendanceSession?.batchCode} (${present} P • ${absent} A • ${excused} E)`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Faculty,Employee Code,Branch,Day,Period,Course,Batch,Time,Room,Mode,Attendance Status\n";
    const rows = filteredClasses
      .map(
        (c) =>
          `"${c.facultyName}","${c.facultyId}","${c.branchName}","${c.dayOfWeek}","Period ${c.period}","${c.courseName}","${c.batchCode}","${c.startTime} - ${c.endTime}","${c.roomNo}","${c.mode}","${c.attendanceStatus || "PENDING"}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Aadya_Faculty_Timetable_${weekDateLabel.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered session students
  const filteredSessionStudents = useMemo(() => {
    return sessionStudents.filter((s) => {
      const matchSearch =
        !attendanceSearchTerm ||
        s.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(attendanceSearchTerm.toLowerCase());
      const matchStatus = attendanceStatusFilter === "ALL" || s.status === attendanceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [sessionStudents, attendanceSearchTerm, attendanceStatusFilter]);

  // Attendance Session Statistics
  const sessionTotal = sessionStudents.length;
  const sessionPresent = sessionStudents.filter((s) => s.status === "PRESENT").length;
  const sessionAbsent = sessionStudents.filter((s) => s.status === "ABSENT").length;
  const sessionExcused = sessionStudents.filter((s) => s.status === "EXCUSED").length;
  const sessionMarked = sessionPresent + sessionAbsent + sessionExcused;

  const sessionPercentage = sessionTotal > 0 ? ((sessionPresent / sessionTotal) * 100).toFixed(2) : "0.00";
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (parseFloat(sessionPercentage) / 100) * circumference;

  const currentDayObj = DAYS_OF_WEEK.find((d) => d.key === activeAttendanceSession?.dayOfWeek) || DAYS_OF_WEEK[0];

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: IF ACTIVE ATTENDANCE SESSION IS OPEN → RENDER CLASS ATTENDANCE DESK
  // ═══════════════════════════════════════════════════════════════════════════

  if (activeAttendanceSession) {
    return (
      <div className="space-y-6 max-w-[1680px] mx-auto pb-20 animate-in fade-in duration-200">
        {/* ─── BREADCRUMB & BACK NAVIGATION ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <button
              onClick={() => setActiveAttendanceSession(null)}
              className="hover:text-[#1769AA] flex items-center gap-1 font-bold text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> My Timetable
            </button>
            <span>/</span>
            <span className="text-slate-600">{currentDayObj.label}, {currentDayObj.sub}</span>
            <span>/</span>
            <span className="text-slate-600">Period {activeAttendanceSession.period}</span>
            <span>/</span>
            <span className="text-[#1769AA] font-bold">
              {activeAttendanceSession.courseName} – {activeAttendanceSession.batchCode}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveAttendanceSession(null)}
            className="text-xs font-bold h-8 px-3 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Timetable
          </Button>
        </div>

        {/* ─── TOAST NOTIFICATION ──────────────────────────────────────── */}
        {notificationMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* ─── TOP CLASS CONTEXT CARD ──────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1769AA] to-indigo-700 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 uppercase tracking-wider text-white">
                  Period {activeAttendanceSession.period} • {activeAttendanceSession.startTime} – {activeAttendanceSession.endTime}
                </span>
                {activeAttendanceSession.attendanceStatus === "COMPLETED" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider flex items-center gap-1">
                    <Check className="h-3 w-3" /> Attendance Completed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 uppercase tracking-wider">
                    ● Attendance In Progress
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black mt-2">
                {activeAttendanceSession.courseName} – {activeAttendanceSession.batchCode}
              </h2>
              <p className="text-xs text-blue-100 font-medium mt-1">
                {currentDayObj.label}, {currentDayObj.sub} 2026 • {activeAttendanceSession.batchName}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-indigo-100 font-medium">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Building2 className="h-3.5 w-3.5" /> {activeAttendanceSession.branchName}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <MapPin className="h-3.5 w-3.5" /> {activeAttendanceSession.roomNo}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <UserCheck className="h-3.5 w-3.5" /> {activeAttendanceSession.facultyName}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg font-bold text-white">
                  <Users className="h-3.5 w-3.5" /> {sessionTotal} Assigned Students
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleMarkAllPresent}
                className="bg-white hover:bg-slate-100 text-[#1769AA] text-xs font-black h-10 px-4 rounded-xl shadow-xs gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark All Present
              </Button>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* ─── SMART ATTENDANCE SUMMARY & PERCENTAGE RING ───────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{sessionTotal}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Assigned to {activeAttendanceSession.batchCode}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl text-[#6366F1]">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-slate-900">{sessionPresent}</h3>
                  <span className="text-xs font-black text-emerald-600">{sessionPercentage}%</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Active in class</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Absent</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-slate-900">{sessionAbsent}</h3>
                  <span className="text-xs font-black text-rose-600">
                    {sessionTotal > 0 ? ((sessionAbsent / sessionTotal) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-0.5">Unexcused</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <XCircle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Excused</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-slate-900">{sessionExcused}</h3>
                  <span className="text-xs font-black text-amber-600">
                    {sessionTotal > 0 ? ((sessionExcused / sessionTotal) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Approved leave</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl col-span-2 md:col-span-1">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Presence Rate</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{sessionPercentage}%</h3>
                <p className="text-[10px] text-slate-500 font-medium">Session Attendance</p>
              </div>
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} className="stroke-slate-100" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-emerald-500 transition-all duration-500 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-800">
                    {Math.round(parseFloat(sessionPercentage))}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── VALIDATION WARNING ALERT ────────────────────────────────── */}
        {validationWarning && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs font-bold shadow-2xs animate-in shake duration-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{validationWarning}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAllPresent}
              className="text-xs font-bold border-amber-300 bg-white text-amber-800 hover:bg-amber-100 h-7"
            >
              Mark Remaining as Present
            </Button>
          </div>
        )}

        {/* ─── FILTERS & SEARCH ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeAttendanceSession.batchCode}...`}
              value={attendanceSearchTerm}
              onChange={(e) => setAttendanceSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none shadow-2xs placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setAttendanceStatusFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attendanceStatusFilter === "ALL" ? "bg-[#1769AA] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                All ({sessionTotal})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter("PRESENT")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attendanceStatusFilter === "PRESENT" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Present ({sessionPresent})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter("ABSENT")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attendanceStatusFilter === "ABSENT" ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Absent ({sessionAbsent})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter("EXCUSED")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  attendanceStatusFilter === "EXCUSED" ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Excused ({sessionExcused})
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold pl-2">
              <span className={`h-2 w-2 rounded-full ${autoSaveState === "saved" ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
              <span className={autoSaveState === "saved" ? "text-emerald-700" : "text-amber-700"}>
                {autoSaveState === "saved" ? "Auto-saved" : "Saving..."}
              </span>
            </div>
          </div>
        </div>

        {/* ─── INTERACTIVE ATTENDANCE TABLE ────────────────────────────── */}
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200/80">
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filteredSessionStudents.length > 0 && selectedStudentIds.size === filteredSessionStudents.length}
                      onChange={handleSelectAllStudents}
                      className="rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-slate-600">#</TableHead>
                  <TableHead className="w-32 text-xs font-bold text-slate-600">Student ID</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-bold text-slate-600">Student Name</TableHead>
                  <TableHead className="min-w-[320px] text-xs font-bold text-slate-600 text-center">Attendance Status</TableHead>
                  <TableHead className="min-w-[240px] text-xs font-bold text-slate-600">Remarks (Optional)</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessionStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">
                      No students found in batch {activeAttendanceSession.batchCode}.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessionStudents.map((stu, index) => {
                    const isSelected = selectedStudentIds.has(stu.id);
                    return (
                      <TableRow
                        key={stu.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(stu.id)}
                            className="rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-700">{stu.studentCode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200">
                              <AvatarImage src={stu.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-[#1769AA] to-indigo-600 text-white text-[10px] font-bold">
                                {stu.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">{stu.name}</span>
                              <span className="text-[11px] text-slate-400 font-medium block">{stu.email}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Interactive Status Buttons */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.id, "PRESENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-600/30"
                                  : "bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.id, "ABSENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/30"
                                  : "bg-rose-50/70 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Absent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.id, "EXCUSED")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "EXCUSED"
                                  ? "bg-amber-500 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-500/30"
                                  : "bg-amber-50/70 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Excused</span>
                            </button>
                          </div>
                        </TableCell>

                        {/* Remarks */}
                        <TableCell>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={stu.remarks}
                              onChange={(e) => handleStudentRemarksChange(stu.id, e.target.value)}
                              placeholder="Add remarks..."
                              className="w-full h-8 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none transition-all placeholder:text-slate-400"
                            />
                            {stu.status === "EXCUSED" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-600" title="Quick leave reasons">
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                                  {EXCUSED_REASONS.map((reason) => (
                                    <DropdownMenuItem key={reason} onClick={() => handleStudentRemarksChange(stu.id, reason)} className="cursor-pointer">
                                      {reason}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>

                        {/* 3-Dots Action */}
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuItem onClick={() => navigate("/faculty/students/all")} className="cursor-pointer">
                                View Student Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStudentStatusChange(stu.id, "EXCUSED")} className="cursor-pointer">
                                Mark as Approved Leave
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ─── FLOATING BULK TOOLBAR ─────────────────────────────────── */}
          {selectedStudentIds.size > 0 && (
            <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black shadow-2xs">
                  {selectedStudentIds.size} Students Selected
                </span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={() => handleBulkStatusChange("PRESENT")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 gap-1">
                    <Check className="h-3 w-3" /> Mark Present
                  </Button>
                  <Button size="sm" onClick={() => handleBulkStatusChange("ABSENT")} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8 px-3 gap-1">
                    <XCircle className="h-3 w-3" /> Mark Absent
                  </Button>
                  <Button size="sm" onClick={() => handleBulkStatusChange("EXCUSED")} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3 gap-1">
                    <Clock className="h-3 w-3" /> Mark Excused
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudentIds(new Set())} className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs">
                Clear Selection
              </Button>
            </div>
          )}

          {/* Table Footer Progress */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span>Showing {filteredSessionStudents.length} of {sessionTotal} Students in {activeAttendanceSession.batchCode}</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">{sessionMarked} / {sessionTotal} Students Marked</span>
              <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${sessionTotal > 0 ? (sessionMarked / sessionTotal) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* ─── STICKY SAVE ATTENDANCE BANNER ───────────────────────────── */}
        <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-amber-900">
                {activeAttendanceSession.attendanceStatus === "COMPLETED" ? "Attendance Already Recorded" : "Don't forget to save your attendance!"}
              </h5>
              <p className="text-[11px] text-amber-800/90 font-medium mt-0.5">
                Attendance is permanently linked to {activeAttendanceSession.batchCode} for Period {activeAttendanceSession.period} on {currentDayObj.label}, {currentDayObj.sub}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveAttendance}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-black h-10 px-6 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02]"
            >
              <Lock className="h-4 w-4" /> {activeAttendanceSession.attendanceStatus === "COMPLETED" ? "Update Attendance" : "Save Attendance"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW: TIMETABLE MATRIX (WEEK & DAY VIEW)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-[1680px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* ─── 1. PAGE HEADER & TIMETABLE CONTROLS ──────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isFacultyOnly && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/admin/faculty/all")}
              className="h-10 w-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs shrink-0"
              title="Back to Faculty Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {isFacultyOnly ? "My Teaching Timetable" : "All Faculty Timetable"}
              </h1>
              {isFacultyOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Assigned by Admin / Counsellor
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isFacultyOnly
                ? `Click any assigned class slot to mark or review student attendance (${loggedInFaculty?.name || "Faculty"} • ${loggedInFaculty?.branchName || "All Branches"})`
                : "Weekly & Daily schedule overview for all faculty across branch locations."}
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Date Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>{weekDateLabel}</span>
            </div>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* View Toggles (Week View / Day View) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "week"
                  ? "bg-[#6366F1] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "day"
                  ? "bg-[#6366F1] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Day View
            </button>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-bold h-9 px-3.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export
          </Button>

          {/* Direct Mark Attendance Shortcut Button for Faculty */}
          {isFacultyOnly && (
            <Button
              onClick={() => navigate("/faculty/students/attendance")}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 px-4 flex items-center gap-1.5 shadow-xs transition-all hover:shadow-md"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Student Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ─── 2. SUMMARY KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Total Faculty", value: kpis.totalFaculty, sub: "Across all branches", icon: Users, color: "text-[#6366F1]", bg: "bg-indigo-50" },
          { label: "Total Classes", value: kpis.totalClasses, sub: "This Week", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Batches", value: kpis.totalBatches, sub: "This Week", icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Students", value: kpis.totalStudents.toLocaleString(), sub: "This Week", icon: Layers, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Teaching Hours", value: `${kpis.teachingHours}h`, sub: "This Week", icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Avg. Attendance", value: kpis.avgAttendance, sub: "This Week", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-200/80 shadow-2xs bg-white hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} shrink-0`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{kpi.label}</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{kpi.value}</h3>
                <p className="text-[10px] text-slate-400 font-medium truncate">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── 3. FILTER BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Branch Dropdown */}
          {!isFacultyOnly && (
            <div className="relative min-w-[180px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">🏢 All Branches</option>
                <option value="b-ramamurthy">Ramanagar Branch</option>
                <option value="b-malleswaram">Malleshwaram Branch</option>
                <option value="b-central">Jayanagar Branch</option>
              </select>
            </div>
          )}

          {/* Course Category Dropdown */}
          <div className="relative min-w-[170px]">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">📚 All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Design">Design (UI/UX / Graphic)</option>
              <option value="Data Analytics">Data Analytics & AI</option>
              <option value="Programming">Full Stack MERN</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search subjects or batch codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 bg-slate-50 border-slate-200 text-xs font-medium rounded-xl focus:ring-2 focus:ring-[#1769AA]/30"
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedBranch("ALL");
            setSelectedCourse("ALL");
            setSearchQuery("");
          }}
          className="text-xs font-bold h-10 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl shrink-0 gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" /> Reset Filter
        </Button>
      </div>

      {/* ─── 4. MAIN TIMETABLE GRID ───────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
        {/* Day Mode Switcher (Day View Only) */}
        {viewMode === "day" && (
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider pl-2 pr-1">Day:</span>
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.key}
                onClick={() => setSelectedDay(d.key)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedDay === d.key
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{d.label}</span>
                <span className={`text-[10px] font-normal ${selectedDay === d.key ? "text-white/80" : "text-slate-400"}`}>
                  ({d.sub})
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          {isFacultyOnly ? (
            /* ─── FACULTY PORTAL HORIZONTAL TIMETABLE MATRIX ─── */
            viewMode === "week" ? (
              /* HORIZONTAL WEEKLY MATRIX: ROWS = DAYS (MON–SAT), COLS = PERIODS (1–7) */
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5 pl-5 min-w-[150px] border-r border-slate-200/60">Day & Date</th>
                    {PERIODS.map((pNum) => (
                      <th key={pNum} className="p-3 text-center min-w-[175px] border-r border-slate-200/60 last:border-r-0">
                        <div className="font-bold text-slate-800">Period {pNum}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  {DAYS_OF_WEEK.map((day) => {
                    const currentFacId = loggedInFaculty?.id || filteredFaculty[0]?.id;
                    const currentFacName = loggedInFaculty?.name?.toLowerCase();
                    const dayClasses = filteredClasses.filter(
                      (c) =>
                        (c.facultyId === currentFacId ||
                          c.facultyName.toLowerCase() === currentFacName ||
                          c.facultyName.toLowerCase().includes(currentFacName || "") ||
                          (currentFacName && currentFacName.includes(c.facultyName.toLowerCase()))) &&
                        c.dayOfWeek === day.key
                    );

                    return (
                      <tr key={day.key} className="hover:bg-slate-50/40 transition-colors">
                        {/* Day & Date Header Cell */}
                        <td className="p-3.5 pl-5 border-r border-slate-200/60 align-middle bg-slate-50/50 min-w-[150px]">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0 shadow-2xs">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-xs block">{day.label}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{day.sub}</span>
                            </div>
                          </div>
                        </td>

                        {/* Period Columns (1 to 7) */}
                        {PERIODS.map((pNum) => {
                          const classInPeriod = dayClasses.find((c) => c.period === pNum);
                          const styling = classInPeriod
                            ? CATEGORY_COLORS[classInPeriod.category] || CATEGORY_COLORS["Others"]
                            : null;

                          return (
                            <td
                              key={pNum}
                              className="p-2.5 border-r border-slate-200/60 last:border-r-0 align-middle bg-white/60 min-w-[175px]"
                            >
                              {classInPeriod ? (
                                <div
                                  onClick={() => handleSlotClick(classInPeriod)}
                                  className={`p-3 rounded-xl border ${styling?.bg} ${styling?.border} cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all text-left group relative`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[11px] font-black truncate ${styling?.text}`}>
                                      {classInPeriod.courseName}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-700 font-bold truncate mt-0.5">
                                    {classInPeriod.batchCode}
                                  </p>

                                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1.5">
                                    <span className="font-bold text-slate-800">
                                      {classInPeriod.startTime && classInPeriod.endTime
                                        ? `${classInPeriod.startTime} – ${classInPeriod.endTime}`
                                        : `Period ${pNum}`}
                                    </span>
                                    <span className="font-medium text-slate-500">{classInPeriod.roomNo}</span>
                                  </div>

                                  {/* Student Count & Attendance Status Pill */}
                                  <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-slate-200/60">
                                    <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                      <Users className="h-3 w-3 text-slate-400" />
                                      {classInPeriod.studentCount || 42} Students
                                    </span>

                                    {classInPeriod.attendanceStatus === "COMPLETED" ? (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shadow-2xs">
                                        <Check className="h-2.5 w-2.5" />
                                        {classInPeriod.attendanceSummary
                                          ? `${classInPeriod.attendanceSummary.present}P • ${classInPeriod.attendanceSummary.absent}A • ${classInPeriod.attendanceSummary.excused}E`
                                          : "Completed"}
                                      </span>
                                    ) : classInPeriod.attendanceStatus === "IN_PROGRESS" ? (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800">
                                        ● In Progress
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
                                        ● Mark Attendance →
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => handleFreeSlotClick(day.label, pNum)}
                                  className="h-20 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40 hover:bg-slate-100/50 cursor-pointer flex flex-col items-center justify-center text-slate-300 transition-colors group"
                                  title="No class is scheduled for this period."
                                >
                                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-500">Free Slot</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* HORIZONTAL DAILY VIEW FOR FACULTY */
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5 pl-5 min-w-[150px] border-r border-slate-200/60">Selected Day</th>
                    {PERIODS.map((pNum) => (
                      <th key={pNum} className="p-3 text-center min-w-[175px] border-r border-slate-200/60 last:border-r-0">
                        <div className="font-bold text-slate-800">Period {pNum}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  {(() => {
                    const currentFacId = loggedInFaculty?.id || filteredFaculty[0]?.id;
                    const currentFacName = loggedInFaculty?.name?.toLowerCase();
                    const dayClasses = filteredClasses.filter(
                      (c) =>
                        (c.facultyId === currentFacId ||
                          c.facultyName.toLowerCase() === currentFacName ||
                          c.facultyName.toLowerCase().includes(currentFacName || "") ||
                          (currentFacName && currentFacName.includes(c.facultyName.toLowerCase()))) &&
                        c.dayOfWeek === selectedDay
                    );
                    const dayObj = DAYS_OF_WEEK.find((d) => d.key === selectedDay) || DAYS_OF_WEEK[0];

                    return (
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 pl-5 border-r border-slate-200/60 align-middle bg-slate-50/50 min-w-[150px]">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0 shadow-2xs">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-xs block">{dayObj.label}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{dayObj.sub}</span>
                            </div>
                          </div>
                        </td>

                        {PERIODS.map((pNum) => {
                          const classInPeriod = dayClasses.find((c) => c.period === pNum);
                          const styling = classInPeriod
                            ? CATEGORY_COLORS[classInPeriod.category] || CATEGORY_COLORS["Others"]
                            : null;

                          return (
                            <td
                              key={pNum}
                              className="p-3 border-r border-slate-200/60 last:border-r-0 align-middle bg-white/60 min-w-[175px]"
                            >
                              {classInPeriod ? (
                                <div
                                  onClick={() => handleSlotClick(classInPeriod)}
                                  className={`p-3.5 rounded-xl border ${styling?.bg} ${styling?.border} cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all text-left group`}
                                >
                                  <span className={`text-[11px] font-black block truncate ${styling?.text}`}>
                                    {classInPeriod.courseName}
                                  </span>
                                  <p className="text-[10px] text-slate-700 font-bold truncate mt-0.5">
                                    {classInPeriod.batchCode}
                                  </p>

                                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2">
                                    <span className="font-bold text-slate-800">
                                      {classInPeriod.startTime && classInPeriod.endTime
                                        ? `${classInPeriod.startTime} – ${classInPeriod.endTime}`
                                        : `Period ${pNum}`}
                                    </span>
                                    <span className="font-medium text-slate-500">{classInPeriod.roomNo}</span>
                                  </div>

                                  {/* Student Count & Attendance Status Pill */}
                                  <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-200/60">
                                    <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                      <Users className="h-3 w-3 text-slate-400" />
                                      {classInPeriod.studentCount || 42} Students
                                    </span>

                                    {classInPeriod.attendanceStatus === "COMPLETED" ? (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shadow-2xs">
                                        <Check className="h-2.5 w-2.5" />
                                        {classInPeriod.attendanceSummary
                                          ? `${classInPeriod.attendanceSummary.present}P • ${classInPeriod.attendanceSummary.absent}A • ${classInPeriod.attendanceSummary.excused}E`
                                          : "Completed"}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
                                        ● Mark Attendance →
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => handleFreeSlotClick(dayObj.label, pNum)}
                                  className="h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-100/50 cursor-pointer flex flex-col items-center justify-center text-slate-300 transition-colors group"
                                  title="No class is scheduled for this period."
                                >
                                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-500">Free Slot</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            )
          ) : (
            /* ─── ADMIN / CENTER MANAGER / COUNSELLOR MULTI-FACULTY VIEW ─── */
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="p-3.5 pl-5 min-w-[200px] border-r border-slate-200/60">Faculty</th>
                  <th className="p-3.5 min-w-[150px] border-r border-slate-200/60">Branch</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day.key} className="p-3 text-center min-w-[190px] border-r border-slate-200/60 last:border-r-0">
                      <div className="font-bold text-slate-800">{day.label}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{day.sub}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredFaculty.length > 0 ? (
                  filteredFaculty.map((fac) => {
                    return (
                      <tr key={fac.id} className="hover:bg-slate-50/40 transition-colors">
                        {/* Faculty Info */}
                        <td className="p-3.5 pl-5 border-r border-slate-200/60 align-middle bg-white">
                          <div className="flex items-center gap-3">
                            <img
                              src={fac.avatar}
                              alt={fac.name}
                              className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs truncate">{fac.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{fac.employeeCode}</p>
                              <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">{fac.specialization}</p>
                            </div>
                          </div>
                        </td>

                        {/* Branch Info */}
                        <td className="p-3.5 border-r border-slate-200/60 align-middle text-center bg-white">
                          <span className="text-[11px] font-bold text-slate-800">{fac.branchName}</span>
                        </td>

                        {/* Day Columns */}
                        {DAYS_OF_WEEK.map((day) => {
                          const dayClasses = filteredClasses.filter(
                            (c) => (c.facultyId === fac.id || c.facultyName === fac.name) && c.dayOfWeek === day.key
                          );

                          return (
                            <td key={day.key} className="p-2 border-r border-slate-200/60 last:border-r-0 align-top bg-white/60 min-w-[190px]">
                              {dayClasses.length === 0 ? (
                                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-300 p-4 border border-dashed border-slate-200/80 rounded-xl bg-slate-50/40">
                                  <Calendar className="h-5 w-5 mb-1 text-slate-300" />
                                  <span className="text-[11px] font-bold text-slate-400">No Classes</span>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {dayClasses.map((cls) => {
                                    const styling = CATEGORY_COLORS[cls.category] || CATEGORY_COLORS["Others"];
                                    return (
                                      <div
                                        key={cls.id}
                                        onClick={() => handleSlotClick(cls)}
                                        className={`p-2.5 rounded-xl border ${styling.bg} ${styling.border} cursor-pointer hover:shadow-sm transition-all text-left`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`text-[11px] font-bold truncate ${styling.text}`}>
                                            {cls.courseName}
                                          </span>
                                          {cls.attendanceStatus === "COMPLETED" && (
                                            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
                                          {cls.batchCode}
                                        </p>
                                        <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-200/50">
                                          <span className="font-bold text-slate-700">
                                            {cls.startTime && cls.endTime ? `${cls.startTime} - ${cls.endTime}` : `Period ${cls.period}`}
                                          </span>
                                          <span className="font-medium text-slate-500">{cls.roomNo}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                      No faculty found matching the selected branch/filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── FOOTER LEGEND ────────────────────────────────────────── */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Categories:</span>
            {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                <span className="text-slate-700 font-medium text-xs">{cat}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500">
              ● Click any assigned slot to mark classroom attendance
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
