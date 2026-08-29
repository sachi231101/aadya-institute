import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  Percent,
  Sparkles,
  ChevronRight,
  Info,
  ShieldCheck,
  Receipt,
  FileText,
  AlertCircle,
  HelpCircle,
  Eye,
  Check,
  UserCheck,
  BookOpen,
  Layers,
  Sparkle,
  Wallet,
  AlertTriangle,
  ArrowRight,
  GripVertical,
  SlidersHorizontal,
  PackagePlus,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { coursesApi } from "@/services/courses.api";
import { batchesApi, type BatchData } from "@/services/batches.api";
import { studentsApi } from "@/services/students.api";
import { admissionsApi } from "@/services/admissions.api";
import { branchesApi } from "@/services/branches.api";
import { usersApi } from "@/services/users.api";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useNumberingSeriesPreview } from "@/hooks/useMasters";
import { MasterSelect } from "@/components/common/MasterSelect";
import { getMasterLabel, findMasterIdByLabel } from "@/utils/master.utils";
import type { CreateAdmissionPayload } from "@/types/admission.types";

export interface CourseCatalogItem {
  id: string;
  name: string;
  code: string;
  duration?: string;
  durationMonths?: number;
  fee: number;
  category: string;
  packageProgram: string;
}

export interface CoursePackageItem {
  id: string;
  name: string;
  courseIds: string[];
  description: string;
}

export interface SelectedCourseItem {
  id: string;
  courseId: string;
  courseName: string;
  packageProgram: string;
  batchId: string;
  batchCode: string;
  facultyName: string;
  facultyAvatar?: string;
  schedule: string;
  startDate: string;
  endDate: string;
  fee: number;
}

export interface InstallmentItem {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: "Pending" | "Partially Paid" | "Paid" | "Overdue";
}

const toDateInput = (value?: string | Date | null) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const addMonthsIso = (base: Date, months: number) => {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
};

const resolveCourseFee = (course: { fee?: number | null }) => {
  return typeof course.fee === "number" && course.fee >= 0 ? course.fee : 0;
};

const formatBatchSchedule = (batch: BatchData) => {
  if (batch.schedules && batch.schedules.length > 0) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const labels = batch.schedules
      .map((slot) => `${days[slot.dayOfWeek] || slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`)
      .join(", ");
    if (labels) return labels;
  }
  const pattern = batch.schedulePattern || "Custom";
  return `${pattern} ${batch.timeSlot || ""}`.trim();
};

const mapBatchToSelection = (batch: BatchData) => {
  const facultyName = batch.faculty?.user?.name || "Faculty to be assigned";
  return {
    batchId: batch.id,
    batchCode: batch.code,
    facultyName,
    facultyAvatar: facultyName.charAt(0).toUpperCase(),
    schedule: formatBatchSchedule(batch),
    startDate: toDateInput(batch.startDate),
    endDate: toDateInput((batch as { expectedEndDate?: string }).expectedEndDate || ""),
  };
};

const buildEqualInstallments = (
  total: number,
  count: number,
  existing: InstallmentItem[] = []
): InstallmentItem[] => {
  const splitCount = Math.max(count, 1);
  const equalPart = Math.floor(total / splitCount);
  const remainder = total - equalPart * splitCount;
  const start = existing[0]?.dueDate ? new Date(existing[0].dueDate) : new Date();
  if (Number.isNaN(start.getTime())) start.setTime(Date.now());

  return Array.from({ length: splitCount }, (_, idx) => ({
    installmentNo: idx + 1,
    dueDate: existing[idx]?.dueDate || addMonthsIso(start, idx === 0 && existing[0]?.dueDate ? 0 : idx + 1),
    amount: idx === 0 ? equalPart + remainder : equalPart,
    status: existing[idx]?.status || "Pending",
  }));
};

const mapPaymentMethod = (label: string): CreateAdmissionPayload["paymentMethod"] => {
  const value = label.toLowerCase();
  if (value.includes("net") || value.includes("imps") || value.includes("neft")) return "NET_BANKING";
  if (value.includes("card")) return "CARD";
  if (value.includes("cash")) return "CASH";
  if (value.includes("cheque") || value.includes("dd")) return "CHEQUE";
  return "UPI";
};

const currentYear = new Date().getFullYear();
const ACADEMIC_YEAR_OPTIONS = [
  `${currentYear} - ${currentYear + 1}`,
  `${currentYear - 1} - ${currentYear}`,
  `${currentYear + 1} - ${currentYear + 2}`,
];

