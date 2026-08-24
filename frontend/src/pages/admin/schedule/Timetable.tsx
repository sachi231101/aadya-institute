import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Filter, 
  Edit3,
  BookOpen
} from "lucide-react";
import { useScheduleStore } from "../../../store/schedule.store";
import { useCourseStore } from "../../../store/course.store";
import { useFacultyList } from "../../../hooks/useFaculty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditClassModal } from "./EditClassModal";
import type { ClassSession } from "../../../types/schedule.types";

const INITIAL_TIMETABLE_ROWS: ClassSession[] = [
  {
    id: "tt-1",
    title: "Class Session",
    batchId: "b-wd-a",
    batchCode: "WD-2026-A",
    courseId: "c-fs",
    courseName: "Full Stack Web Development",
    facultyId: "f-1",
    facultyName: "HM Adithya",
    facultyDesignation: "Senior Instructor",
    date: "2026-08-13",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 101",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "tt-2",
    title: "Class Session",
    batchId: "b-wd-a",
    batchCode: "WD-2026-A",
    courseId: "c-fs",
    courseName: "Full Stack Web Development",
    facultyId: "f-1",
    facultyName: "HM Adithya",
    facultyDesignation: "Senior Instructor",
    date: "2026-08-14",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 101",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "tt-3",
    title: "Class Session",
    batchId: "b-wd-a",
    batchCode: "WD-2026-A",
    courseId: "c-fs",
    courseName: "Full Stack Web Development",
    facultyId: "f-1",
    facultyName: "HM Adithya",
    facultyDesignation: "Senior Instructor",
    date: "2026-08-19",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 101",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "tt-4",
    title: "Class Session",
    batchId: "b-js-a",
    batchCode: "JS-2026-A",
    courseId: "c-js",
    courseName: "JavaScript Essentials",
    facultyId: "f-2",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Senior Instructor",
    date: "2026-08-20",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Lab 1",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "tt-5",
    title: "Class Session",
    batchId: "b-re-a",
    batchCode: "RE-2026-A",
    courseId: "c-re",
    courseName: "React JS Development",
    facultyId: "f-3",
    facultyName: "Priya Sharma",
    facultyDesignation: "Assistant Professor",
    date: "2026-08-21",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 102",
    mode: "OFFLINE",
    status: "ONGOING",
    attendanceMarked: false,
  },
];

