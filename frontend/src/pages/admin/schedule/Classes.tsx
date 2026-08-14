import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  MoreVertical, 
  Trash2, 
  MapPin,
  XCircle,
  Loader2
} from "lucide-react";
import { useScheduleStore } from "../../../store/schedule.store";
import { useCourseStore } from "../../../store/course.store";
import { useFacultyList } from "../../../hooks/useFaculty";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClassMode, ClassStatus } from "../../../types/schedule.types";

export const Classes: React.FC = () => {
  const { classes, isLoading, fetchClasses, addClassSession, deleteClassSession, cancelClassSession, toggleAttendanceMarked } = useScheduleStore();
  const { courses, batches, fetchCourses, fetchBatches } = useCourseStore();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchBatches();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Class
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [facultyId, setFacultyId] = useState(facultyList[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [roomNo, setRoomNo] = useState("Lab 201");
  const [mode, setMode] = useState<ClassMode>("OFFLINE");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      !searchTerm ||
      (cls.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.batchCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.courseName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.facultyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.roomNo || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === "ALL" || cls.mode === modeFilter;
    const matchesStatus = statusFilter === "ALL" || cls.status === statusFilter;

    return matchesSearch && matchesMode && matchesStatus;
  });

  const totalClasses = classes.length;
  const ongoingCount = classes.filter((c) => c.status === "ONGOING").length;
  const completedCount = classes.filter((c) => c.status === "COMPLETED").length;
  const attendanceMarkedCount = classes.filter((c) => c.attendanceMarked).length;
  const attendancePercent = totalClasses > 0 ? Math.round((attendanceMarkedCount / totalClasses) * 100) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBatchId = batchId || batches[0]?.id;
    const effectiveFacultyId = facultyId || facultyList[0]?.id;
    const selectedCourse = courses.find((c) => c.id === courseId);
    if (!title || !effectiveBatchId || !effectiveFacultyId || !date) return;

    await addClassSession({
      title,
      batchId: effectiveBatchId,
      batchModuleId: selectedCourse ? undefined : undefined,
      facultyId: effectiveFacultyId,
      scheduledDate: date,
      startTime,
      endTime,
      roomNo,
      mode,
      meetingUrl,
      notes,
    });

    setTitle("");
    setNotes("");
    setMeetingUrl("");
    setShowModal(false);
  };

  const getStatusBadge = (st: ClassStatus) => {
    switch (st) {
      case "ONGOING":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 animate-pulse">● Ongoing</Badge>;
      case "UPCOMING":
        return <Badge variant="warning">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const getModeBadge = (md: ClassMode) => {
    switch (md) {
      case "OFFLINE":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Campus</Badge>;
      case "ONLINE":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Online</Badge>;
      case "HYBRID":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Hybrid</Badge>;
      default:
        return <Badge variant="outline">{md}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Class Sessions</h2>
          <p className="text-sm text-text-secondary">
            Manage daily lectures, lab schedules, room allocations, and attendance marking.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule New Class
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Scheduled</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalClasses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Ongoing Right Now</p>
              <h3 className="text-2xl font-bold text-text-primary">{ongoingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Completed Sessions</p>
              <h3 className="text-2xl font-bold text-text-primary">{completedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Attendance Marked</p>
              <h3 className="text-2xl font-bold text-text-primary">{attendancePercent}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by topic title, batch, faculty, course, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Modes</option>
                <option value="OFFLINE">Campus</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ONGOING">Ongoing</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Classes Data Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Class Topic & Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Batch Code</TableHead>
                  <TableHead className="font-semibold text-text-primary">Instructor</TableHead>
                  <TableHead className="font-semibold text-text-primary">Date & Time Slot</TableHead>
                  <TableHead className="font-semibold text-text-primary">Location / Link</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                        Loading class sessions...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-text-primary text-sm block">
                            {cls.title}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {cls.courseName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs text-[#1769AA] border-blue-200 bg-blue-50">
                          {cls.batchCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary font-medium">
                        {cls.facultyName}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-800 block">{cls.date}</span>
                          <span className="text-[11px] text-slate-500 block">{cls.startTime} - {cls.endTime}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.roomNo}</span>
                          </div>
                          {getModeBadge(cls.mode)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(cls.status)}
                          {cls.attendanceMarked ? (
                            <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Attendance Marked
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">Attendance Pending</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                            <DropdownMenuLabel>Session Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => toggleAttendanceMarked(cls.id)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Toggle Attendance Status
                            </DropdownMenuItem>
                            {cls.status !== "CANCELLED" && (
                              <DropdownMenuItem 
                                className="text-amber-600"
                                onClick={() => cancelClassSession(cls.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Class
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteClassSession(cls.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Session
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No class sessions found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Scheduling New Class */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1769AA]" />
              Schedule New Class
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Topic / Lecture Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Express Router & Middleware Pipeline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Batch *</label>
                <select
                  value={batchId}
                  onChange={(e) => {
                    setBatchId(e.target.value);
                    const b = batches.find((item) => item.id === e.target.value);
                    if (b) setCourseId(b.courseId);
                  }}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Faculty *</label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                >
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <Input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="bg-white border-slate-300 text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <Input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="bg-white border-slate-300 text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ClassMode)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="OFFLINE">Campus Offline</option>
                    <option value="ONLINE">Online Virtual</option>
                    <option value="HYBRID">Hybrid Mode</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Lab Allocation</label>
                  <Input
                    type="text"
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    placeholder="Lab 201"
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {mode !== "OFFLINE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Virtual Meeting URL</label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/xyz-aadya"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                >
                  Schedule Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