export const DirectAdmissionEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedBranchId } = useBranchStore();

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  // ─── 1. STUDENT DETAILS STATE ───────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState("");
  const [isNewStudentMode, setIsNewStudentMode] = useState(true);
  const [selectedExistingStudentId, setSelectedExistingStudentId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [areaMasterId, setAreaMasterId] = useState("");

  // Government ID & Guardian details (Optional)
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [govtIdType, setGovtIdType] = useState("Aadhaar Card");
  const [govtIdNumber, setGovtIdNumber] = useState("");
  const [govtIdFileName, setGovtIdFileName] = useState("");
  const [govtIdVerified, setGovtIdVerified] = useState(false);

  // ─── 2. ADMISSION DETAILS STATE ─────────────────────────────────────────
  const [admissionType, setAdmissionType] = useState("Regular Admission");
  const [branchId, setBranchId] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEAR_OPTIONS[0]);
  const [counsellorName, setCounsellorName] = useState(user?.name || "");
  const [sourceMasterId, setSourceMasterId] = useState("");
  const { options: leadSourceOptions } = useMasterDropdown("leadsource");
  const { options: paymentModeOptions } = useMasterDropdown("paymentmodes");
  const { options: admissionStatusOptions } = useMasterDropdown("admissionstatus");
  const [referralSourceMasterId, setReferralSourceMasterId] = useState("");
  const [statusMasterId, setStatusMasterId] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState<"Draft" | "Provisional" | "Confirmed" | "Cancelled">("Confirmed");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ─── 3. MULTI-COURSE DUAL PANEL & SELECTION STATE ───────────────────────
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [availableSearchQuery, setAvailableSearchQuery] = useState("");
  const [selectedSearchQuery, setSelectedSearchQuery] = useState("");

  // Track single selected course in Available panel
  const [selectedAvailableCourseId, setSelectedAvailableCourseId] = useState<string | null>(null);

  // Selected courses list for admission
  const [selectedCoursesList, setSelectedCoursesList] = useState<SelectedCourseItem[]>([]);

  // ─── 4. FEE & PAYMENT STATE ─────────────────────────────────────────────
  const [registrationFee, setRegistrationFee] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"Percentage" | "Fixed">("Fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [scholarshipAmount, setScholarshipAmount] = useState<number>(0);
  const [customGstAmount, setCustomGstAmount] = useState<number | null>(null);
  const [customFinalPayable, setCustomFinalPayable] = useState<number | null>(null);

  // Amount Paid at Admission & Mode
  const [amountPaidAtAdmission, setAmountPaidAtAdmission] = useState<number>(0);
  const [paymentModeMasterId, setPaymentModeMasterId] = useState("");
  const [transactionRef, setTransactionRef] = useState("");

  // ─── 5. INSTALLMENT DETAILS STATE ───────────────────────────────────────
  const [paymentMode, setPaymentMode] = useState<"FULL" | "INSTALLMENT">("INSTALLMENT");
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  // ─── 6. REMARKS & TERMS STATE ───────────────────────────────────────────
  const [remarks, setRemarks] = useState("");
  const [termsAccepted1, setTermsAccepted1] = useState(false);
  const [termsAccepted2, setTermsAccepted2] = useState(false);

  // ─── 7. MODALS STATE ───────────────────────────────────────────────────
  const [showReviewStepModal, setShowReviewStepModal] = useState(false);
  const [reviewVerifiedCheck, setReviewVerifiedCheck] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAdmissionSummary, setCreatedAdmissionSummary] = useState<any>(null);

  // Auto-fill student details when converted directly from a Lead or Enquiry
  useEffect(() => {
    const rawData = location.state?.lead || location.state;
    if (!rawData) return;

    if (rawData.name) {
      const parts = String(rawData.name).trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (rawData.phone) {
      setPhone(String(rawData.phone).replace(/[^0-9+]/g, ""));
    }
    if (rawData.email) {
      setEmail(String(rawData.email));
    }
    if (rawData.counsellor || rawData.assignedCounselor) {
      setCounsellorName(rawData.counsellor || rawData.assignedCounselor);
    }
    if (rawData.source) {
      setSourceMasterId(findMasterIdByLabel(leadSourceOptions, rawData.source));
    }
    if (rawData.location) {
      setCity(rawData.location);
    }
    if (rawData.notes) {
      setRemarks(rawData.notes);
    }
    if (rawData.parentName) {
      setFatherName(rawData.parentName);
    }
    if (rawData.parentPhone) {
      setEmergencyContact(rawData.parentPhone);
    }
    if (rawData.gender) {
      setGender(rawData.gender);
    }
    if (rawData.dob) {
      setDob(rawData.dob);
    }
    if (rawData.govtIdType) {
      setGovtIdType(rawData.govtIdType);
    }
    if (rawData.govtIdNumber) {
      setGovtIdNumber(rawData.govtIdNumber);
    }
  }, [location.state, leadSourceOptions]);

  // ─── QUERIES ─────────────────────────────────────────────────────────────
  const { data: dbCoursesRes, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", "direct-admission"],
    queryFn: () => coursesApi.getAll({ status: "ACTIVE" }),
  });

  const { data: batchesRes, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const { data: studentsRes, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", "direct-entry", studentSearch],
    queryFn: () => studentsApi.getAll({ limit: 50, search: studentSearch.trim() || undefined }),
    enabled: !isNewStudentMode,
  });

  const { data: branchesRes, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches({ limit: 50, status: "ACTIVE" }),
    retry: false,
  });

  const { data: counselorsRes } = useQuery({
    queryKey: ["users", "counsellors"],
    queryFn: () => usersApi.getUsers({ role: "COUNSELLOR", limit: 50, status: "ACTIVE" }),
    retry: false,
  });

  const branches = useMemo(() => {
    const list = branchesRes?.data || [];
    if (list.length > 0) return list;
    if (user?.branchId) {
      return [{ id: user.branchId, name: "Assigned Center", code: "", instituteId: user.instituteId, address: null, phone: null, status: "ACTIVE" as const, createdAt: "", updatedAt: "" }];
    }
    return [];
  }, [branchesRes, user]);
  const allDbBatches = useMemo(() => (batchesRes?.data || []) as BatchData[], [batchesRes]);
  const counselors = useMemo(() => {
    const list = counselorsRes?.data || [];
    if (user?.name && !list.some((c) => c.name === user.name)) {
      return [{ id: user.id, name: user.name }, ...list];
    }
    return list;
  }, [counselorsRes, user]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );
  const branchName = selectedBranch?.name || "";
  const branchCode = selectedBranch?.code;
  const { data: admissionSeriesData, isLoading: isAdmissionPreviewLoading, refetch: refetchAdmissionPreview } =
    useNumberingSeriesPreview("ADMISSION", branchCode ? { branchCode } : undefined);
  const admissionNo = admissionSeriesData?.data?.preview ?? (isAdmissionPreviewLoading ? "Loading..." : "—");

  // Sync with global admin branch filter or auto-select default branch
  useEffect(() => {
    if (branches.length === 0) return;
    if (
      selectedBranchId &&
      selectedBranchId !== "ALL" &&
      branches.some((b) => b.id === selectedBranchId)
    ) {
      if (branchId !== selectedBranchId) {
        setBranchId(selectedBranchId);
      }
    } else if (user?.branchId && branches.some((b) => b.id === user.branchId)) {
      if (branchId !== user.branchId) {
        setBranchId(user.branchId);
      }
    } else if (!branchId && branches.length > 0) {
      setBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId, user?.branchId, branchId]);

  useEffect(() => {
    if (counsellorName) return;
    if (user?.name) setCounsellorName(user.name);
    else if (counselors[0]?.name) setCounsellorName(counselors[0].name);
  }, [counsellorName, user?.name, counselors]);

  useEffect(() => {
    if (paymentModeOptions.length === 0) return;
    if (!paymentModeMasterId) {
      setPaymentModeMasterId(paymentModeOptions[0].value);
    }
  }, [paymentModeOptions, paymentModeMasterId]);

  const allAvailableCourses = useMemo(() => {
    return (dbCoursesRes?.data || [])
      .filter((c: { status?: string }) => c.status !== "INACTIVE" && c.status !== "DELETED")
      .map((c: { id: string; name: string; code: string; duration?: number; category?: string; fee?: number | null }) => {
        const durationMonths = c.duration || 0;
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          fee: resolveCourseFee(c),
          durationMonths,
          duration: durationMonths > 0 ? `${durationMonths} Months` : undefined,
          category: c.category || "General",
          packageProgram: c.name,
        };
      });
  }, [dbCoursesRes]);

  const availablePackages = useMemo(() => [] as Array<CoursePackageItem & { matchedCourses: typeof allAvailableCourses }>, []);

  const existingStudents = useMemo(() => {
    return (studentsRes?.data || []).map((s: any) => {
      const names = (s.user?.name || s.name || "Student").split(" ");
      const street = typeof s.address === "string" ? s.address : s.address?.street || "";
      return {
        id: s.id,
        studentCode: s.studentCode || `STU-${String(s.id).slice(0, 6)}`,
        name: s.user?.name || s.name || "Student",
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        email: s.user?.email || s.email || "",
        phone: s.user?.phone || s.phone || "",
        dob: s.dateOfBirth ? String(s.dateOfBirth).slice(0, 10) : "",
        gender: s.gender || "Male",
        address: street,
        city: s.city || s.address?.city || "",
        state: s.state || s.address?.state || "",
        pincode: s.pincode || s.address?.pincode || "",
      };
    });
  }, [studentsRes]);

  // Autocomplete search for existing students
  const searchedExistingStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return existingStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [existingStudents, studentSearch]);

  const handleSelectExistingStudent = (st: any) => {
    setSelectedExistingStudentId(st.id);
    setFirstName(st.firstName || "");
    setLastName(st.lastName || "");
    setPhone(st.phone || "");
    setEmail(st.email || "");
    setDob(st.dob || "");
    setGender(st.gender || "Female");
    setAddress(st.address || "");
    setCity(st.city || "Bengaluru");
    setState(st.state || "Karnataka");
    setPincode(st.pincode || "560102");
    setStudentSearch(`${st.name} (${st.studentCode})`);
  };

  const handleSwitchToNewStudent = () => {
    setIsNewStudentMode(true);
    setSelectedExistingStudentId(null);
    setStudentSearch("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setAltPhone("");
    setEmail("");
    setDob("");
    setGender("Female");
    setAddress("");
    setCity("Bengaluru");
    setState("Karnataka");
    setPincode("560102");
  };

  const handleSwitchToSearchExisting = () => {
    setIsNewStudentMode(false);
    setSelectedExistingStudentId(null);
    setStudentSearch("");
  };

  const getCourseBatches = (courseId: string, courseName: string, courseCode: string) => {
    const realBatches = allDbBatches.filter((b) => b.courseId === courseId && b.status !== "CANCELLED");
    if (realBatches.length > 0) {
      return realBatches.map((batch) => {
        const mapped = mapBatchToSelection(batch);
        return {
          id: mapped.batchId,
          name: batch.name,
          code: mapped.batchCode,
          facultyName: mapped.facultyName,
          facultyAvatar: mapped.facultyAvatar,
          schedule: mapped.schedule,
          startDate: mapped.startDate,
          endDate: mapped.endDate,
          availableSeats: Math.max(0, (batch.capacity || 35) - (batch._count?.enrollments || 0)),
          totalCapacity: batch.capacity || 35,
          isPersisted: true,
        };
      });
    }

    return [];
  };

  const buildSelectedCourseItem = (cObj: (typeof allAvailableCourses)[number]): SelectedCourseItem => {
    const courseBatches = getCourseBatches(cObj.id, cObj.name, cObj.code);
    const defaultBatch = courseBatches[0];
    return {
      id: `sel-${cObj.id}-${Date.now()}`,
      courseId: cObj.id,
      courseName: cObj.name,
      packageProgram: cObj.packageProgram,
      batchId: defaultBatch?.id || "",
      batchCode: defaultBatch?.code || "Unassigned",
      facultyName: defaultBatch?.facultyName || "To be assigned",
      facultyAvatar: defaultBatch?.facultyAvatar,
      schedule: defaultBatch?.schedule || "Schedule pending",
      startDate: defaultBatch?.startDate || admissionDate,
      endDate: defaultBatch?.endDate || "",
      fee: resolveCourseFee(cObj),
    };
  };

  // Auto-select course from Enquiry/Lead when available courses are ready
  useEffect(() => {
    const rawData = location.state?.lead || location.state;
    const courseTarget = rawData?.course || rawData?.courseName;
    if (!courseTarget || allAvailableCourses.length === 0) return;

    if (selectedCoursesList.length === 0) {
      const targetLower = String(courseTarget).toLowerCase().trim();
      const matched = allAvailableCourses.find(
        (c) =>
          c.name.toLowerCase().includes(targetLower) ||
          targetLower.includes(c.name.toLowerCase()) ||
          c.code.toLowerCase() === targetLower
      ) || allAvailableCourses[0];

      if (matched && !selectedCoursesList.some((item) => item.courseId === matched.id)) {
        setSelectedCoursesList([buildSelectedCourseItem(matched)]);
      }
    }
  }, [location.state, allAvailableCourses]);

  // Available courses list (excluding already selected courses)
  const filteredAvailableCourses = useMemo(() => {
    const selectedCourseIdSet = new Set(selectedCoursesList.map((c) => c.courseId));
    let list = allAvailableCourses.filter((c) => !selectedCourseIdSet.has(c.id));

    if (availableSearchQuery.trim()) {
      const q = availableSearchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return list;
  }, [allAvailableCourses, selectedCoursesList, availableSearchQuery]);

  // Filtered selected courses
  const filteredSelectedCourses = useMemo(() => {
    if (!selectedSearchQuery.trim()) return selectedCoursesList;
    const q = selectedSearchQuery.toLowerCase();
    return selectedCoursesList.filter((c) => c.courseName.toLowerCase().includes(q) || c.batchCode.toLowerCase().includes(q));
  }, [selectedCoursesList, selectedSearchQuery]);

  // ─── 1-CLICK INSTANT COURSE SELECTION & RETURN HANDLERS ────────────────
  // 1-Click: Click on course in Available panel -> Instantly moves into Selected Courses table
  const handleQuickAddCourse = (courseId: string) => {
    const cObj = allAvailableCourses.find((c) => c.id === courseId);
    if (!cObj) return;
    if (selectedCoursesList.some((item) => item.courseId === cObj.id)) return;
    setSelectedCoursesList((prev) => [...prev, buildSelectedCourseItem(cObj)]);
    setSelectedAvailableCourseId(null);
  };

  // 1-Click: Click on course in Selected table -> Instantly returns back to Available list
  const handleQuickRemoveCourse = (itemId: string) => {
    setSelectedCoursesList((prev) => prev.filter((c) => c.id !== itemId));
  };

  // Remove single course from Selected table (returns it to Available list)
  const handleRemoveSingleCourse = (itemId: string) => {
    setSelectedCoursesList((prev) => prev.filter((c) => c.id !== itemId));
  };

  // Apply a Course Package
  const handleApplyPackage = (pkgId?: string) => {
    const idToApply = pkgId || selectedPackageId;
    if (!idToApply) return;

    const pkg = availablePackages.find((p) => p.id === idToApply);
    if (!pkg) {
      setFormError("This package has no matching courses in the current catalog.");
      return;
    }

    const existingCourseIds = new Set(selectedCoursesList.map((c) => c.courseId));
    const newItems = pkg.matchedCourses
      .filter((cObj) => !existingCourseIds.has(cObj.id))
      .map((cObj) => buildSelectedCourseItem(cObj));

    if (newItems.length === 0) {
      setFormError("All courses in this package are already selected.");
      return;
    }

    setSelectedCoursesList((prev) => [...prev, ...newItems]);
    setFormError(null);
  };

  // ─── BATCH & COURSE CONFIGURATION HANDLERS ──────────────────────────────
  const handleBatchChangeForCourse = (courseItemId: string, newBatchId: string) => {
    setSelectedCoursesList((prev) =>
      prev.map((item) => {
        if (item.id !== courseItemId) return item;
        const cObj = allAvailableCourses.find((c) => c.id === item.courseId);
        const courseBatches = getCourseBatches(item.courseId, item.courseName, cObj?.code || "CRS");
        const foundBatch = courseBatches.find((b) => b.id === newBatchId);
        if (!foundBatch) {
          return { ...item, batchId: "", batchCode: "Unassigned", facultyName: "To be assigned", schedule: "Schedule pending" };
        }

        return {
          ...item,
          batchId: foundBatch.id,
          batchCode: foundBatch.code,
          facultyName: foundBatch.facultyName,
          facultyAvatar: foundBatch.facultyAvatar,
          schedule: foundBatch.schedule,
          startDate: foundBatch.startDate,
          endDate: foundBatch.endDate,
        };
      })
    );
  };

  const handleUpdateCourseFee = (courseItemId: string, newFee: number) => {
    setSelectedCoursesList((prev) =>
      prev.map((item) => (item.id === courseItemId ? { ...item, fee: newFee } : item))
    );
  };

  const handleUpdateStartDate = (courseItemId: string, newDate: string) => {
    setSelectedCoursesList((prev) =>
      prev.map((item) => (item.id === courseItemId ? { ...item, startDate: newDate } : item))
    );
  };

  const handleUpdateEndDate = (courseItemId: string, newDate: string) => {
    setSelectedCoursesList((prev) =>
      prev.map((item) => (item.id === courseItemId ? { ...item, endDate: newDate } : item))
    );
  };

  // ─── FINANCIAL CALCULATIONS ──────────────────────────────────────────────
  const totalBaseCourseFee = useMemo(() => {
    return selectedCoursesList.reduce((acc, item) => acc + (Number(item.fee) || 0), 0);
  }, [selectedCoursesList]);

  const subTotal = useMemo(() => {
    return totalBaseCourseFee + (Number(registrationFee) || 0) + (Number(additionalCharges) || 0);
  }, [totalBaseCourseFee, registrationFee, additionalCharges]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === "Percentage") {
      return Math.round((totalBaseCourseFee * (Number(discountValue) || 0)) / 100);
    }
    return Number(discountValue) || 0;
  }, [totalBaseCourseFee, discountType, discountValue]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subTotal - calculatedDiscount - (Number(scholarshipAmount) || 0));
  }, [subTotal, calculatedDiscount, scholarshipAmount]);

  const calculatedGst = useMemo(() => {
    return Math.round(taxableAmount * 0.18);
  }, [taxableAmount]);

  const gstAmount = customGstAmount !== null ? customGstAmount : calculatedGst;

  const calculatedFinalPayable = useMemo(() => {
    return Math.max(0, taxableAmount + gstAmount);
  }, [taxableAmount, gstAmount]);

  const finalPayableAmount = customFinalPayable !== null ? customFinalPayable : calculatedFinalPayable;

  const balanceToBePaid = useMemo(() => {
    return Math.max(0, finalPayableAmount - (Number(amountPaidAtAdmission) || 0));
  }, [finalPayableAmount, amountPaidAtAdmission]);

  useEffect(() => {
    setCustomGstAmount(null);
    setCustomFinalPayable(null);
  }, [totalBaseCourseFee, registrationFee, additionalCharges, discountValue, discountType, scholarshipAmount]);

  useEffect(() => {
    if (paymentMode !== "INSTALLMENT" || balanceToBePaid <= 0) {
      if (paymentMode === "FULL" || balanceToBePaid <= 0) {
        setInstallments([]);
      }
      return;
    }
    setInstallments((prev) => buildEqualInstallments(balanceToBePaid, prev.length > 0 ? prev.length : 3, prev));
  }, [paymentMode, balanceToBePaid]);

  const totalInstallmentAmount = useMemo(() => {
    return installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [installments]);

  const notifyError = (message: string) => {
    setFormSuccess(null);
    setFormError(message);
    window.setTimeout(() => setFormError(null), 5000);
  };

  const notifySuccess = (message: string) => {
    setFormError(null);
    setFormSuccess(message);
    window.setTimeout(() => setFormSuccess(null), 4000);
  };

  const handleAutoDistributeInstallments = () => {
    if (installments.length === 0) {
      setInstallments(buildEqualInstallments(balanceToBePaid, 3));
      return;
    }
    setInstallments(buildEqualInstallments(balanceToBePaid, installments.length, installments));
  };

  const handleAddInstallment = () => {
    const next = [
      ...installments,
      {
        installmentNo: installments.length + 1,
        dueDate: addMonthsIso(new Date(installments[installments.length - 1]?.dueDate || Date.now()), 1),
        amount: 0,
        status: "Pending" as const,
      },
    ];
    setInstallments(buildEqualInstallments(balanceToBePaid, next.length, next));
  };

  const handleRemoveInstallment = (index: number) => {
    if (installments.length <= 1) return;
    const remaining = installments.filter((_, idx) => idx !== index);
    setInstallments(buildEqualInstallments(balanceToBePaid, remaining.length, remaining));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateAdmissionForm = (statusOverride?: "Draft" | "Confirmed") => {
    if (!firstName.trim()) {
      notifyError("Please enter the student's first name.");
      return false;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      notifyError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notifyError("Please enter a valid email address.");
      return false;
    }
    if (!branchId) {
      notifyError("Please select a branch / center.");
      return false;
    }
    if (!counsellorName) {
      notifyError("Please select a counsellor.");
      return false;
    }
    if (selectedCoursesList.length === 0) {
      notifyError("Please select at least one course.");
      return false;
    }
    if (statusOverride !== "Draft" && !govtIdNumber.trim()) {
      notifyError("Please enter the student's Government ID number (e.g. Aadhaar / PAN Card).");
      return false;
    }
    if (paymentMode === "INSTALLMENT" && balanceToBePaid > 0 && installments.length === 0) {
      notifyError("Please add at least one installment for the remaining balance.");
      return false;
    }
    if (paymentMode === "INSTALLMENT" && balanceToBePaid > 0) {
      const installmentTotal = installments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      if (Math.abs(installmentTotal - balanceToBePaid) > 1) {
        notifyError(`Installment amounts (₹${installmentTotal.toLocaleString()}) must equal the remaining balance (₹${balanceToBePaid.toLocaleString()}). Use Auto-Balance.`);
        return false;
      }
    }
    if (Number(amountPaidAtAdmission) > finalPayableAmount) {
      notifyError("Amount paid cannot exceed the total payable amount.");
      return false;
    }
    if (statusOverride !== "Draft" && (!termsAccepted1 || !termsAccepted2)) {
      notifyError("Please accept the terms and conditions before confirming.");
      return false;
    }
    return true;
  };

  const buildAdmissionNotes = () => {
    return [
      remarks.trim() || null,
      `Admission type: ${admissionType}`,
      `Academic year: ${academicYear}`,
      counsellorName ? `Counsellor: ${counsellorName}` : null,
      sourceMasterId
        ? `Lead source: ${getMasterLabel(leadSourceOptions, sourceMasterId)}`
        : null,
      referralSourceMasterId
        ? `Referral: ${getMasterLabel(leadSourceOptions, referralSourceMasterId)}`
        : null,
      altPhone ? `Alternate mobile: ${altPhone}` : null,
      fatherName ? `Father's Name: ${fatherName}` : null,
      motherName ? `Mother's Name: ${motherName}` : null,
      guardianPhone ? `Guardian Phone: ${guardianPhone}` : null,
      govtIdNumber ? `Govt ID (${govtIdType}): ${govtIdNumber}` : null,
      address ? `Address: ${address}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  };

  const handleConfirmAdmission = (statusOverride?: "Draft" | "Confirmed") => {
    if (!validateAdmissionForm(statusOverride)) return;

    const studentFullName = `${firstName} ${lastName}`.trim() || "Student";
    const coursesSummary = selectedCoursesList.map((c) => c.courseName).join(", ");
    const batchesSummary = selectedCoursesList.map((c) => c.batchCode).join(", ");

    const summaryPayload = {
      admissionNo,
      studentName: studentFullName,
      email,
      phone,
      branch: branchName,
      counsellor: counsellorName,
      course: coursesSummary,
      batch: batchesSummary,
      coursesCount: selectedCoursesList.length,
      finalPayable: finalPayableAmount,
      amountPaid: Number(amountPaidAtAdmission) || 0,
      balanceToPay: balanceToBePaid,
      paymentMethod: getMasterLabel(paymentModeOptions, paymentModeMasterId) || "UPI / Online",
      transactionRef: transactionRef || "",
      status: statusOverride === "Draft" ? "Draft Saved" : "Confirmed",
      date: admissionDate || new Date().toISOString().slice(0, 10),
    };

    setCreatedAdmissionSummary(summaryPayload);

    if (statusOverride === "Draft") {
      void submitAdmissions("PENDING");
      return;
    }

    setReviewVerifiedCheck(false);
    setShowReviewStepModal(true);
  };

  const submitAdmissions = async (status: "PENDING" | "CONFIRMED" | "PROVISIONAL") => {
    setIsSubmitting(true);
    const studentFullName = `${firstName} ${lastName}`.trim();
    const realStudentId = selectedExistingStudentId && !selectedExistingStudentId.startsWith("st-")
      ? selectedExistingStudentId
      : undefined;

    try {
      let createdStudentId = realStudentId;
      let firstAdmissionNo = admissionNo;

      for (let index = 0; index < selectedCoursesList.length; index += 1) {
        const course = selectedCoursesList[index];
        const isPrimary = index === 0;
        const payload: CreateAdmissionPayload = {
          studentName: studentFullName,
          email: email.trim(),
          phone: phone.replace(/\D/g, "").slice(-10),
          courseId: course.courseId,
          batchId: allDbBatches.some((b) => b.id === course.batchId) ? course.batchId : undefined,
          studentId: createdStudentId,
          branchId,
          feePlan: paymentMode === "FULL" ? "FULL_PAYMENT" : "INSTALLMENT",
          status,
          notes: buildAdmissionNotes(),
          admissionDate,
          sourceMasterId: sourceMasterId || undefined,
          statusMasterId: statusMasterId || undefined,
          paymentModeMasterId: paymentModeMasterId || undefined,
          areaMasterId: areaMasterId || undefined,
          paymentMethod: mapPaymentMethod(getMasterLabel(paymentModeOptions, paymentModeMasterId)),
          transactionRef: transactionRef || undefined,
          totalFee: isPrimary ? finalPayableAmount : undefined,
          amountPaid: isPrimary ? Number(amountPaidAtAdmission) || 0 : undefined,
          installments:
            isPrimary && paymentMode === "INSTALLMENT" && balanceToBePaid > 0
              ? installments.map((item) => ({
                  installmentNo: item.installmentNo,
                  dueDate: item.dueDate,
                  amount: item.amount,
                }))
              : undefined,
        };

        const result = await admissionsApi.createAdmission(payload);
        if (isPrimary) {
          firstAdmissionNo = result.data?.admissionNo || firstAdmissionNo;
          createdStudentId = (result.data as { student?: { id?: string }; studentId?: string })?.student?.id
            || (result.data as { studentId?: string })?.studentId
            || createdStudentId;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["admissions"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      await queryClient.invalidateQueries({ queryKey: ["pending-fees"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["masters", "preview"] });
      void refetchAdmissionPreview();

      setCreatedAdmissionSummary((prev: any) => ({
        ...(prev || {}),
        admissionNo: firstAdmissionNo,
        status: status === "PENDING" ? "Draft Saved" : "Confirmed",
      }));
      setShowReviewStepModal(false);
      setShowSuccessModal(true);
      notifySuccess(status === "PENDING" ? "Admission saved as draft." : "Admission confirmed successfully.");
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to create admission. Please try again.";
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmitAdmission = async () => {
    if (!reviewVerifiedCheck) {
      notifyError("Please verify the confirmation checkbox before proceeding.");
      return;
    }
    const nextStatus = admissionStatus === "Provisional" ? "PROVISIONAL" : "CONFIRMED";
    await submitAdmissions(nextStatus);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {(formError || formSuccess) && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-border animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-sm">
          {formError ? (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          <span>{formError || formSuccess}</span>
        </div>
      )}
      {/* ─── TOP BREADCRUMB & HEADER ────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Link to={`${basePath}/admissions/all`} className="hover:text-primary transition-colors">
                Counsellor Portal
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span>Admissions & Counselling Desk</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link to={`${basePath}/admissions/all`} className="hover:text-primary transition-colors">
                All Admissions
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-primary font-bold">Direct Admission Entry</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Direct Admission Entry</h1>
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold text-[11px] px-2.5 py-0.5">
                Multi-Course Admission
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/admissions/all`)}
              className="text-xs font-semibold border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfirmAdmission("Draft")}
              disabled={isSubmitting}
              className="text-xs font-semibold border-border text-foreground hover:bg-muted"
            >
              Save as Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!firstName.trim() || phone.replace(/\D/g, "").length < 10 || !email.trim()) {
                  document.getElementById("section-student")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  notifyError("Complete student details first.");
                  return;
                }
                if (selectedCoursesList.length === 0) {
                  document.getElementById("section-courses")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  notifyError("Select at least one course to continue.");
                  return;
                }
                document.getElementById("section-fees")?.scrollIntoView({ behavior: "smooth", block: "start" });
                notifySuccess("Details saved locally. Review fees, installments, and terms next.");
              }}
              disabled={isSubmitting}
              className="text-xs font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            >
              Save & Continue
            </Button>
            <Button
              size="sm"
              onClick={() => handleConfirmAdmission("Confirmed")}
              disabled={isSubmitting}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold shadow-xs px-4"
            >
              Confirm Admission
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <p className="text-xs sm:text-sm text-muted-foreground mb-6">
          Create a new student admission, select multiple courses, assign batches, configure fees and confirm the admission.
        </p>

        {/* ─── MAIN 2-COLUMN LAYOUT ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLS: FORM WORKSPACE */}
          <div className="lg:col-span-8 space-y-6">
            {/* ──── 1. STUDENT DETAILS ────────────────────────────────────────── */}
            <Card id="section-student" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <CardTitle className="text-base font-bold text-foreground">Student Details</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="studentMode"
                        checked={!isNewStudentMode}
                        onChange={handleSwitchToSearchExisting}
                        className="text-primary focus:ring-primary"
                      />
                      Search Existing Student
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="studentMode"
                        checked={isNewStudentMode}
                        onChange={handleSwitchToNewStudent}
                        className="text-primary focus:ring-primary"
                      />
                      Add New Student
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Mode 1: Search Existing Student */}
                {!isNewStudentMode && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by student name, ID (STU-...), mobile number, or email..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          if (selectedExistingStudentId) setSelectedExistingStudentId(null);
                        }}
                        className="pl-9 bg-background border-border text-foreground text-xs sm:text-sm"
                      />
                    </div>

                    {studentsLoading && studentSearch.trim() && (
                      <div className="border border-border rounded-xl bg-card p-3 text-xs text-muted-foreground">
                        Searching students...
                      </div>
                    )}
                    {!studentsLoading && studentSearch.trim() && !selectedExistingStudentId && searchedExistingStudents.length === 0 && (
                      <div className="border border-border rounded-xl bg-card p-3 text-xs text-muted-foreground">
                        No matching students found. Switch to Add New Student to register them.
                      </div>
                    )}
                    {!selectedExistingStudentId && searchedExistingStudents.length > 0 && (
                      <div className="border border-border rounded-xl bg-card shadow-lg overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
                        {searchedExistingStudents.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => handleSelectExistingStudent(st)}
                            className="p-3 hover:bg-muted/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-500/20 text-primary dark:text-blue-400 flex items-center justify-center font-bold">
                                {st.firstName?.charAt(0) || "S"}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">{st.name}</span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {st.studentCode} • {st.phone} • {st.email}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                              Select Student
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Found Student Mini Profile Banner */}
                    {selectedExistingStudentId && (
                      <div className="p-3.5 bg-muted/40 border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            {firstName ? firstName.charAt(0) : "S"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{firstName} {lastName}</span>
                              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-background border-border">
                                {existingStudents.find((s) => s.id === selectedExistingStudentId)?.studentCode || "STU-000126"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground text-[11px] mt-0.5">
                              <span>Mobile: <strong className="text-foreground">{phone}</strong></span>
                              <span>Email: <strong className="text-foreground">{email}</strong></span>
                              <span>DOB: <strong className="text-foreground">{dob}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Existing student loaded</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedExistingStudentId(null);
                              setStudentSearch("");
                            }}
                            className="text-[11px] text-primary dark:text-blue-400 hover:bg-muted h-7 px-2"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 2: Add New Student Banner */}
                {isNewStudentMode && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <span><strong>New Student Mode:</strong> Fill in the personal details below to register and enroll a new student.</span>
                    </div>
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                      New Profile
                    </Badge>
                  </div>
                )}

                {/* Student Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Last Name
                    </label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" required className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Alternate Mobile</label>
                    <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} placeholder="Alternate number" className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Date of Birth</label>
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1">Residential Address</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Area / Locality</label>
                    <MasterSelect
                      entityType="area"
                      value={areaMasterId}
                      onChange={setAreaMasterId}
                      placeholder="Select area"
                      className="mt-0 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Father's / Guardian's Name</label>
                    <Input
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Father / Guardian Name"
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Mother's Name</label>
                    <Input
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="Mother Name"
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Emergency / Guardian Mobile</label>
                    <Input
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="Emergency contact number"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                {/* ──── GOVERNMENT IDENTITY (MANDATORY — NO UPLOAD REQUIRED) ──── */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Government Identity</span>
                    </div>
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                      Mandatory
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Government ID Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={govtIdType}
                        onChange={(e) => setGovtIdType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Driving Licence">Driving Licence</option>
                        <option value="Passport">Passport</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Other Government ID">Other Government ID</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        {govtIdType} Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={govtIdNumber}
                        onChange={(e) => setGovtIdNumber(e.target.value)}
                        placeholder={
                          govtIdType === "Aadhaar Card"
                            ? "XXXX XXXX XXXX (12 digits)"
                            : govtIdType === "PAN Card"
                            ? "ABCDE1234F (10 characters)"
                            : `Enter ${govtIdType} number`
                        }
                        required
                        className="bg-background border-border text-foreground text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Government ID number is mandatory for student registration. Document file upload is not required.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ──── 2. ADMISSION DETAILS ──────────────────────────────────────── */}
            <Card id="section-admission" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">Admission Details</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Admission Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={admissionType}
                      onChange={(e) => setAdmissionType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="Regular Admission">Regular Admission</option>
                      <option value="Direct / Fast Track">Direct / Fast Track</option>
                      <option value="Lateral Entry">Lateral Entry</option>
                      <option value="Corporate Sponsored">Corporate Sponsored</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Branch / Center <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="">Select Branch / Center</option>
                      {branchesLoading && <option value="" disabled>Loading branches...</option>}
                      {!branchesLoading && branches.length === 0 && <option value="" disabled>No branches found</option>}
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Admission No.</label>
                    <Input
                      value={admissionNo}
                      readOnly
                      className="font-mono text-foreground font-bold bg-muted/50 border-border"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-assigned from Master Numbering Series upon confirmation.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Admission Date <span className="text-red-500">*</span>
                    </label>
                    <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} required className="bg-background border-border text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      {ACADEMIC_YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Counsellor <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={counsellorName}
                      onChange={(e) => setCounsellorName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      {counsellorName && !counselors.some((c) => c.name === counsellorName) && (
                        <option value={counsellorName}>{counsellorName}</option>
                      )}
                      {counselors.map((counselor) => (
                        <option key={counselor.id} value={counselor.name}>
                          {counselor.name}
                        </option>
                      ))}
                      {counselors.length === 0 && !counsellorName && (
                        <option value="">No counsellors found</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Lead Source</label>
                    <MasterSelect
                      entityType="leadsource"
                      value={sourceMasterId}
                      onChange={setSourceMasterId}
                      placeholder="Select Lead Source"
                      className="mt-0 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Referral Source</label>
                    <MasterSelect
                      entityType="leadsource"
                      value={referralSourceMasterId}
                      onChange={setReferralSourceMasterId}
                      placeholder="Select Referral Source"
                      className="mt-0 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Admission Status</label>
                    <MasterSelect
                      entityType="admissionstatus"
                      value={statusMasterId}
                      onChange={(id) => {
                        setStatusMasterId(id);
                        const statusLabel = getMasterLabel(admissionStatusOptions, id);
                        if (/draft/i.test(statusLabel)) setAdmissionStatus("Draft");
                        else if (/provisional/i.test(statusLabel)) setAdmissionStatus("Provisional");
                        else if (/cancel/i.test(statusLabel)) setAdmissionStatus("Cancelled");
                        else setAdmissionStatus("Confirmed");
                      }}
                      placeholder="Select status"
                      className="mt-0 rounded-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ──── 3. COURSE SELECTION (SINGLE SELECT AT A TIME) ─────────────── */}
            <Card id="section-courses" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Course Selection</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Select one or more courses for this student's admission.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                    {selectedCoursesList.length} Selected
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* Course Package Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">Course Package (Optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={selectedPackageId}
                        onChange={(e) => {
                          setSelectedPackageId(e.target.value);
                          if (e.target.value) handleApplyPackage(e.target.value);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                      >
                        <option value="">Select Course Package...</option>
                        {availablePackages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.matchedCourses.map((c) => c.name).join(" + ")})
                          </option>
                        ))}
                        {availablePackages.length === 0 && (
                          <option value="" disabled>
                            No packages match the current course catalog
                          </option>
                        )}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPackage()}
                      className="text-xs text-primary border-primary/30 hover:bg-primary/10 font-bold h-9 px-3.5 gap-1.5 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Package
                    </Button>
                  </div>
                </div>

                {/* ─── DUAL PANEL SELECTOR (1-CLICK INSTANT TRANSFER) ───────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* LEFT PANEL: Available Courses */}
                  <div className="md:col-span-5 border border-border rounded-xl overflow-hidden flex flex-col h-[350px] bg-card shadow-2xs">
                    <div className="p-3 bg-muted/40 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          Available Courses
                          <span className="text-[10px] font-normal text-muted-foreground">(1-click to add)</span>
                        </span>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground bg-background border-border">
                          {filteredAvailableCourses.length} items
                        </Badge>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search courses..."
                          value={availableSearchQuery}
                          onChange={(e) => setAvailableSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-background border-border text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {coursesLoading ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">Loading courses...</div>
                      ) : filteredAvailableCourses.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                          {availableSearchQuery ? (
                            <p>No matching courses found.</p>
                          ) : allAvailableCourses.length === 0 ? (
                            <>
                              <p>No courses available yet.</p>
                              <p className="text-[11px]">Add courses in Course Management to enable admissions.</p>
                              {basePath === "/admin" && (
                                <Link
                                  to="/admin/courses/add"
                                  className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                                >
                                  Add Course <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </>
                          ) : (
                            <p>All available courses have been added.</p>
                          )}
                        </div>
                      ) : (
                        filteredAvailableCourses.map((course) => (
                          <div
                            key={course.id}
                            onClick={() => handleQuickAddCourse(course.id)}
                            className="group p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between border border-border hover:border-primary/50 hover:bg-muted/60 text-foreground"
                            title="Click to add this course"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="block truncate font-medium group-hover:text-primary transition-colors">
                                {course.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {course.category} • {(course as any).duration || ((course as any).durationMonths ? `${(course as any).durationMonths} Months` : "6 Months")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-bold text-foreground">
                                ₹{course.fee.toLocaleString()}
                              </span>
                              <div className="h-6 w-6 rounded-md bg-blue-500/15 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* CENTER INDICATOR */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center gap-2 py-2 text-center">
                    <div className="h-10 w-10 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-primary dark:text-blue-400 shadow-2xs">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold text-primary dark:text-blue-400 block">
                      1-Click Select
                    </span>
                    <span className="text-[10px] text-muted-foreground max-w-[120px] leading-tight">
                      Click any course to add or return
                    </span>
                  </div>

                  {/* RIGHT PANEL: Selected Courses Table */}
                  <div className="md:col-span-5 border border-border rounded-xl overflow-hidden flex flex-col h-[350px] bg-card shadow-2xs">
                    <div className="p-3 bg-muted/40 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          Selected Courses ({selectedCoursesList.length})
                          <span className="text-[10px] font-normal text-muted-foreground">(1-click to remove)</span>
                        </span>
                        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                          ₹{totalBaseCourseFee.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search selected courses..."
                          value={selectedSearchQuery}
                          onChange={(e) => setSelectedSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-background border-border text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {filteredSelectedCourses.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground space-y-1 mt-8">
                          <Layers className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                          <p className="font-semibold text-foreground">No courses selected yet.</p>
                          <p className="text-[11px] text-muted-foreground">
                            Click any course in the <span className="font-semibold text-primary dark:text-blue-400">Available Courses</span> list to add it instantly.
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow className="text-xs border-border">
                              <TableHead className="w-10 font-bold text-muted-foreground text-center">#</TableHead>
                              <TableHead className="font-bold text-foreground">Course Name</TableHead>
                              <TableHead className="text-right font-bold text-foreground pr-3 w-24">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSelectedCourses.map((item, idx) => (
                              <TableRow
                                key={item.id}
                                onClick={() => handleQuickRemoveCourse(item.id)}
                                className="text-xs hover:bg-red-500/10 cursor-pointer transition-colors group border-border"
                                title="Click to remove and return to available courses"
                              >
                                <TableCell className="font-mono text-muted-foreground font-bold text-center py-2.5">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <span className="font-bold text-foreground block group-hover:text-red-500 transition-colors">
                                    {item.courseName}
                                  </span>
                                  <span className="text-[10px] font-mono text-primary dark:text-blue-400">
                                    ₹{item.fee.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right pr-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickRemoveCourse(item.id);
                                    }}
                                    className="px-2 py-1 text-red-500 hover:bg-red-500/20 rounded-md transition-colors text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    title="Remove course"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    <span>Remove</span>
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Flow Tip */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>1-Click Instant Transfer:</strong> Click any course from <strong>Available Courses</strong> to add it immediately. Click any selected course to return it to the main table.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ──── 4. BATCH & COURSE CONFIGURATION TABLE ─────────────────────── */}
            <Card id="section-batches" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Batch & Course Configuration</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Assign batch for each selected course. Faculty and schedule will be auto-filled.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold text-primary dark:text-blue-400 bg-blue-500/10 border-blue-500/30">
                    {selectedCoursesList.length} Courses Staged
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {selectedCoursesList.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-xs text-muted-foreground space-y-2">
                    <Layers className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="font-bold text-foreground">No courses selected for batch assignment.</p>
                    <p>Select one or more courses in the dual-panel selector above to configure batches.</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-x-auto shadow-2xs">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs border-border">
                          <TableHead className="font-bold text-foreground min-w-[160px]">Course</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[200px]">Select Batch *</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[140px]">Faculty</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[180px]">Schedule</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[120px]">Start Date</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[120px]">End Date</TableHead>
                          <TableHead className="font-bold text-foreground min-w-[110px]">Course Fee</TableHead>
                          <TableHead className="text-right font-bold text-foreground pr-4 min-w-[60px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCoursesList.map((item) => {
                          const cObj = allAvailableCourses.find((c) => c.id === item.courseId);
                          const courseBatches = getCourseBatches(item.courseId, item.courseName, cObj?.code || "CRS");

                          return (
                            <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors border-border">
                              {/* Course Name */}
                              <TableCell className="align-middle">
                                <span className="font-bold text-foreground block">{item.courseName}</span>
                                <span className="text-[11px] text-muted-foreground block">{item.packageProgram}</span>
                              </TableCell>

                              {/* Select Batch Dropdown */}
                              <TableCell className="align-middle">
                                <select
                                  value={item.batchId}
                                  onChange={(e) => handleBatchChangeForCourse(item.id, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background font-medium text-foreground"
                                >
                                  {courseBatches.length === 0 && <option value="">No batch available</option>}
                                  {courseBatches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.code} ({b.availableSeats} seats left)
                                    </option>
                                  ))}
                                </select>
                                {batchesLoading && (
                                  <span className="text-[10px] text-muted-foreground">Loading batches...</span>
                                )}
                              </TableCell>

                              {/* Faculty Auto-filled */}
                              <TableCell className="align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {item.facultyAvatar || item.facultyName.charAt(0)}
                                  </div>
                                  <span className="font-semibold text-foreground truncate">{item.facultyName}</span>
                                </div>
                              </TableCell>

                              {/* Schedule Auto-filled */}
                              <TableCell className="align-middle">
                                <span className="text-muted-foreground text-[11px] block">{item.schedule}</span>
                              </TableCell>

                              {/* Start Date */}
                              <TableCell className="align-middle">
                                <Input
                                  type="date"
                                  value={item.startDate}
                                  onChange={(e) => handleUpdateStartDate(item.id, e.target.value)}
                                  className="h-8 text-xs bg-background border-border text-foreground"
                                />
                              </TableCell>

                              {/* End Date */}
                              <TableCell className="align-middle">
                                <Input
                                  type="date"
                                  value={item.endDate}
                                  onChange={(e) => handleUpdateEndDate(item.id, e.target.value)}
                                  className="h-8 text-xs bg-background border-border text-foreground"
                                />
                              </TableCell>

                              {/* Course Fee (Editable) */}
                              <TableCell className="align-middle">
                                <Input
                                  type="number"
                                  value={item.fee}
                                  onChange={(e) => handleUpdateCourseFee(item.id, Number(e.target.value))}
                                  className="h-8 w-24 text-xs font-bold text-foreground bg-background border-border"
                                />
                              </TableCell>

                              {/* Delete Action */}
                              <TableCell className="text-right pr-4 align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSingleCourse(item.id)}
                                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                  title="Remove course"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ──── 5. FEE DETAILS (AUTO-CALCULATED) ──────────────────────────── */}
            {/* ──── 5. FEE DETAILS ────────────────────────────────────────────── */}
            <Card id="section-fees" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      5
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Fee Details (Auto Calculated)</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Fees are auto calculated based on selected courses.
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Total Base Course Fee: <strong className="text-foreground">₹{totalBaseCourseFee.toLocaleString()}</strong>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Registration Fee (₹)</label>
                    <Input
                      type="number"
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(Number(e.target.value))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Additional Charges (₹)</label>
                    <Input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Discount (₹)</label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="bg-background border-border font-semibold text-red-600 dark:text-red-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="Fixed">Amount (₹)</option>
                      <option value="Percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Scholarship (₹)</label>
                    <Input
                      type="number"
                      value={scholarshipAmount}
                      onChange={(e) => setScholarshipAmount(Number(e.target.value))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Tax / GST (18%)</label>
                    <Input
                      type="number"
                      value={gstAmount}
                      onChange={(e) => setCustomGstAmount(Number(e.target.value))}
                      className="bg-background border-border font-semibold text-foreground"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1">Total Payable Amount</label>
                    <div className="h-10 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Net Total Payable:</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">₹{finalPayableAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* ─── PAYMENT AT TIME OF ADMISSION SUB-CARD ─── */}
                <div className="mt-4 p-4.5 bg-muted/40 dark:bg-slate-900/60 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Payment Collection at the Time of Admission
                      </h4>
                    </div>
                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                      Admission Desk Settlement
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        Amount Paid at Admission (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={amountPaidAtAdmission}
                        onChange={(e) => setAmountPaidAtAdmission(Number(e.target.value))}
                        className="font-extrabold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-background focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Payment Method</label>
                      <MasterSelect
                        entityType="paymentmodes"
                        value={paymentModeMasterId}
                        onChange={setPaymentModeMasterId}
                        placeholder="Select payment mode"
                        className="mt-0 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Transaction Ref / Receipt No.</label>
                      <Input
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="e.g. UPI/61928392182"
                        className="bg-background border-border text-foreground text-xs"
                      />
                    </div>

                    <div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block">Balance to be Paid (₹)</span>
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">
                          {balanceToBePaid > 0 ? "Remaining:" : "Settled"}
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-600 dark:text-amber-300 text-sm">
                        ₹{balanceToBePaid.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      ℹ️ Remaining balance of <strong className="text-foreground">₹{balanceToBePaid.toLocaleString()}</strong> can be distributed across future installments.
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountPaidAtAdmission(finalPayableAmount)}
                      className="text-xs font-bold text-primary dark:text-blue-400 hover:underline"
                    >
                      Set Full Payment (₹{finalPayableAmount.toLocaleString()})
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ──── 6. INSTALLMENT PLAN ────────────────────────────────────────── */}
            <Card id="section-installments" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      6
                    </div>
                    <CardTitle className="text-base font-bold text-foreground">Installment Plan</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === "FULL"}
                        onChange={() => setPaymentMode("FULL")}
                        className="text-primary focus:ring-primary"
                      />
                      Full Payment
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === "INSTALLMENT"}
                        onChange={() => setPaymentMode("INSTALLMENT")}
                        className="text-primary focus:ring-primary"
                      />
                      Installment Payment
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {selectedCoursesList.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-1.5">
                    <Wallet className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                    <p className="font-bold text-foreground">Select courses to configure the installment plan.</p>
                    <p>Fees and remaining balance appear here after course selection.</p>
                  </div>
                ) : paymentMode === "FULL" || balanceToBePaid === 0 ? (
                  <div className="p-6 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {paymentMode === "FULL" ? "Full Payment Selected" : "100% Paid at Admission"}
                    </h4>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                      No remaining balance required for installment scheduling.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Remaining balance of <strong className="text-foreground">₹{balanceToBePaid.toLocaleString()}</strong> distributed across installments:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoDistributeInstallments}
                        className="text-xs text-primary border-primary/30 hover:bg-primary/10 font-bold h-8"
                      >
                        Auto-Balance Installments
                      </Button>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="text-xs border-border">
                            <TableHead className="font-semibold text-foreground">Installment No.</TableHead>
                            <TableHead className="font-semibold text-foreground">Due Date</TableHead>
                            <TableHead className="font-semibold text-foreground">Amount (₹)</TableHead>
                            <TableHead className="font-semibold text-foreground">Payment Status</TableHead>
                            <TableHead className="text-right font-semibold text-foreground pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installments.map((inst, index) => (
                            <TableRow key={index} className="text-xs border-border">
                              <TableCell className="font-bold text-foreground">Installment {inst.installmentNo}</TableCell>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={inst.dueDate}
                                  onChange={(e) => {
                                    const updated = [...installments];
                                    updated[index].dueDate = e.target.value;
                                    setInstallments(updated);
                                  }}
                                  className="h-8 text-xs bg-background border-border text-foreground"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={inst.amount}
                                  onChange={(e) => {
                                    const updated = [...installments];
                                    updated[index].amount = Number(e.target.value);
                                    setInstallments(updated);
                                  }}
                                  className="h-8 w-28 text-xs font-bold text-foreground bg-background border-border"
                                />
                              </TableCell>
                              <TableCell>
                                <select
                                  value={inst.status}
                                  onChange={(e) => {
                                    const updated = [...installments];
                                    updated[index].status = e.target.value as any;
                                    setInstallments(updated);
                                  }}
                                  className="px-2.5 py-1 text-xs rounded-md border border-border bg-background text-foreground"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Partially Paid">Partially Paid</option>
                                  <option value="Paid">Paid</option>
                                  <option value="Overdue">Overdue</option>
                                </select>
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                {installments.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInstallment(index)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddInstallment}
                        className="text-xs text-[#1769AA] border-blue-200 hover:bg-blue-50 font-bold h-8 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Installment
                      </Button>
                      <span className="text-xs font-bold text-slate-800">
                        Total Installment Amount: <strong className="text-slate-900 font-extrabold">₹{totalInstallmentAmount.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ──── 7. REMARKS & TERMS ────────────────────────────────────────── */}
            <Card id="section-remarks" className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border pb-3 pt-4 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    7
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">Remarks & Terms</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Admission Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Enter any remarks about this admission..."
                      className="w-full p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="text-xs font-bold text-foreground block">Terms & Conditions</label>
                    <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted1}
                        onChange={(e) => setTermsAccepted1(e.target.checked)}
                        className="mt-0.5 rounded text-primary focus:ring-primary"
                      />
                      <span>I have read and understood all the academy terms & conditions.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted2}
                        onChange={(e) => setTermsAccepted2(e.target.checked)}
                        className="mt-0.5 rounded text-primary focus:ring-primary"
                      />
                      <span>I confirm that all the information provided is correct and verified.</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── RIGHT 4 COLS: STICKY SIDEBAR ───────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4 sticky top-20">
            {/* Card 1: Admission Summary */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3 px-5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">Admission Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Student Name</span>
                  <span className="font-bold text-foreground">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Admission No.</span>
                  <span className="font-mono font-bold text-foreground">{admissionNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Admission Date</span>
                  <span className="font-semibold text-foreground">{admissionDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Branch / Center</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[170px]">{branchName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Counsellor</span>
                  <span className="font-semibold text-foreground">{counsellorName}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-border">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${
                    admissionStatus === "Confirmed"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : admissionStatus === "Cancelled"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      admissionStatus === "Confirmed"
                        ? "bg-emerald-500"
                        : admissionStatus === "Cancelled"
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`} /> {admissionStatus}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Selected Courses Summary */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Selected Courses Summary
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-primary dark:text-blue-400 bg-blue-500/10 border-blue-500/30">
                    {selectedCoursesList.length} Courses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2">
                {selectedCoursesList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-2">No courses selected.</p>
                ) : (
                  selectedCoursesList.map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                      <span className="text-foreground font-medium truncate max-w-[200px]">
                        {idx + 1}. {item.courseName}
                      </span>
                      <span className="font-bold text-foreground shrink-0">₹{item.fee.toLocaleString()}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border font-extrabold text-foreground">
                  <span>Total Course Fee</span>
                  <span className="text-primary dark:text-blue-400">₹{totalBaseCourseFee.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Billing Summary */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3 px-5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">Billing Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Course Fee</span>
                  <span className="font-semibold text-foreground">₹{totalBaseCourseFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration Fee</span>
                  <span className="font-semibold text-foreground">₹{registrationFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Charges</span>
                  <span className="font-semibold text-foreground">₹{additionalCharges.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold text-foreground">
                  <span>Sub Total</span>
                  <span>₹{subTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Discount</span>
                  <span>- ₹{calculatedDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Scholarship</span>
                  <span>- ₹{scholarshipAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax / GST (18%)</span>
                  <span>₹{gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-black text-emerald-600 dark:text-emerald-400">
                  <span>Total Payable Amount</span>
                  <span className="text-base">₹{finalPayableAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Payment Summary */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">Payment Summary</CardTitle>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${
                    finalPayableAmount === 0
                      ? "text-muted-foreground bg-muted border-border"
                      : balanceToBePaid === 0
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : amountPaidAtAdmission > 0
                      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30"
                  }`}>
                    {finalPayableAmount === 0
                      ? "No Fees Yet"
                      : balanceToBePaid === 0
                      ? "Fully Paid"
                      : amountPaidAtAdmission > 0
                      ? "Partially Paid"
                      : "Unpaid"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Payable</span>
                  <span className="font-bold text-foreground">₹{finalPayableAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Amount Paid</span>
                  <span>₹{amountPaidAtAdmission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-extrabold pt-1 border-t border-border">
                  <span>Remaining Balance</span>
                  <span>₹{balanceToBePaid.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1">
                  Installments: <strong className="text-foreground">{installments.length}</strong>
                </div>
              </CardContent>
            </Card>

            {/* Confirm Admission CTA Button */}
            <Button
              onClick={() => handleConfirmAdmission("Confirmed")}
              disabled={isSubmitting}
              className="w-full bg-[#1769AA] hover:bg-[#125890] text-white text-sm font-bold h-11 rounded-xl shadow-sm gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Admission
            </Button>
          </div>
        </div>
      </div>

      {/* ─── STEP 1 MODAL: REVIEW & VERIFY ADMISSION ────────────────────── */}
      <Dialog open={showReviewStepModal} onOpenChange={setShowReviewStepModal}>
        <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                Step 1 of 2 • Review & Verify Admission
              </Badge>
              <span className="font-mono text-xs text-muted-foreground font-semibold">{admissionNo}</span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2 pt-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm Admission Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please review the student profile, enrolled courses, batch allocations, fee calculations, and admission desk payment before final registration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2 text-xs">
            {/* Student Profile Card */}
            <div className="p-3.5 sm:p-4 bg-muted/40 border border-border rounded-xl space-y-2.5">
              <div className="flex justify-between items-center font-bold text-foreground border-b border-border pb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Student Profile
                </span>
                <span className="text-[11px] text-muted-foreground font-normal truncate max-w-[200px]">{branchName}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-muted-foreground">
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Full Name</span><span className="font-bold text-foreground">{firstName} {lastName}</span></div>
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Mobile</span><span className="font-semibold text-foreground">{phone}</span></div>
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Email</span><span className="font-semibold text-foreground truncate block">{email}</span></div>
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Counsellor</span><span className="font-semibold text-foreground">{counsellorName}</span></div>
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Academic Year</span><span className="font-semibold text-foreground">{academicYear}</span></div>
                <div><span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Admission Date</span><span className="font-semibold text-foreground">{admissionDate}</span></div>
              </div>
            </div>

            {/* Courses & Batches Card */}
            <div className="p-3.5 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold text-foreground border-b border-blue-500/20 pb-1.5">
                <span className="flex items-center gap-1.5 text-primary dark:text-blue-400">
                  <GraduationCap className="h-3.5 w-3.5" /> Enrolled Course(s) & Batch ({selectedCoursesList.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedCoursesList.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 bg-card rounded-lg border border-border text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block truncate">{c.courseName}</span>
                      <span className="text-muted-foreground block text-[10px] truncate">{c.packageProgram} • {c.schedule}</span>
                    </div>
                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-0">
                      <Badge variant="outline" className="font-mono text-[10px] text-primary dark:text-blue-400 bg-blue-500/10 border-blue-500/30">
                        {c.batchCode}
                      </Badge>
                      <span className="font-bold text-foreground block text-xs sm:mt-0.5">₹{c.fee.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial & Settlement Card */}
            <div className="p-3.5 sm:p-4 bg-muted/40 border border-border rounded-xl space-y-2.5">
              <div className="flex justify-between items-center font-bold text-foreground border-b border-border pb-1.5">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" /> Fee & Payment Settlement
                </span>
                <span className="text-xs font-extrabold text-foreground">Total Payable: ₹{finalPayableAmount.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Paid at Admission</span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">{getMasterLabel(paymentModeOptions, paymentModeMasterId)}</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{amountPaidAtAdmission.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">Remaining Balance</span>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                      {balanceToBePaid > 0 ? `${installments.length} installment(s)` : "Fully Settled"}
                    </span>
                  </div>
                  <span className="font-black text-amber-600 dark:text-amber-300 text-sm">₹{balanceToBePaid.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Verification Checkbox */}
            <label className="flex items-start gap-2.5 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={reviewVerifiedCheck}
                onChange={(e) => setReviewVerifiedCheck(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <span className="text-xs font-semibold text-foreground">
                I have reviewed all the student admission details and verify that the initial payment collection of ₹{(Number(amountPaidAtAdmission) || 0).toLocaleString()} and batch schedules are accurate.
              </span>
            </label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewStepModal(false)}
              className="text-xs font-semibold border-border text-foreground hover:bg-muted"
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleFinalSubmitAdmission}
              disabled={isSubmitting || !reviewVerifiedCheck}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold gap-2"
            >
              {isSubmitting ? (
                <span>Generating Admission...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Proceed to Final Confirmation →</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STEP 2 MODAL: ADMISSION CONFIRMED / SUCCESS ──────────────────── */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="w-[94vw] max-w-xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border-border text-foreground text-center">
          <div className="mx-auto my-1 h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <DialogHeader className="text-center sm:text-center space-y-1">
            <div className="inline-block mx-auto">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Step 2 of 2 • Admission Confirmed
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Admission Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              The student admission record, batch schedule allocation, and fee installment structure have been registered.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-4 sm:p-4.5 bg-muted/40 border border-border rounded-2xl text-xs space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Admission No</span>
                <span className="font-mono font-extrabold text-foreground text-xs sm:text-sm">
                  {createdAdmissionSummary?.admissionNo || admissionNo}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Admission Date</span>
                <span className="font-semibold text-foreground text-xs">
                  {createdAdmissionSummary?.date || admissionDate}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-muted-foreground font-medium shrink-0">Student Name:</span>
              <div className="sm:text-right min-w-0">
                <span className="font-bold text-foreground block truncate">
                  {createdAdmissionSummary?.studentName || `${firstName} ${lastName}`.trim()}
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">{phone} • {email}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-muted-foreground font-medium shrink-0">Course(s):</span>
              <span className="font-semibold text-foreground sm:text-right min-w-0 break-words">
                {createdAdmissionSummary?.course || selectedCoursesList.map((c) => c.courseName).join(", ") || "Digital Marketing"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium shrink-0">Batch Code(s):</span>
              <span className="font-mono font-bold text-primary dark:text-blue-400 text-right truncate">
                {createdAdmissionSummary?.batch || selectedCoursesList.map((c) => c.batchCode).join(", ") || "DM-JUN-2026-MORN"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-foreground font-bold">Final Payable Amount:</span>
              <span className="font-extrabold text-foreground text-sm">
                ₹{(createdAdmissionSummary?.finalPayable ?? finalPayableAmount).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Amount Paid at Admission:</span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                  via {createdAdmissionSummary?.paymentMethod || getMasterLabel(paymentModeOptions, paymentModeMasterId)}
                </span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                ₹{(createdAdmissionSummary?.amountPaid ?? amountPaidAtAdmission).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <div>
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">Balance to be Paid:</span>
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                  {(createdAdmissionSummary?.balanceToPay ?? balanceToBePaid) > 0
                    ? `${installments.length} installment(s) remaining`
                    : "Full Settlement Completed"}
                </span>
              </div>
              <span className="font-black text-amber-600 dark:text-amber-300 text-base">
                ₹{(createdAdmissionSummary?.balanceToPay ?? balanceToBePaid).toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-1">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`${basePath}/admissions/all`);
              }}
              className="text-xs font-semibold border-border text-foreground hover:bg-muted"
            >
              Back to All Admissions
            </Button>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`${basePath}/fees/payments`);
              }}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" /> View Payment Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
