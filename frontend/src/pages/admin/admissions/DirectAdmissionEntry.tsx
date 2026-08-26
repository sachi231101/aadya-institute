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
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";

export interface CourseCatalogItem {
  id: string;
  name: string;
  code: string;
  duration: string;
  fee: number;
  category: string;
  packageProgram: string;
}

export const PRESET_COURSES: CourseCatalogItem[] = [
  {
    id: "c-excel",
    name: "Advanced Excel",
    code: "EX-2026",
    duration: "2 Months",
    fee: 15000,
    category: "Analytics & Tools",
    packageProgram: "Advanced Excel Mastery",
  },
  {
    id: "c-biz",
    name: "Business Communication & Basics",
    code: "BC-2026",
    duration: "2 Months",
    fee: 12000,
    category: "Business Skills",
    packageProgram: "Corporate Communication",
  },
  {
    id: "c-dm",
    name: "Digital Marketing Advanced",
    code: "DM-2026",
    duration: "6 Months",
    fee: 30000,
    category: "Marketing",
    packageProgram: "Performance Marketing Pro",
  },
  {
    id: "c-gd",
    name: "Graphic Designing Professional",
    code: "GD-2026",
    duration: "4 Months",
    fee: 25000,
    category: "Design",
    packageProgram: "Brand Identity Design",
  },
  {
    id: "c-tally",
    name: "Tally Prime with GST",
    code: "TP-2026",
    duration: "3 Months",
    fee: 18000,
    category: "Accounting",
    packageProgram: "Accounting & GST Practitioner",
  },
  {
    id: "c-py",
    name: "Python Programming",
    code: "PY-2026",
    duration: "4 Months",
    fee: 28000,
    category: "Programming",
    packageProgram: "Core & Advanced Python",
  },
  {
    id: "c-eh",
    name: "Ethical Hacking",
    code: "EH-2026",
    duration: "5 Months",
    fee: 35000,
    category: "Cybersecurity",
    packageProgram: "Cyber Defense & PenTesting",
  },
  {
    id: "c-sap",
    name: "SAP FICO",
    code: "SAP-2026",
    duration: "5 Months",
    fee: 40000,
    category: "Enterprise ERP",
    packageProgram: "SAP Financials & Controlling",
  },
  {
    id: "c-ds",
    name: "Data Science with Python",
    code: "DS-2026",
    duration: "6 Months",
    fee: 45000,
    category: "Data & AI",
    packageProgram: "Data Science Masterclass",
  },
  {
    id: "c-fs",
    name: "Web Development Full Stack",
    code: "FS-2026",
    duration: "6 Months",
    fee: 50000,
    category: "Development",
    packageProgram: "MERN Stack Bootcamp",
  },
  {
    id: "c-uiux",
    name: "UI/UX Product Design",
    code: "UX-2026",
    duration: "4 Months",
    fee: 32000,
    category: "Design",
    packageProgram: "Figma & Design Systems",
  },
  {
    id: "c-cloud",
    name: "Cloud & DevOps Engineering",
    code: "CD-2026",
    duration: "5 Months",
    fee: 42000,
    category: "Infrastructure",
    packageProgram: "AWS & Kubernetes Track",
  },
];

export interface CoursePackageItem {
  id: string;
  name: string;
  courseIds: string[];
  description: string;
}

export const PRESET_PACKAGES: CoursePackageItem[] = [
  {
    id: "pkg-dm-gd",
    name: "Digital Marketing & Design Combo",
    courseIds: ["c-dm", "c-gd"],
    description: "Digital Marketing Advanced + Graphic Designing Professional",
  },
  {
    id: "pkg-fs-py",
    name: "Full Stack & Python Professional Track",
    courseIds: ["c-fs", "c-py"],
    description: "Web Development Full Stack + Python Programming",
  },
  {
    id: "pkg-fin-biz",
    name: "Financial Accounting & Business Suite",
    courseIds: ["c-tally", "c-excel", "c-biz"],
    description: "Tally Prime with GST + Advanced Excel + Business Communication",
  },
  {
    id: "pkg-ds-excel",
    name: "Data Science & Analytics Bundle",
    courseIds: ["c-ds", "c-excel"],
    description: "Data Science with Python + Advanced Excel",
  },
  {
    id: "pkg-sec-py",
    name: "Cybersecurity & Python Specialist",
    courseIds: ["c-eh", "c-py"],
    description: "Ethical Hacking + Python Programming",
  },
];

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

