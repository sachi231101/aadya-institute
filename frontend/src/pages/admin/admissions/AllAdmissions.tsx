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
  Filter,
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
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { admissionsApi } from "../../../services/admissions.api";
import { useAdmissionById } from "../../../hooks/useAdmissions";
import { PermissionGate, ReadOnlyBanner } from "@/components/permissions/PermissionGate";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViewAdmissionInfo } from "./ViewAdmissionInfo";

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
  studentId?: string;
  studentCode?: string;
  studentName: string;
  avatar: string;
  email: string;
  phone: string;
  altPhone?: string;
  emergencyContact?: string;
  dob: string;
  gender: "Female" | "Male" | "Other" | string;
  bloodGroup?: string;
  highestQualification?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  guardianName: string;
  counselorName: string;
  admissionSource: string;
  admissionType?: string;
  branchName?: string;
  academicYear?: string;

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

  const preselectedAdmissionId = (location.state as { admissionId?: string })?.admissionId;
  const { data: preselectedAdmissionRes } = useAdmissionById(preselectedAdmissionId || "");

  const [admissionsList, setAdmissionsList] = useState<EnrichedAdmission[]>([]);

  // Fetch live admissions from PostgreSQL database
  const { data: dbAdmissionsRes } = useQuery({
    queryKey: ["admissions"],
    queryFn: () => admissionsApi.getAdmissions(),
  });

  useEffect(() => {
    const rawList = dbAdmissionsRes?.data || [];
    const extractNote = (notes: string | undefined | null, pattern: RegExp) => {
      if (!notes) return null;
      const match = notes.match(pattern);
      return match ? match[1].trim() : null;
    };

    const mappedDbAdmissions: EnrichedAdmission[] = rawList.map((adm: any) => ({
      id: adm.id,
      admissionNo: adm.admissionNo || `ADM-${adm.id.slice(-6).toUpperCase()}`,
      studentId: adm.studentId || adm.student?.id || "",
      studentCode: adm.student?.studentCode || adm.studentCode || "",
      studentName: adm.studentName || adm.student?.user?.name || "Admitted Student",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(adm.studentName || adm.student?.user?.name || "AD")}`,
      email: adm.email || adm.student?.user?.email || "—",
      phone: adm.phone || adm.student?.user?.phone || "",
      altPhone: extractNote(adm.notes, /Alternate mobile:\s*([^|\n]+)/i) || "—",
      emergencyContact: extractNote(adm.notes, /(?:Guardian Phone|Emergency):\s*([^|\n]+)/i) || "—",
      dob: adm.dob ? String(adm.dob).slice(0, 10) : extractNote(adm.notes, /DOB:\s*([^|\n]+)/i) || "—",
      gender: extractNote(adm.notes, /Gender:\s*([^|\n]+)/i) || "—",
      bloodGroup: extractNote(adm.notes, /Blood Group:\s*([^|\n]+)/i) || "—",
      highestQualification: extractNote(adm.notes, /(?:Highest Qualification|Qualification):\s*([^|\n]+)/i) || adm.student?.qualification || "—",
      address: extractNote(adm.notes, /Address:\s*([^|\n]+)/i) || "—",
      city: extractNote(adm.notes, /City:\s*([^|\n]+)/i) || "—",
      state: extractNote(adm.notes, /State:\s*([^|\n]+)/i) || "—",
      pincode: extractNote(adm.notes, /Pincode:\s*([^|\n]+)/i) || "—",
      guardianName: extractNote(adm.notes, /(?:Father's Name|Mother's Name|Guardian Name|Guardian):\s*([^|\n]+)/i) || "—",
      counselorName: extractNote(adm.notes, /Counsellor:\s*([^|\n]+)/i) || "—",
      admissionSource: extractNote(adm.notes, /(?:Lead source|Source):\s*([^|\n]+)/i) || "Direct Walk-in",
      admissionType: extractNote(adm.notes, /Admission type:\s*([^|\n]+)/i) || "Regular Admission",
      branchName: adm.branch?.name || "—",
      academicYear: extractNote(adm.notes, /Academic year:\s*([^|\n]+)/i) || "—",
      courseId: adm.courseId || "",
      courseName: adm.course?.name || "—",
      programDuration: adm.course?.duration ? `(${adm.course.duration} Months)` : "—",
      batchId: adm.batchId || "",
      batchCode: adm.batch?.code || adm.batch?.name || "—",
      batchType: "Morning Batch",
      batchTiming: adm.batch?.timeSlot || "—",
      batchStartDate: adm.batch?.startDate ? new Date(adm.batch.startDate).toLocaleDateString() : "—",
      assignedFaculty: "—",
      batchCapacity: adm.batch?.capacity || 0,
      enrolledCount: 0,
      feePlan: adm.feePlan === "FULL_PAYMENT" ? "Standard Plan" : "Installment Plan",
      feePaymentStatus: (adm.payments?.length || 0) > 0 ? "Paid" : "Due",
      totalCourseFee: Number(adm.course?.fee || 0),
      discountAmount: 0,
      finalFee: Number(adm.course?.fee || 0),
      amountPaid: (adm.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      amountDue: (adm.pendingFees || []).reduce((sum: number, p: any) => sum + Number(p.dueAmount || 0), 0),
      paymentHistory: (adm.payments || []).map((p: any) => ({
        id: p.id,
        receiptNo: p.receiptNo || `REC-${p.id.slice(-6).toUpperCase()}`,
        amount: Number(p.amount || 0),
        paymentMode: p.mode || "UPI / QR",
        transactionId: p.transactionId || `TXN/${p.id.slice(-8)}`,
        date: new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        status: p.status === "SUCCESS" ? "Completed" : "Pending",
      })),
      status: adm.status === "CONFIRMED" ? "Confirmed" : "Provisional",
      workflowStep: adm.status === "CONFIRMED" ? 4 : 3,
      admissionDate: new Date(adm.admissionDate || adm.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      admissionTime: new Date(adm.admissionDate || adm.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      documents: (adm.documents || []).map((d: any) => ({
        id: d.id,
        title: d.title || d.name,
        category: d.category || "Identity Proof",
        fileName: d.fileName || "document.pdf",
        fileSize: d.fileSize || "1.2 MB",
        uploadDate: new Date(d.createdAt).toLocaleDateString(),
        verified: !!d.verified,
      })),
      counsellorNotes: adm.notes ? [{ id: `n-${adm.id}`, author: adm.counselorName || "Counsellor", role: "Counsellor", date: "Today", time: "Now", text: adm.notes }] : [],
    }));

    setAdmissionsList(mappedDbAdmissions);
  }, [dbAdmissionsRes]);

  useEffect(() => {
    const detail = preselectedAdmissionRes?.data;
    if (!detail) return;
    const extractNote = (notes: string | undefined | null, pattern: RegExp) => {
      if (!notes) return null;
      const match = notes.match(pattern);
      return match ? match[1].trim() : null;
    };
    const mapped: EnrichedAdmission = {
      id: detail.id,
      admissionNo: detail.admissionNo || `ADM-${detail.id.slice(-6).toUpperCase()}`,
      studentId: detail.studentId || detail.student?.id || "",
      studentCode: detail.student?.studentCode || "",
      studentName: detail.studentName || detail.student?.user?.name || "Admitted Student",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(detail.studentName || "AD")}`,
      email: detail.email || detail.student?.user?.email || "—",
      phone: detail.phone || detail.student?.user?.phone || "",
      altPhone: extractNote(detail.notes, /Alternate mobile:\s*([^|\n]+)/i) || "—",
      emergencyContact: extractNote(detail.notes, /(?:Guardian Phone|Emergency):\s*([^|\n]+)/i) || "—",
      dob: extractNote(detail.notes, /DOB:\s*([^|\n]+)/i) || "—",
      gender: extractNote(detail.notes, /Gender:\s*([^|\n]+)/i) || "—",
      bloodGroup: extractNote(detail.notes, /Blood Group:\s*([^|\n]+)/i) || "—",
      highestQualification: extractNote(detail.notes, /(?:Highest Qualification|Qualification):\s*([^|\n]+)/i) || detail.student?.qualification || "—",
      address: extractNote(detail.notes, /Address:\s*([^|\n]+)/i) || "—",
      city: "—",
      state: "—",
      pincode: "—",
      guardianName: extractNote(detail.notes, /(?:Father's Name|Mother's Name|Guardian):\s*([^|\n]+)/i) || "—",
      counselorName: "—",
      admissionSource: extractNote(detail.notes, /(?:Lead source|Source):\s*([^|\n]+)/i) || "Direct Walk-in",
      branchName: detail.branch?.name || "—",
      courseId: detail.courseId,
      courseName: detail.course?.name || "—",
      programDuration: "—",
      batchId: detail.batchId || "",
      batchCode: detail.batch?.code || detail.batch?.name || "—",
      batchType: "Morning Batch",
      batchTiming: detail.batch?.timeSlot || "—",
      batchStartDate: "—",
      assignedFaculty: "—",
      batchCapacity: 0,
      enrolledCount: 0,
      feePlan: detail.feePlan === "FULL_PAYMENT" ? "Standard Plan" : "Installment Plan",
      feePaymentStatus: (detail.payments?.length || 0) > 0 ? "Paid" : "Due",
      totalCourseFee: Number(detail.course?.fee || 0),
      discountAmount: 0,
      finalFee: Number(detail.course?.fee || 0),
      amountPaid: (detail.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
      amountDue: (detail.pendingFees || []).reduce((sum, p) => sum + Number(p.dueAmount || 0), 0),
      paymentHistory: (detail.payments || []).map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: Number(p.amount || 0),
        paymentMode: p.method || "UPI",
        transactionId: p.transactionRef || p.id,
        date: p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—",
        status: p.status === "SUCCESS" ? "Completed" : "Pending",
      })),
      status: detail.status === "CONFIRMED" ? "Confirmed" : detail.status === "PENDING" ? "Admission Pending" : "Provisional",
      workflowStep: detail.status === "CONFIRMED" ? 4 : 2,
      admissionDate: new Date(detail.admissionDate || detail.createdAt || Date.now()).toLocaleDateString("en-IN"),
      admissionTime: new Date(detail.admissionDate || detail.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      documents: (detail.documents || []).map((d) => ({
        id: d.id,
        title: d.name,
        category: "Identity Proof",
        fileName: d.fileName,
        fileSize: "—",
        uploadDate: "—",
        verified: d.status === "VERIFIED",
      })),
      counsellorNotes: detail.notes ? [{ id: `n-${detail.id}`, author: "Counsellor", role: "Counsellor", date: "Today", time: "Now", text: detail.notes }] : [],
    };
    setSelectedAdmission(mapped);
  }, [preselectedAdmissionRes]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchTypeFilter, setBatchTypeFilter] = useState("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 7;

  // View Details & Sub-Modal States
  const [selectedAdmission, setSelectedAdmission] = useState<EnrichedAdmission | null>(null);
  const [isManageAdmissionOpen, setIsManageAdmissionOpen] = useState(false);
  const [isFeeDetailsModalOpen, setIsFeeDetailsModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

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
  const confirmedCount = admissionsList.filter((a) => a.status === "Confirmed" || (a.status as string) === "CONFIRMED").length;
  const provisionalCount = admissionsList.filter((a) => a.status === "Provisional" || (a.status as string) === "PROVISIONAL").length;

  const courseOptions = useMemo(() => {
    const names = new Set(admissionsList.map((a) => a.courseName).filter((n) => n && n !== "—"));
    return Array.from(names).sort();
  }, [admissionsList]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Helper for Status Badge
  const renderAdmissionStatusBadge = (status: AdmissionRecordStatus | string) => {
    switch (status) {
      case "Confirmed":
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
            Confirmed
          </span>
        );
      case "Provisional":
      case "PROVISIONAL":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
            Provisional
          </span>
        );
      case "Admission Pending":
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
            Admission Pending
          </span>
        );
      case "Cancelled":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-2xs">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <PermissionGate itemKey="admissions.all" mode="read">
    <div className="p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-4 bg-background min-h-screen text-foreground font-sans">
      <ReadOnlyBanner itemKey="admissions.all" label="Admissions" />

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-border animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {selectedAdmission ? (
        <ViewAdmissionInfo
          admission={selectedAdmission}
          onBack={() => setSelectedAdmission(null)}
          onOpenManageAdmission={() => setIsManageAdmissionOpen(true)}
          onOpenChangeBatch={() => {
            setTargetBatchId(selectedAdmission.batchCode);
            setIsChangeBatchOpen(true);
          }}
          onOpenFeeDetails={() => setIsFeeDetailsModalOpen(true)}
          onOpenDocs={() => setIsDocsModalOpen(true)}
          onCopyAdmNo={handleCopyAdmNo}
          renderAdmissionStatusBadge={renderAdmissionStatusBadge}
          basePath={basePath}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Admissions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalAdmissionsCount} total · {confirmedCount} confirmed · {provisionalCount} provisional
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`${basePath}/admissions/direct-entry`)}
              className="h-9 gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New admission
            </Button>
          </div>

          {/* Toolbar */}
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, admission no, phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 pl-8 text-xs rounded-lg"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
              >
                <option value="ALL">All statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Provisional">Provisional</option>
                <option value="Admission Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                className="h-9 gap-1.5 text-xs shrink-0"
              >
                <Filter className="h-3.5 w-3.5" />
                More
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <select
                  value={courseFilter}
                  onChange={(e) => {
                    setCourseFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
                >
                  <option value="ALL">All courses</option>
                  {courseOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  value={feeStatusFilter}
                  onChange={(e) => {
                    setFeeStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
                >
                  <option value="ALL">All fees</option>
                  <option value="Paid">Paid</option>
                  <option value="Due">Due</option>
                </select>
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
                    className="h-9 text-xs text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <Card className="border border-border shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pl-5">
                  Student
                </TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Course
                </TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Batch
                </TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  Date
                </TableHead>
                <TableHead className="py-2.5 px-4 w-10" />
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border">
              {currentRows.length > 0 ? (
                currentRows.map((adm) => (
                  <TableRow
                    key={adm.id}
                    onClick={() => handleOpenDetails(adm)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group border-border"
                  >
                    <TableCell className="py-3 px-4 pl-5 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarImage src={adm.avatar} alt={adm.studentName} />
                          <AvatarFallback className="text-[10px] font-semibold">
                            {adm.studentName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{adm.studentName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{adm.admissionNo}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 align-middle">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{adm.courseName}</p>
                      <p className="text-[11px] text-muted-foreground md:hidden truncate">{adm.batchCode}</p>
                    </TableCell>

                    <TableCell className="py-3 px-4 align-middle hidden md:table-cell">
                      <p className="text-xs text-foreground font-mono">{adm.batchCode || "—"}</p>
                    </TableCell>

                    <TableCell className="py-3 px-4 align-middle">
                      {renderAdmissionStatusBadge(adm.status)}
                    </TableCell>

                    <TableCell className="py-3 px-4 align-middle hidden sm:table-cell">
                      <p className="text-xs text-muted-foreground">{adm.admissionDate}</p>
                    </TableCell>

                    <TableCell className="py-3 px-4 pr-4 align-middle text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground py-6">
                      <GraduationCap className="h-7 w-7 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No admissions found</p>
                      <p className="text-xs">Try adjusting search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAdmissions.length)} of {filteredAdmissions.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            </Button>
            <span className="text-foreground font-medium">Page {currentPage}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage * pageSize >= filteredAdmissions.length}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
        </>
      )}

      {/* ─── MODALS ─── */}

      {/* MANAGE ADMISSION MODAL */}
      {isManageAdmissionOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Manage Admission</h3>
                  <p className="text-xs text-muted-foreground">{selectedAdmission.studentName} ({selectedAdmission.admissionNo})</p>
                </div>
              </div>
              <button
                onClick={() => setIsManageAdmissionOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Change Admission Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Confirmed", "Provisional", "Cancelled"] as AdmissionRecordStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateAdmissionStatus(selectedAdmission.id, st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedAdmission.status === st
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-xs font-bold text-foreground">Add Counsellor Note</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add operational notes, remarks..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="bg-background border-border text-foreground text-xs h-9"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCounsellorNote}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 h-9 shrink-0 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {selectedAdmission.counsellorNotes?.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">Recent Notes</p>
                  {selectedAdmission.counsellorNotes.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-semibold mb-0.5">
                        <span>{n.author}</span>
                        <span>{n.date}</span>
                      </div>
                      <p className="text-foreground">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setIsManageAdmissionOpen(false)}
                  className="h-9 text-xs font-semibold border-border text-foreground hover:bg-muted/50 cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEE DETAILS MODAL */}
      {isFeeDetailsModalOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Fee Details & Transactions</h3>
                  <p className="text-xs text-muted-foreground">{selectedAdmission.studentName} ({selectedAdmission.admissionNo})</p>
                </div>
              </div>
              <button
                onClick={() => setIsFeeDetailsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Fee</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">₹{selectedAdmission.totalCourseFee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Paid Amount</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{selectedAdmission.amountPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Balance Due</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">₹{selectedAdmission.amountDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment History</h4>
              {selectedAdmission.paymentHistory.length > 0 ? (
                <div className="space-y-2">
                  {selectedAdmission.paymentHistory.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="font-bold text-foreground">{p.receiptNo}</p>
                          <p className="text-[11px] text-muted-foreground">{p.paymentMode} • {p.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">₹{p.amount.toLocaleString()}</span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                  No payment transactions recorded yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsFeeDetailsModalOpen(false)}
                className="h-9 text-xs font-semibold border-border text-foreground hover:bg-muted/50 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS MODAL */}
      {isDocsModalOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Verification Documents</h3>
                  <p className="text-xs text-muted-foreground">{selectedAdmission.studentName} ({selectedAdmission.admissionNo})</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedAdmission.documents.length > 0 ? (
                selectedAdmission.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground">{doc.fileName} • {doc.fileSize}</p>
                        {doc.verified && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="h-3 w-3" /> Verified by {doc.verifiedBy || "Priya Singh"}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleToggleDocVerification(doc.id)}
                      className={`h-8 px-3 text-xs font-bold transition-all cursor-pointer ${
                        doc.verified
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {doc.verified ? "Verified ✓" : "Verify Doc"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                  No documents uploaded yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsDocsModalOpen(false)}
                className="h-9 text-xs font-semibold border-border text-foreground hover:bg-muted/50 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </PermissionGate>
  );
};
