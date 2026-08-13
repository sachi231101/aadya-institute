import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCheck,
  Target,
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ArrowRight,
  Plus,
  TrendingUp,
  PhoneCall,
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useStudentStore } from "@/store/student.store";
import { useCounselorStore } from "@/store/counselor.store";
import { useAdmissionStore } from "@/store/admission.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const CounselorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { students } = useStudentStore();
  const { fetchCounselors } = useCounselorStore();
  const { enquiries, admissions, isLoading, fetchEnquiries, fetchAdmissions } = useAdmissionStore();

  useEffect(() => {
    fetchCounselors();
    fetchEnquiries();
    fetchAdmissions();
  }, []);

  const totalLeadsCount = enquiries.length;
  const newLeadsCount = enquiries.filter((e) => e.status === "NEW").length;
  const pendingFollowups = enquiries.filter((e) => e.status === "FOLLOW_UP" || e.status === "IN_PROGRESS").length;
  const confirmedAdmissionsCount = admissions.length;

  const recentEnquiries = enquiries.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            Counsellor Operations Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Lead Pipeline, Student Admissions & Branch Counselling Operations — Aadya Institute
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/counselor/admissions/enquiries")}
            variant="outline"
            className="gap-2"
          >
            <Plus size={16} /> New Lead Enquiry
          </Button>
          <Button
            onClick={() => navigate("/counselor/students/add")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Register Student
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Lead Enquiries</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{totalLeadsCount}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {newLeadsCount} New Leads
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Target className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Follow-ups Pending</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{pendingFollowups}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                In Progress & Scheduled
              </p>
            </div>
            <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
              <PhoneCall className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Confirmed Admissions</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{confirmedAdmissionsCount}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Confirmed Enrolments
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registered Students</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{students.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">Total Enrolled</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Access Cards */}
      <h2 className="text-lg font-semibold text-text-primary">Counsellor Workspace Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Admissions / Leads */}
        <Card
          className="border border-border/60 hover:border-emerald-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/admissions/enquiries")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Target className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-emerald-600 transition-colors">
              Admissions & Lead Enquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage candidate lead enquiries, schedule demo calls, log follow-up notes, and convert admissions.
            </p>
          </CardContent>
        </Card>

        {/* 2. Students */}
        <Card
          className="border border-border/60 hover:border-purple-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/students/all")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-purple-600 transition-colors">
              Student Records & Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Register new students, review enrolled profiles, view attendance logs, and track performance.
            </p>
          </CardContent>
        </Card>

        {/* 3. Faculty */}
        <Card
          className="border border-border/60 hover:border-amber-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/faculty/all")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                <Users className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-amber-600 transition-colors">
              Faculty & Course Instructors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse course instructors, view batch assignments, and log faculty daily attendance records.
            </p>
          </CardContent>
        </Card>

        {/* 4. Fees */}
        <Card
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/fees/payments")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
                <CreditCard className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#1769AA] group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-[#1769AA] transition-colors">
              Fee Collections & Installments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor candidate fee payments, track pending installment dues, and generate payment receipts.
            </p>
          </CardContent>
        </Card>

        {/* 5. Reports */}
        <Card
          className="border border-border/60 hover:border-blue-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/reports/students")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-blue-600 transition-colors">
              Counselling & Branch Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review student conversion reports, faculty performance metrics, and financial fee summaries.
            </p>
          </CardContent>
        </Card>

        {/* 6. Settings */}
        <Card
          className="border border-border/60 hover:border-slate-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/counselor/settings")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-slate-500/10 rounded-xl text-slate-600">
                <Settings className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-slate-600 transition-colors">
              Counsellor Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure personal profile, security credentials, notification channels, and counselling preferences.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Lead Follow-up Table Preview */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-bg-tertiary/30 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Priority Lead Follow-up Pipeline
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/counselor/admissions/enquiries")}
              className="text-emerald-700 hover:text-emerald-800 gap-1"
            >
              View All Enquiries <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-text-primary">Enquiry Code & Lead</TableHead>
              <TableHead className="font-semibold text-text-primary">Interested Course</TableHead>
              <TableHead className="font-semibold text-text-primary">Contact Number</TableHead>
              <TableHead className="font-semibold text-text-primary">Status</TableHead>
              <TableHead className="font-semibold text-text-primary">Counsellor Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-1" />
                  Loading live lead enquiries...
                </TableCell>
              </TableRow>
            ) : recentEnquiries.length > 0 ? (
              recentEnquiries.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-700 block">{lead.enquiryNo || lead.id}</span>
                      <span className="font-medium text-text-primary text-xs">{lead.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary font-medium">{lead.courseName || "General Course"}</TableCell>
                  <TableCell className="text-xs text-text-secondary">{lead.phone}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground italic">{lead.counselorNotes || "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No lead enquiries found. Add your first live enquiry in Admissions!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
