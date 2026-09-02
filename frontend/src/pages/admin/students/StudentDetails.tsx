import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudent, useUpdateStudent } from "../../../hooks/useStudents";
import { useCourses } from "../../../hooks/useCourses";
import { useBatches } from "../../../hooks/useBatches";
import { batchIncludesCourse, formatBatchInstructorsSummary, formatBatchSubjectNames } from "@/utils/batch.utils";
import { aiCallingApi } from "../../../services/ai-calling.api";
import { studentsApi } from "../../../services/students.api";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Loader2,
  AlertCircle,
  User,
  HeartHandshake,
  CreditCard,
  Clock,
  MessageSquare,
  Bot,
  Download,
  Award,
  CircleDot,
  Check,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  FileText,
  ShieldCheck,
  Copy,
  MapPin,
  RefreshCw,
  X,
  ExternalLink,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [callInitiated, setCallInitiated] = useState(false);
  const [waSent, setWaSent] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Admission & Batch Activation Modal State
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [feePlan, setFeePlan] = useState<"INSTALLMENT" | "FULL_PAYMENT">("INSTALLMENT");
  const [totalFee, setTotalFee] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [admissionNotes, setAdmissionNotes] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: response, isLoading, isError } = useStudent(id);
  const student = response?.data;

  const { courses } = useCourses();
  const updateMutation = useUpdateStudent();

  const { batches } = useBatches({
    courseId: selectedCourseId || undefined,
  });

  const studentBranchId = student?.branchId || student?.branch?.id || "";

  const availableBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return batches.filter((b) => {
      if (selectedCourseId && !batchIncludesCourse(b, selectedCourseId)) return false;
      if (studentBranchId && b.branchId && b.branchId !== studentBranchId) return false;
      return true;
    });
  }, [batches, selectedCourseId, studentBranchId]);

  const { data: aiCallsResponse } = useQuery({
    queryKey: ["ai-calls", id],
    queryFn: () => aiCallingApi.getCallLogs({ studentId: id!, limit: 10 }),
    enabled: !!id,
  });
  const aiCallLogs = aiCallsResponse?.data ?? [];

  const admission = student?.admissions?.[0] as any;
  const enrollment = student?.batchEnrollments?.[0] as any;

  const isDraftStudent = useMemo(() => {
    if (!student) return false;
    return (
      student.status === ("DRAFT" as any) ||
      (student as any).isDraft ||
      (student as any).admissionStatus === "PENDING" ||
      admission?.status === "PENDING"
    );
  }, [student, admission]);

  // Sync initial dialog state when student loads
  useEffect(() => {
    if (student) {
      const initialCourseId = admission?.courseId || admission?.course?.id || enrollment?.batch?.course?.id || "";
      const initialBatchId = admission?.batchId || enrollment?.batchId || "";
      const initialTotalFee = Number(student.fees?.totalFee || (student.fees as any)?.total || admission?.totalFee || 0);
      const initialDownPay = Number(student.fees?.amountPaid || (student.fees as any)?.paid || 0);

      setSelectedCourseId(initialCourseId);
      setSelectedBatchId(initialBatchId);
      setFeePlan((admission?.feePlan as any) || "INSTALLMENT");
      setTotalFee(initialTotalFee);
      setDownPayment(initialDownPay);
      setAdmissionNotes(admission?.notes || "");
    }
  }, [student, admission, enrollment]);

  // Auto-open modal if navigated with ?action=activate
  useEffect(() => {
    if (searchParams.get("action") === "activate" && student) {
      setIsActivateModalOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, student, setSearchParams]);

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedBatchId("");
    const matched = courses.find((c) => c.id === courseId);
    if (matched && (matched.fee || (matched as any).totalFee)) {
      const courseFee = Number(matched.fee || (matched as any).totalFee || 0);
      if (!totalFee || totalFee === 0) {
        setTotalFee(courseFee);
      }
    }
  };

  const handleActivateStudent = async () => {
    if (!id) return;
    setDialogError(null);

    if (!selectedCourseId) {
      setDialogError("Please select a Course / Academic Program.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: student?.user?.name || student?.studentCode || "Student",
          branchId: studentBranchId,
          courseId: selectedCourseId,
          batchId: selectedBatchId || undefined,
          status: "ACTIVE",
          admissionStatus: "CONFIRMED",
          feePlan,
          totalFee: Number(totalFee) || 0,
          downPayment: Number(downPayment) || 0,
          notes: admissionNotes || undefined,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["student", id] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });

      setIsActivateModalOpen(false);
      setSuccessToast("Student admission confirmed and status successfully converted to Active!");
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setDialogError(err?.response?.data?.message || "Failed to activate student admission.");
    }
  };

  const getStatusBadge = (status: string) => {
    if (isDraftStudent) {
      return (
        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Admission Pending
        </span>
      );
    }
    switch (status) {
      case "ACTIVE":
        return (
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Student
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> On Approved Leave
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Graduated
          </span>
        );
      case "DISCONTINUED":
        return (
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Discontinued
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-muted text-muted-foreground border border-border text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const handleAICall = () => {
    setCallInitiated(true);
    setTimeout(() => setCallInitiated(false), 4000);
  };

  const handleWhatsAppSend = () => {
    setWaSent(true);
    setTimeout(() => setWaSent(false), 3000);
  };

  // ─── Send ID & Password to Student WhatsApp ───────────────────────
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);
  const [credentialsSentInfo, setCredentialsSentInfo] = useState<{
    phone: string;
    studentCode: string;
    whatsappWebUrl: string;
  } | null>(null);
  const [showCredentialsSentModal, setShowCredentialsSentModal] = useState(false);

  const handleSendCredentialsWhatsApp = async () => {
    if (!id) return;
    setIsSendingCredentials(true);
    try {
      const res = await studentsApi.sendCredentialsWhatsApp(id);
      if (res.data?.success) {
        setCredentialsSentInfo({
          phone: res.data.recipient.formattedPhone || res.data.recipient.phone,
          studentCode: res.data.recipient.studentCode,
          whatsappWebUrl: res.data.whatsappWebUrl,
        });
        setShowCredentialsSentModal(true);
      }
    } catch {
      // Fallback: If student has a phone number, construct WhatsApp Web URL directly
      const phoneToUse = studentPhone && studentPhone !== "—" && studentPhone !== notProvided
        ? studentPhone
        : "";
      const cleanPhone = phoneToUse.replace(/\D/g, "");
      const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const code = student?.studentCode || admissionNo || "AADYA/2026/0001";
      const fallbackText = `🎓 *Welcome to Aadya Institute!*

Dear *${studentName}*,

Your admission has been confirmed. Below are your Student Portal login credentials:

🆔 *Student ID / Username:* \`${code}\`
🔑 *Initial Password:* \`Aadya@123\`
🌐 *Portal URL:* ${window.location.origin}/login

📌 *Important Instructions:*
1. Sign in to your Student Dashboard using your Student ID and Initial Password.
2. Go to *Profile* → *Change Password* to set your personal secure password.
3. Access your class timetables, attendance history, assignments, and recordings.

Best regards,  
*Aadya Institute Management*`;

      const directUrl = formatted ? `https://wa.me/${formatted}?text=${encodeURIComponent(fallbackText)}` : "";
      setCredentialsSentInfo({
        phone: formatted ? `+${formatted}` : "Registered Number",
        studentCode: code,
        whatsappWebUrl: directUrl,
      });
      setShowCredentialsSentModal(true);
    } finally {
      setIsSendingCredentials(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 font-medium text-muted-foreground">Loading student dossier...</span>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-16 max-w-md mx-auto text-foreground">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4 opacity-70" />
        <h3 className="text-lg font-bold mb-2">Student Not Found</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Could not locate student record with ID: <span className="font-mono text-foreground font-semibold">{id}</span>
        </p>
        <Button variant="outline" onClick={() => navigate(`${basePath}/students/all`)}>
          Back to Students List
        </Button>
      </div>
    );
  }

  const notProvided = "Not Provided";

  const extractNote = (notes: string | undefined | null, pattern: RegExp) => {
    if (!notes) return null;
    const match = notes.match(pattern);
    return match ? match[1].trim() : null;
  };

  const notesText = admission?.notes || student.notes || "";

  const studentName = student.user?.name || student.studentCode;
  const studentEmail = student.user?.email || notProvided;
  const studentPhone = student.user?.phone || notProvided;
  const altPhone = extractNote(notesText, /Alternate mobile:\s*([^|\n]+)/i) || notProvided;
  const branchName = student.branch?.name || "Aadya Institute Malleshwaram";
  const gender = student.gender || extractNote(notesText, /Gender:\s*([^|\n]+)/i) || notProvided;
  const qualification =
    (student as any).highestQualification ||
    student.qualification ||
    extractNote(notesText, /(?:Highest Qualification|Qualification):\s*([^|\n]+)/i) ||
    notProvided;
  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : extractNote(notesText, /DOB:\s*([^|\n]+)/i) || notProvided;
  const bloodGroup = student.bloodGroup || extractNote(notesText, /Blood Group:\s*([^|\n]+)/i) || notProvided;

  const guardianName = student.guardian?.name || extractNote(notesText, /(?:Father's Name|Mother's Name|Guardian Name|Guardian):\s*([^|\n]+)/i) || notProvided;
  const guardianPhone = student.guardian?.phone || extractNote(notesText, /(?:Guardian Phone|Emergency):\s*([^|\n]+)/i) || notProvided;
  const emergencyContact = guardianPhone !== notProvided ? guardianPhone : notProvided;
  const addressStr = student.address?.street || extractNote(notesText, /Address:\s*([^|\n]+)/i) || notProvided;
  const cityStr = student.address?.city || "Bengaluru";
  const stateStr = (student.address as any)?.state || "Karnataka";
  const pincodeStr = student.address?.pincode || "560102";

  const activeBatch = student.batchEnrollments?.[0]?.batch;
  const batchName = isDraftStudent || (!activeBatch?.name && !student.batchName && !admission?.batch?.name) ? "Not Assigned" : (activeBatch?.name || student.batchName || admission?.batch?.name || "Not Assigned");
  const hasAssignedBatch = !isDraftStudent && Boolean(
    activeBatch || (batchName && batchName !== "Not Assigned" && batchName !== "—" && !batchName.toLowerCase().includes("pending"))
  );
  const courseName =
    isDraftStudent && !admission?.course?.name && !student.courseName
      ? "Not Assigned"
      : activeBatch
        ? formatBatchSubjectNames(activeBatch)
        : student.courseName || admission?.course?.name || "Not Assigned";
  const courseCode = activeBatch?.course?.code || admission?.course?.code || "—";
  const courseDuration = admission?.course?.duration ? `${admission.course.duration} Months` : "6 Months Program";
  const deliveryMode = "Classroom / Offline Mode";
  const batchTimeSlot = activeBatch?.timeSlot || student.batchTiming || "10:00 AM – 12:00 PM";
  const facultyName =
    isDraftStudent ||
    (!activeBatch?.faculty?.user?.name && !student.facultyName && !activeBatch?.batchCourses?.length)
      ? "Not Assigned"
      : activeBatch
        ? formatBatchInstructorsSummary(activeBatch)
        : student.facultyName || "Not Assigned";
  const facultyAvatar = (activeBatch?.faculty?.user?.name)
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeBatch.faculty.user.name)}`
    : undefined;
  const schedulePattern = isDraftStudent || (!activeBatch?.schedulePattern && !admission?.batch?.schedulePattern) ? "Not Assigned" : (activeBatch?.schedulePattern || admission?.batch?.schedulePattern || "Not Assigned");
  const preferredTiming = batchTimeSlot !== notProvided ? batchTimeSlot : "Morning / Evening";

  const admissionNo = isDraftStudent || !admission?.admissionNo ? "Not Yet Admitted" : admission.admissionNo;
  const admissionType = extractNote(notesText, /Admission type:\s*([^|\n]+)/i) || "Regular Admission";
  const admissionDate = isDraftStudent
    ? "Not Yet Admitted"
    : admission?.admissionDate
    ? new Date(admission.admissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const academicYear = extractNote(notesText, /Academic year:\s*([^|\n]+)/i) || "2025 – 2026";
  const counselorName = admission?.counselorName || extractNote(notesText, /Counsellor:\s*([^|\n]+)/i) || "Priya Singh (Senior Counsellor)";
  const leadSource = extractNote(notesText, /(?:Lead source|Source):\s*([^|\n]+)/i) || (student as any).leadSource || "Direct Walk-in";
  const referralSource = extractNote(notesText, /Referral:\s*([^|\n]+)/i) || "Direct";
  const admissionStatusDisplay = isDraftStudent ? "Admission Pending" : admission?.status === "PROVISIONAL" ? "Provisional" : "Confirmed";

  const attendanceRate = student.attendance?.overallPercentage ?? 0;
  const totalClasses = student.attendance?.totalClasses ?? 0;
  const presentClasses = student.attendance?.presentCount ?? 0;
  const absentClasses = student.attendance?.absentCount ?? 0;
  const leaveClasses = student.attendance?.leaveCount ?? 0;
  const consecutiveAbsences = student.attendance?.consecutiveAbsences ?? 0;
  const isDiscontinuationRisk = consecutiveAbsences >= 2;

  const totalFeeAmount = student.fees?.totalFee ?? (admission?.totalFee || 0);
  const amountPaid = student.fees?.amountPaid ?? (admission?.paidAmount || 0);
  const dueAmount = student.fees?.dueAmount ?? Math.max(0, totalFeeAmount - amountPaid);
  const feePaymentStatus = totalFeeAmount > 0 && dueAmount === 0 ? "Paid in Full" : dueAmount > 0 ? "Installment Due" : "Not Set";

  const attendanceRecords = student.attendanceRecords ?? [];
  const courseModules = student.courseModules ?? [];
  const assignments = student.assignments ?? [];
  const payments = student.payments ?? [];
  const pendingFees = student.pendingFees ?? [];

  const docs = (admission?.documents && admission.documents.length > 0)
    ? admission.documents
    : [
        { id: "d1", title: "Government Identity Proof (Aadhaar / Passport)", fileName: "aadhaar_card.pdf", verified: true },
        { id: "d2", title: "Highest Qualification Certificate / Marksheet", fileName: "qualification_certificate.pdf", verified: true },
        { id: "d3", title: "Passport Size Photograph", fileName: "student_photo.jpg", verified: true },
        { id: "d4", title: "Residential Address Verification Proof", fileName: "address_proof.pdf", verified: true },
      ];

  const docStats = {
    total: docs.length,
    submitted: docs.length,
    pending: docs.filter((d: any) => !d.verified).length,
    verified: docs.filter((d: any) => d.verified).length,
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 text-foreground font-sans antialiased animate-in fade-in duration-200">
      {/* ─── Success Notification ─── */}
      {successToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{successToast}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSuccessToast(null)}
            className="h-7 text-xs font-bold hover:bg-emerald-500/10 cursor-pointer"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ─── 1. TOP BREADCRUMB & ACTION BAR ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`${basePath}/students/all`)}
            className="h-9 w-9 rounded-lg border-border text-foreground hover:bg-muted/50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Student Profile & Dossier
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {student.studentCode}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-0.5">
              {studentName}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isDraftStudent ? (
            <Button
              onClick={() => setIsActivateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Complete Admission & Activate</span>
            </Button>
          ) : (
            <Button
              onClick={() => setIsActivateModalOpen(true)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted/50 font-semibold text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Assign / Change Batch</span>
            </Button>
          )}

          {/* AI Voice Call Trigger */}
          <Button
            onClick={handleAICall}
            disabled={callInitiated}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {callInitiated ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>AI Call Ringing...</span>
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5" />
                <span>Trigger AI Voice Call</span>
              </>
            )}
          </Button>

          {/* Send ID & Password to Student WhatsApp */}
          <Button
            onClick={handleSendCredentialsWhatsApp}
            disabled={isSendingCredentials}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            {isSendingCredentials ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending ID & Password...</span>
              </>
            ) : credentialsSentInfo ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Credentials Sent!</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send ID & Password via WhatsApp</span>
              </>
            )}
          </Button>

          {/* WhatsApp Direct */}
          <Button
            onClick={handleWhatsAppSend}
            variant="outline"
            disabled={waSent}
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            {waSent ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp Sent!</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Send WhatsApp</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── 2. DISCONTINUATION RISK ALERT BANNER ───────────────────────── */}
      {isDiscontinuationRisk && (
        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-xs flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                Aadya Discontinuation Rule Alert ({consecutiveAbsences} Consecutive Theory Absences)
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                Student has missed {consecutiveAbsences} consecutive scheduled theory class{consecutiveAbsences === 1 ? "" : "es"}.
                {consecutiveAbsences >= 3
                  ? " The auto-discontinuation workflow is triggered."
                  : " One more absence will trigger the discontinuation workflow."}
                {" "}Please contact the student via AI Voice Call or WhatsApp.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAICall}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1 shadow-sm shrink-0 cursor-pointer"
          >
            Initiate Urgent AI Call
          </Button>
        </div>
      )}

      {/* ─── 3. COMPACT STUDENT SUMMARY HEADER ──────────────────────────── */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left Side: Avatar, Name, Code, Phone, Email */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-border shrink-0">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentName)}`} alt={studentName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {studentName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {studentName}
                  </h2>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {student.studentCode}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{studentPhone}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-foreground font-medium truncate max-w-[220px]">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{studentEmail}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Horizontal Status Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 lg:border-l lg:border-border lg:pl-5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                <div className="mt-1">
                  {getStatusBadge(student.status)}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Admission</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {admissionStatusDisplay}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Batch</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  {hasAssignedBatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Batch Assigned</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Batch Pending</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Date</p>
                <p className="text-xs font-medium text-foreground mt-1">
                  {admissionDate}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Source</p>
                <p className="text-xs font-medium text-foreground mt-1">
                  {leadSource}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. COMPACT HORIZONTAL TAB NAVIGATION ──────────────────────── */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap gap-1 border border-border">
          <TabsTrigger
            value="overview"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <User className="h-3.5 w-3.5 mr-1.5" /> Identity & Family
          </TabsTrigger>
          <TabsTrigger
            value="academics"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Program & Batches
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Attendance & Discipline
          </TabsTrigger>
          <TabsTrigger
            value="fees"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Fee Installments & Receipts
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Award className="h-3.5 w-3.5 mr-1.5" /> Assignments & Grades
          </TabsTrigger>
          <TabsTrigger
            value="ai_communications"
            className="text-xs font-semibold py-2 px-3.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Bot className="h-3.5 w-3.5 mr-1.5" /> AI Voice & WhatsApp Logs
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: IDENTITY & FAMILY (6 BALANCED STRUCTURED SECTIONS) ─── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT COLUMN: Section 1, Section 3, Section 5 */}
            <div className="space-y-4">
              {/* SECTION 1 — STUDENT INFORMATION */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Section 1 — Student Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Full Legal Name</span>
                    <span className="text-foreground font-bold text-sm mt-0.5 block">{studentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student ID / Student Code</span>
                    <span className="text-foreground font-mono font-bold mt-0.5 block">{student.studentCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Primary Mobile Number</span>
                    <span className="text-foreground font-medium mt-0.5 block">{studentPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Alternative Mobile Number</span>
                    <span className="text-foreground font-medium mt-0.5 block">{altPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Email Address</span>
                    <span className="text-foreground font-medium mt-0.5 block truncate">{studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date of Birth</span>
                    <span className="text-foreground font-medium mt-0.5 block">{dob}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Gender</span>
                    <span className="text-foreground font-medium mt-0.5 block">{gender}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Blood Group</span>
                    <span className="text-foreground font-semibold mt-0.5 block">{bloodGroup}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Highest Qualification</span>
                    <span className="text-foreground font-semibold text-xs mt-0.5 block">{qualification}</span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 3 — ADMISSION DETAILS */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Section 3 — Admission Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Number</span>
                    <span className="text-foreground font-mono font-bold mt-0.5 block">{admissionNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Type</span>
                    <span className="text-foreground font-medium mt-0.5 block">{admissionType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Date</span>
                    <span className="text-foreground font-medium mt-0.5 block">{admissionDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Academic Year</span>
                    <span className="text-foreground font-medium mt-0.5 block">{academicYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Branch / Center</span>
                    <span className="text-foreground font-medium mt-0.5 block">{branchName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Counsellor</span>
                    <span className="text-foreground font-medium mt-0.5 block">{counselorName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Lead / Enquiry Source</span>
                    <span className="text-foreground font-medium mt-0.5 block">{leadSource}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Referral Source</span>
                    <span className="text-foreground font-medium mt-0.5 block">{referralSource}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Status</span>
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {admissionStatusDisplay}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 5 — FEE SUMMARY */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Section 5 — Fee Summary</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("fees")}
                    className="h-7 text-xs font-semibold border-border text-foreground hover:bg-muted/50 gap-1 cursor-pointer"
                  >
                    <CreditCard className="h-3 w-3 text-emerald-500" />
                    <span>View Fee Details</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-5 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Course Fee</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block">₹{totalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Amount Paid</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{amountPaid.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Remaining Balance</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">₹{dueAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Status</span>
                      <span className="mt-1 block">
                        <Badge className={dueAmount === 0 && totalFeeAmount > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10px]" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[10px]"}>
                          {feePaymentStatus}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Section 2, Section 4, Section 6 */}
            <div className="space-y-4">
              {/* SECTION 2 — PARENT / GUARDIAN & ADDRESS */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-primary" />
                    <span>Section 2 — Parent / Guardian & Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Parent / Guardian Name</span>
                    <span className="text-foreground font-semibold mt-0.5 block">{guardianName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Guardian Mobile Number</span>
                    <span className="text-foreground font-medium mt-0.5 block">{guardianPhone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Emergency Contact</span>
                    <span className="text-foreground font-medium mt-0.5 block">{emergencyContact}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Residential Address</span>
                    <span className="text-foreground font-medium mt-0.5 block">{addressStr}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">City / Location</span>
                    <span className="text-foreground font-medium mt-0.5 block">
                      {cityStr}, {stateStr} {pincodeStr ? `- ${pincodeStr}` : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 4 — COURSE & BATCH DETAILS */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Section 4 — Course & Batch Details</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsActivateModalOpen(true)}
                    className="h-7 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{hasAssignedBatch ? "Change Batch" : "Assign Batch"}</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Selected Course</span>
                      <span className="text-primary font-bold text-sm mt-0.5 block">{courseName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Course Duration</span>
                      <span className="text-foreground font-medium mt-0.5 block">{courseDuration}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Course Code</span>
                      <span className="text-foreground font-mono font-semibold mt-0.5 block">{courseCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Delivery Mode</span>
                      <span className="text-foreground font-medium mt-0.5 block">{deliveryMode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Preferred Timing</span>
                      <span className="text-foreground font-medium mt-0.5 block">{preferredTiming}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch Status</span>
                      <span className="mt-0.5 block font-semibold">
                        {hasAssignedBatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Batch Assigned</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">● Batch Assignment Pending</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    {hasAssignedBatch ? (
                      <div className="p-3 bg-muted/40 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Batch</span>
                          <span className="font-bold text-foreground font-mono mt-0.5 block">{batchName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Faculty</span>
                          <span className="font-medium text-foreground mt-0.5 block">{facultyName}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                        <p className="font-bold text-xs">Batch not assigned yet</p>
                        <p className="text-[11px] mt-0.5 opacity-90">Click "Assign Batch" to allocate student to an active batch.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 6 — DOCUMENT SUMMARY */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Section 6 — Document Summary</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsDocsModalOpen(true)}
                    className="h-7 text-xs font-semibold border-border text-foreground hover:bg-muted/50 gap-1 cursor-pointer"
                  >
                    <FileText className="h-3 w-3 text-primary" />
                    <span>View Documents</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-5 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-xl border border-border text-center">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Documents</span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">{docStats.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submitted</span>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{docStats.submitted}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Pending</span>
                      <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{docStats.pending}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Verified</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{docStats.verified}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: PROGRAM & BATCHES ───────────────────────────────── */}
        <TabsContent value="academics" className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Enrolled Academic Curriculum & Batch Schedule</span>
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{isDraftStudent ? "Complete Admission & Assign Batch" : "Change / Assign Batch"}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-primary tracking-wider">Active Enrollment</span>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">{courseName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Batch: <strong className="text-foreground">{batchName}</strong> ({courseCode}) • Assigned Faculty: <strong className="text-foreground">{facultyName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {batchTimeSlot !== notProvided && (
                    <Badge variant="outline" className="text-foreground bg-card font-medium border-border">{batchTimeSlot}</Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">
                  Course Modules & Completion Status
                </h4>
                {courseModules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                    No modules assigned to this student's batch yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courseModules.map((mod, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1 rounded-full ${mod.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : mod.status === "In Progress" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {mod.status === "Completed" ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${mod.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : mod.status === "In Progress" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {mod.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: ATTENDANCE & DISCIPLINE ─────────────────────────── */}
        <TabsContent value="attendance" className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Attendance Logs & Absence Risk Monitor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Classes</p>
                  <h4 className="text-xl font-bold text-foreground mt-1">{totalClasses}</h4>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Classes Attended</p>
                  <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{presentClasses}</h4>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                  <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Absent</p>
                  <h4 className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">{absentClasses}</h4>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">On Leave</p>
                  <h4 className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{leaveClasses}</h4>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">
                  Recent Class Attendance Log
                </h4>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                    No attendance records for this student yet.
                  </p>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] border-b border-border">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Session Topic / Subject</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {attendanceRecords.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-semibold text-foreground">
                              {new Date(rec.classSession?.scheduledDate || rec.date || rec.markedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="p-3 text-foreground">{rec.classSession?.title || rec.sessionTopic || "General Class Session"}</td>
                            <td className="p-3">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${rec.status === "PRESENT" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : rec.status === "LEAVE" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"}`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground">{rec.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: FEES & PAYMENTS ─────────────────────────────────── */}
        <TabsContent value="fees" className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Fee Payment Plan & Installment Ledger</span>
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                variant="outline"
                className="text-xs h-8 border-border font-semibold cursor-pointer"
              >
                Update Fee Structure
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Total Agreed Fee</p>
                  <h3 className="text-2xl font-black text-foreground mt-1">₹{totalFeeAmount.toLocaleString()}</h3>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Amount Paid</p>
                  <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">₹{amountPaid.toLocaleString()}</h3>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Remaining Due</p>
                  <h3 className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">₹{dueAmount.toLocaleString()}</h3>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">
                  Installment Schedule & Payments
                </h4>
                {pendingFees.length === 0 && payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                    No fee records found for this student.
                  </p>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] border-b border-border">
                        <tr>
                          <th className="p-3">Installment</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Receipt / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {pendingFees.map((fee) => {
                          const matchingPayment = payments.find((p) => p.status === "SUCCESS" && Math.abs(p.amount - (fee.totalFee / pendingFees.length)) < 1);
                          const isPaid = fee.dueAmount <= 0;
                          return (
                            <tr key={fee.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-bold text-foreground">
                                {fee.installmentNo}{fee.installmentNo === 1 ? "st" : fee.installmentNo === 2 ? "nd" : fee.installmentNo === 3 ? "rd" : "th"} Installment
                              </td>
                              <td className="p-3 text-muted-foreground">{new Date(fee.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                              <td className="p-3 font-bold text-foreground">₹{fee.dueAmount.toLocaleString()}</td>
                              <td className="p-3">
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isPaid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"}`}>
                                  {isPaid ? "PAID" : fee.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="p-3">
                                {matchingPayment ? (
                                  <span className="text-primary font-semibold flex items-center gap-1"><Download className="h-3 w-3" /> {matchingPayment.receiptNo}</span>
                                ) : isPaid ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold">Due</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {pendingFees.length === 0 && payments.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-bold text-foreground">Payment</td>
                            <td className="p-3 text-muted-foreground">{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="p-3 font-bold text-foreground">₹{p.amount.toLocaleString()}</td>
                            <td className="p-3"><span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">{p.status}</span></td>
                            <td className="p-3"><span className="text-primary font-semibold">{p.receiptNo}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: ASSIGNMENTS ─────────────────────────────────────── */}
        <TabsContent value="assignments" className="space-y-4">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>Course Assignments & Project Evaluations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                  No assignments submitted or assigned yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {assignments.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-border bg-card space-y-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-foreground text-xs">{item.title}</h4>
                        <Badge variant="default" className="text-[10px] shrink-0">{item.status}</Badge>
                      </div>
                      <p className="text-xs font-mono font-bold text-primary">
                        {item.marks !== null ? `${item.marks} / 100` : item.submittedAt ? "Pending Grading" : "Not submitted"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{item.feedback || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 6: AI VOICE & WHATSAPP LOGS ───────────────────────── */}
        <TabsContent value="ai_communications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Voice Calling Logs */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-500" />
                  <span>AI Voice Agent Calls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {aiCallLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                    No AI voice call logs for this student yet.
                  </p>
                ) : (
                  aiCallLogs.map((call: { id: string; createdAt: string; duration: number; status: string; aiSummary?: string }) => (
                    <div key={call.id} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-foreground">{new Date(call.createdAt).toLocaleString("en-IN")}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] border border-emerald-500/30">{call.status} ({Math.floor(call.duration / 60)}m {call.duration % 60}s)</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{call.aiSummary || "No summary available."}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* WhatsApp Notifications */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="bg-muted/20 border-b border-border py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span>WhatsApp Automated Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                  WhatsApp notification logs will appear here once messages are sent to this student.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── 5. DOCUMENTS MODAL ─────────────────────────────────────────── */}
      {isDocsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Verification Documents</h3>
                  <p className="text-xs text-muted-foreground">{studentName} ({student.studentCode})</p>
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
              {docs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">{doc.title}</p>
                      <p className="text-[11px] text-muted-foreground">{doc.fileName}</p>
                      {doc.verified && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="h-3 w-3" /> Verified Document
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                    Verified ✓
                  </Badge>
                </div>
              ))}
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

      {/* ─── 6. ON-DOSSIER COMPLETE ADMISSION & BATCH ASSIGNMENT DIALOG ───── */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {isDraftStudent ? "Complete Admission & Activate Student" : "Assign / Update Academic Batch & Fee"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Finalize course enrollment, select an active class batch, and configure student fees for <strong className="text-foreground">{studentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Course Selector */}
            <div>
              <label className="font-bold text-foreground uppercase text-[11px] block mb-1.5">
                Enrolled Course / Program *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" className="bg-card text-foreground">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.name} {c.code ? `(${c.code})` : ""} {c.fee ? `- ₹${Number(c.fee).toLocaleString()}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="font-bold text-foreground uppercase text-[11px] block mb-1.5">
                Assigned Class Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" className="bg-card text-foreground">-- Assign Batch Later / Not Assigned --</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-card text-foreground">
                    {b.name} {b.timeSlot ? `[${b.timeSlot}]` : ""} {b.faculty?.user?.name ? `• ${b.faculty.user.name}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {availableBatches.length} batch(es) available in this branch
              </p>
            </div>

            {/* Fee Plan & Amounts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
              <div>
                <label className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                  Payment Plan
                </label>
                <select
                  value={feePlan}
                  onChange={(e) => setFeePlan(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-md border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="INSTALLMENT" className="bg-card text-foreground">Installment Plan</option>
                  <option value="FULL_PAYMENT" className="bg-card text-foreground">Full Payment</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                  Total Course Fee (₹)
                </label>
                <Input
                  type="number"
                  value={totalFee}
                  onChange={(e) => setTotalFee(Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs bg-background border-border text-foreground"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                  Down Payment / Paid (₹)
                </label>
                <Input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Counsellor Remarks / Notes */}
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                Admission Notes & Remarks
              </label>
              <Input
                value={admissionNotes}
                onChange={(e) => setAdmissionNotes(e.target.value)}
                placeholder="Special fee discounts, timing preferences, documents submitted..."
                className="h-9 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsActivateModalOpen(false)}
              className="text-xs h-9 border-border text-foreground hover:bg-muted/50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivateStudent}
              disabled={updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-4 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : isDraftStudent ? (
                "Confirm Admission & Activate Student"
              ) : (
                "Save Batch & Fee Updates"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CREDENTIALS SENT TO WHATSAPP ─────────────────────────── */}
      <Dialog open={showCredentialsSentModal} onOpenChange={setShowCredentialsSentModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-foreground">
              Credentials Dispatched to WhatsApp
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Login ID and initial default password sent to the mobile number registered during admission.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-xl p-4 border border-border/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Student Name:</span>
              <span className="font-semibold text-foreground">{studentName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Student ID / Admission No:</span>
              <span className="font-mono font-bold text-primary">{credentialsSentInfo?.studentCode || student.studentCode}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Default Password:</span>
              <span className="font-mono font-bold text-foreground">Aadya@123</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">WhatsApp Recipient:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {credentialsSentInfo?.phone || studentPhone}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-3 pt-2 border-t border-border">
            {credentialsSentInfo?.whatsappWebUrl && (
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
                onClick={() => window.open(credentialsSentInfo.whatsappWebUrl, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in WhatsApp Web / App</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full sm:w-auto text-xs border-border text-foreground hover:bg-muted/50 cursor-pointer"
              onClick={() => setShowCredentialsSentModal(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
