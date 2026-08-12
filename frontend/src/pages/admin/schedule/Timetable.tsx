import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  UserCheck, 
  BookOpen,
  Filter,
  Loader2
} from "lucide-react";
import { useScheduleStore } from "../../../store/schedule.store";
import { useCourseStore } from "../../../store/course.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Timetable: React.FC = () => {
  const { classes, isLoading, fetchClasses } = useScheduleStore();
  const { batches, fetchBatches } = useCourseStore();

  useEffect(() => {
    fetchClasses();
    fetchBatches();
  }, []);

  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");

  const filteredClasses = classes.filter((cls) => {
    return selectedBatch === "ALL" || cls.batchId === selectedBatch;
  });

  const getDayName = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Academy Timetable</h2>
          <p className="text-sm text-text-secondary">
            Weekly matrix grid view of batch schedules, faculty slots, and classroom availability.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Filter className="h-4 w-4 text-[#1769AA]" />
            <span>Filter Timetable View:</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA] w-full sm:w-64"
            >
              <option value="ALL">All Cohort Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Matrix Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-lg border border-slate-200 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
            Loading academy timetable grid...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DAYS.map((day) => {
              const dayClasses = filteredClasses.filter((cls) => {
                const dayName = getDayName(cls.date);
                return dayName === day;
              });

            return (
              <Card key={day} className="border-border/50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#1769AA]" />
                    {day}
                  </CardTitle>
                  <Badge variant="outline" className="bg-white text-slate-700 text-xs">
                    {dayClasses.length} Sessions
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {dayClasses.length > 0 ? (
                    dayClasses.map((cls) => (
                      <div 
                        key={cls.id} 
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-[#1769AA] bg-blue-50 border-blue-200">
                            {cls.batchCode}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-800">
                            {cls.mode}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {cls.title}
                        </h4>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.startTime} - {cls.endTime}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.facultyName}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.roomNo}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <BookOpen className="mx-auto h-8 w-8 text-slate-200 mb-1" />
                      <span>No classes scheduled for {day}.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
