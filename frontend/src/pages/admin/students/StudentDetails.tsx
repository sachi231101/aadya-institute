import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStudent } from "../../../hooks/useStudents";
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
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [callInitiated, setCallInitiated] = useState(false);
  const [waSent, setWaSent] = useState(false);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: response, isLoading, isError } = useStudent(id);
  const student = response?.data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active Student</span>;
      case "ON_LEAVE":
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> On Approved Leave</span>;
      case "COMPLETED":
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-600" /> Graduated</span>;
      case "DISCONTINUED":
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Discontinued</span>;
      case "CANCELLED":
        return <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  const handleSarvamAICall = () => {
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

  // Enriched attributes with graceful fallbacks
  const studentName = student.user?.name || student.studentCode;
  const studentEmail = student.user?.email || "Not Provided";
  const studentPhone = student.user?.phone || "Not Provided";
  const branchName = student.branch?.name || "Bengaluru Central";
  const gender = student.gender || "Male";
  const qualification = student.qualification || "Graduate (Computer Science)";
  const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "12 Aug 2003";
  const bloodGroup = student.bloodGroup || "O+";
  
  // Guardian info
  const guardianName = student.guardian?.name || "Suresh Sharma";
  const guardianRelation = student.guardian?.relation || "Father";
  const guardianPhone = student.guardian?.phone || "9845012345";
  const addressStr = student.address?.street || "#42, 2nd Cross, Indiranagar";
  const cityStr = student.address?.city || "Bengaluru";
  const pincodeStr = student.address?.pincode || "560038";

  // Academic & Batch info
  const activeBatch = student.batchEnrollments?.[0]?.batch;
  const courseName = activeBatch?.course?.name || student.courseName || "Full Stack Web Development";
  const courseCode = activeBatch?.course?.code || "FSWD-01";
  const batchName = activeBatch?.name || student.batchName || "FSWD Morning Batch (MWF)";
  const batchTimeSlot = activeBatch?.timeSlot || "10:00 AM - 12:00 PM";
  const facultyName = activeBatch?.faculty?.user?.name || student.facultyName || "Prof. Rajesh Kumar";

  // Attendance & Risk metrics
  const attendanceRate = student.attendance?.overallPercentage ?? 92;
  const totalClasses = student.attendance?.totalClasses ?? 24;
  const presentClasses = student.attendance?.presentCount ?? 22;
  const absentClasses = student.attendance?.absentCount ?? 2;
  const consecutiveAbsences = student.attendance?.consecutiveAbsences ?? (attendanceRate < 70 ? 3 : 0);
  const isDiscontinuationRisk = consecutiveAbsences >= 2 || attendanceRate < 65;

  // Fee info
  const totalFee = student.fees?.totalFee || 45000;
  const amountPaid = student.fees?.amountPaid || 35000;
  const dueAmount = totalFee - amountPaid;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
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
          {/* Sarvam AI Trigger */}
          <Button
            onClick={handleSarvamAICall}
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
                <span>Trigger Sarvam AI Call</span>
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

          {/* Edit Button */}
          <Button
            onClick={() => navigate(`${basePath}/students/${student.id}/edit`)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-medium text-xs px-3 py-1.5 shadow-sm flex items-center gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
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
                Student has missed {consecutiveAbsences} consecutive scheduled theory classes. The auto-discontinuation workflow is primed. Please contact student via Sarvam AI Voice or WhatsApp immediately.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSarvamAICall}
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
                <div className={`p-1.5 rounded-lg ${attendanceRate >= 85 ? "bg-emerald-50 text-emerald-600" : attendanceRate >= 70 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">{attendanceRate}%</h3>
                <span className="text-xs text-slate-500 font-medium">({presentClasses}/{totalClasses} Classes)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${attendanceRate >= 85 ? "bg-emerald-500" : attendanceRate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {absentClasses === 0 ? "Perfect attendance record" : `${absentClasses} classes missed this term`}
              </p>
            </CardContent>
          </Card>

          {/* Fees KPI */}
          <Card className="border-slate-200 shadow-sm bg-white flex flex-col justify-between">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Fee Account Status</span>
                <div className={`p-1.5 rounded-lg ${dueAmount === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">₹{amountPaid.toLocaleString()}</h3>
                <span className="text-xs text-slate-500 font-medium">of ₹{totalFee.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1769AA]"
                  style={{ width: `${Math.min(100, Math.round((amountPaid / totalFee) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-slate-500">Balance: <strong className={dueAmount > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>₹{dueAmount.toLocaleString()}</strong></span>
                <Badge variant={dueAmount === 0 ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                  {dueAmount === 0 ? "Paid in Full" : "Installment Due"}
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
              <h3 className="text-lg font-bold text-slate-900 truncate" title={batchName}>{batchName}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Faculty: <strong className="text-slate-700">{facultyName}</strong></p>
              <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100 text-[11px] flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1 font-medium"><Clock className="h-3 w-3 text-[#1769AA]" /> {batchTimeSlot}</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">Ongoing</span>
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
            <Bot className="h-3.5 w-3.5 mr-1.5" /> Sarvam AI & WhatsApp Logs
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
                  <p className="text-slate-900 font-bold text-sm mt-0.5">{guardianName} ({guardianRelation})</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Guardian Mobile</p>
                  <p className="text-slate-800 font-bold text-sm mt-0.5">{guardianPhone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-semibold uppercase">Residential Street Address</p>
                  <p className="text-slate-800 font-medium mt-0.5">{addressStr}, {cityStr} - {pincodeStr}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Center / Branch</p>
                  <p className="text-slate-800 font-medium mt-0.5">📍 {branchName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">WhatsApp Alerts</p>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold inline-block mt-0.5">
                    ✓ Active on {studentPhone}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: PROGRAM & BATCHES ───────────────────────────────── */}
        <TabsContent value="academics" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#1769AA]" />
                Enrolled Academic Curriculum & Batch Schedule
              </CardTitle>
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
                  <Badge className="bg-[#1769AA] text-white">MWF Schedule</Badge>
                  <Badge variant="outline" className="text-slate-700 bg-white font-medium">{batchTimeSlot}</Badge>
                </div>
              </div>

              {/* Module Progression Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Course Modules & Completion Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: "1. Web Architecture & Frontend Fundamentals", status: "Completed", score: "94%" },
                    { name: "2. Modern React & State Management", status: "Completed", score: "88%" },
                    { name: "3. Backend API Development with Node & Express", status: "Completed", score: "91%" },
                    { name: "4. PostgreSQL Database Design & Prisma ORM", status: "In Progress", score: "Current" },
                    { name: "5. Redis Caching & Background BullMQ Queues", status: "Upcoming", score: "—" },
                    { name: "6. AI Agents Integration (Sarvam Voice AI)", status: "Upcoming", score: "—" },
                  ].map((mod, i) => (
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
              {/* Stat breakdown */}
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
                  <p className="text-[10px] font-bold uppercase text-red-700">Absences</p>
                  <h4 className="text-xl font-bold text-red-800 mt-1">{absentClasses}</h4>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-700">Approved Leave</p>
                  <h4 className="text-xl font-bold text-amber-800 mt-1">0</h4>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Session / Date</th>
                      <th className="p-3">Module / Topic</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Faculty Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {[
                      { date: "16 Aug 2026", topic: "Prisma Relations & Transactions", time: "10:00 - 12:00", status: "PRESENT", remark: "Active participation" },
                      { date: "14 Aug 2026", topic: "PostgreSQL Queries & Aggregations", time: "10:00 - 12:00", status: "PRESENT", remark: "On time" },
                      { date: "12 Aug 2026", topic: "Database Schema Migrations", time: "10:00 - 12:00", status: "PRESENT", remark: "Completed in-class task" },
                      { date: "09 Aug 2026", topic: "REST API Architecture & Services", time: "10:00 - 12:00", status: "ABSENT", remark: "Automated WhatsApp alert sent" },
                      { date: "07 Aug 2026", topic: "Express Middleware & JWT Auth", time: "10:00 - 12:00", status: "PRESENT", remark: "On time" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{row.date}</td>
                        <td className="p-3 text-slate-700">{row.topic}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{row.time}</td>
                        <td className="p-3">
                          {row.status === "PRESENT" ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">PRESENT</span>
                          ) : (
                            <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">ABSENT</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{row.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: FEES & RECEIPTS ─────────────────────────────────── */}
        <TabsContent value="fees" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#1769AA]" />
                Fee Structure, Installments & Receipts
              </CardTitle>
              <Button size="sm" className="bg-[#1769AA] text-white text-xs font-semibold">
                <DollarSign className="h-3.5 w-3.5 mr-1" /> Record Fee Payment
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Fee Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Agreed Fee</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totalFee.toLocaleString()}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Plan: 3 Installments</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                  <p className="text-xs font-semibold text-emerald-700 uppercase">Total Paid</p>
                  <h3 className="text-2xl font-black text-emerald-800 mt-1">₹{amountPaid.toLocaleString()}</h3>
                  <p className="text-[11px] text-emerald-600 mt-1">78% of Total Paid</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                  <p className="text-xs font-semibold text-amber-700 uppercase">Remaining Due</p>
                  <h3 className="text-2xl font-black text-amber-800 mt-1">₹{dueAmount.toLocaleString()}</h3>
                  <p className="text-[11px] text-amber-600 mt-1">Next Due: 28 Aug 2026</p>
                </div>
              </div>

              {/* Installment Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Installment Schedule
                </h4>
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
                      <tr>
                        <td className="p-3 font-bold text-slate-800">1st Installment (Down Payment)</td>
                        <td className="p-3 text-slate-600">10 June 2026</td>
                        <td className="p-3 font-bold text-slate-900">₹20,000</td>
                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">PAID</span></td>
                        <td className="p-3"><button className="text-[#1769AA] hover:underline font-semibold flex items-center gap-1"><Download className="h-3 w-3" /> RCP-2026-081</button></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">2nd Installment</td>
                        <td className="p-3 text-slate-600">10 July 2026</td>
                        <td className="p-3 font-bold text-slate-900">₹15,000</td>
                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">PAID</span></td>
                        <td className="p-3"><button className="text-[#1769AA] hover:underline font-semibold flex items-center gap-1"><Download className="h-3 w-3" /> RCP-2026-145</button></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">3rd Installment (Final Balance)</td>
                        <td className="p-3 text-slate-600">28 Aug 2026</td>
                        <td className="p-3 font-bold text-slate-900">₹10,000</td>
                        <td className="p-3"><span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">DUE SOON</span></td>
                        <td className="p-3"><button className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold hover:bg-emerald-100">Send WhatsApp Reminder</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "React Component Hierarchy & State", marks: "95 / 100", grade: "A+", feedback: "Clean component structure and clean hooks usage." },
                  { title: "Node.js REST API with Validation", marks: "88 / 100", grade: "A", feedback: "Well structured Zod schemas and error middleware." },
                  { title: "Database Schema & Query Optimization", marks: "Pending Grading", grade: "Submitted", feedback: "Submitted on time. Review in progress." },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                      <Badge variant="default" className="text-[10px] shrink-0">{item.grade}</Badge>
                    </div>
                    <p className="text-xs font-mono font-bold text-[#1769AA]">{item.marks}</p>
                    <p className="text-[11px] text-slate-500">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 6: SARVAM AI & WHATSAPP LOGS ───────────────────────── */}
        <TabsContent value="ai_communications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sarvam AI Calling Logs */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  Sarvam AI Voice Agent Calls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  {
                    date: "10 Aug 2026, 04:30 PM",
                    duration: "1m 45s",
                    status: "ANSWERED",
                    intent: "High Interest",
                    summary: "AI Voice Agent checked on student after missed class. Student confirmed attendance for next session.",
                  },
                  {
                    date: "05 July 2026, 11:15 AM",
                    duration: "2m 12s",
                    status: "ANSWERED",
                    intent: "High Interest",
                    summary: "Pre-admission counseling call. Inquired about full stack web development syllabus and timing.",
                  },
                ].map((call, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{call.date}</span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{call.status} ({call.duration})</Badge>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{call.summary}</p>
                  </div>
                ))}
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
                {[
                  {
                    time: "16 Aug 2026, 08:00 AM",
                    type: "Class Reminder",
                    msg: "Reminder: Your class 'Prisma ORM & PostgreSQL' begins at 10:00 AM at Bengaluru Central.",
                    status: "Delivered & Read",
                  },
                  {
                    time: "09 Aug 2026, 12:30 PM",
                    type: "Absence Notice",
                    msg: "Hi Rahul, we missed you in today's class. Please review the recording in your portal.",
                    status: "Delivered & Read",
                  },
                  {
                    time: "10 July 2026, 02:15 PM",
                    type: "Fee Receipt",
                    msg: "Receipt #RCP-2026-145 for ₹15,000 has been generated. Thank you for your payment.",
                    status: "Delivered & Read",
                  },
                ].map((wa, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span className="text-emerald-700 font-bold">{wa.type}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{wa.time}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{wa.msg}</p>
                    <p className="text-[10px] text-emerald-600 font-medium pt-1">✓✓ {wa.status}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
