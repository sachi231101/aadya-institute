import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RotateCcw,
  Plus,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  X,
  Sparkles,
  Info,
  BarChart3,
  Lock,
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
  AlertCircle,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStore } from "@/store/branch.store";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LEAVE"
  | "HALF_DAY"
  | "HOLIDAY"
  | "NOT_MARKED";

export interface FacultyAttendanceItem {
  id: string;
  facultyId: string;
  name: string;
  code: string;
  avatar: string;
  email: string;
  department: string;
  branch: string;
  branchId: string;
  loginTime: string | null; // e.g. "08:52 AM"
  logoutTime: string | null; // e.g. "06:04 PM"
  workingHours: string | null; // e.g. "09h 12m" or "—"
  status: AttendanceStatus;
  loginStatusText: string; // "Logged in", "Logged out", "On Leave", "No Login"
  remarks?: string;
  markedAt?: string;
  isModified?: boolean;
}

// Master list of 12 Faculty members
const BASE_FACULTY_MEMBERS: Omit<
  FacultyAttendanceItem,
  "status" | "loginTime" | "logoutTime" | "workingHours" | "loginStatusText" | "remarks" | "markedAt"
>[] = [
  {
    id: "att-1",
    facultyId: "fac-1",
    name: "Dr. Rajesh Kumar",
    code: "FAC001",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    email: "rajesh@aadya.in",
    department: "Computer Science",
    branch: "HSR Layout",
    branchId: "branch-1",
  },
  {
    id: "att-2",
    facultyId: "fac-2",
    name: "Sneha Nair",
    code: "FAC002",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
    email: "sneha.nair@aadya.in",
    department: "Data Science",
    branch: "Indiranagar",
    branchId: "branch-2",
  },
  {
    id: "att-3",
    facultyId: "fac-3",
    name: "Vikram Patel",
    code: "FAC003",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    email: "vikram.patel@aadya.in",
    department: "Web Development",
    branch: "Marathahalli",
    branchId: "branch-3",
  },
  {
    id: "att-4",
    facultyId: "fac-4",
    name: "Anjali Prasad",
    code: "FAC004",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120",
    email: "anjali.prasad@aadya.in",
    department: "UI/UX Design",
    branch: "HSR Layout",
    branchId: "branch-1",
  },
  {
    id: "att-5",
    facultyId: "fac-5",
    name: "Mohammed Tariq",
    code: "FAC005",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    email: "tariq@aadya.in",
    department: "Cloud Computing",
    branch: "Rajajinagar",
    branchId: "branch-4",
  },
  {
    id: "att-6",
    facultyId: "fac-6",
    name: "Pooja Singh",
    code: "FAC006",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
    email: "pooja.singh@aadya.in",
    department: "Digital Marketing",
    branch: "Indiranagar",
    branchId: "branch-2",
  },
  {
    id: "att-7",
    facultyId: "fac-7",
    name: "Rohit Sharma",
    code: "FAC007",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=120",
    email: "rohit.sharma@aadya.in",
    department: "Graphic Design",
    branch: "BTM Layout",
    branchId: "branch-5",
  },
  {
    id: "att-8",
    facultyId: "fac-8",
    name: "Kavya Ramesh",
    code: "FAC008",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=120",
    email: "kavya.ramesh@aadya.in",
    department: "Finance & Accounts",
    branch: "Koramangala",
    branchId: "branch-6",
  },
  {
    id: "att-9",
    facultyId: "fac-9",
    name: "Suresh Menon",
    code: "FAC009",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=120",
    email: "suresh.menon@aadya.in",
    department: "Web Development",
    branch: "Rajajinagar",
    branchId: "branch-4",
  },
  {
    id: "att-10",
    facultyId: "fac-10",
    name: "Divya Iyer",
    code: "FAC010",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=120",
    email: "divya.iyer@aadya.in",
    department: "UI/UX Design",
    branch: "Indiranagar",
    branchId: "branch-2",
  },
  {
    id: "att-11",
    facultyId: "fac-11",
    name: "Arjun Rao",
    code: "FAC011",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
    email: "arjun.rao@aadya.in",
    department: "Data Science",
    branch: "HSR Layout",
    branchId: "branch-1",
  },
  {
    id: "att-12",
    facultyId: "fac-12",
    name: "Meera Krishnan",
    code: "FAC012",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=120",
    email: "meera.k@aadya.in",
    department: "Computer Science",
    branch: "Marathahalli",
    branchId: "branch-3",
  },
];

// Helper to calculate working hours from login/logout strings
function calculateHours(loginStr: string | null, logoutStr: string | null): string {
  if (!loginStr || !logoutStr) return "—";

  const parseTime = (str: string): number => {
    const parts = str.trim().split(" ");
    if (parts.length < 2) return 0;
    const time = parts[0];
    const modifier = parts[1].toUpperCase();
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  };

  try {
    const loginMinutes = parseTime(loginStr);
    const logoutMinutes = parseTime(logoutStr);
    const diff = logoutMinutes - loginMinutes;
    if (diff < 0) return "Invalid";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  } catch {
    return "—";
  }
}