export const Timetable: React.FC = () => {
  const { classes: serverClasses, fetchClasses } = useScheduleStore();
  const { batches, fetchBatches } = useCourseStore();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];

  // Local timetable state for immediate interactive editing
  const [localRows, setLocalRows] = useState<ClassSession[]>(INITIAL_TIMETABLE_ROWS);

  useEffect(() => {
    fetchClasses();
    fetchBatches();
  }, []);

  // Synchronize server classes if available
  useEffect(() => {
    if (serverClasses && serverClasses.length > 0) {
      setLocalRows((prev) => {
        // Merge server classes while preserving any existing local demo rows
        const ids = new Set(serverClasses.map((c) => c.id));
        const customRows = prev.filter((p) => !ids.has(p.id));
        return [...serverClasses, ...customRows];
      });
    }
  }, [serverClasses]);

  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("ALL");
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // Filtered dataset
  const filteredRows = useMemo(() => {
    return localRows.filter((cls) => {
      const matchesBatch =
        selectedBatch === "ALL" ||
        cls.batchId === selectedBatch ||
        cls.batchCode.toLowerCase() === selectedBatch.toLowerCase();

      const matchesFaculty =
        selectedFaculty === "ALL" ||
        cls.facultyId === selectedFaculty ||
        cls.facultyName.toLowerCase() === selectedFaculty.toLowerCase();

      return matchesBatch && matchesFaculty;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${(a.startTime || "00:00").split(" ")[0]}`).getTime();
      const dateB = new Date(`${b.date}T${(b.startTime || "00:00").split(" ")[0]}`).getTime();
      return (dateA || 0) - (dateB || 0);
    });
  }, [localRows, selectedBatch, selectedFaculty]);

  const getDayName = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "Thu";
      return d.toLocaleDateString("en-US", { weekday: "short" });
    } catch {
      return "Thu";
    }
  };

  const handleSaveSession = (updated: ClassSession) => {
    setLocalRows((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  // Distinct batch list for dropdown
  const batchOptions = useMemo(() => {
    const defaultBatchCodes = [
      { id: "b-wd-a", code: "WD-2026-A", name: "Batch WD-2026-A" },
      { id: "b-js-a", code: "JS-2026-A", name: "Batch JS-2026-A" },
      { id: "b-re-a", code: "RE-2026-A", name: "Batch RE-2026-A" },
      { id: "b-wd-b", code: "WD-2026-B", name: "Batch WD-2026-B" },
      { id: "b-js-b", code: "JS-2026-B", name: "Batch JS-2026-B" },
    ];
    if (batches && batches.length > 0) {
      return batches.map((b) => ({ id: b.id, code: b.code, name: `${b.name} (${b.code})` }));
    }
    return defaultBatchCodes;
  }, [batches]);

  // Distinct faculty list for dropdown
  const facultyOptions = useMemo(() => {
    const defaultFaculty = [
      { id: "f-1", name: "HM Adithya" },
      { id: "f-2", name: "Ramesh Kumar" },
      { id: "f-3", name: "Priya Sharma" },
      { id: "f-4", name: "Suresh Babu" },
      { id: "f-5", name: "Neha Patil" },
    ];
    if (facultyList && facultyList.length > 0) {
      return facultyList.map((f) => ({
        id: f.id,
        name: f.user?.name || (f as any).name || "Faculty",
      }));
    }
    return defaultFaculty;
  }, [facultyList]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6 text-slate-800 font-sans">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          Academy Timetable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Weekly data view of classes assigned to each faculty with editing access.
        </p>
      </div>

      {/* ── Filter Controls Card ────────────────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 whitespace-nowrap">
            <Filter className="w-4 h-4 text-[#1769AA]" />
            <span>Filter Timetable View:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Cohort Batches Selector */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-colors appearance-none cursor-pointer"
              >
                <option value="ALL">All Cohort Batches</option>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Faculties Selector */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-colors appearance-none cursor-pointer"
              >
                <option value="ALL">All Faculties</option>
                {facultyOptions.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Timetable Table Grid ────────────────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4 pl-6">
                  Date & Time
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Faculty
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Class & Batch
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Location/Mode
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4 pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No class sessions found</p>
                      <p className="text-xs text-slate-400">No timetable entries match the selected batch or faculty filter.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBatch("ALL");
                          setSelectedFaculty("ALL");
                        }}
                        className="mt-2 text-xs"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((cls) => {
                  const day = getDayName(cls.date);
                  return (
                    <TableRow 
                      key={cls.id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Date & Time */}
                      <TableCell className="py-4 pl-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.date}</span>
                            <span className="text-slate-500 font-normal">({day})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.startTime} – {cls.endTime}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 2: Faculty */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <User className="w-4 h-4 text-slate-400 stroke-[2]" />
                          <span>{cls.facultyName}</span>
                        </div>
                      </TableCell>

                      {/* Column 3: Class & Batch */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 text-sm block group-hover:text-[#1769AA] transition-colors">
                            {cls.title || "Class Session"}
                          </span>
                          <div>
                            <Badge 
                              variant="outline" 
                              className="bg-blue-50/80 text-[#1769AA] border-blue-200 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            >
                              {cls.batchCode}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 4: Location/Mode */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.roomNo || "Room 101"}</span>
                          </div>
                          <div>
                            <Badge 
                              variant="outline" 
                              className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase"
                            >
                              {cls.mode}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 5: Status */}
                      <TableCell className="py-4">
                        {cls.status === "UPCOMING" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200/50">
                            Upcoming
                          </span>
                        )}
                        {cls.status === "ONGOING" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200/50">
                            Ongoing
                          </span>
                        )}
                        {cls.status === "COMPLETED" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100/80 text-purple-800 border border-purple-200/50">
                            Completed
                          </span>
                        )}
                        {cls.status === "CANCELLED" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100/80 text-rose-800 border border-rose-200/50">
                            Cancelled
                          </span>
                        )}
                      </TableCell>

                      {/* Column 6: Actions (Edit Button) */}
                      <TableCell className="py-4 pr-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingSession(cls)}
                          className="h-8 px-3 text-[#1769AA] hover:text-[#145a92] hover:bg-blue-50 font-semibold text-xs rounded-lg gap-1.5 transition-colors inline-flex items-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Edit Class Modal ─────────────────────────────────────────────────── */}
      {editingSession && (
        <EditClassModal 
          session={editingSession} 
          onClose={() => setEditingSession(null)}
          onSave={handleSaveSession}
        />
      )}
    </div>
  );
};
