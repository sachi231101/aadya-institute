import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  CheckCircle2, 
  GraduationCap,
  UserCheck,
  ArrowRight
} from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
import { useFacultyStore } from "../../../store/faculty.store";
import { useStudentStore } from "../../../store/student.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const CounsellorBatches: React.FC = () => {
  const navigate = useNavigate();
  const { batches, courses, addBatch } = useCourseStore();
  const { facultyList } = useFacultyStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Batch Creation
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [facultyId, setFacultyId] = useState(facultyList[0]?.id || "");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [schedulePattern, setSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [capacity, setCapacity] = useState<number>(35);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.facultyName && b.facultyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      b.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === "ALL" || b.courseId === courseFilter;
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !courseId) return;

    const selectedCourse = courses.find((c) => c.id === courseId);
    const selectedFaculty = facultyList.find((f) => f.id === facultyId);

    addBatch({
      name,
      code,
      courseId,
      courseName: selectedCourse?.name || "General Course",
      facultyId,
      facultyName: selectedFaculty?.name || "Unassigned",
      startDate,
      schedulePattern,
      timeSlot,
      capacity,
      status: "UPCOMING",
    });

    setName("");
    setCode("");
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor — Batch Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create new training batches, allocate target courses, and set schedule details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowModal(true)} 
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Create New Batch
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batch name, code, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-bg-secondary">
              <TableRow>
                <TableHead>Batch Name & Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Assigned Faculty</TableHead>
                <TableHead>Schedule & Slot</TableHead>
                <TableHead>Enrollment / Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No batches found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div className="font-semibold text-text-primary">{batch.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{batch.code}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{batch.courseName}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-text-primary">
                        {batch.facultyName || "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{batch.schedulePattern}</div>
                      <div className="text-muted-foreground">{batch.timeSlot}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold">
                        {batch.enrolledCount} / {batch.capacity} Students
                      </div>
                      <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-[#1769AA] h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round((batch.enrolledCount / batch.capacity) * 100))}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={batch.status === "ACTIVE" ? "default" : "outline"}>
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate("/admin/counselor/assign-students")}
                        className="text-xs gap-1"
                      >
                        <GraduationCap className="h-3.5 w-3.5" /> Assign Students
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate("/admin/counselor/assign-faculty")}
                        className="text-xs gap-1"
                      >
                        <Users className="h-3.5 w-3.5" /> Assign Faculty
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Batch Modal Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Fill in the details to create a new batch as a Counsellor.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Batch Name</label>
              <Input
                placeholder="e.g. FullStack Alpha 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Batch Code</label>
                <Input
                  placeholder="e.g. FS-2026-A1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Capacity</label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Faculty (Collected from Faculty Store)</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.department || "Faculty"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Schedule Pattern</label>
                <select
                  value={schedulePattern}
                  onChange={(e) => setSchedulePattern(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
                >
                  <option value="MWF">MWF (Mon/Wed/Fri)</option>
                  <option value="TTS">TTS (Tue/Thu/Sat)</option>
                  <option value="WEEKEND">Weekend (Sat/Sun)</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Time Slot</label>
              <Input
                placeholder="e.g. 10:00 AM - 12:00 PM"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white">
                Create Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