// Generate default template data for any date
function generateDateTemplate(dateStr: string): FacultyAttendanceItem[] {
  const day = parseInt(dateStr.split("-")[2], 10) || 5;

  return BASE_FACULTY_MEMBERS.map((base, idx) => {
    // Deterministic realistic seeding per date
    let status: AttendanceStatus = "PRESENT";
    let loginTime: string | null = "08:50 AM";
    let logoutTime: string | null = "06:00 PM";
    let loginStatusText = "Logged out";

    if (dateStr === "2026-09-05") {
      // 05 Sep 2026 reference values
      if (idx === 2) {
        status = "ABSENT";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else if (idx === 3) {
        status = "LEAVE";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "On Leave";
      } else if (idx === 5) {
        status = "NOT_MARKED";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else if (idx === 8 || idx === 11) {
        status = "ABSENT";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else {
        status = "PRESENT";
        loginTime = idx % 2 === 0 ? "08:52 AM" : "08:58 AM";
        logoutTime = idx === 0 || idx === 1 ? "06:04 PM" : idx % 2 === 0 ? "06:10 PM" : "05:58 PM";
        loginStatusText = logoutTime ? "Logged out" : "Logged in";
      }
    } else if (day === 1 || day === 2) {
      // High presence days
      if (idx === 3) {
        status = "LEAVE";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "On Leave";
      } else if (idx === 8) {
        status = "ABSENT";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else {
        status = "PRESENT";
        loginTime = "08:45 AM";
        logoutTime = "06:00 PM";
        loginStatusText = "Logged out";
      }
    } else if (day === 3) {
      // More absences on day 3
      if (idx % 3 === 0) {
        status = "ABSENT";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else if (idx === 4) {
        status = "LEAVE";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "On Leave";
      } else {
        status = "PRESENT";
        loginTime = "08:50 AM";
        logoutTime = "05:55 PM";
        loginStatusText = "Logged out";
      }
    } else if (day === 4) {
      // Day 4 (Leaves)
      if (idx === 2 || idx === 7) {
        status = "LEAVE";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "On Leave";
      } else if (idx === 5) {
        status = "ABSENT";
        loginTime = null;
        logoutTime = null;
        loginStatusText = "No Login";
      } else {
        status = "PRESENT";
        loginTime = "08:55 AM";
        logoutTime = "06:05 PM";
        loginStatusText = "Logged out";
      }
    } else if (day > 5) {
      // Future dates in Sep default to not marked / fresh
      status = "NOT_MARKED";
      loginTime = null;
      logoutTime = null;
      loginStatusText = "No Login";
    }

    const workingHours =
      status === "PRESENT" ? calculateHours(loginTime, logoutTime) : null;

    return {
      ...base,
      status,
      loginTime,
      logoutTime,
      workingHours,
      loginStatusText,
      markedAt: loginTime || undefined,
    };
  });
}

// Initial pre-seeded multi-date records map
const INITIAL_DATE_MAP: Record<string, FacultyAttendanceItem[]> = {
  "2026-09-01": generateDateTemplate("2026-09-01"),
  "2026-09-02": generateDateTemplate("2026-09-02"),
  "2026-09-03": generateDateTemplate("2026-09-03"),
  "2026-09-04": generateDateTemplate("2026-09-04"),
  "2026-09-05": generateDateTemplate("2026-09-05"),
};

export const FacultyAttendance: React.FC = () => {
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  // Calendar Month & Year State (September 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(8); // 8 = September (0-indexed)

  const [selectedDate, setSelectedDate] = useState<string>("2026-09-05");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(5);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);

  // Multi-date attendance data store
  const [attendanceByDate, setAttendanceByDate] =
    useState<Record<string, FacultyAttendanceItem[]>>(INITIAL_DATE_MAP);

  // Track unsaved modifications flag
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Active attendance list for the currently selected date
  const currentAttendanceList: FacultyAttendanceItem[] = useMemo(() => {
    if (attendanceByDate[selectedDate]) {
      return attendanceByDate[selectedDate];
    }
    // Generate on-the-fly if not cached
    return generateDateTemplate(selectedDate);
  }, [attendanceByDate, selectedDate]);

  // Modal States
  const [isMarkModalOpen, setIsMarkModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeFaculty, setActiveFaculty] = useState<FacultyAttendanceItem | null>(null);

  // Form states inside Mark Attendance Modal
  const [modalStatus, setModalStatus] = useState<AttendanceStatus>("PRESENT");
  const [modalLoginTime, setModalLoginTime] = useState<string>("08:52 AM");
  const [modalLogoutTime, setModalLogoutTime] = useState<string>("06:04 PM");
  const [modalRemarks, setModalRemarks] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Computed working hours in modal
  const computedWorkingHours = useMemo(() => {
    if (modalStatus === "ABSENT" || modalStatus === "LEAVE" || modalStatus === "HOLIDAY") {
      return "—";
    }
    return calculateHours(modalLoginTime, modalLogoutTime);
  }, [modalStatus, modalLoginTime, modalLogoutTime]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set(BASE_FACULTY_MEMBERS.map((f) => f.department));
    return Array.from(set);
  }, []);

  // Format date helper (e.g. "05 Sep 2026", "Saturday")
  const formattedDateDetails = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dayNum = String(d.getDate()).padStart(2, "0");
      const monthShort = d.toLocaleDateString("en-US", { month: "short" });
      const year = d.getFullYear();
      return {
        formatted: `${dayNum} ${monthShort} ${year}`,
        dayName,
      };
    } catch {
      return { formatted: selectedDate, dayName: "Saturday" };
    }
  }, [selectedDate]);

  // Month navigation helpers
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // Month metadata for calendar grid
  const monthData = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonthIndex, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    return { firstDayIndex, daysInMonth };
  }, [currentYear, currentMonthIndex]);

  // Date Selection Handler (from Calendar or Dropdown)
  const handleSelectDate = (dateString: string) => {
    setSelectedDate(dateString);
    const day = parseInt(dateString.split("-")[2], 10) || 1;
    setSelectedCalendarDay(day);

    // If date has not been initialized in map, initialize it
    if (!attendanceByDate[dateString]) {
      setAttendanceByDate((prev) => ({
        ...prev,
        [dateString]: generateDateTemplate(dateString),
      }));
    }

    setHasUnsavedChanges(false);
  };

  // Direct 1-click Attendance marking function for a specific faculty
  const handleDirectMark = (id: string, newStatus: AttendanceStatus) => {
    setAttendanceByDate((prev) => {
      const currentList = prev[selectedDate] || generateDateTemplate(selectedDate);
      const updatedList = currentList.map((item) => {
        if (item.id === id) {
          if (newStatus === "PRESENT") {
            const login = item.loginTime || "08:52 AM";
            const logout = item.logoutTime || "06:04 PM";
            const hours = calculateHours(login, logout);
            return {
              ...item,
              status: "PRESENT",
              loginTime: login,
              logoutTime: logout,
              workingHours: hours,
              loginStatusText: logout ? "Logged out" : "Logged in",
              isModified: true,
            };
          } else if (newStatus === "ABSENT") {
            return {
              ...item,
              status: "ABSENT",
              loginTime: null,
              logoutTime: null,
              workingHours: null,
              loginStatusText: "No Login",
              isModified: true,
            };
          } else if (newStatus === "LEAVE") {
            return {
              ...item,
              status: "LEAVE",
              loginTime: null,
              logoutTime: null,
              workingHours: null,
              loginStatusText: "On Leave",
              isModified: true,
            };
          }
        }
        return item;
      });
      return { ...prev, [selectedDate]: updatedList };
    });

    setHasUnsavedChanges(true);

    const faculty = currentAttendanceList.find((f) => f.id === id);
    const facultyName = faculty?.name || "Faculty";
    showToast(
      `Marked ${facultyName} as ${
        newStatus === "PRESENT" ? "Present" : newStatus === "ABSENT" ? "Absent" : "On Leave"
      }. Click "Save Attendance" to commit.`,
      "info"
    );
  };

  // Direct time field change handler
  const handleTimeChange = (id: string, field: "loginTime" | "logoutTime", value: string) => {
    setAttendanceByDate((prev) => {
      const currentList = prev[selectedDate] || generateDateTemplate(selectedDate);
      const updatedList = currentList.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value, isModified: true };
          if (updated.status === "PRESENT" && updated.loginTime && updated.logoutTime) {
            updated.workingHours = calculateHours(updated.loginTime, updated.logoutTime);
          }
          return updated;
        }
        return item;
      });
      return { ...prev, [selectedDate]: updatedList };
    });
    setHasUnsavedChanges(true);
  };

  // Save Attendance for current date
  const handleSaveAllAttendance = () => {
    setAttendanceByDate((prev) => {
      const currentList = prev[selectedDate] || generateDateTemplate(selectedDate);
      const cleanedList = currentList.map((item) => ({
        ...item,
        isModified: false,
      }));
      return { ...prev, [selectedDate]: cleanedList };
    });

    setHasUnsavedChanges(false);
    showToast(
      `Attendance for ${formattedDateDetails.formatted} saved successfully!`,
      "success"
    );
  };

  // Save single faculty attendance row
  const handleSaveRow = (id: string) => {
    setAttendanceByDate((prev) => {
      const currentList = prev[selectedDate] || generateDateTemplate(selectedDate);
      const updatedList = currentList.map((item) =>
        item.id === id ? { ...item, isModified: false } : item
      );
      return { ...prev, [selectedDate]: updatedList };
    });

    const f = currentAttendanceList.find((item) => item.id === id);
    showToast(`Saved attendance for ${f?.name || "Faculty"}.`, "success");
  };

  // Filtered faculty list
  const filteredList = useMemo(() => {
    return currentAttendanceList.filter((f) => {
      if (selectedBranchId !== "ALL" && f.branchId !== selectedBranchId) return false;
      if (selectedDepartment !== "ALL" && f.department !== selectedDepartment) return false;
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchCode = f.code.toLowerCase().includes(q);
        const matchEmail = f.email.toLowerCase().includes(q);
        const matchDept = f.department.toLowerCase().includes(q);
        const matchBranch = f.branch.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail && !matchDept && !matchBranch) {
          return false;
        }
      }
      return true;
    });
  }, [currentAttendanceList, selectedBranchId, selectedDepartment, selectedStatus, searchQuery]);

  // Pagination slice
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, currentPage, rowsPerPage]);

  // Summary Metrics calculations based on the currently selected date
  const summary = useMemo(() => {
    const totalFaculty = currentAttendanceList.length;
    const presentToday = currentAttendanceList.filter(
      (f) => f.status === "PRESENT" || f.status === "HALF_DAY"
    ).length;
    const absentToday = currentAttendanceList.filter((f) => f.status === "ABSENT").length;
    const onLeave = currentAttendanceList.filter((f) => f.status === "LEAVE").length;

    const presentPct = totalFaculty > 0 ? ((presentToday / totalFaculty) * 100).toFixed(1) + "%" : "0%";
    const absentPct = totalFaculty > 0 ? ((absentToday / totalFaculty) * 100).toFixed(1) + "%" : "0%";
    const leavePct = totalFaculty > 0 ? ((onLeave / totalFaculty) * 100).toFixed(1) + "%" : "0%";

    const currentlyLoggedIn = currentAttendanceList.filter(
      (f) => f.status === "PRESENT" && f.loginTime && !f.logoutTime
    ).length || (presentToday > 3 ? 6 : presentToday);
    const alreadyLoggedOut = currentAttendanceList.filter(
      (f) => f.status === "PRESENT" && f.loginTime && f.logoutTime
    ).length || (presentToday > 5 ? 2 : 1);
    const notLoggedInYet = currentAttendanceList.filter(
      (f) => f.status === "ABSENT" || f.status === "NOT_MARKED"
    ).length;

    // Calculate total hours
    const totalMinutes = currentAttendanceList.reduce((acc, f) => {
      if (f.status === "PRESENT" && f.workingHours && f.workingHours !== "—") {
        const parts = f.workingHours.split(" ");
        const h = parseInt(parts[0]?.replace("h", ""), 10) || 0;
        const m = parseInt(parts[1]?.replace("m", ""), 10) || 0;
        return acc + h * 60 + m;
      }
      return acc;
    }, 0);

    const totalHoursFormatted =
      totalMinutes > 0
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : "54h 36m";

    return {
      totalFaculty,
      presentToday,
      presentPct,
      absentToday,
      absentPct,
      onLeave,
      leavePct,
      attendanceRate: totalFaculty > 0 ? `${((presentToday / totalFaculty) * 100).toFixed(1)}%` : "87.5%",
      totalWorkingHours: totalHoursFormatted,
      currentlyLoggedIn,
      notLoggedInYet,
      alreadyLoggedOut,
    };
  }, [currentAttendanceList]);

  // Open modal for a specific faculty
  const handleOpenMarkModal = (faculty?: FacultyAttendanceItem) => {
    const target = faculty || currentAttendanceList[0];
    setActiveFaculty(target);
    setModalStatus(target.status === "NOT_MARKED" ? "PRESENT" : target.status);
    setModalLoginTime(target.loginTime || "08:52 AM");
    setModalLogoutTime(target.logoutTime || "06:04 PM");
    setModalRemarks(target.remarks || "");
    setValidationError(null);
    setIsMarkModalOpen(true);
  };

  // Save Attendance handler from modal
  const handleSaveModalAttendance = () => {
    if (!activeFaculty) return;

    if (modalStatus === "PRESENT" || modalStatus === "HALF_DAY") {
      if (modalLogoutTime && !modalLoginTime) {
        setValidationError("Login time is required before logout time.");
        return;
      }
      if (modalLoginTime && modalLogoutTime) {
        const calculated = calculateHours(modalLoginTime, modalLogoutTime);
        if (calculated === "Invalid") {
          setValidationError("Login time must be earlier than logout time.");
          return;
        }
      }
    }

    const calculatedHours =
      modalStatus === "ABSENT" || modalStatus === "LEAVE" || modalStatus === "HOLIDAY"
        ? null
        : calculateHours(modalLoginTime, modalLogoutTime);

    const loginStatus =
      modalStatus === "LEAVE"
        ? "On Leave"
        : modalStatus === "ABSENT"
        ? "No Login"
        : modalLogoutTime
        ? "Logged out"
        : modalLoginTime
        ? "Logged in"
        : "No Login";

    setAttendanceByDate((prev) => {
      const currentList = prev[selectedDate] || generateDateTemplate(selectedDate);
      const updated = currentList.map((item) => {
        if (item.id === activeFaculty.id) {
          return {
            ...item,
            status: modalStatus,
            loginTime:
              modalStatus === "ABSENT" || modalStatus === "LEAVE" || modalStatus === "HOLIDAY"
                ? null
                : modalLoginTime,
            logoutTime:
              modalStatus === "ABSENT" || modalStatus === "LEAVE" || modalStatus === "HOLIDAY"
                ? null
                : modalLogoutTime,
            workingHours: calculatedHours === "—" ? null : calculatedHours,
            loginStatusText: loginStatus,
            remarks: modalRemarks,
            markedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isModified: false,
          };
        }
        return item;
      });
      return { ...prev, [selectedDate]: updated };
    });

    setIsMarkModalOpen(false);
    showToast("Faculty attendance updated successfully.", "success");
  };

  // Status Badge UI
  const renderStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Present
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Absent
          </span>
        );
      case "LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Leave
          </span>
        );
      case "HALF_DAY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800">
            <Clock className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            Half Day
          </span>
        );
      case "HOLIDAY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            Holiday
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Not Marked
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 max-w-[1750px] mx-auto pb-12">
      {/* ─── Toast Notification Banner ──────────────────────────────── */}
      {toastMessage && (
        <div
          className={`p-3.5 px-5 rounded-2xl text-white flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 dark:bg-emerald-700"
              : toastMessage.type === "error"
              ? "bg-rose-600 dark:bg-rose-700"
              : "bg-blue-600 dark:bg-blue-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <span>Faculty Management</span>
            <span>&gt;</span>
            <span className="text-primary font-bold">Faculty Attendance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Faculty Attendance
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage daily faculty attendance and track Login / Logout and working hours.
          </p>
        </div>

        {/* Top-Right Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="h-9 px-4 rounded-xl border-border/80 text-xs font-semibold gap-2 shadow-xs hover:bg-accent bg-white dark:bg-slate-900"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            Import Attendance
          </Button>

          <Button
            type="button"
            onClick={() => handleOpenMarkModal()}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* ─── Summary Cards (6 Compact Cards in 1 Row) ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Faculty */}
        <Card className="border border-border/60 bg-blue-50/20 dark:bg-slate-900/40 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Faculty
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {summary.totalFaculty}
              </div>
              <div className="text-[10.5px] text-muted-foreground truncate">
                Active Faculty
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card className="border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Present ({formattedDateDetails.dayName.slice(0, 3)})
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {summary.presentToday}
              </div>
              <div className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                {summary.presentPct}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Absent Today */}
        <Card className="border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                Absent Today
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {summary.absentToday}
              </div>
              <div className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
                {summary.absentPct}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card className="border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                On Leave
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {summary.onLeave}
              </div>
              <div className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400">
                {summary.leavePct}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card className="border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">
                Attendance Rate
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {summary.attendanceRate}
              </div>
              <div className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-medium">
                {monthNames[currentMonthIndex]} {currentYear}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Working Hours */}
        <Card className="border border-cyan-200/60 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-cyan-950/20 rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[10.5px] font-bold text-cyan-800 dark:text-cyan-400 uppercase tracking-wider">
                Total Working Hours
              </div>
              <div className="text-xl font-black text-foreground mt-0.5 truncate">
                {summary.totalWorkingHours}
              </div>
              <div className="text-[10.5px] text-cyan-700 dark:text-cyan-400 font-medium">
                {formattedDateDetails.formatted}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Date + Filters Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-xl px-3 h-9 text-xs font-medium text-foreground">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedDate}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2026-09-05">05 Sep 2026 (Today)</option>
              <option value="2026-09-04">04 Sep 2026 (Friday)</option>
              <option value="2026-09-03">03 Sep 2026 (Thursday)</option>
              <option value="2026-09-02">02 Sep 2026 (Wednesday)</option>
              <option value="2026-09-01">01 Sep 2026 (Tuesday)</option>
              <option value="2026-08-31">31 Aug 2026 (Monday)</option>
            </select>
          </div>

          {/* Branch Filter */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-9 text-xs font-medium bg-background border border-border/70 rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">All Branches</option>
            <option value="branch-1">HSR Layout</option>
            <option value="branch-2">Indiranagar</option>
            <option value="branch-3">Marathahalli</option>
            <option value="branch-4">Rajajinagar</option>
            <option value="branch-5">BTM Layout</option>
            <option value="branch-6">Koramangala</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-9 text-xs font-medium bg-background border border-border/70 rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 text-xs font-medium bg-background border border-border/70 rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present Only</option>
            <option value="ABSENT">Absent Only</option>
            <option value="LEAVE">Leave Only</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="NOT_MARKED">Not Marked</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search faculty by name, code, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 text-xs rounded-xl border-border/70 bg-background"
            />
          </div>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              setAttendanceByDate((prev) => ({
                ...prev,
                [selectedDate]: generateDateTemplate(selectedDate),
              }));
              setHasUnsavedChanges(false);
              showToast(`Refreshed data for ${formattedDateDetails.formatted}`, "info");
            }}
            className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── MAIN DESKTOP LAYOUT (Calendar on Left, Faculty Attendance Table on Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── LEFT COLUMN: Monthly Calendar & Selected Date Card (lg:col-span-4 xl:col-span-3) ─ */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="border border-border/60 rounded-2xl shadow-xs bg-card">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-sm font-bold tracking-tight">
                {monthNames[currentMonthIndex]} {currentYear}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {/* Day Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <div
                    key={day}
                    className={`text-[10px] font-bold tracking-wider py-0.5 ${
                      idx === 0 ? "text-rose-500" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid with Dynamic Month Calculation */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Previous month trailing empty slots */}
                {Array.from({ length: monthData.firstDayIndex }, (_, i) => {
                  const prevMonthLastDay = new Date(currentYear, currentMonthIndex, 0).getDate();
                  const d = prevMonthLastDay - monthData.firstDayIndex + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground/30 font-medium"
                    >
                      {d}
                    </div>
                  );
                })}

                {/* Current Month Days 1..daysInMonth */}
                {Array.from({ length: monthData.daysInMonth }, (_, i) => i + 1).map((d) => {
                  const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isSelected = selectedDate === dateStr;

                  // Determine status dot for this day
                  const dayRecords = attendanceByDate[dateStr];
                  let isPresentDay = false;
                  let isAbsentDay = false;
                  let isLeaveDay = false;

                  if (dayRecords) {
                    const presentCount = dayRecords.filter((r) => r.status === "PRESENT").length;
                    const absentCount = dayRecords.filter((r) => r.status === "ABSENT").length;
                    const leaveCount = dayRecords.filter((r) => r.status === "LEAVE").length;

                    if (presentCount >= 6) isPresentDay = true;
                    else if (absentCount >= 3) isAbsentDay = true;
                    else if (leaveCount >= 2) isLeaveDay = true;
                  } else {
                    // Fallback visual seeding for Sep
                    if (currentMonthIndex === 8 && currentYear === 2026) {
                      if (d === 1 || d === 2 || d === 5) isPresentDay = true;
                      else if (d === 3) isAbsentDay = true;
                      else if (d === 4) isLeaveDay = true;
                    }
                  }

                  return (
                    <button
                      key={`day-${d}`}
                      type="button"
                      onClick={() => handleSelectDate(dateStr)}
                      className={`h-8 rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white font-black shadow-sm shadow-blue-600/30"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{d}</span>
                      {!isSelected && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isPresentDay
                              ? "bg-emerald-500"
                              : isAbsentDay
                              ? "bg-rose-500"
                              : isLeaveDay
                              ? "bg-amber-500"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground pt-3 border-t border-border/40 px-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Leave</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Not Marked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Card */}
          <Card className="border border-border/60 rounded-2xl shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Selected Date
                </div>
                <div className="text-sm font-black text-foreground">
                  {formattedDateDetails.formatted}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formattedDateDetails.dayName}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT MAIN COLUMN: Faculty Attendance Table (lg:col-span-8 xl:col-span-9) ─ */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          <Card className="border border-border/60 rounded-2xl shadow-xs overflow-hidden bg-card">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    Faculty Attendance ({filteredList.length})
                  </CardTitle>
                  {hasUnsavedChanges && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0 px-2 font-bold animate-pulse">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daily attendance, Login / Logout and verified working hours for{" "}
                  <span className="font-semibold text-foreground">
                    {formattedDateDetails.formatted} ({formattedDateDetails.dayName})
                  </span>.
                </p>
              </div>

              {/* Table Action Buttons: Save Attendance + Export */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveAllAttendance}
                  className={`h-8 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-xs transition-all cursor-pointer ${
                    hasUnsavedChanges
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-600/30 animate-bounce"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Attendance
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    showToast(
                      `Attendance sheet for ${formattedDateDetails.formatted} exported as CSV.`,
                      "success"
                    );
                  }}
                  className="h-8 px-3 rounded-xl border-border/80 text-xs font-semibold gap-1.5 shadow-xs bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-3 w-8 text-center">#</th>
                      <th className="py-3 px-3">Faculty</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Branch</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3">Login Time</th>
                      <th className="py-3 px-3">Logout Time</th>
                      <th className="py-3 px-3">Working Hours</th>
                      <th className="py-3 px-3 text-center">Mark Attendance</th>
                      <th className="py-3 px-2 text-center w-12">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paginatedList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-muted-foreground">
                          No faculty records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((f, index) => {
                        const rowNum = (currentPage - 1) * rowsPerPage + index + 1;
                        const isPresent = f.status === "PRESENT";
                        const isAbsent = f.status === "ABSENT";
                        const isLeave = f.status === "LEAVE";

                        return (
                          <tr
                            key={f.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              f.isModified ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-muted-foreground font-medium">
                              {rowNum}
                            </td>

                            {/* Faculty Name, Code & Photo */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-full overflow-hidden shrink-0 border border-border/60">
                                  <img
                                    src={f.avatar}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground truncate text-xs">
                                    {f.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {f.code}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-3 px-3 text-muted-foreground font-medium whitespace-nowrap">
                              {f.department}
                            </td>

                            {/* Branch */}
                            <td className="py-3 px-3 text-muted-foreground font-medium whitespace-nowrap">
                              {f.branch}
                            </td>

                            {/* Attendance Status Badge */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {renderStatusBadge(f.status)}
                            </td>

                            {/* Login Time Input / Display */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isPresent ? (
                                <div className="flex items-center gap-1 bg-background border border-border/70 rounded-lg px-2 py-1 w-24 shadow-2xs">
                                  <input
                                    type="text"
                                    value={f.loginTime || "08:52 AM"}
                                    onChange={(e) =>
                                      handleTimeChange(f.id, "loginTime", e.target.value)
                                    }
                                    className="w-full bg-transparent font-mono text-[11px] font-medium text-foreground focus:outline-none"
                                  />
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0 cursor-pointer" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-muted/20 border border-border/40 rounded-lg px-2 py-1 w-24 text-muted-foreground/60">
                                  <span className="font-mono text-[11px]">—</span>
                                  <Clock className="w-3 h-3 opacity-40 shrink-0" />
                                </div>
                              )}
                            </td>

                            {/* Logout Time Input / Display */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isPresent ? (
                                <div className="flex items-center gap-1 bg-background border border-border/70 rounded-lg px-2 py-1 w-24 shadow-2xs">
                                  <input
                                    type="text"
                                    value={f.logoutTime || "06:04 PM"}
                                    onChange={(e) =>
                                      handleTimeChange(f.id, "logoutTime", e.target.value)
                                    }
                                    className="w-full bg-transparent font-mono text-[11px] font-medium text-foreground focus:outline-none"
                                  />
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0 cursor-pointer" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-muted/20 border border-border/40 rounded-lg px-2 py-1 w-24 text-muted-foreground/60">
                                  <span className="font-mono text-[11px]">—</span>
                                  <Clock className="w-3 h-3 opacity-40 shrink-0" />
                                </div>
                              )}
                            </td>

                            {/* Working Hours */}
                            <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {isPresent ? f.workingHours || "09h 12m" : "—"}
                            </td>

                            {/* Direct Mark Attendance 3-Button Controls (✓ ✕ 📅) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Present Button */}
                                <button
                                  type="button"
                                  title="Mark Present"
                                  onClick={() => handleDirectMark(f.id, "PRESENT")}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isPresent
                                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                                      : "bg-muted/40 hover:bg-emerald-50 text-muted-foreground hover:text-emerald-700 border border-border/60"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Absent Button */}
                                <button
                                  type="button"
                                  title="Mark Absent"
                                  onClick={() => handleDirectMark(f.id, "ABSENT")}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isAbsent
                                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30"
                                      : "bg-muted/40 hover:bg-rose-50 text-muted-foreground hover:text-rose-700 border border-border/60"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Leave Button */}
                                <button
                                  type="button"
                                  title="Mark Leave"
                                  onClick={() => handleDirectMark(f.id, "LEAVE")}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isLeave
                                      ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30"
                                      : "bg-muted/40 hover:bg-amber-50 text-muted-foreground hover:text-amber-700 border border-border/60"
                                  }`}
                                >
                                  <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
                                </button>
                              </div>
                            </td>

                            {/* Individual Row Save Action */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                title="Save Row Attendance"
                                onClick={() => handleSaveRow(f.id)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  f.isModified
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold animate-pulse"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-border/40">
                {paginatedList.map((f) => (
                  <div key={f.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-full overflow-hidden shrink-0 border border-border/60">
                          <img
                            src={f.avatar}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{f.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{f.code}</div>
                        </div>
                      </div>
                      {renderStatusBadge(f.status)}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <span>{f.department}</span> • <span>{f.branch}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Login</span>
                        <span className="font-mono font-semibold">{f.loginTime || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Logout</span>
                        <span className="font-mono font-semibold">{f.logoutTime || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Hours</span>
                        <span className="font-mono font-bold text-indigo-600">{f.workingHours || "—"}</span>
                      </div>
                    </div>

                    {/* Direct Mark Attendance in mobile */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-muted-foreground">Mark:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDirectMark(f.id, "PRESENT")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            f.status === "PRESENT"
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectMark(f.id, "ABSENT")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            f.status === "ABSENT"
                              ? "bg-rose-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectMark(f.id, "LEAVE")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            f.status === "LEAVE"
                              ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          📅
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRow(f.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-t border-border/40 text-xs text-muted-foreground gap-3">
                <div>
                  Showing {totalItems > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems} faculty
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={`page-${pg}`}
                        type="button"
                        onClick={() => setCurrentPage(pg)}
                        className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                          currentPage === pg
                            ? "bg-blue-600 text-white shadow-xs"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-7 w-7 rounded-lg"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    <span className="text-[11px]">Rows per page</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 bg-transparent border border-border/70 rounded-md px-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={12}>12</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── BOTTOM SECTION (Today's Activity & Quick Stats for Selected Date) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Today's Activity (col-span-7) */}
        <Card className="lg:col-span-7 border border-border/60 rounded-2xl shadow-xs bg-card flex flex-col justify-between">
          <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Today's Activity ({formattedDateDetails.formatted})
            </CardTitle>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-2 gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </Badge>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
            {/* Activity Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-1">
                    <th className="pb-2 w-28">Time</th>
                    <th className="pb-2">Faculty</th>
                    <th className="pb-2">Event</th>
                    <th className="pb-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {currentAttendanceList.slice(0, 5).map((f) => {
                    const isGreen = f.status === "PRESENT";
                    const isRed = f.status === "ABSENT";
                    const isOrange = f.status === "LEAVE";
                    const timeStr = f.logoutTime || f.loginTime || "09:30 AM";

                    return (
                      <tr key={`act-${f.id}`} className="hover:bg-muted/20">
                        {/* Time with status dot */}
                        <td className="py-2.5 font-mono text-muted-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isGreen
                                  ? "bg-emerald-500"
                                  : isRed
                                  ? "bg-rose-500"
                                  : isOrange
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span>{timeStr}</span>
                          </div>
                        </td>

                        {/* Faculty with Avatar */}
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] rounded-full overflow-hidden shrink-0 border border-border/60">
                              <img
                                src={f.avatar}
                                alt={f.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-bold text-foreground truncate">
                              {f.name}
                            </span>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="py-2.5 text-muted-foreground font-medium">
                          {f.loginStatusText}
                        </td>

                        {/* Details */}
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {f.status === "PRESENT" && f.workingHours
                            ? `Working hours: ${f.workingHours}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* View All Activity link */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => showToast("Showing all activity logs", "info")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
              >
                View All Activity <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Quick Stats (col-span-5) */}
        <Card className="lg:col-span-5 border border-border/60 rounded-2xl shadow-xs bg-card flex flex-col justify-between">
          <CardHeader className="p-4 border-b border-border/40 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Quick Stats ({formattedDateDetails.dayName})
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Currently Logged In */}
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] text-muted-foreground truncate font-medium">
                    Currently Logged In
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {summary.currentlyLoggedIn} Faculty
                  </div>
                </div>
              </div>

              {/* Not Logged In Yet */}
              <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <XCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] text-muted-foreground truncate font-medium">
                    Not Logged In Yet
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {summary.notLoggedInYet} Faculty
                  </div>
                </div>
              </div>

              {/* Already Logged Out */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] text-muted-foreground truncate font-medium">
                    Already Logged Out
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {summary.alreadyLoggedOut} Faculty
                  </div>
                </div>
              </div>

              {/* Total Working Hours */}
              <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] text-muted-foreground truncate font-medium">
                    Total Working Hours
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {summary.totalWorkingHours}
                  </div>
                </div>
              </div>
            </div>

            {/* Information Notice Card */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/50 text-[11.5px] text-blue-900 dark:text-blue-200 flex items-start gap-2 shadow-xs">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-tight">
                Attendance is managed by Admin, Counsellor or Center Manager. Faculty members can view their attendance in their own portal.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Mark / View Faculty Attendance Modal ────────────────────── */}
      <Dialog open={isMarkModalOpen} onOpenChange={setIsMarkModalOpen}>
        <DialogContent className="sm:max-w-[580px] p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              Mark Faculty Attendance
            </DialogTitle>
          </DialogHeader>

          {activeFaculty && (
            <div className="p-5 space-y-4">
              {/* Faculty Info Card */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-border/40">
                <div className="flex items-center gap-3">
                  <img
                    src={activeFaculty.avatar}
                    alt={activeFaculty.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/60"
                    style={{ width: "40px", height: "40px" }}
                  />
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {activeFaculty.name} ({activeFaculty.code})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activeFaculty.department} • {activeFaculty.branch}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {activeFaculty.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Date</span>
                  <div className="text-xs font-bold text-foreground bg-background border border-border/60 px-2.5 py-1 rounded-lg">
                    {formattedDateDetails.formatted}
                  </div>
                </div>
              </div>

              {/* Attendance Status Radios */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-2 uppercase tracking-wider">
                  Attendance Status
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { key: "PRESENT", label: "Present" },
                      { key: "ABSENT", label: "Absent" },
                      { key: "LEAVE", label: "Leave" },
                      { key: "HALF_DAY", label: "Half Day" },
                      { key: "HOLIDAY", label: "Holiday" },
                    ] as const
                  ).map((st) => {
                    const isSelected = modalStatus === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          setModalStatus(st.key);
                          setValidationError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500 shadow-xs"
                            : "border-border/60 bg-card hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-blue-600 bg-blue-600" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                        </span>
                        <span>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Tracking Inputs (Shown for Present / Half Day) */}
              {modalStatus !== "ABSENT" && modalStatus !== "LEAVE" && modalStatus !== "HOLIDAY" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      Login Time
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={modalLoginTime}
                        placeholder="08:52 AM"
                        onChange={(e) => {
                          setModalLoginTime(e.target.value);
                          setValidationError(null);
                        }}
                        className="h-9 text-xs rounded-xl font-mono"
                      />
                      <Clock className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      Logout Time
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={modalLogoutTime}
                        placeholder="06:04 PM"
                        onChange={(e) => {
                          setModalLogoutTime(e.target.value);
                          setValidationError(null);
                        }}
                        className="h-9 text-xs rounded-xl font-mono"
                      />
                      <Clock className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      Working Hours
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {computedWorkingHours}
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Remarks (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Add remarks (e.g. On Time, Approved Leave)..."
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMarkModalOpen(false)}
              className="h-8 px-4 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModalAttendance}
              className="h-8 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Save Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Attendance Modal ────────────────────────────────── */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Import Faculty Attendance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Upload a CSV or Excel file containing faculty biometric logs or attendance records for{" "}
              <strong>{formattedDateDetails.formatted}</strong>.
            </p>

            <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
              <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-foreground">
                Click to browse or drag & drop CSV file
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Supported formats: .csv, .xlsx (Max 5MB)
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Required columns: <code>FacultyCode</code>, <code>Date</code>, <code>LoginTime</code>, <code>LogoutTime</code>, <code>Status</code>.
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
              className="h-8 px-4 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false);
                showToast("Attendance file processed successfully (12 records synced).", "success");
              }}
              className="h-8 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Upload & Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyAttendance;
