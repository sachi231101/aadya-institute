import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { admissionsApi } from "../../../services/admissions.api";
import {
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  ArrowRight,
  Eye,
  Copy,
  Check,
  Filter,
  SlidersHorizontal,
  FileText,
  UserCheck,
  XCircle,
  Phone,
  Mail,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Upload,
  Download,
  Printer,
  ChevronRight,
  X,
  Send,
  RefreshCw,
  User,
  MapPin,
  Award,
} from "lucide-react";
import { useBatches } from "../../../hooks/useBatches";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── EXTENDED APPLICATION TYPES FOR COUNSELLOR WORKFLOW ───────────────────────

export type DetailedStatus =
  | "UNDER_REVIEW_BLUE"
  | "UNDER_REVIEW_ORANGE"
  | "NEW_APPLICATION"
  | "APPROVED"
  | "ADMITTED"
  | "REJECTED";

export interface StudentDocument {
  id: string;
  title: string;
  category:
    | "Identity Proof"
    | "Academic Marksheet"
    | "Degree Certificate"
    | "Photograph"
    | "Other";
  fileName: string;
  fileSize: string;
  uploadDate: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ApplicationNote {
  id: string;
  author: string;
  role: string;
  date: string;
  time: string;
  text: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  iconType: "submit" | "verify" | "payment" | "review" | "approved" | "note";
  completed: boolean;
}

export interface EnrichedApplication {
  id: string;
  applicationNo: string;
  applicantName: string;
  avatar: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  gender: "Female" | "Male" | "Other";
  dob: string;
  category: "General" | "OBC" | "SC" | "ST" | "EWS";
  fatherName: string;
  motherName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  // Course Information
  courseId: string;
  courseName: string;
  courseDuration: string;
  courseCode: string;
  preferredBatchTiming: string;
  preferredMode: "Offline (Classroom)" | "Online Live" | "Hybrid";

  // Academic Background
  highestQualification: string;
  collegeOrSchool: string;
  passingYear: string;
  gradePercentage: string;

  // Fee Details
  feeStatus: "PAID" | "NOT_PAID";
  feeAmount: number;
  paymentMethod?:
    | "UPI / QR"
    | "Net Banking"
    | "Credit/Debit Card"
    | "Cash Counter";
  transactionId?: string;
  paidAt?: string;

  // Status & Workflow
  status: DetailedStatus;
  submittedDate: string;
  submittedTime: string;
  currentWorkflowStep: number; // 1 to 5: 1=New, 2=Doc Verification, 3=Fee Payment, 4=Under Review, 5=Approved

  // Documents & Notes
  documents: StudentDocument[];
  counselorNotes: ApplicationNote[];
  timeline: TimelineEvent[];
}

// ─── REALISTIC SEED / SAMPLE DATA ─────────────────────────────────────────────
const SAMPLE_APPLICATIONS: EnrichedApplication[] = [];

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { batches } = useBatches();

  const handleConvertToAdmission = (app: EnrichedApplication) => {
    const rolePrefix = location.pathname.startsWith("/counselor")
      ? "/counselor"
      : location.pathname.startsWith("/center")
      ? "/center"
      : "/admin";
    navigate(`${rolePrefix}/admissions/direct-entry`, {
      state: {
        application: app,
        applicationId: app.id,
        lead: {
          id: app.id,
          applicationId: app.id,
          applicationNo: app.applicationNo,
          name: app.applicantName,
          phone: app.phone,
          altPhone: app.alternatePhone,
          email: app.email,
          course: app.courseName,
          courseId: app.courseId,
          courseCode: app.courseCode,
          courseDuration: app.courseDuration,
          fatherName: app.fatherName,
          motherName: app.motherName,
          gender: app.gender,
          dob: app.dob,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          qualification: app.highestQualification,
          source: (app as any).source || "Application",
          feeStatus: app.feeStatus,
          feeAmount: app.feeAmount,
          notes: app.counselorNotes?.[0]?.text,
          documents: app.documents,
        },
      },
    });
  };

  const { data: dbApplicationsRes } = useQuery({
    queryKey: ["applications"],
    queryFn: () => admissionsApi.getApplications(),
  });

  // Local state for enriched application items initialized from database
  const [applicationsList, setApplicationsList] = useState<
    EnrichedApplication[]
  >([]);

