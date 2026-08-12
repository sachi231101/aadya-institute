import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Calendar, 
  Plus, 
  Filter, 
  GraduationCap,
  Layers,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useFacultyCourses, useAssignFacultyCourse, useFacultyList } from "../../../hooks/useFaculty";
import { useCourseStore } from "../../../store/course.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatSchedules = (schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
  if (!schedules || schedules.length === 0) return "No schedule set";
  return schedules
    .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}`)
    .join(", ");
};

export const FacultyCourses: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "";

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(initialFacultyId || "ALL");
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  // Store batches
  const { batches: storeBatches } = useCourseStore();

  // Modal Form state
  const [newFacultyId, setNewFacultyId] = useState<string>("");
  const [newBatchId, setNewBatchId] = useState<string>("");

  // Fetch data from backend
  const coursesParams = {
    limit: 50,
    facultyId: selectedFacultyId !== "ALL" ? selectedFacultyId : undefined,
  };

  const { data: coursesResponse, isLoading, isError } = useFacultyCourses(coursesParams);
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const assignMutation = useAssignFacultyCourse();

  const assignments = coursesResponse?.data ?? [];
  const facultyList = facultyResponse?.data ?? [];

  // Combine backend batch assignments + store batches for complete dropdown list
  const assignmentBatches = assignments.map((a) => ({
    id: a.id,
    name: a.name,
    code: a.code,
    courseName: a.course?.name || "",
  }));
  const storeBatchesMapped = storeBatches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    courseName: b.courseName || "",
  }));

  const allBatchesMap = new Map<string, { id: string; name: string; code: string; courseName: string }>();
  [...assignmentBatches, ...storeBatchesMapped].forEach((b) => allBatchesMap.set(b.id, b));
  const allBatches = Array.from(allBatchesMap.values());

  const totalStudentsTaught = assignments.reduce((acc, curr) => acc + (curr._count?.enrollments ?? 0), 0);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultyId || !newBatchId) return;

    try {
      await assignMutation.mutateAsync({
        batchId: newBatchId,
        facultyId: newFacultyId,
      });
      setNewFacultyId("");
      setNewBatchId("");
      setShowAssignModal(false);
    } catch (error) {
      console.error("Failed to assign course:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Assigned Courses & Workload</h2>
          <p className="text-sm text-text-secondary">
            Manage course distributions, batch schedules, and faculty teaching hours.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
          onClick={() => setShowAssignModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Assign Course to Faculty
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Assignments</p>
              <h3 className="text-2xl font-bold text-text-primary">{coursesResponse?.meta?.total ?? assignments.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Batches with Schedules</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {assignments.filter((a) => a.schedules && a.schedules.length > 0).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Students Impacted</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalStudentsTaught}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary">{facultyResponse?.meta?.total ?? facultyList.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-bg-secondary border border-border/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">Filter by Faculty:</span>
        </div>
        <select
          value={selectedFacultyId}
          onChange={(e) => setSelectedFacultyId(e.target.value)}
          className="h-10 px-3 py-2 bg-bg-primary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA] w-full sm:w-72"
        >
          <option value="ALL">All Faculty Members</option>
          {facultyList.map((f) => (
            <option key={f.id} value={f.id}>
              {f.user.name} ({f.employeeCode})
            </option>
          ))}
        </select>
      </div>

      {/* Assigned Courses Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
          <span className="ml-3 text-text-secondary">Loading assignments...</span>
        </div>
      ) : isError ? (
        <Card className="border-border/50 bg-bg-primary text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load assignments</h3>
          <p className="text-text-secondary max-w-sm mx-auto">Please try again later.</p>
        </Card>
      ) : assignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((item) => (
            <Card key={item.id} className="border-border/50 shadow-sm bg-bg-primary hover:border-border transition-all">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#1769AA]" />
                      {item.course.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Batch: <span className="font-mono text-text-primary font-semibold">{item.code}</span>
                      {" • "}Course Code: <span className="font-mono text-text-primary font-semibold">{item.course.code}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-[#1769AA] border-blue-200">
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-text-muted" /> Instructor:
                  </span>
                  <span className="font-medium text-text-primary">
                    {item.faculty?.user.name ?? "Unassigned"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-text-muted" /> Schedule:
                  </span>
                  <span className="text-xs font-mono text-text-primary">
                    {formatSchedules(item.schedules)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-text-muted" /> Enrolled Students:
                  </span>
                  <span className="font-semibold text-emerald-600">{item._count?.enrollments ?? 0} Students</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-bg-primary text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-text-muted mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No courses assigned</h3>
          <p className="text-text-secondary max-w-sm mx-auto mb-6">
            There are currently no course assignments matching the selected faculty filter.
          </p>
          <Button 
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
            onClick={() => setShowAssignModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign New Course
          </Button>
        </Card>
      )}

      {/* Modal Dialog for Assigning Course */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#1769AA]" />
              Assign Faculty to Batch
            </h3>
            
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Faculty *</label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  <option value="">Select a faculty member</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user.name} ({f.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Batch *</label>
                <select
                  value={newBatchId}
                  onChange={(e) => setNewBatchId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  <option value="">Select a batch to assign</option>
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) {b.courseName ? `— ${b.courseName}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select an active academy batch from the dropdown above.
                </p>
              </div>

              {assignMutation.isError && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                  Failed to assign faculty to batch. Please verify the batch ID.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                >
                  {assignMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Course"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
