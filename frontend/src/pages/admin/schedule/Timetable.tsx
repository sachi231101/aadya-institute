import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  UserCheck, 
  BookOpen,
  Filter,
  Loader2,
  Edit,
  CheckCircle2
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
import type { ClassSession, ClassMode, ClassStatus } from "../../../types/schedule.types";

export const Timetable: React.FC = () => {
  const { classes, isLoading, fetchClasses } = useScheduleStore();
  const { batches, fetchBatches } = useCourseStore();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];

  useEffect(() => {
    fetchClasses();
    fetchBatches();
  }, []);

  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("ALL");
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  const filteredClasses = classes.filter((cls) => {
    const matchesBatch = selectedBatch === "ALL" || cls.batchId === selectedBatch;
    const matchesFaculty = selectedFaculty === "ALL" || cls.facultyId === selectedFaculty;
    return matchesBatch && matchesFaculty;
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime.split(' ')[0]}`);
    const dateB = new Date(`${b.date}T${b.startTime.split(' ')[0]}`);
    return dateA.getTime() - dateB.getTime();
  });

  const getDayName = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getStatusBadge = (st: ClassStatus) => {
    switch (st) {
      case "ONGOING":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Ongoing</Badge>;
      case "UPCOMING":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Academy Timetable</h2>
          <p className="text-sm text-text-secondary">
            Weekly data view of classes assigned to each faculty with editing access.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary whitespace-nowrap">
            <Filter className="h-4 w-4 text-[#1769AA]" />
            <span>Filter Timetable View:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA] min-w-[200px]"
            >
              <option value="ALL">All Cohort Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA] min-w-[200px]"
            >
              <option value="ALL">All Faculties</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table Grid */}
      <Card className="border-border/50 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">Date & Time</TableHead>
              <TableHead className="font-semibold text-slate-700">Faculty</TableHead>
              <TableHead className="font-semibold text-slate-700">Class & Batch</TableHead>
              <TableHead className="font-semibold text-slate-700">Location/Mode</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                    Loading academy timetable...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((cls) => (
                <TableRow key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        {cls.date} <span className="text-xs text-slate-500">({getDayName(cls.date)})</span>
                      </span>
                      <span className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {cls.startTime} - {cls.endTime}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      {cls.facultyName}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        {cls.title}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] text-[#1769AA] border-blue-200 bg-blue-50">
                          {cls.batchCode}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cls.roomNo}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                        {cls.mode}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(cls.status)}
                      {cls.attendanceMarked && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3" /> Marked
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#1769AA] hover:text-[#1769AA] hover:bg-blue-50"
                      onClick={() => setEditingSession(cls)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  No class sessions found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {editingSession && (
        <EditClassModal 
          session={editingSession} 
          onClose={() => setEditingSession(null)} 
        />
      )}
    </div>
  );
};
