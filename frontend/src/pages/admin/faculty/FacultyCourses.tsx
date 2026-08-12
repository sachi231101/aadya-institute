import React, { useState } from "react";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Calendar, 
  Plus, 
  Filter, 
  GraduationCap,
  Layers
} from "lucide-react";
import { useFacultyStore } from "../../../store/faculty.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const FacultyCourses: React.FC = () => {
  const { facultyList, assignments, assignCourse } = useFacultyStore();

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("ALL");
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  // Modal Form state
  const [newFacultyId, setNewFacultyId] = useState<string>(facultyList[0]?.id || "");
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newBatchCode, setNewBatchCode] = useState<string>("");
  const [newSchedule, setNewSchedule] = useState<string>("Mon, Wed, Fri (10:00 AM - 12:00 PM)");
  const [newWeeklyHours, setNewWeeklyHours] = useState<number>(6);

  const filteredAssignments = assignments.filter(
    (item) => selectedFacultyId === "ALL" || item.facultyId === selectedFacultyId
  );

  const totalWeeklyHours = filteredAssignments.reduce((acc, curr) => acc + curr.weeklyHours, 0);
  const totalStudentsTaught = filteredAssignments.reduce((acc, curr) => acc + curr.studentCount, 0);

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const facultyObj = facultyList.find((f) => f.id === newFacultyId);
    if (!facultyObj || !newCourseName || !newBatchCode) return;

    assignCourse({
      facultyId: facultyObj.id,
      facultyName: facultyObj.name,
      courseId: `CRS-${Math.floor(100 + Math.random() * 900)}`,
      courseName: newCourseName,
      batchCode: newBatchCode,
      schedule: newSchedule,
      studentCount: 30,
      weeklyHours: Number(newWeeklyHours) || 6,
    });

    // Reset & Close
    setNewCourseName("");
    setNewBatchCode("");
    setShowAssignModal(false);
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
          className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white transition-colors"
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
              <h3 className="text-2xl font-bold text-text-primary">{filteredAssignments.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Weekly Hours</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalWeeklyHours} hrs/wk</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{facultyList.length}</h3>
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
              {f.name} ({f.facultyCode})
            </option>
          ))}
        </select>
      </div>

      {/* Assigned Courses Grid */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssignments.map((item) => (
            <Card key={item.id} className="border-border/50 shadow-sm bg-bg-primary hover:border-border transition-all">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#1769AA]" />
                      {item.courseName}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Batch Code: <span className="font-mono text-text-primary font-semibold">{item.batchCode}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-[#1769AA] border-blue-200">
                    {item.weeklyHours} hrs / week
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-text-muted" /> Instructor:
                  </span>
                  <span className="font-medium text-text-primary">{item.facultyName}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-text-muted" /> Schedule:
                  </span>
                  <span className="text-xs font-mono text-text-primary">{item.schedule}</span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-text-muted" /> Enrolled Students:
                  </span>
                  <span className="font-semibold text-emerald-600">{item.studentCount} Students</span>
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
            className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
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
              Assign Course to Faculty
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
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facultyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Advanced System Design & Microservices"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code *</label>
                <Input
                  type="text"
                  placeholder="e.g. SD-2026-X1"
                  value={newBatchCode}
                  onChange={(e) => setNewBatchCode(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Schedule</label>
                <Input
                  type="text"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Teaching Hours</label>
                <Input
                  type="number"
                  value={newWeeklyHours}
                  onChange={(e) => setNewWeeklyHours(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

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
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                >
                  Assign Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