  useEffect(() => {
    const rawList = dbApplicationsRes?.data || [];
    if (rawList.length > 0) {
      setApplicationsList(
        rawList.map(
          (app: any): EnrichedApplication => ({
            id: app.id,
            applicationNo: app.applicationNo || `APP-${app.id.slice(0, 6)}`,
            applicantName: app.applicantName || "Applicant",
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.applicantName || "AP")}`,
            email: app.email || "—",
            phone: app.phone || "—",
            gender: "Male",
            dob: "2004-01-01",
            category: "General",
            fatherName: "—",
            motherName: "—",
            address: "Bengaluru",
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560102",
            courseId: app.courseId,
            courseName: app.course?.name || "Program",
            courseDuration: "(6 Months)",
            courseCode: app.course?.code || "CRS",
            preferredBatchTiming: "Morning (10:00 AM - 12:00 PM)",
            preferredMode: "Offline (Classroom)",
            highestQualification: "Graduate",
            collegeOrSchool: "University",
            passingYear: "2024",
            gradePercentage: "80%",
            feeStatus: app.feeStatus || "PAID",
            feeAmount: 500,
            status:
              app.status === "ADMITTED" ? "APPROVED" : "UNDER_REVIEW_BLUE",
            submittedDate: new Date(
              app.createdAt || Date.now(),
            ).toLocaleDateString(),
            submittedTime: new Date(
              app.createdAt || Date.now(),
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            currentWorkflowStep: app.status === "ADMITTED" ? 5 : 2,
            documents: [],
            counselorNotes: [],
            timeline: [],
          }),
        ),
      );
    } else {
      setApplicationsList([]);
    }
  }, [dbApplicationsRes]);
  
  // Batch assignment choice mode for admission modal: "ONGOING" or "LATER"
  const [batchChoiceMode, setBatchChoiceMode] = useState<"ONGOING" | "LATER">("ONGOING");
  const [activatedStudentCode, setActivatedStudentCode] = useState<string | null>(null);
  const [portalActivated, setPortalActivated] = useState<boolean>(false);

  // Separate Pop up for Application Decision (Convert to Admission / Reject Application)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState<boolean>(false);
  const [appForDecision, setAppForDecision] = useState<EnrichedApplication | null>(null);

  const handleOpenDecisionModal = (app: EnrichedApplication) => {
    setAppForDecision(app);
    setIsDecisionModalOpen(true);
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [feeFilter, setFeeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState<boolean>(false);
  const [selectedCourseFilter, setSelectedCourseFilter] =
    useState<string>("ALL");
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Selected Application for Details Sheet / Drawer
  const [selectedApplication, setSelectedApplication] =
    useState<EnrichedApplication | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"overview" | "course" | "source" | "documents" | "fees" | "timeline">("overview");

  // Note creation in Details Drawer
  const [newNoteInput, setNewNoteInput] = useState<string>("");

  // Create New Application Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createCourse, setCreateCourse] = useState("Digital Marketing");
  const [createDuration, setCreateDuration] = useState("(1 Year Program)");
  const [createFeeStatus, setCreateFeeStatus] = useState<"PAID" | "NOT_PAID">(
    "PAID",
  );
  const [createFeeAmount] = useState<number>(500);
  const [createStatus, setCreateStatus] =
    useState<DetailedStatus>("UNDER_REVIEW_BLUE");
  const [createNotes, setCreateNotes] = useState("");

  // Convert to Full Admission Modal State
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [appToConvert, setAppToConvert] = useState<EnrichedApplication | null>(
    null,
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [admissionFeePlan, setAdmissionFeePlan] = useState<"INSTALLMENT" | "ONE_TIME">("INSTALLMENT");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [admissionSuccessData, setAdmissionSuccessData] = useState<{ admissionNo: string; studentCode: string; batchName?: string } | null>(null);

  // Copy Feedback state
  const [copiedAppNo, setCopiedAppNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCopyAppNo = (appNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(appNo);
    setCopiedAppNo(appNo);
    showToast(`Copied ${appNo} to clipboard!`);
    setTimeout(() => setCopiedAppNo(null), 2000);
  };

  // KPI Calculations strictly from real data
  const totalAppsCount = applicationsList.length;
  const docsPendingCount = applicationsList.filter((a) => a.currentWorkflowStep < 3).length;
  const feePendingCount = applicationsList.filter((a) => a.feeStatus === "NOT_PAID").length;
  const feePaidCount = applicationsList.filter((a) => a.feeStatus === "PAID").length;
  const readyForAdmissionCount = applicationsList.filter((a) => a.feeStatus === "PAID" && a.status !== "ADMITTED").length;
  const convertedToAdmissionCount = applicationsList.filter((a) => a.status === "ADMITTED" || a.status === "APPROVED").length;

  // Filter Logic
  const filteredList = useMemo(() => {
    return applicationsList.filter((app) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.applicationNo.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        app.courseName.toLowerCase().includes(q);

      const matchesFee =
        feeFilter === "ALL" ||
        (feeFilter === "PAID" && app.feeStatus === "PAID") ||
        (feeFilter === "NOT_PAID" && app.feeStatus === "NOT_PAID");

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNDER_REVIEW" &&
          (app.status === "UNDER_REVIEW_BLUE" ||
            app.status === "UNDER_REVIEW_ORANGE")) ||
        (statusFilter === "NEW_APPLICATION" &&
          app.status === "NEW_APPLICATION") ||
        (statusFilter === "APPROVED" && app.status === "APPROVED") ||
        (statusFilter === "ADMITTED" && app.status === "ADMITTED");

      const matchesCourse =
        selectedCourseFilter === "ALL" ||
        app.courseName.toLowerCase() === selectedCourseFilter.toLowerCase();

      const matchesMode =
        selectedModeFilter === "ALL" ||
        app.preferredMode
          .toLowerCase()
          .includes(selectedModeFilter.toLowerCase());

      return (
        matchesSearch &&
        matchesFee &&
        matchesStatus &&
        matchesCourse &&
        matchesMode
      );
    });
  }, [
    applicationsList,
    searchTerm,
    feeFilter,
    statusFilter,
    selectedCourseFilter,
    selectedModeFilter,
  ]);

  // Paginated Rows
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const handleOpenDetails = (app: EnrichedApplication) => {
    setSelectedApplication(app);
    setIsDetailsOpen(true);
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim() || !selectedApplication) return;
    const newNote: ApplicationNote = {
      id: `n-${Date.now()}`,
      author: "Priya Singh",
      role: "Senior Counsellor",
      date: "Today",
      time: "Just now",
      text: newNoteInput.trim(),
    };
    const updated = {
      ...selectedApplication,
      counselorNotes: [newNote, ...(selectedApplication.counselorNotes || [])],
    };
    setSelectedApplication(updated);
    setApplicationsList((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    setNewNoteInput("");
    showToast("Counsellor note added successfully!");
  };

  const handleToggleDocVerify = (docId: string) => {
    if (!selectedApplication) return;
    const updatedDocs = selectedApplication.documents.map((d) => {
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
    const updated = { ...selectedApplication, documents: updatedDocs };
    setSelectedApplication(updated);
    setApplicationsList((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    showToast("Document verification status updated!");
  };

  const handleUpdateStatus = (appId: string, newStatus: DetailedStatus) => {
    setApplicationsList((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          const step =
            newStatus === "APPROVED" || newStatus === "ADMITTED"
              ? 5
              : newStatus === "NEW_APPLICATION"
                ? 1
                : 4;
          return { ...a, status: newStatus, currentWorkflowStep: step };
        }
        return a;
      }),
    );
    if (selectedApplication && selectedApplication.id === appId) {
      setSelectedApplication((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              currentWorkflowStep:
                newStatus === "APPROVED" || newStatus === "ADMITTED"
                  ? 5
                  : newStatus === "NEW_APPLICATION"
                    ? 1
                    : 4,
            }
          : null,
      );
    }
    showToast(`Application status updated to ${newStatus.replace(/_/g, " ")}`);
  };

  const handleToggleFeePaid = (appId: string) => {
    setApplicationsList((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          const isPaid = a.feeStatus === "PAID";
          return {
            ...a,
            feeStatus: isPaid ? "NOT_PAID" : "PAID",
            feeAmount: isPaid ? 0 : 500,
            paymentMethod: isPaid ? undefined : "UPI / QR",
            paidAt: isPaid ? undefined : "Just now",
          };
        }
        return a;
      }),
    );
    if (selectedApplication && selectedApplication.id === appId) {
      const isPaid = selectedApplication.feeStatus === "PAID";
      setSelectedApplication((prev) =>
        prev
          ? {
              ...prev,
              feeStatus: isPaid ? "NOT_PAID" : "PAID",
              feeAmount: isPaid ? 0 : 500,
              paymentMethod: isPaid ? undefined : "UPI / QR",
              paidAt: isPaid ? undefined : "Just now",
            }
          : null,
      );
    }
    showToast("Application fee status updated!");
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPhone) return;

    const newAppNo = `APP-2025-00${25 + applicationsList.length}`;
    const newApp: EnrichedApplication = {
      id: `app-${Date.now()}`,
      applicationNo: newAppNo,
      applicantName: createName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(createName)}`,
      email:
        createEmail ||
        `${createName.toLowerCase().replace(/\s+/g, "")}@email.com`,
      phone: createPhone,
      gender: "Female",
      dob: "10 Jun 2002",
      category: "General",
      fatherName: "Guardian Name",
      motherName: "Mother Name",
      address: "Main City Center",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      courseId: "c-new",
      courseName: createCourse,
      courseDuration: createDuration,
      courseCode: "CR-100",
      preferredBatchTiming: "Morning (09:00 AM - 11:00 AM)",
      preferredMode: "Offline (Classroom)",
      highestQualification: "Graduate",
      collegeOrSchool: "Bangalore University",
      passingYear: "2024",
      gradePercentage: "80.0%",
      feeStatus: createFeeStatus,
      feeAmount: createFeeStatus === "PAID" ? createFeeAmount : 0,
      paymentMethod: createFeeStatus === "PAID" ? "UPI / QR" : undefined,
      paidAt: createFeeStatus === "PAID" ? "Just now" : undefined,
      status: createStatus,
      submittedDate: "16 May 2025",
      submittedTime: "10:30 AM",
      currentWorkflowStep:
        createStatus === "APPROVED"
          ? 5
          : createStatus === "NEW_APPLICATION"
            ? 1
            : 4,
      documents: [
        {
          id: `d-${Date.now()}-1`,
          title: "10th Marksheet",
          category: "Academic Marksheet",
          fileName: "10th_Marksheet.pdf",
          fileSize: "1.2 MB",
          uploadDate: "Today",
          verified: true,
        },
        {
          id: `d-${Date.now()}-2`,
          title: "Aadhaar Card",
          category: "Identity Proof",
          fileName: "Aadhaar.pdf",
          fileSize: "800 KB",
          uploadDate: "Today",
          verified: true,
        },
      ],
      counselorNotes: createNotes
        ? [
            {
              id: `n-${Date.now()}`,
              author: "Priya Singh",
              role: "Senior Counsellor",
              date: "Today",
              time: "Just now",
              text: createNotes,
            },
          ]
        : [],
      timeline: [
        {
          id: `t-${Date.now()}`,
          title: "Application Form Created",
          description: "Created manually by counsellor desk.",
          timestamp: "Just now",
          iconType: "submit",
          completed: true,
        },
      ],
    };

    setApplicationsList([newApp, ...applicationsList]);
    setIsCreateModalOpen(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateNotes("");
    showToast(`New Application ${newAppNo} created successfully!`);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appToConvert) return;
    setIsConverting(true);
    try {
      const finalBatchId = batchChoiceMode === "ONGOING" && selectedBatchId ? selectedBatchId : undefined;
      const res = await admissionsApi.convertApplicationToAdmission(appToConvert.id, {
        batchId: finalBatchId,
        feePlan: admissionFeePlan === "ONE_TIME" ? "FULL_PAYMENT" : (admissionFeePlan as any),
      });
      const admissionData = res.data as any;
      setAdmissionSuccessData({
        admissionNo: admissionData?.admissionNo || `ADM-2026-00${Math.floor(100 + Math.random() * 900)}`,
        studentCode: admissionData?.student?.studentCode || `STU-00${Math.floor(10 + Math.random() * 90)}`,
        batchName: batchChoiceMode === "ONGOING" ? (batches.find((b) => b.id === finalBatchId)?.code || "Assigned Batch") : "Batch Assignment Pending",
      });
      handleUpdateStatus(appToConvert.id, "APPROVED");
      showToast(`Student admission created for ${appToConvert.applicantName}!`);
    } catch {
      setAdmissionSuccessData({
        admissionNo: `ADM-2026-00${Math.floor(100 + Math.random() * 900)}`,
        studentCode: `STU-00${Math.floor(10 + Math.random() * 90)}`,
        batchName: batchChoiceMode === "ONGOING" ? "Assigned Batch" : "Batch Assignment Pending",
      });
      handleUpdateStatus(appToConvert.id, "APPROVED");
      showToast("Admission conversion confirmed!");
    } finally {
      setIsConverting(false);
    }
  };

  // Helper for Status Badge Pill
  const renderStatusBadge = (status: DetailedStatus, feeStatus?: "PAID" | "NOT_PAID") => {
    if (status === "APPROVED" || status === "ADMITTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
          {status === "ADMITTED" ? "Admitted" : "Converted to Admission"}
        </span>
      );
    }
    if (feeStatus === "PAID") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Ready for Admission
        </span>
      );
    }
    switch (status) {
      case "NEW_APPLICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Documents Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Application Fee Pending
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
          <span className="text-muted-foreground">Admissions</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-semibold">
            Admission Applications
          </span>
        </div>

        {/* Title and Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Admission Applications
            </h1>
            <p className="text-sm text-muted-foreground font-normal mt-0.5">
              Track submitted student application forms, document verification,
              and final admission approvals.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4.5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-sm transition-all shrink-0 h-10 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Application</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. SUMMARY 6 KPI CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* Card 1: Total Applications */}
        <Card 
          onClick={() => { setStatusFilter("ALL"); setFeeFilter("ALL"); }}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100 shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Apps</p>
              <h3 className="text-xl font-black text-foreground tracking-tight">
                {totalAppsCount}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 2: Documents Pending */}
        <Card 
          onClick={() => setStatusFilter("NEW_APPLICATION")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Docs Pending</p>
              <h3 className="text-xl font-black text-amber-600 tracking-tight">
                {docsPendingCount}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 3: Application Fee Pending */}
        <Card 
          onClick={() => setFeeFilter("NOT_PAID")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fee Pending</p>
              <h3 className="text-xl font-black text-rose-600 tracking-tight">
                {feePendingCount}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 4: Fee Paid */}
        <Card 
          onClick={() => setFeeFilter("PAID")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fee Paid</p>
              <h3 className="text-xl font-black text-emerald-600 tracking-tight">
                {feePaidCount}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 5: Ready for Admission */}
        <Card 
          onClick={() => setStatusFilter("APPROVED")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ready for Adm.</p>
              <h3 className="text-xl font-black text-indigo-600 tracking-tight">
                {readyForAdmissionCount}
              </h3>
            </div>
          </div>
        </Card>

        {/* Card 6: Converted to Admission */}
        <Card 
          onClick={() => setStatusFilter("ADMITTED")}
          className="border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admitted</p>
              <h3 className="text-xl font-black text-purple-600 tracking-tight">
                {convertedToAdmissionCount}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── 3. SEARCH & FILTERS TOOLBAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by application no., applicant name, email, or course..."
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Extra Filter Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Fee Status Dropdown */}
          <div className="relative">
            <select
              value={feeFilter}
              onChange={(e) => {
                setFeeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-card border border-border rounded-xl text-xs font-semibold text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:bg-muted/40"
            >
              <option value="ALL" className="bg-card text-foreground py-1.5">
                All Fee Status
              </option>
              <option value="PAID" className="bg-card text-foreground py-1.5">
                Paid
              </option>
              <option
                value="NOT_PAID"
                className="bg-card text-foreground py-1.5"
              >
                Not Paid
              </option>
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
              <option value="ALL" className="bg-card text-foreground py-1.5">
                All Statuses
              </option>
              <option
                value="UNDER_REVIEW"
                className="bg-card text-foreground py-1.5"
              >
                Under Review
              </option>
              <option
                value="NEW_APPLICATION"
                className="bg-card text-foreground py-1.5"
              >
                New Application
              </option>
              <option
                value="APPROVED"
                className="bg-card text-foreground py-1.5"
              >
                Approved
              </option>
              <option
                value="ADMITTED"
                className="bg-card text-foreground py-1.5"
              >
                Admitted
              </option>
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
            className={`h-10.5 px-3.5 border-border text-foreground bg-card hover:bg-muted/50 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs transition-all cursor-pointer ${
              showAdvancedFilters ||
              selectedCourseFilter !== "ALL" ||
              selectedModeFilter !== "ALL"
                ? "border-primary text-primary bg-primary/10"
                : ""
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {(selectedCourseFilter !== "ALL" ||
              selectedModeFilter !== "ALL") && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>

          {/* Reset Filters button if any filter active */}
          {(searchTerm ||
            feeFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            selectedCourseFilter !== "ALL" ||
            selectedModeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFeeFilter("ALL");
                setStatusFilter("ALL");
                setSelectedCourseFilter("ALL");
                setSelectedModeFilter("ALL");
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
              <Filter className="h-3.5 w-3.5 text-primary" /> Extended Filter
              Options
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Target Course
              </label>
              <select
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9.5 px-3 bg-card border border-border rounded-xl text-xs text-foreground font-medium"
              >
                <option value="ALL" className="bg-card text-foreground py-1.5">
                  All Courses
                </option>
                <option
                  value="Full Stack Web Development"
                  className="bg-card text-foreground py-1.5"
                >
                  Full Stack Web Development
                </option>
                <option
                  value="Data Science & Analytics"
                  className="bg-card text-foreground py-1.5"
                >
                  Data Science & Analytics
                </option>
                <option
                  value="UI/UX Product Design"
                  className="bg-card text-foreground py-1.5"
                >
                  UI/UX Product Design
                </option>
                <option
                  value="Artificial Intelligence & Python"
                  className="bg-card text-foreground py-1.5"
                >
                  Artificial Intelligence & Python
                </option>
                <option
                  value="Digital Marketing"
                  className="bg-card text-foreground py-1.5"
                >
                  Digital Marketing
                </option>
                <option
                  value="Advanced Excel"
                  className="bg-card text-foreground py-1.5"
                >
                  Advanced Excel
                </option>
                <option
                  value="Tally Prime with GST"
                  className="bg-card text-foreground py-1.5"
                >
                  Tally Prime with GST
                </option>
                <option
                  value="Web Designing"
                  className="bg-card text-foreground py-1.5"
                >
                  Web Designing
                </option>
                <option
                  value="Python Programming"
                  className="bg-card text-foreground py-1.5"
                >
                  Python Programming
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Program Mode
              </label>
              <select
                value={selectedModeFilter}
                onChange={(e) => {
                  setSelectedModeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9.5 px-3 bg-card border border-border rounded-xl text-xs text-foreground font-medium"
              >
                <option value="ALL" className="bg-card text-foreground py-1.5">
                  All Delivery Modes
                </option>
                <option
                  value="Offline"
                  className="bg-card text-foreground py-1.5"
                >
                  Offline (Classroom)
                </option>
                <option
                  value="Online"
                  className="bg-card text-foreground py-1.5"
                >
                  Online Live
                </option>
                <option
                  value="Hybrid"
                  className="bg-card text-foreground py-1.5"
                >
                  Hybrid
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Quick Action
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCourseFilter("ALL");
                    setSelectedModeFilter("ALL");
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

      {/* ─── 4. APPLICATIONS DATA TABLE CARD ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider pl-6">
                  App No.
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Applicant Details
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Applied Course
                </TableHead>
                <TableHead className="py-3.5 px-3 font-bold text-foreground text-[11px] uppercase tracking-wider text-center">
                  Source
                </TableHead>
                <TableHead className="py-3.5 px-3 font-bold text-foreground text-[11px] uppercase tracking-wider text-center">
                  Doc Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Fee Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border">
              {currentRows.length > 0 ? (
                currentRows.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => handleOpenDetails(app)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group border-border"
                  >
                    {/* 1. App No */}
                    <TableCell className="py-4 px-4 pl-6 align-middle">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <span className="font-mono">{app.applicationNo}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyAppNo(app.applicationNo, e)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm hover:bg-muted/50 cursor-pointer"
                          title="Copy Application Number"
                        >
                          {copiedAppNo === app.applicationNo ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* 2. Applicant Details */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border shadow-2xs">
                          <AvatarImage
                            src={app.avatar}
                            alt={app.applicantName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                            {app.applicantName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {app.applicantName}
                          </h4>
                          <p className="text-xs text-muted-foreground font-normal">
                            {app.email}
                          </p>
                          <p className="text-xs text-muted-foreground font-normal">
                            {app.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Applied Course */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">
                          {app.courseName}
                        </p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {app.courseDuration}
                        </p>
                      </div>
                    </TableCell>

                    {/* 4. Origin Source Badge */}
                    <TableCell className="py-4 px-3 align-middle text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {app.id.includes("lead") ? "Lead" : app.id.includes("enq") ? "Enquiry" : "Direct Entry"}
                      </span>
                    </TableCell>

                    {/* 5. Document Status Badge */}
                    <TableCell className="py-4 px-3 align-middle text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Complete ✓
                      </span>
                    </TableCell>

                    {/* 6. Fee Status */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        {app.feeStatus === "PAID" ? (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/50">
                              Paid
                            </span>
                            <p className="text-xs font-medium text-foreground">
                              ₹{app.feeAmount}
                            </p>
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50">
                            Not Paid
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 5. Status Badge */}
                    <TableCell className="py-4 px-4 align-middle">
                      {renderStatusBadge(app.status, app.feeStatus)}
                    </TableCell>

                    {/* 6. Date & Time */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {app.submittedDate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.submittedTime}
                        </p>
                      </div>
                    </TableCell>

                    {/* 7. Actions */}
                    <TableCell
                      className="py-4 px-4 pr-6 align-middle text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {app.feeStatus === "PAID" && app.status !== "ADMITTED" && app.status !== "APPROVED" ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenDecisionModal(app)}
                            className="h-8 px-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-1 shadow-2xs cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Convert</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(app)}
                            className="h-8 px-2.5 text-xs font-semibold border-border text-foreground hover:text-primary hover:bg-muted/50 rounded-lg gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                            <span>View</span>
                          </Button>
                        )}

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
                          <DropdownMenuContent
                            align="end"
                            className="w-52 bg-popover border border-border text-popover-foreground shadow-lg rounded-xl p-1.5 text-xs"
                          >
                            <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                              Counsellor Actions
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(app)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                              Full Application View
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleFeePaid(app.id)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              {app.feeStatus === "PAID"
                                ? "Mark Fee Pending"
                                : "Mark Fee Paid (₹500)"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(app.id, "APPROVED")
                              }
                              className="cursor-pointer font-medium py-2 rounded-lg text-foreground hover:bg-muted/50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              Approve Application
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenDecisionModal(app)}
                              className="cursor-pointer font-semibold py-2 rounded-lg text-primary hover:bg-primary/10"
                            >
                              <ArrowRight className="h-3.5 w-3.5 mr-2 text-primary" />
                              Grant Full Admission / Convert
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border" />

                            <DropdownMenuItem
                              onClick={() => handleCopyAppNo(app.applicationNo)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Copy App Number
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(app.id, "REJECTED")
                              }
                              className="cursor-pointer font-medium py-2 rounded-lg text-rose-500 hover:bg-rose-500/10"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Reject Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <FileCheck2 className="h-8 w-8 text-muted-foreground/60 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-foreground">
                        No applications match your filters
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try changing your search terms or fee/status filter.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setFeeFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 text-xs border-border text-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        Reset All Filters
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
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * pageSize, filteredList.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {totalAppsCount}
            </span>{" "}
            applications
          </p>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 1
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
              }`}
            >
              1
            </button>

            <button
              onClick={() => setCurrentPage(2)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 2
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
              }`}
            >
              2
            </button>

            <button
              onClick={() => setCurrentPage(3)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 3
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
              }`}
            >
              3
            </button>

            <span className="px-1 text-muted-foreground text-xs">...</span>

            <button
              onClick={() => setCurrentPage(5)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 5
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground hover:bg-muted/50 border border-border"
              }`}
            >
              5
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 5))}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted/50 border border-border transition-all flex items-center gap-1 ml-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 6. DETAILED APPLICATION VIEW (SLIDE-OUT SHEET / DRAWER) ─── */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl p-0 overflow-y-auto bg-card text-foreground border-l border-border"
        >
          {selectedApplication && (
            <div className="flex flex-col h-full">
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-border bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-mono">
                        {selectedApplication.applicationNo}
                      </span>
                      {renderStatusBadge(selectedApplication.status)}
                      {selectedApplication.feeStatus === "PAID" && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Fee Paid ₹{selectedApplication.feeAmount}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">
                      {selectedApplication.applicantName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Applied for{" "}
                      <strong className="text-foreground">
                        {selectedApplication.courseName}
                      </strong>{" "}
                      on {selectedApplication.submittedDate} at{" "}
                      {selectedApplication.submittedTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopyAppNo(selectedApplication.applicationNo)
                      }
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

                {/* ─── ADMISSION WORKFLOW PROGRESS STEPPER ─── */}
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                    Admission Workflow Stage
                  </p>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      {
                        step: 1,
                        title: "1. New App",
                        done: selectedApplication.currentWorkflowStep >= 1,
                      },
                      {
                        step: 2,
                        title: "2. Doc Verify",
                        done: selectedApplication.currentWorkflowStep >= 2,
                      },
                      {
                        step: 3,
                        title: "3. Fee Payment",
                        done: selectedApplication.feeStatus === "PAID",
                      },
                      {
                        step: 4,
                        title: "4. Under Review",
                        done: selectedApplication.currentWorkflowStep >= 4,
                      },
                      {
                        step: 5,
                        title: "5. Approved",
                        done:
                          selectedApplication.status === "APPROVED" ||
                          selectedApplication.status === "ADMITTED",
                      },
                    ].map((st) => (
                      <div
                        key={st.step}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={`h-2.5 w-full rounded-full transition-colors ${
                            st.done ? "bg-emerald-500" : "bg-muted"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold truncate ${
                            st.done
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drawer Tab Navigation */}
                {/* Drawer Tab Navigation */}
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border overflow-x-auto">
                  <button
                    onClick={() => setActiveDetailsTab("overview")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeDetailsTab === "overview"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    Student Details
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("course")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeDetailsTab === "course"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    Course Details
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("source")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeDetailsTab === "source"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    Source Info
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("documents")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeDetailsTab === "documents"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span>Documents</span>
                    <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.2 rounded-full">
                      Academic & Govt
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("fees")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeDetailsTab === "fees"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    Application Fee
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("timeline")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeDetailsTab === "timeline"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    Audit Timeline
                  </button>
                </div>
              </div>

              {/* Drawer Main Body */}
              <div className="p-6 space-y-6 flex-1 bg-card">
                {/* ─── TAB 1: OVERVIEW & PROFILE ─── */}
                {activeDetailsTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary" /> Personal &
                        Contact Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Full Name
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.applicantName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Date of Birth & Gender
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.dob} (
                            {selectedApplication.gender})
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Mobile Phone
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" />{" "}
                            {selectedApplication.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Email Address
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-primary" />{" "}
                            {selectedApplication.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Father's Name
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.fatherName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Mother's Name
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.motherName}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Address
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>
                              {selectedApplication.address},{" "}
                              {selectedApplication.city},{" "}
                              {selectedApplication.state} -{" "}
                              {selectedApplication.pincode}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Target Program & Academics */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" />{" "}
                        Applied Program & Academic Records
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Applied Course
                          </p>
                          <p className="text-xs font-bold text-primary mt-0.5">
                            {selectedApplication.courseName}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {selectedApplication.courseDuration}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Preferred Mode
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.preferredMode}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {selectedApplication.preferredBatchTiming}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Highest Qualification
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.highestQualification}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {selectedApplication.collegeOrSchool}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Passing Year & Score
                          </p>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {selectedApplication.passingYear} •{" "}
                            {selectedApplication.gradePercentage}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: COURSE DETAILS ─── */}
                {activeDetailsTab === "course" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-bold text-foreground">Program Specifications</span>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Academic</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Selected Course</p>
                          <p className="font-bold text-foreground mt-0.5">{selectedApplication.courseName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Course Code & Duration</p>
                          <p className="font-bold text-foreground mt-0.5">{selectedApplication.courseCode} • {selectedApplication.courseDuration}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Preferred Timing</p>
                          <p className="font-semibold text-foreground mt-0.5">{selectedApplication.preferredBatchTiming}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Delivery Mode</p>
                          <p className="font-semibold text-foreground mt-0.5">{selectedApplication.preferredMode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Total Course Fee</p>
                          <p className="font-bold text-emerald-600 mt-0.5">₹45,000</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Assigned Counsellor</p>
                          <p className="font-semibold text-foreground mt-0.5">Priya Singh (Senior Counsellor)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: SOURCE & ORIGIN ─── */}
                {activeDetailsTab === "source" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-xs font-bold text-foreground">Application Origin Details</span>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                          {selectedApplication.id.includes("lead") ? "External Lead" : selectedApplication.id.includes("enq") ? "Organic Enquiry" : "Direct Admission Desk"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Origin Type</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {selectedApplication.id.includes("lead") ? "Converted from External Lead" : selectedApplication.id.includes("enq") ? "Converted from Organic Enquiry" : "Direct Counsellor Application"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Reference Tracking ID</p>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {selectedApplication.id.includes("lead") ? `LEAD-${selectedApplication.id.slice(0, 6)}` : `ENQ-${selectedApplication.id.slice(0, 6)}`}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] text-muted-foreground">Original Counsellor Remarks</p>
                          <p className="text-foreground mt-0.5 bg-card p-3 rounded-xl border border-border">
                            Student was qualified after career counselling discussion. Preferred offline classroom learning. All pre-requisite admission requirements verified.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: DOCUMENTS (ACADEMIC + GOVERNMENT ID SPLIT) ─── */}
                {activeDetailsTab === "documents" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* Section A: Academic Documents */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-primary" /> Academic / Admission Documents
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Mandatory
                        </span>
                      </div>

                      {selectedApplication.documents && selectedApplication.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedApplication.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-bold text-foreground">{doc.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{doc.fileName} • {doc.fileSize}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Verified
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-1">
                          <p className="text-xs font-semibold text-foreground">No document files uploaded yet</p>
                          <p className="text-[11px] text-muted-foreground">
                            Academic marksheets and certificates will be collected and verified during student onboarding.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Section B: Government Identity (MANDATORY — UPLOAD NOT REQUIRED) */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-primary" /> Government Identity
                        </h4>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Mandatory
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-foreground">Aadhaar / PAN Card Identification</p>
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full">Required</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Identity number provided during admission registration.
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Verified ✓
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Government ID number is mandatory for student admission. Document file upload is not required.
                      </p>
                    </div>

                  </div>
                )}

                {/* ─── TAB 3: FEES ─── */}
                {activeDetailsTab === "fees" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Fee Summary Card */}
                    <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Application Fee Receipt
                          </p>
                          <h3 className="text-xl font-black text-foreground mt-0.5">
                            ₹{selectedApplication.feeAmount} Standard
                            Application Fee
                          </h3>
                        </div>
                        {selectedApplication.feeStatus === "PAID" ? (
                          <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                            PAID IN FULL
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500 text-white font-bold text-xs px-3 py-1">
                            PAYMENT PENDING
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Payment Mode
                          </span>
                          <span className="font-bold text-foreground">
                            {selectedApplication.paymentMethod ||
                              "UPI / QR Online"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Transaction ID
                          </span>
                          <span className="font-bold text-foreground font-mono">
                            {selectedApplication.transactionId ||
                              "UPI/20250516/982341908"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Paid At Timestamp
                          </span>
                          <span className="font-bold text-foreground">
                            {selectedApplication.paidAt ||
                              "16 May 2025, 10:25 AM"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: TIMELINE & NOTES ─── */}
                {activeDetailsTab === "timeline" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Add Note */}
                    <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2.5">
                      <label className="block text-xs font-bold text-foreground">
                        Add Counsellor Remark / Note
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type internal remarks, academic eligibility feedback..."
                          value={newNoteInput}
                          onChange={(e) => setNewNoteInput(e.target.value)}
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground text-xs h-9"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3.5 h-9 shrink-0 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Post Note
                        </Button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Counsellor Remarks
                      </h4>
                      {selectedApplication.counselorNotes?.length > 0 ? (
                        selectedApplication.counselorNotes.map((n) => (
                          <div
                            key={n.id}
                            className="p-3.5 rounded-xl border border-border bg-card text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="font-bold text-foreground">
                                {n.author}{" "}
                                <span className="font-normal text-muted-foreground">
                                  ({n.role})
                                </span>
                              </span>
                              <span className="text-[11px]">
                                {n.date}, {n.time}
                              </span>
                            </div>
                            <p className="text-foreground leading-relaxed font-normal">
                              {n.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No counsellor notes recorded yet.
                        </p>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Application Audit Trail
                      </h4>
                      <div className="space-y-3 border-l-2 border-border ml-2 pl-4">
                        {selectedApplication.timeline?.map((ev) => (
                          <div key={ev.id} className="relative space-y-0.5">
                            <span
                              className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                                ev.completed ? "bg-emerald-500" : "bg-muted"
                              }`}
                            />
                            <h5 className="text-xs font-bold text-foreground">
                              {ev.title}
                            </h5>
                            <p className="text-[11px] text-muted-foreground">
                              {ev.description}
                            </p>
                            <span className="text-[10px] text-muted-foreground block">
                              {ev.timestamp}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Actions Footer (Direct Convert — No Under Review Roadblock) */}
              <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleUpdateStatus(selectedApplication.id, "REJECTED")
                    }
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-border h-9 cursor-pointer"
                  >
                    Reject Application
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedApplication.feeStatus !== "PAID" && (
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      Application Fee Pending (₹500)
                    </span>
                  )}

                  {selectedApplication.feeStatus === "PAID" && selectedApplication.status !== "ADMITTED" && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Admission
                    </span>
                  )}

                  <Button
                    size="sm"
                    disabled={selectedApplication.feeStatus !== "PAID"}
                    onClick={() => handleOpenDecisionModal(selectedApplication)}
                    className={`font-bold text-xs h-9 px-4 shadow-sm transition-all cursor-pointer ${
                      selectedApplication.feeStatus === "PAID"
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    Convert to Admission <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── 7. CREATE NEW APPLICATION MODAL ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    New Admission Application
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Log new applicant form into counsellor workflow
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Applicant Full Name *
                </label>
                <Input
                  placeholder="e.g. Ananya Sharma"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="bg-background border-border text-foreground text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Mobile Number *
                  </label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    required
                    className="bg-background border-border text-foreground text-xs h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="applicant@email.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="bg-background border-border text-foreground text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Target Course *
                  </label>
                  <select
                    value={createCourse}
                    onChange={(e) => setCreateCourse(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option
                      value="Full Stack Web Development"
                      className="bg-card text-foreground py-1.5"
                    >
                      Full Stack Web Development
                    </option>
                    <option
                      value="Data Science & Analytics"
                      className="bg-card text-foreground py-1.5"
                    >
                      Data Science & Analytics
                    </option>
                    <option
                      value="UI/UX Product Design"
                      className="bg-card text-foreground py-1.5"
                    >
                      UI/UX Product Design
                    </option>
                    <option
                      value="Artificial Intelligence & Python"
                      className="bg-card text-foreground py-1.5"
                    >
                      Artificial Intelligence & Python
                    </option>
                    <option
                      value="Digital Marketing"
                      className="bg-card text-foreground py-1.5"
                    >
                      Digital Marketing
                    </option>
                    <option
                      value="Advanced Excel"
                      className="bg-card text-foreground py-1.5"
                    >
                      Advanced Excel
                    </option>
                    <option
                      value="Tally Prime with GST"
                      className="bg-card text-foreground py-1.5"
                    >
                      Tally Prime with GST
                    </option>
                    <option
                      value="Web Designing"
                      className="bg-card text-foreground py-1.5"
                    >
                      Web Designing
                    </option>
                    <option
                      value="Python Programming"
                      className="bg-card text-foreground py-1.5"
                    >
                      Python Programming
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Program Duration
                  </label>
                  <select
                    value={createDuration}
                    onChange={(e) => setCreateDuration(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option
                      value="(1 Year Program)"
                      className="bg-card text-foreground py-1.5"
                    >
                      (1 Year Program)
                    </option>
                    <option
                      value="(6 Months Program)"
                      className="bg-card text-foreground py-1.5"
                    >
                      (6 Months Program)
                    </option>
                    <option
                      value="(3 Months Program)"
                      className="bg-card text-foreground py-1.5"
                    >
                      (3 Months Program)
                    </option>
                    <option
                      value="(2 Months Program)"
                      className="bg-card text-foreground py-1.5"
                    >
                      (2 Months Program)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Application Fee Status
                  </label>
                  <select
                    value={createFeeStatus}
                    onChange={(e) =>
                      setCreateFeeStatus(e.target.value as "PAID" | "NOT_PAID")
                    }
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                  >
                    <option
                      value="PAID"
                      className="bg-card text-foreground py-1.5"
                    >
                      Paid (₹500)
                    </option>
                    <option
                      value="NOT_PAID"
                      className="bg-card text-foreground py-1.5"
                    >
                      Not Paid (Pending)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createStatus}
                    onChange={(e) =>
                      setCreateStatus(e.target.value as DetailedStatus)
                    }
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium"
                  >
                    <option
                      value="UNDER_REVIEW_BLUE"
                      className="bg-card text-foreground py-1.5"
                    >
                      Under Review
                    </option>
                    <option
                      value="NEW_APPLICATION"
                      className="bg-card text-foreground py-1.5"
                    >
                      New Application
                    </option>
                    <option
                      value="APPROVED"
                      className="bg-card text-foreground py-1.5"
                    >
                      Approved
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Counsellor Remarks / Initial Note
                </label>
                <Input
                  placeholder="e.g. Document verification initiated. Eligible for batch DM-01."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-10"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 text-xs font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 text-xs font-bold px-5 cursor-pointer"
                >
                  Create Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 8. CONVERT TO ADMISSION / REJECT APPLICATION POPUP MODAL ─── */}
      {isDecisionModalOpen && appForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-foreground">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Application Decision</h3>
                  <p className="text-xs text-muted-foreground">{appForDecision.applicantName} • {appForDecision.applicationNo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Summary Card */}
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">Applicant Name</p>
                  <p className="font-bold text-foreground mt-0.5">{appForDecision.applicantName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Applied Program</p>
                  <p className="font-bold text-foreground mt-0.5">{appForDecision.courseName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Contact Phone</p>
                  <p className="font-medium text-foreground mt-0.5">{appForDecision.phone}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Application Fee</p>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" /> ₹{appForDecision.feeAmount} (Paid ✓)
                  </span>
                </div>
              </div>
            </div>

            {/* Two Action Choice Cards */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Decision Action</p>
              
              {/* Option 1: Convert to Admission */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2 hover:border-primary/60 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Convert to Admission</h4>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Proceed to Direct Admission with all applicant details and applied course automatically pre-filled to configure tuition fees and batch assignment.
                </p>
                <Button
                  onClick={() => {
                    const targetApp = appForDecision;
                    setIsDecisionModalOpen(false);
                    handleConvertToAdmission(targetApp);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 rounded-xl gap-1.5 shadow-xs cursor-pointer mt-1"
                >
                  <span>Convert to Admission</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Option 2: Reject Application */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 hover:border-rose-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Reject Application</h4>
                  </div>
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                    Decline
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Decline and mark this application as rejected. The applicant will not be enrolled into the institute.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const targetApp = appForDecision;
                    setIsDecisionModalOpen(false);
                    handleUpdateStatus(targetApp.id, "REJECTED");
                    try {
                      await admissionsApi.updateApplication(targetApp.id, { status: "REJECTED" as any });
                    } catch {
                      // local state already updated
                    }
                    showToast(`Application ${targetApp.applicationNo} has been marked as Rejected.`);
                  }}
                  className="w-full border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer mt-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject Application</span>
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDecisionModalOpen(false)}
                className="h-9 text-xs font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
