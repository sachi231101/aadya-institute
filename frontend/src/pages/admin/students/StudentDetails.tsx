import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudent, useUpdateStudent } from "../../../hooks/useStudents";
import { useCourses } from "../../../hooks/useCourses";
import { useBatches } from "../../../hooks/useBatches";
import { useContinueStudent } from "@/hooks/useDiscontinuationRisk";
import { batchIncludesCourse, formatBatchInstructorsSummary, formatBatchSubjectNames, getBatchCourseRows } from "@/utils/batch.utils";
import { aiCallingApi } from "../../../services/ai-calling.api";
import { studentsApi } from "../../../services/students.api";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  CircleDot,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiErrorMessage } from "@/utils/api-error";
import {
  CONTINUE_STUDENT_DIALOG_DESCRIPTION,
  continueSuccessMessage,
  studentAllocationPath,
} from "@/utils/continue-student.util";

export const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const [activeTab, setActiveTab] = useState("overview");
  // Admission & Batch Activation Modal State
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [admissionNotes, setAdmissionNotes] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    showAllocationAction?: boolean;
  } | null>(null);
  const [continueNotes, setContinueNotes] = useState("");
  const continueMutation = useContinueStudent();

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: response, isLoading, isError } = useStudent(id);
  const student = response?.data;
  const studentBranchId = student?.branchId || student?.branch?.id || "";

  const { courses } = useCourses({
    status: "ACTIVE",
    branchId: studentBranchId || undefined,
  });
  const updateMutation = useUpdateStudent();

  const { batches } = useBatches({
    courseId: selectedCourseId || undefined,
  });

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

      setSelectedCourseId(initialCourseId);
      setSelectedBatchId(initialBatchId);
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
          notes: admissionNotes || undefined,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["student", id] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });

      setIsActivateModalOpen(false);
      setSuccessToast({
        message: isDraftStudent
          ? "Admission confirmed and student is now active."
          : "Batch updated.",
      });
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setDialogError(err?.response?.data?.message || "Failed to activate student admission.");
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "inline-flex text-xs font-medium px-2 py-0.5 rounded-md border";
    if (isDraftStudent) {
      return <span className={`${base} bg-amber-500/10 text-amber-700 border-amber-500/20`}>Pending</span>;
    }
    switch (status) {
      case "ACTIVE":
        return <span className={`${base} bg-emerald-500/10 text-emerald-700 border-emerald-500/20`}>Active</span>;
      case "ON_LEAVE":
        return <span className={`${base} bg-amber-500/10 text-amber-700 border-amber-500/20`}>On leave</span>;
      case "COMPLETED":
        return <span className={`${base} bg-blue-500/10 text-blue-700 border-blue-500/20`}>Completed</span>;
      case "DISCONTINUED":
        return <span className={`${base} bg-rose-500/10 text-rose-700 border-rose-500/20`}>Discontinued</span>;
      case "CANCELLED":
        return <span className={`${base} bg-muted text-muted-foreground border-border`}>Cancelled</span>;
      default:
        return <span className={`${base} bg-muted text-muted-foreground border-border`}>{status}</span>;
    }
  };

  // ─── Send ID & Password to Student WhatsApp ───────────────────────
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);
  const [credentialsSentInfo, setCredentialsSentInfo] = useState<{
    phone: string;
    studentCode: string;
    temporaryPassword: string;
    queued: boolean;
    skipReason: string | null;
  } | null>(null);
  const [showCredentialsSentModal, setShowCredentialsSentModal] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  const handleSendCredentialsWhatsApp = async () => {
    if (!id) return;
    setIsSendingCredentials(true);
    setCredentialsError(null);
    try {
      const res = await studentsApi.sendCredentialsWhatsApp(id);
      const result = res.data;
      if (!result?.sent) {
        setCredentialsError(result?.skipReason || res.message || "WhatsApp did not send the login ID and password.");
        return;
      }
      setCredentialsSentInfo({
        phone: result.recipient.phone,
        studentCode: result.recipient.studentCode,
        temporaryPassword: result.temporaryPassword,
        queued: true,
        skipReason: null,
      });
      setShowCredentialsSentModal(true);
      await queryClient.invalidateQueries({ queryKey: ["student", id] });
    } catch (err: any) {
      setCredentialsError(err?.response?.data?.message || "Could not send login credentials.");
    } finally {
      setIsSendingCredentials(false);
    }
  };

  const handleConfirmContinue = async () => {
    if (!id) return;
    setDialogError(null);
    const notes = continueNotes.trim();
    try {
      const res = await continueMutation.mutateAsync({
        id,
        notes: notes || undefined,
      });
      const result = res.data;
      const restoredMsg = continueSuccessMessage({
        batchRestored: Boolean(result?.batchRestored),
        batchCode: result?.batchCode,
      });
      const needsAllocation = !result?.batchRestored;
      setSuccessToast({
        message: `Student reactivated.${restoredMsg}`,
        showAllocationAction: needsAllocation,
      });
      setContinueNotes("");
      setIsContinueDialogOpen(false);
      setTimeout(() => setSuccessToast(null), needsAllocation ? 8000 : 5000);
    } catch (err) {
      setDialogError(getApiErrorMessage(err, "Failed to continue student."));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28 text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-16 max-w-md mx-auto text-foreground">
        <h3 className="text-lg font-semibold mb-2">Student not found</h3>
        <p className="text-muted-foreground mb-6 text-sm">This student record could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate(`${basePath}/students/all`)}>
          Back to students
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
  const branchName = student.branch?.name || notProvided;
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
  const cityStr = student.address?.city || notProvided;
  const stateStr = student.address?.state || notProvided;
  const pincodeStr = student.address?.pincode || "";
  const locationStr = [cityStr !== notProvided ? cityStr : "", stateStr !== notProvided ? stateStr : "", pincodeStr]
    .filter(Boolean)
    .join(", ") || notProvided;

  const activeBatch = student.batchEnrollments?.[0]?.batch;
  const batchName = isDraftStudent || (!activeBatch?.name && !student.batchName && !admission?.batch?.name) ? "Not Assigned" : (activeBatch?.name || student.batchName || admission?.batch?.name || "Not Assigned");
  const hasAssignedBatch = !isDraftStudent && Boolean(
    activeBatch || (batchName && batchName !== "Not Assigned" && batchName !== "—" && !batchName.toLowerCase().includes("pending"))
  );

  const enrolledCourses = (() => {
    const byId = new Map<string, { id: string; name: string; code: string; batchName?: string }>();
    const add = (course?: { id?: string; name?: string; code?: string } | null, batchLabel?: string) => {
      if (!course?.id || !course.name) return;
      if (byId.has(course.id)) return;
      byId.set(course.id, {
        id: course.id,
        name: course.name,
        code: course.code || "",
        batchName: batchLabel,
      });
    };

    for (const enrollment of student.batchEnrollments || []) {
      const batch = enrollment.batch;
      if (!batch) continue;
      const rows = getBatchCourseRows(batch as Parameters<typeof getBatchCourseRows>[0]);
      if (rows.length > 0) {
        for (const row of rows) add(row.course, batch.name);
      } else {
        add(batch.course, batch.name);
      }
    }

    for (const adm of student.admissions || []) {
      add(adm.course, adm.batch?.name);
    }

    if (student.courses?.length) {
      for (const c of student.courses) add(c);
    }

    return Array.from(byId.values());
  })();

  const courseName =
    isDraftStudent && enrolledCourses.length === 0 && !student.courseName
      ? "Not Assigned"
      : enrolledCourses.length > 0
        ? enrolledCourses.map((c) => c.name).join(", ")
        : activeBatch
          ? formatBatchSubjectNames(activeBatch)
          : student.courseName || admission?.course?.name || "Not Assigned";
  const courseCode =
    enrolledCourses.length > 1
      ? `${enrolledCourses.length} courses`
      : enrolledCourses[0]?.code || activeBatch?.course?.code || admission?.course?.code || "—";
  const primaryCourse = admission?.course || activeBatch?.course;
  const courseDuration = primaryCourse?.duration ? `${primaryCourse.duration} months` : notProvided;
  const deliveryMode = primaryCourse?.mode || notProvided;
  const batchTimeSlot = activeBatch?.timeSlot || student.batchTiming || notProvided;
  const facultyName =
    isDraftStudent ||
    (!activeBatch?.faculty?.user?.name && !student.facultyName && !activeBatch?.batchCourses?.length)
      ? "Not Assigned"
      : activeBatch
        ? formatBatchInstructorsSummary(activeBatch)
        : student.facultyName || "Not Assigned";
  const schedulePattern = isDraftStudent || (!activeBatch?.schedulePattern && !admission?.batch?.schedulePattern) ? "Not Assigned" : (activeBatch?.schedulePattern || admission?.batch?.schedulePattern || "Not Assigned");
  const preferredTiming = batchTimeSlot !== notProvided ? batchTimeSlot : notProvided;

  const admissionNo = isDraftStudent || !admission?.admissionNo ? "Not Yet Admitted" : admission.admissionNo;
  const admissionType = extractNote(notesText, /Admission type:\s*([^|\n]+)/i) || notProvided;
  const admissionDate = isDraftStudent
    ? "Not Yet Admitted"
    : admission?.admissionDate
    ? new Date(admission.admissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const academicYear = admission?.admissionDate
    ? String(new Date(admission.admissionDate).getFullYear())
    : notProvided;
  const counselorName = student.counsellorName || extractNote(notesText, /Counsellor:\s*([^|\n]+)/i) || notProvided;
  const leadSource = student.leadSource || extractNote(notesText, /(?:Lead source|Source):\s*([^|\n]+)/i) || notProvided;
  const referralSource = extractNote(notesText, /Referral:\s*([^|\n]+)/i) || notProvided;
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

  return (
    <PageContainer className="text-foreground animate-in fade-in duration-200">
      {successToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-medium">{successToast.message}</span>
          <div className="flex items-center gap-2 shrink-0">
            {successToast.showAllocationAction ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-600/40 text-emerald-800 hover:bg-emerald-500/10"
                onClick={() =>
                  navigate(
                    studentAllocationPath(basePath, {
                      search: student?.studentCode || student?.user?.name || "",
                    })
                  )
                }
              >
                Open Student Allocation
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setSuccessToast(null)} className="h-7 text-xs">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`${basePath}/students/all`)}
            className="h-9 w-9 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{studentName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono">{student.studentCode}</span>
              {studentPhone !== notProvided ? ` · ${studentPhone}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && student.status === "DISCONTINUED" && (
            <Button
              size="sm"
              onClick={() => {
                setDialogError(null);
                setContinueNotes("");
                setIsContinueDialogOpen(true);
              }}
              disabled={continueMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Continue
            </Button>
          )}
          <PermissionGate itemKey="students.all" mode="write">
            {isDraftStudent ? (
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Complete admission
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsActivateModalOpen(true)}>
                Change batch
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSendCredentialsWhatsApp}
              disabled={isSendingCredentials}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSendingCredentials ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Sending...
                </>
              ) : credentialsSentInfo?.queued ? (
                "Credentials sent"
              ) : (
                "Send login via WhatsApp"
              )}
            </Button>
          </PermissionGate>
          {credentialsError && (
            <p className="basis-full text-xs text-rose-600">{credentialsError}</p>
          )}
        </div>
      </div>

      {isDiscontinuationRisk && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3.5">
          <p className="text-sm font-semibold text-rose-700">
            Attendance risk — {consecutiveAbsences} consecutive theory absences
          </p>
          <p className="text-xs text-rose-600/90 mt-1">
            {consecutiveAbsences >= 3
              ? "Discontinuation review is recommended."
              : "One more absence may trigger discontinuation review."}
          </p>
        </div>
      )}

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(student.status)}</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admission</p>
              <p className="text-sm font-medium text-foreground mt-1">{admissionStatusDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batch</p>
              <p className={`text-sm font-medium mt-1 ${hasAssignedBatch ? "text-emerald-700" : "text-amber-700"}`}>
                {hasAssignedBatch ? batchName : "Not assigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admission date</p>
              <p className="text-sm font-medium text-foreground mt-1">{admissionDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground mt-1 truncate">{studentEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg h-auto flex flex-wrap gap-1 border border-border w-full sm:w-auto">
          <TabsTrigger value="overview" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="academics" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Course & batch
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="fees" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Fees
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="ai_communications" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            Messages
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
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Student information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-xs">Full name</span>
                    <span className="text-foreground font-bold text-sm mt-0.5 block">{studentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Student code</span>
                    <span className="text-foreground font-mono font-bold mt-0.5 block">{student.studentCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Mobile</span>
                    <span className="text-foreground font-medium mt-0.5 block">{studentPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Alternate mobile</span>
                    <span className="text-foreground font-medium mt-0.5 block">{altPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Email</span>
                    <span className="text-foreground font-medium mt-0.5 block truncate">{studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Date of Birth</span>
                    <span className="text-foreground font-medium mt-0.5 block">{dob}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Gender</span>
                    <span className="text-foreground font-medium mt-0.5 block">{gender}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Blood Group</span>
                    <span className="text-foreground font-semibold mt-0.5 block">{bloodGroup}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-xs">Highest Qualification</span>
                    <span className="text-foreground font-semibold text-xs mt-0.5 block">{qualification}</span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 3 — ADMISSION DETAILS */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Admission details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-xs">Admission Number</span>
                    <span className="text-foreground font-mono font-bold mt-0.5 block">{admissionNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Admission Type</span>
                    <span className="text-foreground font-medium mt-0.5 block">{admissionType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Admission Date</span>
                    <span className="text-foreground font-medium mt-0.5 block">{admissionDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Academic Year</span>
                    <span className="text-foreground font-medium mt-0.5 block">{academicYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Branch / Center</span>
                    <span className="text-foreground font-medium mt-0.5 block">{branchName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Assigned Counsellor</span>
                    <span className="text-foreground font-medium mt-0.5 block">{counselorName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Lead / Enquiry Source</span>
                    <span className="text-foreground font-medium mt-0.5 block">{leadSource}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Referral Source</span>
                    <span className="text-foreground font-medium mt-0.5 block">{referralSource}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-xs">Admission Status</span>
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {admissionStatusDisplay}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 5 — FEE SUMMARY */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Fee summary
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("fees")}
                    className="h-7 text-xs"
                  >
                    View fees
                  </Button>
                </CardHeader>
                <CardContent className="p-5 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                    <div>
                      <span className="text-muted-foreground block text-xs">Total Course Fee</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block">₹{totalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Amount Paid</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{amountPaid.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Remaining Balance</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">₹{dueAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Payment Status</span>
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
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Guardian & address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-xs">Parent / Guardian Name</span>
                    <span className="text-foreground font-semibold mt-0.5 block">{guardianName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Guardian Mobile Number</span>
                    <span className="text-foreground font-medium mt-0.5 block">{guardianPhone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-xs">Emergency Contact</span>
                    <span className="text-foreground font-medium mt-0.5 block">{emergencyContact}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-xs">Residential Address</span>
                    <span className="text-foreground font-medium mt-0.5 block">{addressStr}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-xs">City / Location</span>
                    <span className="text-foreground font-medium mt-0.5 block">
                      {locationStr}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 4 — COURSE & BATCH DETAILS */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="bg-muted/20 border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Course & batch
                  </CardTitle>
                  <PermissionGate itemKey="students.all" mode="write">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsActivateModalOpen(true)}
                    className="h-7 text-xs"
                  >
                    {hasAssignedBatch ? "Change batch" : "Assign batch"}
                  </Button>
                  </PermissionGate>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block text-xs">
                        Selected Course{enrolledCourses.length > 1 ? "s" : ""}
                      </span>
                      {enrolledCourses.length > 1 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {enrolledCourses.map((c) => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="text-[11px] font-semibold border-primary/30 text-primary bg-primary/5"
                            >
                              {c.name}
                              {c.code ? ` (${c.code})` : ""}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-primary font-bold text-sm mt-0.5 block">{courseName}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Course Duration</span>
                      <span className="text-foreground font-medium mt-0.5 block">{courseDuration}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Course Code</span>
                      <span className="text-foreground font-mono font-semibold mt-0.5 block">{courseCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Delivery Mode</span>
                      <span className="text-foreground font-medium mt-0.5 block">{deliveryMode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Preferred Timing</span>
                      <span className="text-foreground font-medium mt-0.5 block">{preferredTiming}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Batch Status</span>
                      <span className="mt-0.5 block font-semibold">
                        {hasAssignedBatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Assigned</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Pending</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    {hasAssignedBatch ? (
                      <div className="p-3 bg-muted/40 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-xs">Assigned Batch</span>
                          <span className="font-bold text-foreground font-mono mt-0.5 block">{batchName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Faculty</span>
                          <span className="font-medium text-foreground mt-0.5 block">{facultyName}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                        <p className="font-medium text-sm">Batch not assigned yet</p>
                        <p className="text-xs mt-0.5 opacity-90">Use Assign batch to place this student in a class.</p>
                      </div>
                    )}
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
              <CardTitle className="text-sm font-semibold text-foreground">
                Course & batch
              </CardTitle>
              <PermissionGate itemKey="students.all" mode="write">
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
              >
                {isDraftStudent ? "Complete admission" : "Change batch"}
              </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground">Enrollment</span>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">
                    {enrolledCourses.length > 1
                      ? `${enrolledCourses.length} Courses Package`
                      : courseName}
                  </h3>
                  {enrolledCourses.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {enrolledCourses.map((c) => (
                        <Badge
                          key={c.id}
                          variant="outline"
                          className="text-[11px] font-semibold border-primary/30 text-primary bg-card"
                        >
                          {c.name}
                          {c.code ? ` · ${c.code}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Batch: <strong className="text-foreground">{batchName}</strong>
                    {schedulePattern !== "Not Assigned" ? ` • ${schedulePattern}` : ""}
                    {enrolledCourses.length <= 1 ? ` (${courseCode})` : ""} • Assigned Faculty:{" "}
                    <strong className="text-foreground">{facultyName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {batchTimeSlot !== notProvided && (
                    <Badge variant="outline" className="text-foreground bg-card font-medium border-border">{batchTimeSlot}</Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Modules
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
              <CardTitle className="text-sm font-semibold text-foreground">
                Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Classes</p>
                  <h4 className="text-xl font-bold text-foreground mt-1">{totalClasses}</h4>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-xs text-muted-foreground">Present</p>
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
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Recent attendance
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
                            <td className="p-3 text-foreground">{rec.classSession?.title || rec.sessionTopic || "Class"}</td>
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
              <CardTitle className="text-sm font-semibold text-foreground">
                Fees
              </CardTitle>
              <PermissionGate itemKey="students.all" mode="write">
              <Button
                size="sm"
                onClick={() => navigate(`${basePath}/fees/students/${id}`)}
                variant="outline"
                className="text-xs h-8 border-border font-semibold cursor-pointer"
              >
                Open Fee Record
              </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total fee</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">₹{totalFeeAmount.toLocaleString()}</h3>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Amount Paid</p>
                  <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">₹{amountPaid.toLocaleString()}</h3>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Remaining Due</p>
                  <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">₹{dueAmount.toLocaleString()}</h3>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Installments
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
              <CardTitle className="text-sm font-semibold text-foreground">
                Assignments
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
                        <Badge variant="default" className="text-[10px] shrink-0">{item.submissionStatus || item.status}</Badge>
                      </div>
                      <p className="text-xs font-mono font-bold text-primary">
                        {item.marks !== null
                          ? `${item.marks} / ${item.maxMarks ?? 100}`
                          : item.submittedAt
                            ? "Pending Grading"
                            : "Not submitted"}
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
                <CardTitle className="text-sm font-semibold text-foreground">
                  AI calls
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
                <CardTitle className="text-sm font-semibold text-foreground">
                  WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {(student.whatsappNotifications || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                    No WhatsApp messages have been sent to this student.
                  </p>
                ) : (
                  student.whatsappNotifications?.map((note) => (
                    <div key={note.id} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-foreground">{new Date(note.createdAt).toLocaleString("en-IN")}</span>
                        <Badge variant="outline" className="text-[10px]">{note.status}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{note.event || "WhatsApp"}{note.skipReason ? ` — ${note.skipReason}` : ""}{note.errorMessage ? ` — ${note.errorMessage}` : ""}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── ON-DOSSIER COMPLETE ADMISSION & BATCH ASSIGNMENT DIALOG ───── */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {isDraftStudent ? "Complete admission" : "Change batch"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select course and batch for {studentName}. Fees are managed separately.
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
              <label className="font-medium text-foreground text-xs block mb-1.5">
                Course *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" className="bg-card text-foreground">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="font-medium text-foreground text-xs block mb-1.5">
                Batch
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

            {/* Counsellor Remarks / Notes */}
            <div>
              <label className="font-medium text-muted-foreground text-xs block mb-1">
                Notes
              </label>
              <Input
                value={admissionNotes}
                onChange={(e) => setAdmissionNotes(e.target.value)}
                placeholder="Batch timing or other notes"
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
                "Confirm admission"
              ) : (
                "Save batch"
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
              {credentialsSentInfo?.queued ? "Login ID and password sent" : "WhatsApp did not send"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {credentialsSentInfo?.queued
                ? "The student's login ID and new password were sent to their WhatsApp number."
                : credentialsSentInfo?.skipReason || "WhatsApp did not send the message."}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-xl p-4 border border-border/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Student Name:</span>
              <span className="font-semibold text-foreground">{studentName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Student ID:</span>
              <span className="font-mono font-bold text-primary">{credentialsSentInfo?.studentCode || student.studentCode}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">New password:</span>
              <span className="font-mono font-bold text-foreground">{credentialsSentInfo?.temporaryPassword}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">Mobile:</span>
              <span className="font-mono font-semibold text-foreground">
                {credentialsSentInfo?.phone || studentPhone}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-3 pt-2 border-t border-border">
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

      {/* ─── MODAL: CONTINUE DISCONTINUED STUDENT ─────────────────────────── */}
      <Dialog
        open={isContinueDialogOpen}
        onOpenChange={(open) => {
          if (!continueMutation.isPending) {
            setIsContinueDialogOpen(open);
            if (!open) {
              setDialogError(null);
              setContinueNotes("");
            }
          }
        }}
      >
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Continue student?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {CONTINUE_STUDENT_DIALOG_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="continue-notes-detail" className="text-xs font-semibold">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="continue-notes-detail"
              value={continueNotes}
              onChange={(e) => setContinueNotes(e.target.value)}
              placeholder="Optional note for this reactivation"
              rows={3}
              maxLength={1000}
              disabled={continueMutation.isPending}
              className="text-sm resize-none"
            />
          </div>
          {dialogError && (
            <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
              {dialogError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={continueMutation.isPending}
              onClick={() => setIsContinueDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={continueMutation.isPending}
              onClick={handleConfirmContinue}
            >
              {continueMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Continuing...
                </>
              ) : (
                "Continue student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
