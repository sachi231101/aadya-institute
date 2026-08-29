import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudent, useUpdateStudent } from "../../../hooks/useStudents";
import { useCourses } from "../../../hooks/useCourses";
import { useBatches } from "../../../hooks/useBatches";
import { aiCallingApi } from "../../../services/ai-calling.api";
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
  Edit,
  Download,
  Award,
  CircleDot,
  Check,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      if (selectedCourseId && b.courseId && b.courseId !== selectedCourseId) return false;
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
      // clear the search param
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

      // Refetch student data
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
        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Draft Student
        </span>
      );
    }
    switch (status) {
      case "ACTIVE":
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active Student
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> On Approved Leave
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" /> Graduated
          </span>
        );
      case "DISCONTINUED":
        return (
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Discontinued
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
        <span className="ml-3 text-slate-600 font-medium">Loading student records...</span>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4 opacity-70" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Student Not Found</h3>
        <p className="text-slate-500 mb-6 text-sm">
          Could not locate student with ID: <span className="font-mono text-slate-800">{id}</span>
        </p>
        <Button variant="outline" onClick={() => navigate(`${basePath}/students/all`)}>
          Back to Students
        </Button>
      </div>
    );
  }

  const notProvided = "Not provided";

  const studentName = student.user?.name || student.studentCode;
  const studentEmail = student.user?.email || notProvided;
  const studentPhone = student.user?.phone || notProvided;
  const branchName = student.branch?.name || notProvided;
  const gender = student.gender || notProvided;
  const qualification = student.qualification || notProvided;
  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : notProvided;
  const bloodGroup = student.bloodGroup || notProvided;

  const guardianName = student.guardian?.name || notProvided;
  const guardianRelation = student.guardian?.relation || notProvided;
  const guardianPhone = student.guardian?.phone || notProvided;
  const addressStr = student.address?.street || notProvided;
  const cityStr = student.address?.city || "";
  const pincodeStr = student.address?.pincode || "";

  const activeBatch = student.batchEnrollments?.[0]?.batch;
  const courseName = activeBatch?.course?.name || student.courseName || admission?.course?.name || notProvided;
  const courseCode = activeBatch?.course?.code || admission?.course?.code || "—";
  const batchName = activeBatch?.name || student.batchName || notProvided;
  const batchTimeSlot = activeBatch?.timeSlot || student.batchTiming || notProvided;
  const facultyName = activeBatch?.faculty?.user?.name || student.facultyName || notProvided;
  const schedulePattern = activeBatch?.schedulePattern || "—";

  const attendanceRate = student.attendance?.overallPercentage ?? 0;
  const totalClasses = student.attendance?.totalClasses ?? 0;
  const presentClasses = student.attendance?.presentCount ?? 0;
  const absentClasses = student.attendance?.absentCount ?? 0;
  const leaveClasses = student.attendance?.leaveCount ?? 0;
  const consecutiveAbsences = student.attendance?.consecutiveAbsences ?? 0;
  const isDiscontinuationRisk = consecutiveAbsences >= 2;

  const totalFeeAmount = student.fees?.totalFee ?? 0;
  const amountPaid = student.fees?.amountPaid ?? 0;
  const dueAmount = student.fees?.dueAmount ?? 0;
  const feePlanDisplay = student.fees?.feePlan || "—";
  const nextDueDate = student.fees?.nextDueDate
    ? new Date(student.fees.nextDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const attendanceRecords = student.attendanceRecords ?? [];
  const courseModules = student.courseModules ?? [];
  const assignments = student.assignments ?? [];
  const payments = student.payments ?? [];
  const pendingFees = student.pendingFees ?? [];
  const paidPercent = totalFeeAmount > 0 ? Math.min(100, Math.round((amountPaid / totalFeeAmount) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* ─── Success Notification ─── */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successToast}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 h-7 text-xs font-bold hover:bg-emerald-100"
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
            className="h-9 w-9 rounded-lg border-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student Profile & Dossier
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-bold text-[#1769AA] bg-[#1769AA]/10 px-2 py-0.5 rounded">
                {student.studentCode}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{studentName}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Complete Admission / Activate Button */}
          {isDraftStudent ? (
            <Button
              onClick={() => setIsActivateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
              <span>Complete Admission & Activate</span>
            </Button>
          ) : (
            <Button
              onClick={() => setIsActivateModalOpen(true)}
              variant="outline"
              className="border-[#1769AA]/40 text-[#1769AA] hover:bg-[#1769AA]/10 font-semibold text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Assign / Change Batch</span>
            </Button>
          )}

          {/* AI Voice Call Trigger */}
          <Button
            onClick={handleAICall}
            disabled={callInitiated}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 shadow-sm flex items-center gap-1.5"
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

          {/* WhatsApp Direct */}
          <Button
            onClick={handleWhatsAppSend}
            variant="outline"
            disabled={waSent}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {waSent ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Sent!</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>Send WhatsApp</span>
              </>
            )}
          </Button>

          {/* Edit Full Profile */}
          <Button
            onClick={() => navigate(`${basePath}/students/${student.id}/edit`)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-medium text-xs px-3 py-1.5 shadow-sm flex items-center gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Full Profile</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. DISCONTINUATION RISK ALERT BANNER ───────────────────────── */}
      {isDiscontinuationRisk && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                Aadya Discontinuation Rule Alert ({consecutiveAbsences} Consecutive Theory Absences)
              </h4>
              <p className="text-xs text-red-700 mt-1">
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
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1 shadow-sm shrink-0"
          >
            Initiate Urgent AI Call
          </Button>
        </div>
      )}

      {/* ─── 3. HERO DOSSIER CARD & QUICK METRICS ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 border-4 border-slate-100 shadow-md mb-3">
              <AvatarFallback className="bg-gradient-to-br from-[#1769AA] to-indigo-700 text-white font-bold text-2xl">
                {studentName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-lg font-bold text-slate-900">{studentName}</h2>
            <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">{student.studentCode}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {getStatusBadge(student.status)}
              <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                📍 {branchName}
              </span>
            </div>

            {isDraftStudent && (
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Complete Admission & Activate
              </Button>
            )}

            <div className="w-full border-t border-slate-100 mt-5 pt-4 space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="h-3.5 w-3.5" /> Mobile
                </span>
                <span className="font-semibold text-slate-800">{studentPhone}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">{studentEmail}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <GraduationCap className="h-3.5 w-3.5" /> Program
                </span>
                <span className="font-semibold text-[#1769AA] truncate max-w-[150px]">{courseName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="h-3.5 w-3.5" /> Enrolled
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(student.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3 KPI Summary Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Attendance KPI */}
          <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Attendance Rate</span>
                <div className={`p-1.5 rounded-lg ${totalClasses === 0 ? "bg-slate-50 text-slate-500" : attendanceRate >= 85 ? "bg-emerald-50 text-emerald-600" : attendanceRate >= 70 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">{attendanceRate}%</h3>
                <span className="text-xs text-slate-500 font-medium">({presentClasses}/{totalClasses} Classes)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${totalClasses === 0 ? "bg-slate-300" : attendanceRate >= 85 ? "bg-emerald-500" : attendanceRate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${totalClasses === 0 ? 0 : attendanceRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {totalClasses === 0
                  ? "No attendance records yet"
                  : absentClasses === 0
                  ? "Perfect attendance record"
                  : `${absentClasses} classes missed`}
              </p>
            </CardContent>
          </Card>

          {/* Fees KPI */}
          <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Fee Account Status</span>
                <div className={`p-1.5 rounded-lg ${dueAmount === 0 && totalFeeAmount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">₹{amountPaid.toLocaleString()}</h3>
                <span className="text-xs text-slate-500 font-medium">of ₹{totalFeeAmount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1769AA]"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-slate-500">
                  Balance: <strong className={dueAmount > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>₹{dueAmount.toLocaleString()}</strong>
                </span>
                <Badge variant={dueAmount === 0 && totalFeeAmount > 0 ? "default" : dueAmount > 0 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {totalFeeAmount === 0 ? "Not set" : dueAmount === 0 ? "Paid in Full" : "Installment Due"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Batch KPI */}
          <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Batch</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-[#1769AA]">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 truncate" title={batchName}>
                {batchName !== notProvided ? batchName : "Batch Not Assigned"}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Faculty: <strong className="text-slate-700">{facultyName}</strong></p>
              <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100 text-[11px] flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3 text-[#1769AA]" /> {batchTimeSlot !== notProvided ? batchTimeSlot : "Timing not set"}
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                  {activeBatch?.status || (isDraftStudent ? "DRAFT" : student.status)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── 4. INTERACTIVE TABBED DOSSIER ────────────────────────────── */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <User className="h-3.5 w-3.5 mr-1.5" /> Identity & Family
          </TabsTrigger>
          <TabsTrigger value="academics" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Program & Batches
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Attendance & Discipline
          </TabsTrigger>
          <TabsTrigger value="fees" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Fee Installments & Receipts
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <Award className="h-3.5 w-3.5 mr-1.5" /> Assignments & Grades
          </TabsTrigger>
          <TabsTrigger value="ai_communications" className="text-xs font-semibold py-2 px-4 data-[state=active]:bg-white data-[state=active]:text-[#1769AA] data-[state=active]:shadow-sm">
            <Bot className="h-3.5 w-3.5 mr-1.5" /> AI Voice & WhatsApp Logs
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: IDENTITY & FAMILY ───────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Details */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1769AA]" />
                  Personal Demographics & Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Full Legal Name</p>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">{studentName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Student Code</p>
                  <p className="font-mono text-slate-800 font-bold text-sm mt-0.5">{student.studentCode}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Date of Birth</p>
                  <p className="text-slate-800 font-medium mt-0.5">{dob}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Gender</p>
                  <p className="text-slate-800 font-medium mt-0.5">{gender}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Blood Group</p>
                  <p className="text-slate-800 font-medium mt-0.5">{bloodGroup}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Highest Qualification</p>
                  <p className="text-slate-800 font-medium mt-0.5">{qualification}</p>
                </div>
              </CardContent>
            </Card>

            {/* Guardian & Contact */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-[#1769AA]" />
                  Parent, Guardian & Address Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Parent / Guardian</p>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">
                    {guardianName}
                    {guardianRelation !== notProvided ? ` (${guardianRelation})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Guardian Mobile</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{guardianPhone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-semibold uppercase">Residential Address</p>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {addressStr}{cityStr ? `, ${cityStr}` : ""}{pincodeStr ? ` - ${pincodeStr}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: PROGRAM & BATCHES ───────────────────────────────── */}
        <TabsContent value="academics" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#1769AA]" />
                Enrolled Academic Curriculum & Batch Schedule
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-semibold h-8 flex items-center gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {isDraftStudent ? "Complete Admission & Assign Batch" : "Change / Assign Batch"}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#1769AA] tracking-wider">Active Enrollment</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{courseName}</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Batch: <strong className="text-slate-800">{batchName}</strong> ({courseCode}) • Assigned Faculty: <strong className="text-slate-800">{facultyName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {schedulePattern !== "—" && (
                    <Badge className="bg-[#1769AA] text-white">{schedulePattern}</Badge>
                  )}
                  {batchTimeSlot !== notProvided && (
                    <Badge variant="outline" className="text-slate-700 bg-white font-medium">{batchTimeSlot}</Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Course Modules & Completion Status
                </h4>
                {courseModules.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    No modules assigned to this student's batch yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courseModules.map((mod, i) => (
                      <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1 rounded-full ${mod.status === "Completed" ? "bg-emerald-100 text-emerald-600" : mod.status === "In Progress" ? "bg-blue-100 text-[#1769AA]" : "bg-slate-100 text-slate-400"}`}>
                            {mod.status === "Completed" ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-800">{mod.name}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${mod.status === "Completed" ? "bg-emerald-50 text-emerald-700" : mod.status === "In Progress" ? "bg-blue-50 text-[#1769AA]" : "bg-slate-100 text-slate-500"}`}>
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1769AA]" />
                Attendance Logs & Absence Risk Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Total Classes</p>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">{totalClasses}</h4>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Classes Attended</p>
                  <h4 className="text-xl font-bold text-emerald-800 mt-1">{presentClasses}</h4>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                  <p className="text-[10px] font-bold uppercase text-red-700">Absent</p>
                  <h4 className="text-xl font-bold text-red-800 mt-1">{absentClasses}</h4>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-700">On Leave</p>
                  <h4 className="text-xl font-bold text-amber-800 mt-1">{leaveClasses}</h4>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Recent Class Attendance Log
                </h4>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                    No attendance records for this student yet.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Session Topic / Subject</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {attendanceRecords.map((rec: any) => (
                          <tr key={rec.id}>
                            <td className="p-3 font-semibold text-slate-800">
                              {new Date(rec.classSession?.scheduledDate || rec.date || rec.markedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="p-3 text-slate-700">{rec.classSession?.title || rec.sessionTopic || "General Class Session"}</td>
                            <td className="p-3">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${rec.status === "PRESENT" ? "bg-emerald-100 text-emerald-800" : rec.status === "LEAVE" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{rec.remarks || "—"}</td>
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#1769AA]" />
                Fee Payment Plan & Installment Ledger
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsActivateModalOpen(true)}
                variant="outline"
                className="text-xs h-8 border-slate-300 font-semibold"
              >
                Update Fee Structure
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Agreed Fee</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totalFeeAmount.toLocaleString()}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Plan: {feePlanDisplay}</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <p className="text-xs font-semibold text-emerald-700 uppercase">Amount Paid</p>
                  <h3 className="text-2xl font-black text-emerald-800 mt-1">₹{amountPaid.toLocaleString()}</h3>
                  <p className="text-[11px] text-emerald-600 mt-1">{paidPercent}% Cleared</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
                  <p className="text-xs font-semibold text-amber-700 uppercase">Remaining Due</p>
                  <h3 className="text-2xl font-black text-amber-800 mt-1">₹{dueAmount.toLocaleString()}</h3>
                  <p className="text-[11px] text-amber-600 mt-1">{nextDueDate ? `Next Due: ${nextDueDate}` : "No pending due date"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Installment Schedule & Payments
                </h4>
                {pendingFees.length === 0 && payments.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    No fee records found for this student.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Installment</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Receipt / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {pendingFees.map((fee) => {
                          const matchingPayment = payments.find((p) => p.status === "SUCCESS" && Math.abs(p.amount - (fee.totalFee / pendingFees.length)) < 1);
                          const isPaid = fee.dueAmount <= 0;
                          return (
                            <tr key={fee.id}>
                              <td className="p-3 font-bold text-slate-800">
                                {fee.installmentNo}{fee.installmentNo === 1 ? "st" : fee.installmentNo === 2 ? "nd" : fee.installmentNo === 3 ? "rd" : "th"} Installment
                              </td>
                              <td className="p-3 text-slate-600">{new Date(fee.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                              <td className="p-3 font-bold text-slate-900">₹{fee.dueAmount.toLocaleString()}</td>
                              <td className="p-3">
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                  {isPaid ? "PAID" : fee.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="p-3">
                                {matchingPayment ? (
                                  <span className="text-[#1769AA] font-semibold flex items-center gap-1"><Download className="h-3 w-3" /> {matchingPayment.receiptNo}</span>
                                ) : isPaid ? (
                                  <span className="text-slate-400">—</span>
                                ) : (
                                  <span className="text-amber-700 text-[11px]">Due</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {pendingFees.length === 0 && payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 font-bold text-slate-800">Payment</td>
                            <td className="p-3 text-slate-600">{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="p-3 font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                            <td className="p-3"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">{p.status}</span></td>
                            <td className="p-3"><span className="text-[#1769AA] font-semibold">{p.receiptNo}</span></td>
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#1769AA]" />
                Course Assignments & Project Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {assignments.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                  No assignments submitted or assigned yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {assignments.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                        <Badge variant="default" className="text-[10px] shrink-0">{item.status}</Badge>
                      </div>
                      <p className="text-xs font-mono font-bold text-[#1769AA]">
                        {item.marks !== null ? `${item.marks} / 100` : item.submittedAt ? "Pending Grading" : "Not submitted"}
                      </p>
                      <p className="text-[11px] text-slate-500">{item.feedback || "—"}</p>
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
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  AI Voice Agent Calls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {aiCallLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    No AI voice call logs for this student yet.
                  </p>
                ) : (
                  aiCallLogs.map((call: { id: string; createdAt: string; duration: number; status: string; aiSummary?: string }) => (
                    <div key={call.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-800">{new Date(call.createdAt).toLocaleString("en-IN")}</span>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{call.status} ({Math.floor(call.duration / 60)}m {call.duration % 60}s)</Badge>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{call.aiSummary || "No summary available."}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* WhatsApp Notifications */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  WhatsApp Automated Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                  WhatsApp notification logs will appear here once messages are sent to this student.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── 5. ON-DOSSIER COMPLETE ADMISSION & BATCH ASSIGNMENT DIALOG ───── */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              {isDraftStudent ? "Complete Admission & Activate Student" : "Assign / Update Academic Batch & Fee"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Finalize course enrollment, select an active class batch, and configure student fees for <strong className="text-slate-800">{studentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Course Selector */}
            <div>
              <label className="font-bold text-slate-700 uppercase text-[11px] block mb-1.5">
                Enrolled Course / Program *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""} {c.fee ? `- ₹${Number(c.fee).toLocaleString()}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="font-bold text-slate-700 uppercase text-[11px] block mb-1.5">
                Assigned Class Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
              >
                <option value="">-- Assign Batch Later / Not Assigned --</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.timeSlot ? `[${b.timeSlot}]` : ""} {b.faculty?.user?.name ? `• ${b.faculty.user.name}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {availableBatches.length} batch(es) available in this branch
              </p>
            </div>

            {/* Fee Plan & Amounts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-600 uppercase text-[10px] block mb-1">
                  Payment Plan
                </label>
                <select
                  value={feePlan}
                  onChange={(e) => setFeePlan(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                >
                  <option value="INSTALLMENT">Installments</option>
                  <option value="FULL_PAYMENT">Full One-Time</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 uppercase text-[10px] block mb-1">
                  Total Course Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <Input
                    type="number"
                    value={totalFee || ""}
                    onChange={(e) => setTotalFee(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="25000"
                    className="pl-6 h-9 font-bold text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 uppercase text-[10px] block mb-1">
                  Down Payment Paid (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <Input
                    type="number"
                    value={downPayment || ""}
                    onChange={(e) => setDownPayment(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="5000"
                    className="pl-6 h-9 font-semibold text-emerald-700 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="font-semibold text-slate-600 uppercase text-[10px] block mb-1">
                Admission Remarks / Notes
              </label>
              <Input
                value={admissionNotes}
                onChange={(e) => setAdmissionNotes(e.target.value)}
                placeholder="e.g. Concession applied, documents verified, etc."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsActivateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleActivateStudent}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 flex items-center gap-1.5 shadow-sm"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Activate & Enroll Student</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
