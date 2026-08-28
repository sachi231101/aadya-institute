import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  Eye,
  Copy,
  Check,
  SlidersHorizontal,
  FileText,
  UserCheck,
  XCircle,
  Phone,
  Mail,
  CreditCard,
  ShieldCheck,
  Upload,
  Download,
  Printer,
  ChevronRight,
  X,
  Send,
  User,
  MapPin,
  Layers,
  Edit,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCourseStore } from "../../../store/course.store";
import { admissionsApi } from "../../../services/admissions.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────────────

export type AdmissionRecordStatus = "Confirmed" | "Provisional" | "Admission Pending" | "Cancelled";
export type BatchType = "Morning Batch" | "Evening Batch" | "Weekend Batch";
export type FeePaymentStatus = "Paid" | "Due";
export type FeePlanType = "Standard Plan" | "Basic Plan" | "Premium Plan" | "Installment Plan";

export interface AdmissionDocument {
  id: string;
  title: string;
  category: "Identity Proof" | "Photograph" | "Educational Documents" | "Address Proof";
  fileName: string;
  fileSize: string;
  uploadDate: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface CounsellorNoteItem {
  id: string;
  author: string;
  role: string;
  date: string;
  time: string;
  text: string;
}

export interface PaymentTransactionItem {
  id: string;
  receiptNo: string;
  amount: number;
  paymentMode: string;
  transactionId: string;
  date: string;
  status: "Completed" | "Pending";
}

export interface EnrichedAdmission {
  id: string;
  admissionNo: string;
  studentName: string;
  avatar: string;
  email: string;
  phone: string;
  dob: string;
  gender: "Female" | "Male" | "Other";
  address: string;
  city: string;
  state: string;
  pincode: string;
  guardianName: string;
  counselorName: string;
  admissionSource: "Online Portal" | "Direct Walk-in" | "Enquiry Conversion" | "Referral";

  // Course
  courseId: string;
  courseName: string;
  programDuration: string;

  // Batch
  batchId: string;
  batchCode: string;
  batchType: BatchType;
  batchTiming: string;
  batchStartDate: string;
  assignedFaculty: string;
  batchCapacity: number;
  enrolledCount: number;

  // Fees
  feePlan: FeePlanType;
  feePaymentStatus: FeePaymentStatus;
  totalCourseFee: number;
  discountAmount: number;
  finalFee: number;
  amountPaid: number;
  amountDue: number;
  nextPaymentDate?: string;
  paymentHistory: PaymentTransactionItem[];

  // Status & Stepper
  status: AdmissionRecordStatus;
  workflowStep: number; // 1: Admission Created, 2: Fee Setup, 3: Batch Assigned, 4: Confirmed
  admissionDate: string;
  admissionTime: string;

  // Documents & Notes
  documents: AdmissionDocument[];
  counsellorNotes: CounsellorNoteItem[];
}

const SAMPLE_ADMISSIONS: EnrichedAdmission[] = [];

export const AllAdmissions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
      ? "/center"
      : "/admin";

  const { fetchCourses, fetchBatches } = useCourseStore();

  const [admissionsList, setAdmissionsList] = useState<EnrichedAdmission[]>([]);

  // Fetch live admissions from PostgreSQL database
  const { data: dbAdmissionsRes } = useQuery({
    queryKey: ["admissions"],
    queryFn: () => admissionsApi.getAdmissions(),
  });