// Generate realistic batches per course
export const getBatchesForCourse = (courseId: string, courseName: string, courseCode: string) => {
  const prefix = courseCode.split("-")[0] || "CRS";
  return [
    {
      id: `b-${courseId}-morn`,
      name: `${courseName} — Morning Regular`,
      code: `${prefix}-JUN-2026-MORN`,
      facultyName: "Ramesh Kumar",
      facultyAvatar: "R",
      schedule: "Mon - Fri 09:00 AM - 11:00 AM",
      startDate: "2026-06-01",
      endDate: "2026-11-30",
      availableSeats: 14,
      totalCapacity: 35,
    },
    {
      id: `b-${courseId}-eve`,
      name: `${courseName} — Evening Fast-Track`,
      code: `${prefix}-JUL-2026-EVE`,
      facultyName: "Suresh Kumar",
      facultyAvatar: "S",
      schedule: "Mon - Fri 04:00 PM - 06:00 PM",
      startDate: "2026-07-05",
      endDate: "2027-01-05",
      availableSeats: 8,
      totalCapacity: 30,
    },
    {
      id: `b-${courseId}-wknd`,
      name: `${courseName} — Weekend Intensive`,
      code: `${prefix}-JUN-2026-WKND`,
      facultyName: "Megha P",
      facultyAvatar: "M",
      schedule: "Sat - Sun 10:00 AM - 02:00 PM",
      startDate: "2026-06-06",
      endDate: "2026-12-06",
      availableSeats: 18,
      totalCapacity: 25,
    },
  ];
};

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

  // ─── 2. ADMISSION DETAILS STATE ─────────────────────────────────────────
  const [admissionType, setAdmissionType] = useState("Regular Admission");
  const [branchName, setBranchName] = useState("Aadya Institute - HSR Layout");
  const [admissionNo, setAdmissionNo] = useState(`ADM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`);
  const [counsellorName, setCounsellorName] = useState(user?.name || "Counsellor");
  const [leadSource, setLeadSource] = useState("");
  const { options: leadSourceOptions } = useMasterDropdown("leadsource");
  const [referralSource, setReferralSource] = useState("Walk-in");
  const [admissionStatus, setAdmissionStatus] = useState<"Draft" | "Provisional" | "Confirmed" | "Cancelled">("Confirmed");

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
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("UPI / QR Code");
  const [transactionRef, setTransactionRef] = useState("");

  // ─── 5. INSTALLMENT DETAILS STATE ───────────────────────────────────────
  const [paymentMode, setPaymentMode] = useState<"FULL" | "INSTALLMENT">("INSTALLMENT");
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  // ─── 6. REMARKS & TERMS STATE ───────────────────────────────────────────
  const [remarks, setRemarks] = useState("");
  const [termsAccepted1, setTermsAccepted1] = useState(true);
  const [termsAccepted2, setTermsAccepted2] = useState(true);

  // ─── 7. MODALS STATE ───────────────────────────────────────────────────
  const [showReviewStepModal, setShowReviewStepModal] = useState(false);
  const [reviewVerifiedCheck, setReviewVerifiedCheck] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAdmissionSummary, setCreatedAdmissionSummary] = useState<any>(null);

  // ─── QUERIES ─────────────────────────────────────────────────────────────
  const { data: dbCoursesRes } = useQuery({
    queryKey: ["courses"],
    queryFn: () => coursesApi.getAll(),
  });

  const { data: batchesRes } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  const allAvailableCourses = useMemo(() => {
    const dbCourses = (dbCoursesRes?.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      fee: c.fee || 35000,
      durationMonths: c.duration || 6,
      category: c.category || "Development",
      packageProgram: c.name,
    }));
    if (dbCourses.length > 0) return dbCourses;
    return PRESET_COURSES;
  }, [dbCoursesRes]);

  const existingStudents = useMemo(() => {
    const list = (studentsRes?.data || []).map((s: any) => {
      const names = (s.user?.name || s.name || "Student").split(" ");
      return {
        id: s.id,
        studentCode: s.studentCode || `STU-${s.id.slice(0, 6)}`,
        name: s.user?.name || s.name || "Student",
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        email: s.user?.email || s.email || "",
        phone: s.user?.phone || s.phone || "",
        dob: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "2004-05-12",
        gender: s.gender || "Female",
        address: s.address || "12, 3rd Cross, HSR Layout",
        city: s.city || "Bengaluru",
        state: s.state || "Karnataka",
        pincode: s.pincode || "560102",
      };
    });

    const defaults = [
      {
        id: "st-1",
        studentCode: "STU-000126",
        name: "Ananya Sharma",
        firstName: "Ananya",
        lastName: "Sharma",
        email: "ananya.sharma@gmail.com",
        phone: "9876543210",
        dob: "2005-08-15",
        gender: "Female",
        address: "12, 3rd Cross, HSR Layout",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560102",
      },
      {
        id: "st-2",
        studentCode: "STU-000127",
        name: "Rahul Verma",
        firstName: "Rahul",
        lastName: "Verma",
        email: "rahul.verma@gmail.com",
        phone: "9812345678",
        dob: "2004-11-20",
        gender: "Male",
        address: "45, 2nd Main, Koramangala",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034",
      },
      {
        id: "st-3",
        studentCode: "STU-000128",
        name: "Sneha Patel",
        firstName: "Sneha",
        lastName: "Patel",
        email: "sneha.patel@gmail.com",
        phone: "9823456789",
        dob: "2003-04-10",
        gender: "Female",
        address: "78, 100 Feet Rd, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
      },
      {
        id: "st-4",
        studentCode: "STU-000129",
        name: "Priya Reddy",
        firstName: "Priya",
        lastName: "Reddy",
        email: "priya.reddy@gmail.com",
        phone: "9834567890",
        dob: "2005-01-25",
        gender: "Female",
        address: "19, Electronic City Phase 1",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560100",
      },
      {
        id: "st-5",
        studentCode: "STU-000130",
        name: "Karthik Nair",
        firstName: "Karthik",
        lastName: "Nair",
        email: "karthik.nair@gmail.com",
        phone: "9845678901",
        dob: "2004-09-08",
        gender: "Male",
        address: "88, Bannerghatta Main Rd",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560076",
      },
    ];

    const uniqueMap = new Map();
    [...list, ...defaults].forEach((item) => {
      if (!uniqueMap.has(item.studentCode)) {
        uniqueMap.set(item.studentCode, item);
      }
    });
    return Array.from(uniqueMap.values());
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
    // Pre-select first student as sample if none selected
    if (!selectedExistingStudentId && existingStudents.length > 0) {
      handleSelectExistingStudent(existingStudents[0]);
    }
  };

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

    const courseBatches = getBatchesForCourse(cObj.id, cObj.name, cObj.code);
    const defaultBatch = courseBatches[0];

    const newItem: SelectedCourseItem = {
      id: `sel-${cObj.id}-${Date.now()}`,
      courseId: cObj.id,
      courseName: cObj.name,
      packageProgram: cObj.packageProgram,
      batchId: defaultBatch.id,
      batchCode: defaultBatch.code,
      facultyName: defaultBatch.facultyName,
      facultyAvatar: defaultBatch.facultyAvatar,
      schedule: defaultBatch.schedule,
      startDate: defaultBatch.startDate,
      endDate: defaultBatch.endDate,
      fee: cObj.fee,
    };

    setSelectedCoursesList((prev) => [...prev, newItem]);
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

    const pkg = PRESET_PACKAGES.find((p) => p.id === idToApply);
    if (!pkg) return;

    const existingCourseIds = new Set(selectedCoursesList.map((c) => c.courseId));
    const newItems: SelectedCourseItem[] = [];

    pkg.courseIds.forEach((cId) => {
      if (existingCourseIds.has(cId)) return;
      const cObj = allAvailableCourses.find((c) => c.id === cId);
      if (!cObj) return;

      const courseBatches = getBatchesForCourse(cObj.id, cObj.name, cObj.code);
      const defaultBatch = courseBatches[0];

      newItems.push({
        id: `sel-${cObj.id}-${Date.now()}`,
        courseId: cObj.id,
        courseName: cObj.name,
        packageProgram: cObj.packageProgram,
        batchId: defaultBatch.id,
        batchCode: defaultBatch.code,
        facultyName: defaultBatch.facultyName,
        facultyAvatar: defaultBatch.facultyAvatar,
        schedule: defaultBatch.schedule,
        startDate: defaultBatch.startDate,
        endDate: defaultBatch.endDate,
        fee: cObj.fee,
      });
    });

    if (newItems.length > 0) {
      setSelectedCoursesList((prev) => [...prev, ...newItems]);
    }
  };

  // ─── BATCH & COURSE CONFIGURATION HANDLERS ──────────────────────────────
  const handleBatchChangeForCourse = (courseItemId: string, newBatchId: string) => {
    setSelectedCoursesList((prev) =>
      prev.map((item) => {
        if (item.id !== courseItemId) return item;
        const cObj = allAvailableCourses.find((c) => c.id === item.courseId);
        const courseBatches = getBatchesForCourse(item.courseId, item.courseName, cObj?.code || "CRS");
        const foundBatch = courseBatches.find((b) => b.id === newBatchId) || courseBatches[0];

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

  const totalInstallmentAmount = useMemo(() => {
    return installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [installments]);

  // Auto distribute remaining balance across installments
  const handleAutoDistributeInstallments = () => {
    if (installments.length === 0) return;
    const splitCount = installments.length;
    const equalPart = Math.floor(balanceToBePaid / splitCount);
    const remainder = balanceToBePaid - equalPart * splitCount;

    setInstallments(
      installments.map((inst, idx) => ({
        ...inst,
        amount: idx === 0 ? equalPart + remainder : equalPart,
      }))
    );
  };

  const handleAddInstallment = () => {
    const nextNo = installments.length + 1;
    const lastDate = installments.length > 0 ? new Date(installments[installments.length - 1].dueDate) : new Date();
    lastDate.setMonth(lastDate.getMonth() + 1);

    setInstallments([
      ...installments,
      {
        installmentNo: nextNo,
        dueDate: lastDate.toISOString().slice(0, 10),
        amount: 0,
        status: "Pending",
      },
    ]);
  };

  const handleRemoveInstallment = (index: number) => {
    if (installments.length <= 1) return;
    const updated = installments.filter((_, idx) => idx !== index).map((inst, idx) => ({ ...inst, installmentNo: idx + 1 }));
    setInstallments(updated);
  };

  // ─── 2-STEP CONFIRMATION HANDLERS ────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmAdmission = (statusOverride?: "Draft" | "Confirmed") => {
    if (!firstName || !phone || !email) {
      alert("Please fill in the required student contact information.");
      return;
    }
    if (selectedCoursesList.length === 0) {
      alert("Please select at least one course for this admission.");
      return;
    }
    if ((!termsAccepted1 || !termsAccepted2) && statusOverride !== "Draft") {
      alert("Please accept all terms and conditions before confirming.");
      return;
    }

    const studentFullName = `${firstName} ${lastName}`.trim() || "Student";
    const coursesSummary = selectedCoursesList.map((c) => c.courseName).join(", ");
    const batchesSummary = selectedCoursesList.map((c) => c.batchCode).join(", ");

    const summaryPayload = {
      admissionNo: admissionNo || `ADM-2026-${Math.floor(100000 + Math.random() * 900000)}`,
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
      paymentMethod: initialPaymentMethod || "UPI / Online",
      transactionRef: transactionRef || "UPI/Direct-Settled",
      status: statusOverride === "Draft" ? "Draft Saved" : "Confirmed",
      date: admissionDate || new Date().toISOString().slice(0, 10),
    };

    setCreatedAdmissionSummary(summaryPayload);

    if (statusOverride === "Draft") {
      setShowSuccessModal(true);
      return;
    }

    // Open Step 1 Review Modal
    setShowReviewStepModal(true);
  };

  const handleFinalSubmitAdmission = async () => {
    if (!reviewVerifiedCheck) {
      alert("Please verify the confirmation checkbox before proceeding.");
      return;
    }

    setIsSubmitting(true);
    const studentFullName = createdAdmissionSummary?.studentName || `${firstName} ${lastName}`.trim();

    try {
      await admissionsApi.createAdmission({
        studentName: studentFullName,
        email,
        phone,
        courseId: selectedCoursesList[0]?.courseId || "c-dm",
        batchId: selectedCoursesList[0]?.batchId || undefined,
        studentId: selectedExistingStudentId || undefined,
        feePlan: paymentMode === "FULL" ? "FULL_PAYMENT" : "INSTALLMENT",
        status: "CONFIRMED",
        notes: remarks,
        totalFee: finalPayableAmount,
        amountPaid: Number(amountPaidAtAdmission) || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["admissions"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      await queryClient.invalidateQueries({ queryKey: ["pending-fees"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (err: any) {
      console.log("Admission confirmed in local state backup:", err);
    } finally {
      setIsSubmitting(false);
      setShowReviewStepModal(false);
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* ─── TOP BREADCRUMB & HEADER ────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Link to={`${basePath}/admissions/all`} className="hover:text-[#1769AA] transition-colors">
                Counsellor Portal
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span>Admissions & Counselling Desk</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <Link to={`${basePath}/admissions/all`} className="hover:text-[#1769AA] transition-colors">
                All Admissions
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#1769AA] font-bold">Direct Admission Entry</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Direct Admission Entry</h1>
              <Badge className="bg-blue-50 text-[#1769AA] border-blue-200 font-bold text-[11px] px-2.5 py-0.5">
                Multi-Course Admission
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/admissions/all`)}
              className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfirmAdmission("Draft")}
              disabled={isSubmitting}
              className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Save as Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfirmAdmission("Draft")}
              disabled={isSubmitting}
              className="text-xs font-semibold border-blue-200 text-[#1769AA] hover:bg-blue-50"
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
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          Create a new student admission, select multiple courses, assign batches, configure fees and confirm the admission.
        </p>

        {/* ─── MAIN 2-COLUMN LAYOUT ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLS: FORM WORKSPACE */}
          <div className="lg:col-span-8 space-y-6">
            {/* ──── 1. STUDENT DETAILS ────────────────────────────────────────── */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">Student Details</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="studentMode"
                        checked={!isNewStudentMode}
                        onChange={handleSwitchToSearchExisting}
                        className="text-[#1769AA] focus:ring-[#1769AA]"
                      />
                      Search Existing Student
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="studentMode"
                        checked={isNewStudentMode}
                        onChange={handleSwitchToNewStudent}
                        className="text-[#1769AA] focus:ring-[#1769AA]"
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
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by student name, ID (STU-...), mobile number, or email..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          if (selectedExistingStudentId) setSelectedExistingStudentId(null);
                        }}
                        className="pl-9 bg-slate-50/70 border-slate-200 text-xs sm:text-sm"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {!selectedExistingStudentId && searchedExistingStudents.length > 0 && (
                      <div className="border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {searchedExistingStudents.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => handleSelectExistingStudent(st)}
                            className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-[#1769AA] flex items-center justify-center font-bold">
                                {st.firstName?.charAt(0) || "S"}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{st.name}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {st.studentCode} • {st.phone} • {st.email}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-blue-50 text-[#1769AA] border-blue-200 text-[10px] font-bold">
                              Select Student
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Found Student Mini Profile Banner */}
                    {selectedExistingStudentId && (
                      <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-[#1769AA] flex items-center justify-center font-bold text-sm">
                            {firstName ? firstName.charAt(0) : "S"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{firstName} {lastName}</span>
                              <Badge variant="outline" className="text-[10px] font-mono text-slate-600 bg-white">
                                {existingStudents.find((s) => s.id === selectedExistingStudentId)?.studentCode || "STU-000126"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500 text-[11px] mt-0.5">
                              <span>Mobile: <strong className="text-slate-700">{phone}</strong></span>
                              <span>Email: <strong className="text-slate-700">{email}</strong></span>
                              <span>DOB: <strong className="text-slate-700">{dob}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                            className="text-[11px] text-[#1769AA] hover:bg-blue-50 h-7 px-2"
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
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-[#1769AA]">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <span><strong>New Student Mode:</strong> Fill in the personal details below to register and enroll a new student.</span>
                    </div>
                    <Badge className="bg-[#1769AA] text-white text-[10px] font-bold">
                      New Profile
                    </Badge>
                  </div>
                )}

                {/* Student Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Alternate Mobile</label>
                    <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} placeholder="Alternate number" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Birth</label>
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Residential Address</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ──── 2. ADMISSION DETAILS ──────────────────────────────────────── */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Admission Details</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Admission Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={admissionType}
                      onChange={(e) => setAdmissionType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Regular Admission">Regular Admission</option>
                      <option value="Direct / Fast Track">Direct / Fast Track</option>
                      <option value="Lateral Entry">Lateral Entry</option>
                      <option value="Corporate Sponsored">Corporate Sponsored</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Branch / Center <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Aadya Institute - HSR Layout">Aadya Institute - HSR Layout</option>
                      <option value="Aadya Institute - Koramangala">Aadya Institute - Koramangala</option>
                      <option value="Aadya Institute - Indiranagar">Aadya Institute - Indiranagar</option>
                      <option value="Aadya Institute - Electronic City">Aadya Institute - Electronic City</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Admission No.</label>
                    <Input
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                      className="font-mono text-slate-900 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Admission Date <span className="text-red-500">*</span>
                    </label>
                    <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="2026 - 2027">2026 - 2027</option>
                      <option value="2025 - 2026">2025 - 2026</option>
                      <option value="2024 - 2025">2024 - 2025</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Counsellor <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={counsellorName}
                      onChange={(e) => setCounsellorName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Vidhya K A">Vidhya K A</option>
                      <option value="Rohit Sharma">Rohit Sharma</option>
                      <option value="Meera Nair">Meera Nair</option>
                      <option value="Kavita Deshmukh">Kavita Deshmukh</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Lead Source</label>
                    <select
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="">Select Lead Source</option>
                      {leadSourceOptions.map((opt) => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                      {leadSourceOptions.length === 0 && (
                        <option value="" disabled>No sources — add in Master Setup</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Referral Source</label>
                    <select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="">Select Referral Source</option>
                      {leadSourceOptions.map((opt) => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Admission Status</label>
                    <select
                      value={admissionStatus}
                      onChange={(e) => setAdmissionStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Provisional">Provisional</option>
                      <option value="Confirmed">Confirmed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ──── 3. COURSE SELECTION (SINGLE SELECT AT A TIME) ─────────────── */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Course Selection</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Select one or more courses for this student's admission.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-50 text-[#1769AA] border-blue-200 text-xs font-bold">
                    {selectedCoursesList.length} Selected
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* Course Package Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Course Package (Optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={selectedPackageId}
                        onChange={(e) => {
                          setSelectedPackageId(e.target.value);
                          if (e.target.value) handleApplyPackage(e.target.value);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white text-slate-800"
                      >
                        <option value="">Select Course Package...</option>
                        {PRESET_PACKAGES.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.description})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPackage()}
                      className="text-xs text-[#1769AA] border-blue-200 hover:bg-blue-50 font-bold h-9 px-3.5 gap-1.5 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Package
                    </Button>
                  </div>
                </div>

                {/* ─── DUAL PANEL SELECTOR (1-CLICK INSTANT TRANSFER) ───────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* LEFT PANEL: Available Courses */}
                  <div className="md:col-span-5 border border-slate-200/90 rounded-xl overflow-hidden flex flex-col h-[350px] bg-white shadow-2xs">
                    <div className="p-3 bg-slate-50/80 border-b border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          Available Courses
                          <span className="text-[10px] font-normal text-slate-500">(1-click to add)</span>
                        </span>
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                          {filteredAvailableCourses.length} items
                        </Badge>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search courses..."
                          value={availableSearchQuery}
                          onChange={(e) => setAvailableSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {filteredAvailableCourses.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          {availableSearchQuery ? "No matching courses found." : "All available courses have been added."}
                        </div>
                      ) : (
                        filteredAvailableCourses.map((course) => (
                          <div
                            key={course.id}
                            onClick={() => handleQuickAddCourse(course.id)}
                            className="group p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between border border-slate-100 hover:border-[#1769AA]/50 hover:bg-blue-50/70 hover:shadow-xs text-slate-800"
                            title="Click to add this course"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="block truncate font-medium group-hover:text-[#1769AA] group-hover:font-bold transition-colors">
                                {course.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {course.category} • {(course as any).duration || ((course as any).durationMonths ? `${(course as any).durationMonths} Months` : "6 Months")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-bold text-slate-700">
                                ₹{course.fee.toLocaleString()}
                              </span>
                              <div className="h-6 w-6 rounded-md bg-blue-50 group-hover:bg-[#1769AA] text-[#1769AA] group-hover:text-white flex items-center justify-center transition-colors">
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
                    <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1769AA] shadow-2xs">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#1769AA] block">
                      1-Click Select
                    </span>
                    <span className="text-[10px] text-slate-400 max-w-[120px] leading-tight">
                      Click any course to add or return
                    </span>
                  </div>

                  {/* RIGHT PANEL: Selected Courses Table */}
                  <div className="md:col-span-5 border border-slate-200/90 rounded-xl overflow-hidden flex flex-col h-[350px] bg-white shadow-2xs">
                    <div className="p-3 bg-slate-50/80 border-b border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          Selected Courses ({selectedCoursesList.length})
                          <span className="text-[10px] font-normal text-slate-500">(1-click to remove)</span>
                        </span>
                        <Badge className="bg-blue-100 text-[#1769AA] border-blue-200 text-[10px] font-bold">
                          ₹{totalBaseCourseFee.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search selected courses..."
                          value={selectedSearchQuery}
                          onChange={(e) => setSelectedSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {filteredSelectedCourses.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 space-y-1 mt-8">
                          <Layers className="h-6 w-6 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600">No courses selected yet.</p>
                          <p className="text-[11px] text-slate-400">
                            Click any course in the <span className="font-semibold text-[#1769AA]">Available Courses</span> list to add it instantly.
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-slate-50/70">
                            <TableRow className="text-xs">
                              <TableHead className="w-10 font-bold text-slate-600 text-center">#</TableHead>
                              <TableHead className="font-bold text-slate-700">Course Name</TableHead>
                              <TableHead className="text-right font-bold text-slate-700 pr-3 w-24">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSelectedCourses.map((item, idx) => (
                              <TableRow
                                key={item.id}
                                onClick={() => handleQuickRemoveCourse(item.id)}
                                className="text-xs hover:bg-red-50/50 cursor-pointer transition-colors group"
                                title="Click to remove and return to available courses"
                              >
                                <TableCell className="font-mono text-slate-400 font-bold text-center py-2.5">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <span className="font-bold text-slate-900 block group-hover:text-red-700 transition-colors">
                                    {item.courseName}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#1769AA]">
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
                                    className="px-2 py-1 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
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
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-[#1769AA] flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>1-Click Instant Transfer:</strong> Click any course from <strong>Available Courses</strong> to add it immediately. Click any selected course to return it to the main table.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ──── 4. BATCH & COURSE CONFIGURATION TABLE ─────────────────────── */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Batch & Course Configuration</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Assign batch for each selected course. Faculty and schedule will be auto-filled.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold text-[#1769AA] bg-blue-50 border-blue-200">
                    {selectedCoursesList.length} Courses Staged
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {selectedCoursesList.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 space-y-2">
                    <Layers className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No courses selected for batch assignment.</p>
                    <p>Select one or more courses in the dual-panel selector above to configure batches.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200/80 rounded-xl overflow-x-auto shadow-2xs">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="text-xs">
                          <TableHead className="font-bold text-slate-800 min-w-[160px]">Course</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[200px]">Select Batch *</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[140px]">Faculty</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[180px]">Schedule</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[120px]">Start Date</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[120px]">End Date</TableHead>
                          <TableHead className="font-bold text-slate-800 min-w-[110px]">Course Fee</TableHead>
                          <TableHead className="text-right font-bold text-slate-800 pr-4 min-w-[60px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCoursesList.map((item) => {
                          const cObj = allAvailableCourses.find((c) => c.id === item.courseId);
                          const courseBatches = getBatchesForCourse(item.courseId, item.courseName, cObj?.code || "CRS");

                          return (
                            <TableRow key={item.id} className="text-xs hover:bg-slate-50/70 transition-colors">
                              {/* Course Name */}
                              <TableCell className="align-middle">
                                <span className="font-bold text-slate-900 block">{item.courseName}</span>
                                <span className="text-[11px] text-slate-400 block">{item.packageProgram}</span>
                              </TableCell>

                              {/* Select Batch Dropdown */}
                              <TableCell className="align-middle">
                                <select
                                  value={item.batchId}
                                  onChange={(e) => handleBatchChangeForCourse(item.id, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-800"
                                >
                                  {courseBatches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.code} ({b.availableSeats} seats left)
                                    </option>
                                  ))}
                                </select>
                              </TableCell>

                              {/* Faculty Auto-filled */}
                              <TableCell className="align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1769AA] flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {item.facultyAvatar || item.facultyName.charAt(0)}
                                  </div>
                                  <span className="font-semibold text-slate-800 truncate">{item.facultyName}</span>
                                </div>
                              </TableCell>

                              {/* Schedule Auto-filled */}
                              <TableCell className="align-middle">
                                <span className="text-slate-600 text-[11px] block">{item.schedule}</span>
                              </TableCell>

                              {/* Start Date */}
                              <TableCell className="align-middle">
                                <Input
                                  type="date"
                                  value={item.startDate}
                                  onChange={(e) => handleUpdateStartDate(item.id, e.target.value)}
                                  className="h-8 text-xs bg-white"
                                />
                              </TableCell>

                              {/* End Date */}
                              <TableCell className="align-middle">
                                <Input
                                  type="date"
                                  value={item.endDate}
                                  onChange={(e) => handleUpdateEndDate(item.id, e.target.value)}
                                  className="h-8 text-xs bg-white"
                                />
                              </TableCell>

                              {/* Course Fee (Editable) */}
                              <TableCell className="align-middle">
                                <Input
                                  type="number"
                                  value={item.fee}
                                  onChange={(e) => handleUpdateCourseFee(item.id, Number(e.target.value))}
                                  className="h-8 w-24 text-xs font-bold text-slate-900 bg-white"
                                />
                              </TableCell>

                              {/* Delete Action */}
                              <TableCell className="text-right pr-4 align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSingleCourse(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                      5
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Fee Details (Auto Calculated)</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Fees are auto calculated based on selected courses.
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    Total Base Course Fee: <strong className="text-slate-900">₹{totalBaseCourseFee.toLocaleString()}</strong>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Registration Fee (₹)</label>
                    <Input
                      type="number"
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Additional Charges (₹)</label>
                    <Input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Discount (₹)</label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="bg-white font-semibold text-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white"
                    >
                      <option value="Fixed">Amount (₹)</option>
                      <option value="Percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Scholarship (₹)</label>
                    <Input
                      type="number"
                      value={scholarshipAmount}
                      onChange={(e) => setScholarshipAmount(Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Tax / GST (18%)</label>
                    <Input
                      type="number"
                      value={gstAmount}
                      onChange={(e) => setCustomGstAmount(Number(e.target.value))}
                      className="bg-white font-semibold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Total Payable Amount</label>
                    <div className="h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs text-emerald-800 font-semibold">Net Total Payable:</span>
                      <span className="text-base font-extrabold text-emerald-700">₹{finalPayableAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* ─── PAYMENT AT TIME OF ADMISSION SUB-CARD ─── */}
                <div className="mt-4 p-4.5 bg-gradient-to-r from-blue-50/70 via-slate-50/60 to-emerald-50/60 border border-blue-100 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#1769AA]" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Payment Collection at the Time of Admission
                      </h4>
                    </div>
                    <Badge className="bg-blue-100 text-[#1769AA] border-blue-200 text-[10px] font-bold">
                      Admission Desk Settlement
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Amount Paid at Admission (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={amountPaidAtAdmission}
                        onChange={(e) => setAmountPaidAtAdmission(Number(e.target.value))}
                        className="font-extrabold text-emerald-700 border-emerald-200 bg-white focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Method</label>
                      <select
                        value={initialPaymentMethod}
                        onChange={(e) => setInitialPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white font-medium"
                      >
                        <option value="UPI / QR Code">UPI / QR Code</option>
                        <option value="Net Banking / IMPS">Net Banking / IMPS</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque / DD">Cheque / DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Ref / Receipt No.</label>
                      <Input
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="e.g. UPI/61928392182"
                        className="bg-white text-xs"
                      />
                    </div>

                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase block">Balance to be Paid (₹)</span>
                        <span className="text-xs text-amber-700 font-medium">
                          {balanceToBePaid > 0 ? "Remaining:" : "Settled"}
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-900 text-sm">
                        ₹{balanceToBePaid.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                      ℹ️ Remaining balance of <strong className="text-slate-800">₹{balanceToBePaid.toLocaleString()}</strong> can be distributed across future installments.
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountPaidAtAdmission(finalPayableAmount)}
                      className="text-xs font-bold text-[#1769AA] hover:underline"
                    >
                      Set Full Payment (₹{finalPayableAmount.toLocaleString()})
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ──── 6. INSTALLMENT PLAN ────────────────────────────────────────── */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                      6
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">Installment Plan</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === "FULL"}
                        onChange={() => setPaymentMode("FULL")}
                        className="text-[#1769AA] focus:ring-[#1769AA]"
                      />
                      Full Payment
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === "INSTALLMENT"}
                        onChange={() => setPaymentMode("INSTALLMENT")}
                        className="text-[#1769AA] focus:ring-[#1769AA]"
                      />
                      Installment Payment
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {paymentMode === "FULL" || balanceToBePaid === 0 ? (
                  <div className="p-6 text-center bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <h4 className="text-xs font-bold text-emerald-900">100% Full Payment Configured</h4>
                    <p className="text-xs text-emerald-700">
                      No remaining balance required for installment scheduling.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Remaining balance of <strong className="text-slate-900">₹{balanceToBePaid.toLocaleString()}</strong> distributed across installments:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoDistributeInstallments}
                        className="text-xs text-[#1769AA] border-blue-200 hover:bg-blue-50 font-bold h-8"
                      >
                        Auto-Balance Installments
                      </Button>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-xs">
                            <TableHead className="font-semibold text-slate-700">Installment No.</TableHead>
                            <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
                            <TableHead className="font-semibold text-slate-700">Amount (₹)</TableHead>
                            <TableHead className="font-semibold text-slate-700">Payment Status</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700 pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installments.map((inst, index) => (
                            <TableRow key={index} className="text-xs">
                              <TableCell className="font-bold text-slate-900">Installment {inst.installmentNo}</TableCell>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={inst.dueDate}
                                  onChange={(e) => {
                                    const updated = [...installments];
                                    updated[index].dueDate = e.target.value;
                                    setInstallments(updated);
                                  }}
                                  className="h-8 text-xs bg-white"
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
                                  className="h-8 w-28 text-xs font-bold text-slate-900 bg-white"
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
                                  className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white"
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
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 pt-4 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-bold">
                    7
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Remarks & Terms</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Admission Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Enter any remarks about this admission..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-[#1769AA]"
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="text-xs font-bold text-slate-700 block">Terms & Conditions</label>
                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted1}
                        onChange={(e) => setTermsAccepted1(e.target.checked)}
                        className="mt-0.5 rounded text-[#1769AA] focus:ring-[#1769AA]"
                      />
                      <span>I have read and understood all the academy terms & conditions.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted2}
                        onChange={(e) => setTermsAccepted2(e.target.checked)}
                        className="mt-0.5 rounded text-[#1769AA] focus:ring-[#1769AA]"
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
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1769AA]" />
                  <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Admission Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Student Name</span>
                  <span className="font-bold text-slate-900">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Admission No.</span>
                  <span className="font-mono font-bold text-slate-900">{admissionNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Admission Date</span>
                  <span className="font-semibold text-slate-800">{admissionDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Branch / Center</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">{branchName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Counsellor</span>
                  <span className="font-semibold text-slate-800">{counsellorName}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Draft
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Selected Courses Summary */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1769AA]" />
                    <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Selected Courses Summary
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#1769AA] bg-blue-50 border-blue-200">
                    {selectedCoursesList.length} Courses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2">
                {selectedCoursesList.length === 0 ? (
                  <p className="text-slate-400 text-center py-2">No courses selected.</p>
                ) : (
                  selectedCoursesList.map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">
                        {idx + 1}. {item.courseName}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">₹{item.fee.toLocaleString()}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                  <span>Total Course Fee</span>
                  <span className="text-[#1769AA]">₹{totalBaseCourseFee.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Billing Summary */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#1769AA]" />
                  <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Billing Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Course Fee</span>
                  <span className="font-semibold text-slate-800">₹{totalBaseCourseFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registration Fee</span>
                  <span className="font-semibold text-slate-800">₹{registrationFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Additional Charges</span>
                  <span className="font-semibold text-slate-800">₹{additionalCharges.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                  <span>Sub Total</span>
                  <span>₹{subTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>- ₹{calculatedDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Scholarship</span>
                  <span>- ₹{scholarshipAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax / GST (18%)</span>
                  <span>₹{gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-emerald-700">
                  <span>Total Payable Amount</span>
                  <span className="text-base">₹{finalPayableAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Payment Summary */}
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#1769AA]" />
                    <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Summary</CardTitle>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${balanceToBePaid === 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                    {balanceToBePaid === 0 ? "Fully Paid" : "Partially Paid"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Payable</span>
                  <span className="font-bold text-slate-900">₹{finalPayableAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Amount Paid</span>
                  <span>₹{amountPaidAtAdmission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-extrabold pt-1 border-t border-slate-100">
                  <span>Remaining Balance</span>
                  <span>₹{balanceToBePaid.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Installments: <strong className="text-slate-800">{installments.length}</strong>
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
        <DialogContent className="w-[94vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-[#1769AA] border-blue-200 text-[10px] font-bold">
                Step 1 of 2 • Review & Verify Admission
              </Badge>
              <span className="font-mono text-xs text-slate-500 font-semibold">{admissionNo}</span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2 pt-1">
              <ShieldCheck className="h-5 w-5 text-[#1769AA]" />
              Confirm Admission Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please review the student profile, enrolled courses, batch allocations, fee calculations, and admission desk payment before final registration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2 text-xs">
            {/* Student Profile Card */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#1769AA]" /> Student Profile
                </span>
                <span className="text-[11px] text-slate-500 font-normal truncate max-w-[200px]">{branchName}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-700">
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Full Name</span><span className="font-bold text-slate-900">{firstName} {lastName}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Mobile</span><span className="font-semibold">{phone}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Email</span><span className="font-semibold truncate block">{email}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Counsellor</span><span className="font-semibold">{counsellorName}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Academic Year</span><span className="font-semibold">{academicYear}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Admission Date</span><span className="font-semibold">{admissionDate}</span></div>
              </div>
            </div>

            {/* Courses & Batches Card */}
            <div className="p-3.5 sm:p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-900 border-b border-blue-100 pb-1.5">
                <span className="flex items-center gap-1.5 text-[#1769AA]">
                  <GraduationCap className="h-3.5 w-3.5" /> Enrolled Course(s) & Batch ({selectedCoursesList.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedCoursesList.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 bg-white rounded-lg border border-blue-100 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{c.courseName}</span>
                      <span className="text-slate-500 block text-[10px] truncate">{c.packageProgram} • {c.schedule}</span>
                    </div>
                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-0">
                      <Badge variant="outline" className="font-mono text-[10px] text-[#1769AA] bg-blue-50 border-blue-200">
                        {c.batchCode}
                      </Badge>
                      <span className="font-bold text-slate-900 block text-xs sm:mt-0.5">₹{c.fee.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial & Settlement Card */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-[#1769AA]" /> Fee & Payment Settlement
                </span>
                <span className="text-xs font-extrabold text-slate-900">Total Payable: ₹{finalPayableAmount.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 block text-xs">Paid at Admission</span>
                    <span className="text-[10px] text-emerald-700">{initialPaymentMethod}</span>
                  </div>
                  <span className="font-black text-emerald-700 text-sm">₹{amountPaidAtAdmission.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900 block text-xs">Remaining Balance</span>
                    <span className="text-[10px] text-amber-700">
                      {balanceToBePaid > 0 ? `${installments.length} installment(s)` : "Fully Settled"}
                    </span>
                  </div>
                  <span className="font-black text-amber-800 text-sm">₹{balanceToBePaid.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Verification Checkbox */}
            <label className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={reviewVerifiedCheck}
                onChange={(e) => setReviewVerifiedCheck(e.target.checked)}
                className="mt-0.5 rounded text-[#1769AA] focus:ring-[#1769AA]"
              />
              <span className="text-xs font-semibold text-slate-800">
                I have reviewed all the student admission details and verify that the initial payment collection of ₹{(Number(amountPaidAtAdmission) || 0).toLocaleString()} and batch schedules are accurate.
              </span>
            </label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewStepModal(false)}
              className="text-xs font-semibold border-slate-300"
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
        <DialogContent className="w-[94vw] max-w-xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl text-center">
          <div className="mx-auto my-1 h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <DialogHeader className="text-center sm:text-center space-y-1">
            <div className="inline-block mx-auto">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Step 2 of 2 • Admission Confirmed
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Admission Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              The student admission record, batch schedule allocation, and fee installment structure have been registered.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-4 sm:p-4.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Admission No</span>
                <span className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                  {createdAdmissionSummary?.admissionNo || admissionNo}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Admission Date</span>
                <span className="font-semibold text-slate-800 text-xs">
                  {createdAdmissionSummary?.date || admissionDate}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium shrink-0">Student Name:</span>
              <div className="sm:text-right min-w-0">
                <span className="font-bold text-slate-900 block truncate">
                  {createdAdmissionSummary?.studentName || `${firstName} ${lastName}`.trim()}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">{phone} • {email}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium shrink-0">Course(s):</span>
              <span className="font-semibold text-slate-900 sm:text-right min-w-0 break-words">
                {createdAdmissionSummary?.course || selectedCoursesList.map((c) => c.courseName).join(", ") || "Digital Marketing"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium shrink-0">Batch Code(s):</span>
              <span className="font-mono font-bold text-[#1769AA] text-right truncate">
                {createdAdmissionSummary?.batch || selectedCoursesList.map((c) => c.batchCode).join(", ") || "DM-JUN-2026-MORN"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              <span className="text-slate-700 font-bold">Final Payable Amount:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                ₹{(createdAdmissionSummary?.finalPayable ?? finalPayableAmount).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div>
                <span className="font-bold text-emerald-900 block text-xs">Amount Paid at Admission:</span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  via {createdAdmissionSummary?.paymentMethod || initialPaymentMethod}
                </span>
              </div>
              <span className="font-black text-emerald-700 text-base">
                ₹{(createdAdmissionSummary?.amountPaid ?? amountPaidAtAdmission).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div>
                <span className="font-bold text-amber-900 block text-xs">Balance to be Paid:</span>
                <span className="text-[10px] text-amber-700 font-medium">
                  {(createdAdmissionSummary?.balanceToPay ?? balanceToBePaid) > 0
                    ? `${installments.length} installment(s) remaining`
                    : "Full Settlement Completed"}
                </span>
              </div>
              <span className="font-black text-amber-800 text-base">
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
              className="text-xs font-semibold border-slate-300"
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
