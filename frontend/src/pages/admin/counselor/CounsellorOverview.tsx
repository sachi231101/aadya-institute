import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  Plus, 
  ArrowRight,
  Sparkles,
  Calendar
} from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
import { useStudentStore } from "../../../store/student.store";
import { useFacultyStore } from "../../../store/faculty.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CounsellorOverview: React.FC = () => {
  const navigate = useNavigate();
  const { batches, courses } = useCourseStore();
  const { students } = useStudentStore();
  const { facultyList } = useFacultyStore();

  const activeBatches = batches.filter((b) => b.status === "ACTIVE").length;
  const upcomingBatches = batches.filter((b) => b.status === "UPCOMING").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor Portal & Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage batches, assign enrolled students, and allocate faculty members to active training programs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/admin/counselor/batches")}
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Create Batch
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{batches.length}</h3>
              <p className="text-xs text-green-600 font-medium mt-1">
                {activeBatches} Active • {upcomingBatches} Upcoming
              </p>
            </div>
            <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{students.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                From Student Store
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
              <p className="text-sm font-medium text-muted-foreground">Available Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{facultyList.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                From Faculty Store
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
              <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{courses.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Active Offerings
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Cards */}
      <h2 className="text-lg font-semibold text-text-primary">Counsellor Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/admin/counselor/batches")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
                <Calendar className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#1769AA] group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-[#1769AA] transition-colors">
              Create & Manage Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define batch schedules, capacity, start dates, time slots, and assign active courses.
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/admin/counselor/assign-students")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-purple-600 transition-colors">
              Assign Students to Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Collect student profiles from system records and enroll them into specific training batches.
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate("/admin/counselor/assign-faculty")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                <Users className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-amber-600 transition-colors">
              Assign Faculty to Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Allocate specialized instructors and faculty members to lead respective batches.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Batches Preview */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Batches Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/40">
            {batches.map((batch) => (
              <div key={batch.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">{batch.name} <span className="text-xs font-mono text-muted-foreground">({batch.code})</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Course: {batch.courseName} • Faculty: <span className="font-medium text-text-primary">{batch.facultyName || "Unassigned"}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#1769AA]/10 text-[#1769AA]">
                    {batch.enrolledCount} / {batch.capacity} Enrolled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