  useEffect(() => {
    const rawList = dbAdmissionsRes?.data || [];
    if (rawList.length > 0) {
      const mappedDbAdmissions: EnrichedAdmission[] = rawList.map((adm: any) => ({
        id: adm.id,
        admissionNo: adm.admissionNo || `ADM-${adm.id.slice(-6).toUpperCase()}`,
        studentName: adm.studentName || adm.student?.user?.name || "Admitted Student",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
        email: adm.email || adm.student?.user?.email || "student@aadya.in",
        phone: adm.phone || adm.student?.user?.phone || "",
        dob: "2003-05-15",
        gender: "Female",
        address: "Aadya Campus",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
        guardianName: "Guardian",
        counselorName: "Priya Singh",
        admissionSource: "Enquiry Conversion",
        courseId: adm.courseId || "c-wd",
        courseName: adm.course?.name || "Full Stack Web Development",
        programDuration: "(6 Months Program)",
        batchId: adm.batchId || "b-wd-jun",
        batchCode: adm.batch?.code || adm.batch?.name || "Pending Batch Assignment",
        batchType: "Weekend Batch",
        batchTiming: "10:00 AM – 1:00 PM",
        batchStartDate: "Upcoming",
        assignedFaculty: "Faculty Mentor",
        batchCapacity: 30,
        enrolledCount: 1,
        feePlan: adm.feePlan === "FULL_PAYMENT" ? "Standard Plan" : "Installment Plan",
        feePaymentStatus: adm.status === "CONFIRMED" ? "Paid" : "Due",
        totalCourseFee: 25000,
        discountAmount: 0,
        finalFee: 25000,
        amountPaid: adm.status === "CONFIRMED" ? 25000 : 5000,
        amountDue: adm.status === "CONFIRMED" ? 0 : 20000,
        paymentHistory: [
          {
            id: `p-${adm.id}`,
            receiptNo: `REC-${adm.id.slice(-6).toUpperCase()}`,
            amount: adm.status === "CONFIRMED" ? 25000 : 5000,
            paymentMode: "UPI / QR",
            transactionId: `TXN/${adm.id.slice(-8)}`,
            date: new Date(adm.admissionDate || adm.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            status: "Completed",
          }
        ],
        status: adm.status === "CONFIRMED" ? "Confirmed" : "Provisional",
        workflowStep: 3,
        admissionDate: new Date(adm.admissionDate || adm.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        admissionTime: "10:00 AM",
        documents: [],
        counsellorNotes: adm.notes ? [{ id: `n-${adm.id}`, author: "Counsellor", role: "Senior Counsellor", date: "Today", time: "Now", text: adm.notes }] : [],
      }));

      setAdmissionsList((prev) => {
        const existingIds = new Set(mappedDbAdmissions.map((d) => d.id));
        const filteredPrev = prev.filter((p) => !existingIds.has(p.id));
        return [...mappedDbAdmissions, ...filteredPrev];
      });
    }
  }, [dbAdmissionsRes]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchTypeFilter, setBatchTypeFilter] = useState("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 7;

  // View Details Drawer State
  const [selectedAdmission, setSelectedAdmission] = useState<EnrichedAdmission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "batch" | "fee" | "docs" | "notes">("overview");

  // Direct Admission Entry Modal
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDob, setFormDob] = useState("2003-05-15");
  const [formGender] = useState<"Female" | "Male" | "Other">("Female");
  const [formAddress, setFormAddress] = useState("");
  const [formCourse, setFormCourse] = useState("Digital Marketing");
  const [formDuration, setFormDuration] = useState("(1 Year Program)");
  const [formBatch, setFormBatch] = useState("DM-JUN-2025");
  const [formBatchType, setFormBatchType] = useState<BatchType>("Morning Batch");
  const [formBatchTiming] = useState("9:00 AM – 11:00 AM");
  const [formFaculty] = useState("Prof. Rajesh Verma");
  const [formFeePlan, setFormFeePlan] = useState<FeePlanType>("Standard Plan");
  const [formCourseFee, setFormCourseFee] = useState<number>(30000);
  const [formDiscount, setFormDiscount] = useState<number>(5000);
  const [formAmountPaid, setFormAmountPaid] = useState<number>(25000);
  const [formPaymentMethod] = useState("UPI / QR");
  const [formNotes, setFormNotes] = useState("");

  // Change Batch Modal
  const [isChangeBatchOpen, setIsChangeBatchOpen] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState("");

  // Note addition state in Drawer
  const [newNoteText, setNewNoteText] = useState("");

  // Copy Feedback & Toast State
  const [copiedAdmNo, setCopiedAdmNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fetchCourses) fetchCourses();
    if (fetchBatches) fetchBatches();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCopyAdmNo = (admNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(admNo);
    setCopiedAdmNo(admNo);
    showToast(`Copied ${admNo} to clipboard!`);
    setTimeout(() => setCopiedAdmNo(null), 2000);
  };

  // KPI Calculations strictly from real data
  const totalAdmissionsCount = admissionsList.length;
  const confirmedCount = admissionsList.filter((a) => (a.status as string) === "CONFIRMED" || (a.status as string) === "Active").length;
  const provisionalCount = admissionsList.filter((a) => (a.status as string) === "PROVISIONAL" || (a.status as string) === "Pending").length;
  const activeBatchesCount = new Set(admissionsList.map((a) => a.batchCode).filter(Boolean)).size;

  // Filter Logic
  const filteredAdmissions = useMemo(() => {
    return admissionsList.filter((adm) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        adm.admissionNo.toLowerCase().includes(q) ||
        adm.studentName.toLowerCase().includes(q) ||
        adm.email.toLowerCase().includes(q) ||
        adm.phone.includes(q) ||
        adm.courseName.toLowerCase().includes(q) ||
        adm.batchCode.toLowerCase().includes(q);

      const matchesCourse =
        courseFilter === "ALL" || adm.courseName.toLowerCase() === courseFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "ALL" || adm.status === statusFilter;

      const matchesBatchType =
        batchTypeFilter === "ALL" || adm.batchType === batchTypeFilter;

      const matchesFee =
        feeStatusFilter === "ALL" || adm.feePaymentStatus === feeStatusFilter;

      return matchesSearch && matchesCourse && matchesStatus && matchesBatchType && matchesFee;
    });
  }, [admissionsList, searchTerm, courseFilter, statusFilter, batchTypeFilter, feeStatusFilter]);

  // Paginated Rows
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmissions.slice(start, start + pageSize);
  }, [filteredAdmissions, currentPage]);

  const handleOpenDetails = (adm: EnrichedAdmission) => {
    setSelectedAdmission(adm);
    setIsDetailsOpen(true);
  };

  const handleAddCounsellorNote = () => {
    if (!newNoteText.trim() || !selectedAdmission) return;
    const newNote: CounsellorNoteItem = {
      id: `n-${Date.now()}`,
      author: "Priya Singh",
      role: "Senior Counsellor",
      date: "Today",
      time: "Just now",
      text: newNoteText.trim(),
    };
    const updated = {
      ...selectedAdmission,
      counsellorNotes: [newNote, ...(selectedAdmission.counsellorNotes || [])],
    };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setNewNoteText("");
    showToast("Counsellor note added!");
  };

  const handleToggleDocVerification = (docId: string) => {
    if (!selectedAdmission) return;
    const updatedDocs = selectedAdmission.documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          verified: !d.verified,
          verifiedBy: !d.verified ? "Priya Singh" : undefined,
          verifiedAt: !d.verified ? "Just now" : undefined,
        };
      }
      return d;
    });
    const updated = { ...selectedAdmission, documents: updatedDocs };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast("Document verification status updated!");
  };

  const handleUpdateAdmissionStatus = (admId: string, newStatus: AdmissionRecordStatus) => {
    setAdmissionsList((prev) =>
      prev.map((a) => {
        if (a.id === admId) {
          const step = newStatus === "Confirmed" ? 4 : newStatus === "Provisional" ? 3 : newStatus === "Admission Pending" ? 2 : 1;
          return { ...a, status: newStatus, workflowStep: step };
        }
        return a;
      })
    );
    if (selectedAdmission && selectedAdmission.id === admId) {
      setSelectedAdmission((prev) =>
        prev
          ? {
            ...prev,
            status: newStatus,
            workflowStep: newStatus === "Confirmed" ? 4 : newStatus === "Provisional" ? 3 : newStatus === "Admission Pending" ? 2 : 1,
          }
          : null
      );
    }
    showToast(`Admission status updated to ${newStatus}`);
  };

  const handleSaveDirectAdmission = (assignBatch: boolean = true) => {
    if (!formName || !formPhone) return;

    const newAdmNo = `ADM-2025-01${29 + admissionsList.length}`;
    const calculatedFinal = Math.max(0, formCourseFee - formDiscount);
    const calculatedDue = Math.max(0, calculatedFinal - formAmountPaid);

    const newAdm: EnrichedAdmission = {
      id: `adm-${Date.now()}`,
      admissionNo: newAdmNo,
      studentName: formName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formName)}`,
      email: formEmail || `${formName.toLowerCase().replace(/\s+/g, "")}@email.com`,
      phone: formPhone,
      dob: formDob,
      gender: formGender,
      address: formAddress || "Main City Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      guardianName: "Parent / Guardian",
      counselorName: "Priya Singh",
      admissionSource: "Direct Walk-in",
      courseId: "c-custom",
      courseName: formCourse,
      programDuration: formDuration,
      batchId: `b-${Date.now()}`,
      batchCode: formBatch,
      batchType: formBatchType,
      batchTiming: formBatchTiming,
      batchStartDate: "01 Jun 2025",
      assignedFaculty: formFaculty,
      batchCapacity: 30,
      enrolledCount: 21,
      feePlan: formFeePlan,
      feePaymentStatus: calculatedDue === 0 ? "Paid" : "Due",
      totalCourseFee: formCourseFee,
      discountAmount: formDiscount,
      finalFee: calculatedFinal,
      amountPaid: formAmountPaid,
      amountDue: calculatedDue,
      paymentHistory: formAmountPaid > 0 ? [
        {
          id: `p-${Date.now()}`,
          receiptNo: `REC-2025-${newAdmNo.split("-")[2]}-1`,
          amount: formAmountPaid,
          paymentMode: formPaymentMethod,
          transactionId: `TXN/${Date.now()}`,
          date: "Today, Just now",
          status: "Completed",
        }
      ] : [],
      status: assignBatch && calculatedDue === 0 ? "Confirmed" : "Provisional",
      workflowStep: assignBatch && calculatedDue === 0 ? 4 : 3,
      admissionDate: "16 May 2025",
      admissionTime: "11:00 AM",
      documents: [
        { id: `d-${Date.now()}-1`, title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar_Doc.pdf", fileSize: "920 KB", uploadDate: "Today", verified: true },
        { id: `d-${Date.now()}-2`, title: "Academic Marksheet", category: "Educational Documents", fileName: "Marksheet.pdf", fileSize: "1.4 MB", uploadDate: "Today", verified: true },
      ],
      counsellorNotes: formNotes ? [
        { id: `n-${Date.now()}`, author: "Priya Singh", role: "Senior Counsellor", date: "Today", time: "Just now", text: formNotes }
      ] : [],
    };

    setAdmissionsList([newAdm, ...admissionsList]);
    setIsDirectModalOpen(false);
    showToast(`Direct Admission created successfully for ${formName}! (${newAdmNo})`);
  };

  const handleChangeBatchConfirm = () => {
    if (!selectedAdmission || !targetBatchId) return;
    const updated = {
      ...selectedAdmission,
      batchCode: targetBatchId,
    };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setIsChangeBatchOpen(false);
    showToast(`Batch updated to ${targetBatchId} for ${selectedAdmission.studentName}!`);
  };

  // Helper for Batch Badge
  const renderBatchBadge = (type: BatchType) => {
    switch (type) {
      case "Morning Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1769AA] border border-blue-200/60">
            Morning Batch
          </span>
        );
      case "Evening Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            Evening Batch
          </span>
        );
      case "Weekend Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
            Weekend Batch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Regular Batch
          </span>
        );
    }
  };

  // Helper for Status Badge
  const renderAdmissionStatusBadge = (status: AdmissionRecordStatus) => {
    switch (status) {
      case "Confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Confirmed
          </span>
        );
      case "Provisional":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Provisional
          </span>
        );
      case "Admission Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1769AA] border border-blue-200/70 shadow-2xs">
            Admission Pending
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] w-full mx-auto space-y-6 bg-background min-h-screen text-foreground font-sans antialiased">

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-border animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. BREADCRUMB & HEADER ─── */}
      <div className="space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <UserCheck className="h-4 w-4" />
            <span>Counsellor Portal</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-muted-foreground">Admissions & Counselling Desk</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-semibold">All Admissions</span>
        </div>

        {/* Title and Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              All Admissions
            </h1>
            <p className="text-sm text-muted-foreground font-normal mt-0.5">
              View active student admissions, fee structures, and batch assignments across all institute departments.
            </p>
          </div>

          <Button
            onClick={() => navigate(`${basePath}/admissions/direct-entry`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4.5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-sm transition-all shrink-0 h-10 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Direct Admission Entry</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

        {/* Card 1: Total Admissions */}
        <Card
          onClick={() => { setStatusFilter("ALL"); setCourseFilter("ALL"); }}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 flex items-center justify-center border border-blue-100 dark:border-sky-900/40 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Admissions</p>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {totalAdmissionsCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Confirmed Seats */}
        <Card
          onClick={() => setStatusFilter("Confirmed")}
          className="border border-border bg-card rounded-3xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirmed Seats</p>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {confirmedCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
                View confirmed <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Provisional Seats */}
        <Card
          onClick={() => setStatusFilter("Provisional")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Provisional Seats</p>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {provisionalCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5">
                View provisional <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Batches Assigned */}
        <Card
          onClick={() => { setStatusFilter("ALL"); setShowAdvancedFilters(true); }}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Batches Assigned</p>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {activeBatchesCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5">
                View batches <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ─── 3. SEARCH & FILTERS TOOLBAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by admission no, student name, email, or course..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10.5 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Extra Filter Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Courses Dropdown */}
          <div className="relative">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-card border border-border rounded-xl text-xs font-semibold text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:bg-muted/40"
            >
              <option value="ALL" className="bg-card text-foreground py-1.5">All Courses</option>
              <option value="Full Stack Web Development" className="bg-card text-foreground py-1.5">Full Stack Web Development</option>
              <option value="Data Science & Analytics" className="bg-card text-foreground py-1.5">Data Science & Analytics</option>
              <option value="UI/UX Product Design" className="bg-card text-foreground py-1.5">UI/UX Product Design</option>
              <option value="Artificial Intelligence & Python" className="bg-card text-foreground py-1.5">Artificial Intelligence & Python</option>
              <option value="Digital Marketing" className="bg-card text-foreground py-1.5">Digital Marketing</option>
              <option value="Advanced Excel" className="bg-card text-foreground py-1.5">Advanced Excel</option>
              <option value="Tally Prime with GST" className="bg-card text-foreground py-1.5">Tally Prime with GST</option>
              <option value="Web Designing" className="bg-card text-foreground py-1.5">Web Designing</option>
              <option value="Python Programming" className="bg-card text-foreground py-1.5">Python Programming</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-card border border-border rounded-xl text-xs font-semibold text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:bg-muted/40"
            >
              <option value="ALL" className="bg-card text-foreground py-1.5">All Statuses</option>
              <option value="Confirmed" className="bg-card text-foreground py-1.5">Confirmed</option>
              <option value="Provisional" className="bg-card text-foreground py-1.5">Provisional</option>
              <option value="Admission Pending" className="bg-card text-foreground py-1.5">Admission Pending</option>
              <option value="Cancelled" className="bg-card text-foreground py-1.5">Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Advanced Filters Button */}
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-10.5 px-3.5 border-border text-foreground bg-card hover:bg-muted/50 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs transition-all cursor-pointer ${showAdvancedFilters || batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL"
                ? "border-primary text-primary bg-primary/10"
                : ""
              }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {(batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL") && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>

          {/* Reset Filters */}
          {(searchTerm || courseFilter !== "ALL" || statusFilter !== "ALL" || batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setCourseFilter("ALL");
                setStatusFilter("ALL");
                setBatchTypeFilter("ALL");
                setFeeStatusFilter("ALL");
                setCurrentPage(1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-10.5 px-2 cursor-pointer"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ─── ADVANCED FILTER DRAWER / PANEL ─── */}
      {showAdvancedFilters && (
        <Card className="border border-border bg-muted/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Extended Filter Options
            </span>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Batch Schedule Type</label>
              <select
                value={batchTypeFilter}
                onChange={(e) => {
                  setBatchTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9.5 px-3 bg-card border border-border rounded-xl text-xs text-foreground font-medium"
              >
                <option value="ALL" className="bg-card text-foreground py-1.5">All Batch Schedules</option>
                <option value="Morning Batch" className="bg-card text-foreground py-1.5">Morning Batch</option>
                <option value="Evening Batch" className="bg-card text-foreground py-1.5">Evening Batch</option>
                <option value="Weekend Batch" className="bg-card text-foreground py-1.5">Weekend Batch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fee Payment Status</label>
              <select
                value={feeStatusFilter}
                onChange={(e) => {
                  setFeeStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9.5 px-3 bg-card border border-border rounded-xl text-xs text-foreground font-medium"
              >
                <option value="ALL" className="bg-card text-foreground py-1.5">All Fee Statuses</option>
                <option value="Paid" className="bg-card text-foreground py-1.5">Fully Paid</option>
                <option value="Due" className="bg-card text-foreground py-1.5">Balance Due</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Quick Action</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setBatchTypeFilter("ALL");
                    setFeeStatusFilter("ALL");
                  }}
                  variant="outline"
                  className="w-full text-xs h-9.5 bg-card border-border text-foreground hover:bg-muted/50 cursor-pointer"
                >
                  Clear Extended
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── 4. ADMISSIONS DATA TABLE CARD ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider pl-6">
                  Adm No.
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Student Details
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Course
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Assigned Batch
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Fee Plan
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Admission Date
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border">
              {currentRows.length > 0 ? (
                currentRows.map((adm) => (
                  <TableRow
                    key={adm.id}
                    onClick={() => handleOpenDetails(adm)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group border-border"
                  >
                    {/* 1. Adm No */}
                    <TableCell className="py-4 px-4 pl-6 align-middle">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <span className="font-mono">{adm.admissionNo}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyAdmNo(adm.admissionNo, e)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm hover:bg-muted/50 cursor-pointer"
                          title="Copy Admission Number"
                        >
                          {copiedAdmNo === adm.admissionNo ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* 2. Student Details */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border shadow-2xs">
                          <AvatarImage src={adm.avatar} alt={adm.studentName} className="object-cover" />
                          <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                            {adm.studentName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {adm.studentName}
                          </h4>
                          <p className="text-xs text-muted-foreground font-normal">
                            {adm.email}
                          </p>
                          <p className="text-xs text-muted-foreground font-normal">
                            {adm.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Course */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">
                          {adm.courseName}
                        </p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {adm.programDuration}
                        </p>
                      </div>
                    </TableCell>

                    {/* 4. Assigned Batch */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground font-mono">
                          {adm.batchCode}
                        </p>
                        <div>
                          {renderBatchBadge(adm.batchType)}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal">
                          {adm.batchTiming}
                        </p>
                      </div>
                    </TableCell>

                    {/* 5. Fee Plan */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">
                          {adm.feePlan}
                        </p>
                        <div>
                          {adm.feePaymentStatus === "Paid" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">
                              Due
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          ₹{adm.finalFee.toLocaleString()}
                        </p>
                      </div>
                    </TableCell>

                    {/* 6. Status */}
                    <TableCell className="py-4 px-4 align-middle">
                      {renderAdmissionStatusBadge(adm.status)}
                    </TableCell>

                    {/* 7. Admission Date */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {adm.admissionDate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {adm.admissionTime}
                        </p>
                      </div>
                    </TableCell>

                    {/* 8. Actions */}
                    <TableCell className="py-4 px-4 pr-6 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(adm)}
                          className="h-8 px-2.5 text-xs font-semibold border-border text-foreground hover:text-primary hover:bg-muted/50 rounded-lg gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                          <span>View</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border text-popover-foreground shadow-lg rounded-xl p-1.5 text-xs">
                            <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                              Admission Actions
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(adm)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                              View Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(adm)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Edit Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setTargetBatchId(adm.batchCode);
                                setIsChangeBatchOpen(true);
                              }}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-2 text-purple-500" />
                              Change Batch
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                handleOpenDetails(adm);
                                setActiveTab("fee");
                              }}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              Update Fee Plan
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateAdmissionStatus(adm.id, adm.status === "Confirmed" ? "Provisional" : "Confirmed")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              Toggle Confirmed Status
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => window.print()}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <Printer className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Print Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => showToast(`Downloading PDF dossier for ${adm.admissionNo}...`)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Download Admission Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border" />

                            <DropdownMenuItem
                              onClick={() => handleUpdateAdmissionStatus(adm.id, "Cancelled")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-rose-500 hover:bg-rose-500/10"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Cancel Admission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-8 w-8 text-muted-foreground/60 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-foreground">No admission records found</p>
                      <p className="text-xs text-muted-foreground">Try changing your search terms or filter selections.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setCourseFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 text-xs border-border text-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ─── 5. PAGINATION FOOTER ─── */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-card text-muted-foreground">
          <p className="text-xs font-medium">
            Showing <span className="font-semibold text-foreground">{filteredAdmissions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filteredAdmissions.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalAdmissionsCount}</span> admissions
          </p>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === 1
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
                }`}
            >
              1
            </button>

            <button
              onClick={() => setCurrentPage(2)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === 2
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
                }`}
            >
              2
            </button>

            <button
              onClick={() => setCurrentPage(3)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === 3
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
                }`}
            >
              3
            </button>

            <span className="px-1 text-muted-foreground text-xs">...</span>

            <button
              onClick={() => setCurrentPage(18)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === 18
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
                }`}
            >
              18
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 18))}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted/50 border border-border transition-all flex items-center gap-1 ml-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 6. VIEW ADMISSION DETAILS (SLIDE-OUT SHEET / DRAWER) ─── */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 overflow-y-auto bg-card text-foreground border-l border-border">
          {selectedAdmission && (
            <div className="flex flex-col h-full">

              {/* Drawer Header */}
              <div className="p-6 border-b border-border bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-mono">
                        {selectedAdmission.admissionNo}
                      </span>
                      {renderAdmissionStatusBadge(selectedAdmission.status)}
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                        {selectedAdmission.batchCode}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">
                      {selectedAdmission.studentName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Enrolled in <strong className="text-foreground">{selectedAdmission.courseName}</strong> on {selectedAdmission.admissionDate} at {selectedAdmission.admissionTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyAdmNo(selectedAdmission.admissionNo)}
                      className="h-8 text-xs font-semibold gap-1 border-border text-foreground hover:bg-muted/50 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="h-8 text-xs font-semibold gap-1 border-border text-foreground hover:bg-muted/50 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </Button>
                  </div>
                </div>

                {/* ─── ADMISSION PROGRESS STEPPER ─── */}
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                    Admission Progress Stage
                  </p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      { step: 1, title: "1. Admission Created", done: selectedAdmission.workflowStep >= 1 },
                      { step: 2, title: "2. Fee Setup", done: selectedAdmission.workflowStep >= 2 },
                      { step: 3, title: "3. Batch Assigned", done: selectedAdmission.workflowStep >= 3 },
                      { step: 4, title: "4. Confirmed", done: selectedAdmission.status === "Confirmed" },
                    ].map((st) => (
                      <div key={st.step} className="flex flex-col items-center gap-1">
                        <div
                          className={`h-2.5 w-full rounded-full transition-colors ${st.done ? "bg-emerald-500" : "bg-muted"
                            }`}
                        />
                        <span className={`text-[10px] font-semibold truncate ${st.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          }`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${activeTab === "overview"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                  >
                    Student & Admission
                  </button>
                  <button
                    onClick={() => setActiveTab("batch")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${activeTab === "batch"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                  >
                    Batch Details
                  </button>
                  <button
                    onClick={() => setActiveTab("fee")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${activeTab === "fee"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                  >
                    Fee Structure & Receipts
                  </button>
                  <button
                    onClick={() => setActiveTab("docs")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "docs"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                  >
                    <span>Documents</span>
                    <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.2 rounded-full">
                      {selectedAdmission.documents.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${activeTab === "notes"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                  >
                    Counsellor Notes
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 flex-1 bg-card">

                {/* ─── TAB 1: STUDENT & ADMISSION OVERVIEW ─── */}
                {activeTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-150">

                    {/* Student Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary" /> Student Personal Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Full Name</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{selectedAdmission.studentName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Date of Birth & Gender</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{selectedAdmission.dob} ({selectedAdmission.gender})</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Primary Mobile Number</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" /> {selectedAdmission.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Email Address</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-primary" /> {selectedAdmission.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Parent / Guardian Name</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{selectedAdmission.guardianName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Assigned Counsellor</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-emerald-500" /> {selectedAdmission.counselorName}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-muted-foreground">Residential Address</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{selectedAdmission.address}, {selectedAdmission.city}, {selectedAdmission.state} - {selectedAdmission.pincode}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Admission Program Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" /> Admission Program Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Admitted Course</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{selectedAdmission.courseName}</p>
                          <span className="text-[11px] text-muted-foreground">{selectedAdmission.programDuration}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Admission Source</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{selectedAdmission.admissionSource}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Assigned Batch Code</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 font-mono">{selectedAdmission.batchCode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Current Status</p>
                          <div className="mt-0.5">{renderAdmissionStatusBadge(selectedAdmission.status)}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ─── TAB 2: BATCH & SCHEDULE DETAILS ─── */}
                {activeTab === "batch" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded font-mono">
                            {selectedAdmission.batchCode}
                          </span>
                          <h3 className="text-base font-extrabold text-foreground mt-1">
                            {selectedAdmission.courseName} — {selectedAdmission.batchType}
                          </h3>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTargetBatchId(selectedAdmission.batchCode);
                            setIsChangeBatchOpen(true);
                          }}
                          className="h-8 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Change Batch
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Class Timing</span>
                          <span className="font-bold text-foreground">{selectedAdmission.batchTiming}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Start Date</span>
                          <span className="font-bold text-foreground">{selectedAdmission.batchStartDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Assigned Faculty</span>
                          <span className="font-bold text-foreground">{selectedAdmission.assignedFaculty}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Batch Capacity</span>
                          <span className="font-bold text-foreground">{selectedAdmission.batchCapacity} Seats</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Available Seats</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {selectedAdmission.batchCapacity - selectedAdmission.enrolledCount} Seats Available
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Batch Schedule Pattern</span>
                          <span className="font-bold text-foreground">{selectedAdmission.batchType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: FEE & RECEIPTS ─── */}
                {activeTab === "fee" && (
                  <div className="space-y-6 animate-in fade-in duration-150">

                    {/* Fee Summary Card */}
                    <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Selected Fee Plan</p>
                          <h3 className="text-xl font-black text-foreground mt-0.5">
                            {selectedAdmission.feePlan}
                          </h3>
                        </div>
                        {selectedAdmission.feePaymentStatus === "Paid" ? (
                          <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                            FULLY PAID
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500 text-white font-bold text-xs px-3 py-1">
                            BALANCE DUE: ₹{selectedAdmission.amountDue.toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Total Course Fee</span>
                          <span className="font-bold text-foreground">₹{selectedAdmission.totalCourseFee.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Discount Applied</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">-₹{selectedAdmission.discountAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Final Payable Fee</span>
                          <span className="font-bold text-foreground">₹{selectedAdmission.finalFee.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Amount Paid</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{selectedAdmission.amountPaid.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Receipts History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Transaction History</h4>
                      {selectedAdmission.paymentHistory.length > 0 ? (
                        selectedAdmission.paymentHistory.map((p) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-foreground">{p.receiptNo}</h5>
                                <p className="text-[11px] text-muted-foreground">{p.paymentMode} • Ref: {p.transactionId}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-extrabold text-foreground text-sm block">₹{p.amount.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground">{p.date}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                          No payments recorded yet.
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ─── TAB 4: SUBMITTED DOCUMENTS ─── */}
                {activeTab === "docs" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Student Verification Documents</h4>
                        <p className="text-xs text-muted-foreground">View and verify mandatory identity & educational records.</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1 border-border text-foreground hover:bg-muted/50 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {selectedAdmission.documents.length > 0 ? (
                        selectedAdmission.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3 hover:border-border/80 transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-foreground">{doc.title}</h5>
                                <p className="text-[11px] text-muted-foreground">
                                  {doc.fileName} • {doc.fileSize} • Uploaded {doc.uploadDate}
                                </p>
                                {doc.verified && (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="h-3 w-3" /> Verified by {doc.verifiedBy || "Priya Singh"}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => showToast(`Previewing document ${doc.fileName}`)}
                                className="h-8 px-2.5 text-xs font-medium text-foreground border-border hover:bg-muted/50 cursor-pointer"
                              >
                                View
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleToggleDocVerification(doc.id)}
                                className={`h-8 px-3 text-xs font-bold transition-all cursor-pointer ${doc.verified
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                  }`}
                              >
                                {doc.verified ? "Verified ✓" : "Verify Doc"}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                          No documents uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 5: COUNSELLOR NOTES ─── */}
                {activeTab === "notes" && (
                  <div className="space-y-6 animate-in fade-in duration-150">

                    {/* Add Counsellor Note */}
                    <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2.5">
                      <label className="block text-xs font-bold text-foreground">Add Internal Counsellor Note</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type notes on payments, batch preferences, special concessions..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground text-xs h-9"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddCounsellorNote}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3.5 h-9 shrink-0 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Post Note
                        </Button>
                      </div>
                    </div>

                    {/* Notes History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Counsellor Audit Trail</h4>
                      {selectedAdmission.counsellorNotes?.length > 0 ? (
                        selectedAdmission.counsellorNotes.map((n) => (
                          <div key={n.id} className="p-3.5 rounded-xl border border-border bg-card text-xs space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="font-bold text-foreground">{n.author} <span className="font-normal text-muted-foreground">({n.role})</span></span>
                              <span className="text-[11px]">{n.date}, {n.time}</span>
                            </div>
                            <p className="text-foreground leading-relaxed font-normal">{n.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No notes recorded yet.</p>
                      )}
                    </div>

                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateAdmissionStatus(selectedAdmission.id, "Cancelled")}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-border h-9 cursor-pointer"
                  >
                    Cancel Admission
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateAdmissionStatus(selectedAdmission.id, "Confirmed")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Admission
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetBatchId(selectedAdmission.batchCode);
                      setIsChangeBatchOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 shadow-sm cursor-pointer"
                  >
                    Change Batch <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── 7. DIRECT ADMISSION ENTRY MODAL ─── */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Direct Admission Entry</h3>
                  <p className="text-xs text-muted-foreground">Instantly enroll student with course, fee, and batch assignment</p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">

              {/* Section A: Student Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">1. Student Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Full Name *</label>
                    <Input
                      placeholder="e.g. Ananya Sharma"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Phone Number *</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      required
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="student@email.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Date of Birth</label>
                    <Input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-foreground mb-1">Residential Address</label>
                    <Input
                      placeholder="Street address, City, Pincode"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Course & Batch */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">2. Course & Batch Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Select Course *</label>
                    <select
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      className="w-full h-9.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                    >
                      <option value="Full Stack Web Development" className="bg-card text-foreground py-1.5">Full Stack Web Development</option>
                      <option value="Data Science & Analytics" className="bg-card text-foreground py-1.5">Data Science & Analytics</option>
                      <option value="UI/UX Product Design" className="bg-card text-foreground py-1.5">UI/UX Product Design</option>
                      <option value="Artificial Intelligence & Python" className="bg-card text-foreground py-1.5">Artificial Intelligence & Python</option>
                      <option value="Digital Marketing" className="bg-card text-foreground py-1.5">Digital Marketing</option>
                      <option value="Advanced Excel" className="bg-card text-foreground py-1.5">Advanced Excel</option>
                      <option value="Tally Prime with GST" className="bg-card text-foreground py-1.5">Tally Prime with GST</option>
                      <option value="Web Designing" className="bg-card text-foreground py-1.5">Web Designing</option>
                      <option value="Python Programming" className="bg-card text-foreground py-1.5">Python Programming</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Program Duration</label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full h-9.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                    >
                      <option value="(1 Year Program)" className="bg-card text-foreground py-1.5">(1 Year Program)</option>
                      <option value="(6 Months Program)" className="bg-card text-foreground py-1.5">(6 Months Program)</option>
                      <option value="(3 Months Program)" className="bg-card text-foreground py-1.5">(3 Months Program)</option>
                      <option value="(2 Months Program)" className="bg-card text-foreground py-1.5">(2 Months Program)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Assign Batch *</label>
                    <Input
                      placeholder="e.g. DM-JUN-2025"
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Batch Schedule Type</label>
                    <select
                      value={formBatchType}
                      onChange={(e) => setFormBatchType(e.target.value as BatchType)}
                      className="w-full h-9.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                    >
                      <option value="Morning Batch" className="bg-card text-foreground py-1.5">Morning Batch (9:00 AM – 11:00 AM)</option>
                      <option value="Evening Batch" className="bg-card text-foreground py-1.5">Evening Batch (5:00 PM – 7:00 PM)</option>
                      <option value="Weekend Batch" className="bg-card text-foreground py-1.5">Weekend Batch (11:00 AM – 01:00 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section C: Fee Setup */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">3. Fee Details & Initial Payment</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Fee Plan</label>
                    <select
                      value={formFeePlan}
                      onChange={(e) => setFormFeePlan(e.target.value as FeePlanType)}
                      className="w-full h-9.5 px-2 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                    >
                      <option value="Standard Plan" className="bg-card text-foreground py-1.5">Standard Plan</option>
                      <option value="Basic Plan" className="bg-card text-foreground py-1.5">Basic Plan</option>
                      <option value="Premium Plan" className="bg-card text-foreground py-1.5">Premium Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Course Fee (₹)</label>
                    <Input
                      type="number"
                      value={formCourseFee}
                      onChange={(e) => setFormCourseFee(Number(e.target.value))}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Discount (₹)</label>
                    <Input
                      type="number"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(Number(e.target.value))}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Amount Paid (₹)</label>
                    <Input
                      type="number"
                      value={formAmountPaid}
                      onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                      className="bg-background border-border text-foreground text-xs h-9.5"
                    />
                  </div>
                </div>
              </div>

              {/* Section D: Notes */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Counsellor Remarks</label>
                <Input
                  placeholder="e.g. Verified educational transcripts. Ready for batch orientation."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9.5"
                />
              </div>

              {/* Final Modal Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="h-10 text-xs font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveDirectAdmission(false)}
                  variant="outline"
                  className="h-10 text-xs font-bold text-foreground border-border hover:bg-muted/50 cursor-pointer"
                >
                  Save Admission
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveDirectAdmission(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 text-xs font-bold px-5 cursor-pointer"
                >
                  Save & Assign Batch
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─── 8. CHANGE BATCH MODAL ─── */}
      {isChangeBatchOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Change Batch Assignment</h3>
                <p className="text-xs text-muted-foreground">{selectedAdmission.studentName} ({selectedAdmission.admissionNo})</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Current Batch: <strong className="text-foreground">{selectedAdmission.batchCode} ({selectedAdmission.batchType})</strong>
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select New Target Batch</label>
                <select
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="DM-JUN-2025" className="bg-card text-foreground py-1.5">DM-JUN-2025 (Morning Batch • 9:00 AM – 11:00 AM)</option>
                  <option value="DM-JUL-2025" className="bg-card text-foreground py-1.5">DM-JUL-2025 (Evening Batch • 5:00 PM – 7:00 PM)</option>
                  <option value="EXCEL-MAY-2025" className="bg-card text-foreground py-1.5">EXCEL-MAY-2025 (Evening Batch • 5:00 PM – 7:00 PM)</option>
                  <option value="TALLY-JUN-2025" className="bg-card text-foreground py-1.5">TALLY-JUN-2025 (Weekend Batch • 11:00 AM – 01:00 PM)</option>
                  <option value="WD-JUN-2025" className="bg-card text-foreground py-1.5">WD-JUN-2025 (Morning Batch • 9:00 AM – 10:30 AM)</option>
                  <option value="PY-JUN-2025" className="bg-card text-foreground py-1.5">PY-JUN-2025 (Evening Batch • 5:30 PM – 7:30 PM)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangeBatchOpen(false)}
                  className="h-10 text-xs font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleChangeBatchConfirm}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-10 text-xs font-bold px-5 cursor-pointer"
                >
                  Confirm Batch Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
