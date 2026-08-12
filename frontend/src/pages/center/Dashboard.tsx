import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  UserCheck, 
  CreditCard, 
  Target, 
  BookOpen, 
  Settings, 
  ArrowRight,
  Plus,
  TrendingUp
} from "lucide-react";
import { useStudentStore } from "@/store/student.store";
import { useFacultyList } from "@/hooks/useFaculty";
import { useCourseStore } from "@/store/course.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CenterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { students } = useStudentStore();
  const { data: facultyResponse } = useFacultyList();
  const facultyList = facultyResponse?.data ?? [];
  const { batches, courses } = useCourseStore();

  const activeBatches = batches.filter((b) => b.status === "ACTIVE").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#1769AA]" />
            Center Manager Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Branch Operations Overview & Administration — Bengaluru Main Campus
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/center/students/add")}
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Add Student
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{students.length}</h3>
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Active Enrolled
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
              <p className="text-sm font-medium text-muted-foreground">Branch Batches</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{batches.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {activeBatches} Currently Running
              </p>
            </div>
            <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branch Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{facultyList.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Assigned Instructors
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Courses</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{courses.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Program Offerings
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Access Cards */}
      <h2 className="text-lg font-semibold text-text-primary">Center Manager Access Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Students */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/students/all")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-purple-600 transition-colors">
              Students Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage student registrations, attendance tracking, profiles, and performance metrics.
            </p>
          </CardContent>
        </Card>

        {/* 2. Counsellor */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/counselor/overview")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
                <UserCheck className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#1769AA] group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-[#1769AA] transition-colors">
              Counsellor & Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create training batches, allocate target schedules, assign students, and assign faculty.
            </p>
          </CardContent>
        </Card>

        {/* 3. Faculty */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/faculty/all")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                <Users className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-amber-600 transition-colors">
              Faculty & Instructors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View instructor profiles, track course assignments, and log faculty daily attendance.
            </p>
          </CardContent>
        </Card>

        {/* 4. Fees */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/fees/payments")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <CreditCard className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-emerald-600 transition-colors">
              Fees & Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor student fee payments, track pending balances, and generate branch financial reports.
            </p>
          </CardContent>
        </Card>

        {/* 5. Admissions / Leads */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/admissions/enquiries")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-600">
                <Target className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-red-600 transition-colors">
              Admissions & Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Handle student lead enquiries, track application pipelines, and convert admissions.
            </p>
          </CardContent>
        </Card>

        {/* 6. Courses */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/courses/all")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-blue-600 transition-colors">
              Courses & Curriculum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse course offerings, view module structures, and verify curriculum timelines.
            </p>
          </CardContent>
        </Card>

        {/* 7. Settings */}
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/center/settings")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-slate-500/10 rounded-xl text-slate-600">
                <Settings className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-slate-600 transition-colors">
              Center Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure branch parameters, system notifications, and operational preferences.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
