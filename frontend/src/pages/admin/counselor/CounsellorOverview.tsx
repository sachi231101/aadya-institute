import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  UserPlus,
  Plus,
  ArrowRight,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { batchesApi } from "../../../services/batches.api";
import { coursesApi } from "../../../services/courses.api";
import { studentsApi } from "../../../services/students.api";
import { facultyApi } from "../../../services/faculty.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CounsellorOverview: React.FC = () => {
  const navigate = useNavigate();
  const basePath = "/admin";

  // Queries for live data from backend
  const { data: batchesRes, isLoading: loadingBatches, isError: errorBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const { data: coursesRes, isLoading: loadingCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => coursesApi.getAll(),
  });

  const { data: studentsRes, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  const { data: facultyRes, isLoading: loadingFaculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });

  const batches = batchesRes?.data || [];
  const courses = coursesRes?.data || [];
  const students = studentsRes?.data || [];
  const facultyList = facultyRes?.data || [];

  const activeBatches = batches.filter((b) => b.status === "ACTIVE").length;
  const upcomingBatches = batches.filter((b) => b.status === "UPCOMING").length;
  const isLoadingAll = loadingBatches || loadingCourses || loadingStudents || loadingFaculty;

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
            onClick={() => navigate(`${basePath}/counselor/all`)}
            variant="outline"
            className="gap-2"
          >
            <UserPlus size={16} /> Manage Counsellors
          </Button>
          <Button
            onClick={() => navigate(`${basePath}/counselor/batches`)}
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Create Batch
          </Button>
        </div>
      </div>

      {errorBatches && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          Failed to load live institute data from server.
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
              {isLoadingAll ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#1769AA] mt-2" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-text-primary mt-1">{batches.length}</h3>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    {activeBatches} Active • {upcomingBatches} Upcoming
                  </p>
                </>
              )}
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
              {isLoadingAll ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 mt-2" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-text-primary mt-1">{students.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Registered System Students</p>
                </>
              )}
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
              {isLoadingAll ? (
                <Loader2 className="h-5 w-5 animate-spin text-amber-600 mt-2" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-text-primary mt-1">{facultyList.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Active Faculty Members</p>
                </>
              )}
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
              {isLoadingAll ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mt-2" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-text-primary mt-1">{courses.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Active Offerings</p>
                </>
              )}
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Cards */}
      <h2 className="text-lg font-semibold text-text-primary">Counsellor Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate(`${basePath}/counselor/all`)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
                <UserCheck className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#1769AA] group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-[#1769AA] transition-colors">
              Manage Counsellors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create new counsellor profiles, update contact info, assign branches, and manage staff statuses.
            </p>
          </CardContent>
        </Card>

        <Card
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate(`${basePath}/counselor/batches`)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-lg mt-4 group-hover:text-blue-600 transition-colors">
              Create & Manage Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define batch schedules, start dates, capacity, and target course offerings.
            </p>
          </CardContent>
        </Card>

        <Card
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate(`${basePath}/counselor/assign-students`)}
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
              Select registered students from database records and enroll them into training batches.
            </p>
          </CardContent>
        </Card>

        <Card
          className="border border-border/60 hover:border-[#1769AA] transition-all cursor-pointer group shadow-sm hover:shadow-md"
          onClick={() => navigate(`${basePath}/counselor/assign-faculty`)}
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
              Allocate qualified faculty instructors to lead and manage specific active batches.
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
          {loadingBatches ? (
            <div className="py-8 flex justify-center items-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-[#1769AA] mr-2" />
              Loading live batches...
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No batches currently exist in the database.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {batches.map((batch) => {
                const enrolledCount = batch._count?.enrollments ?? 0;
                const facultyName = batch.faculty?.user?.name || "Unassigned";
                const courseName = batch.course?.name || "General Course";

                return (
                  <div key={batch.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">
                        {batch.name} <span className="text-xs font-mono text-muted-foreground">({batch.code})</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Course: {courseName} • Faculty: <span className="font-medium text-text-primary">{facultyName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#1769AA]/10 text-[#1769AA]">
                        {enrolledCount} Enrolled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
