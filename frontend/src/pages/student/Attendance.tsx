import React, { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  Check,
  X,
  Clock,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import {
  useStudentAttendanceHistory,
  useStudentAttendanceSummary,
} from "@/hooks/useAttendance";
import { PageContainer, PageHeader, FilterToolbar, PageSection } from "@/components/layout";
import type { StudentAttendanceHistoryItem } from "@/types/attendance.types";

type MatrixStatus = "P" | "A" | "L";
type HistoryStatus = "PRESENT" | "ABSENT" | "LEAVE";
type HistoryFilter = "ALL" | HistoryStatus;

interface SubjectAttendanceData {
  id: string;
  name: string;
  attended: number;
  total: number;
  missed: number;
  leave: number;
  matrix: {
    month: string;
    year: number;
    days: Record<number, MatrixStatus | null>;
  }[];
}

interface HistoryRow {
  id: string;
  date: string;
  dateValue: Date | null;
  timeSlot: string;
  topic: string;
  moduleName: string;
  batchCode: string;
  courseName: string;
  facultyName: string;
  status: HistoryStatus;
  remarks: string;
}

const DAYS_HEADER = Array.from({ length: 31 }, (_, i) => i + 1);
const ALL_SUBJECT_ID = "all";

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const defaultStartDate = (): string => {
  const today = new Date();
  return toIsoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1));
};

const defaultEndDate = (): string => toIsoDate(new Date());

const parseLocalDate = (isoDate: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const listMonthsInRange = (start: string, end: string): { month: string; year: number; monthIndex: number }[] => {
  const startDate = parseLocalDate(start) ?? new Date();
  const endDate = parseLocalDate(end) ?? new Date();
  const months: { month: string; year: number; monthIndex: number }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= last) {
    months.push({
      month: cursor.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.length > 0
    ? months
    : [
        {
          month: startDate.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
          year: startDate.getFullYear(),
          monthIndex: startDate.getMonth(),
        },
      ];
};

const normalizeStatus = (status?: string | null): HistoryStatus => {
  const value = String(status || "").toUpperCase();
  if (value === "PRESENT") return "PRESENT";
  if (value === "LEAVE" || value === "EXCUSED") return "LEAVE";
  return "ABSENT";
};

const statusToMatrix = (status: HistoryStatus): MatrixStatus => {
  if (status === "PRESENT") return "P";
  if (status === "LEAVE") return "L";
  return "A";
};

const pickCellStatus = (current: MatrixStatus | null | undefined, next: MatrixStatus): MatrixStatus => {
  if (!current) return next;
  if (current === "A" || next === "A") return "A";
  if (current === "L" || next === "L") return "L";
  return "P";
};

const sessionDate = (item: StudentAttendanceHistoryItem): Date | null => {
  const raw = item.classSession?.scheduledDate || item.markedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRecordCourseId = (item: StudentAttendanceHistoryItem): string | undefined =>
  item.classSession?.batchCourse?.courseId ||
  item.classSession?.batchCourse?.course?.id ||
  item.classSession?.batch?.course?.id ||
  item.classSession?.batch?.courseId;

const getRecordCourseName = (item: StudentAttendanceHistoryItem): string =>
  item.classSession?.batchCourse?.course?.name ||
  item.classSession?.batch?.course?.name ||
  item.classSession?.batch?.batchCourses?.[0]?.course?.name ||
  "";

const getRecordModuleId = (item: StudentAttendanceHistoryItem): string | undefined =>
  item.classSession?.batchModule?.courseModule?.id || item.classSession?.batchModule?.id;

const getRecordModuleName = (item: StudentAttendanceHistoryItem): string | undefined =>
  item.classSession?.batchModule?.courseModule?.name;

const recordMatchesCourse = (
  item: StudentAttendanceHistoryItem,
  course: { id: string; name: string } | null
): boolean => {
  if (!course) return true;
  const courseId = getRecordCourseId(item);
  if (courseId && courseId === course.id) return true;
  const batchCourseIds = item.classSession?.batch?.batchCourses?.map((row) => row.courseId) ?? [];
  if (batchCourseIds.includes(course.id)) return true;
  if (item.classSession?.batch?.courseId === course.id) return true;
  const name = getRecordCourseName(item);
  return Boolean(name) && name.toLowerCase() === course.name.toLowerCase();
};

const recordMatchesSubject = (
  item: StudentAttendanceHistoryItem,
  subject: { id: string; name: string }
): boolean => {
  if (subject.id === ALL_SUBJECT_ID) return true;
  const moduleId = getRecordModuleId(item);
  if (moduleId && moduleId === subject.id) return true;
  const moduleName = getRecordModuleName(item);
  if (moduleName && moduleName.toLowerCase() === subject.name.toLowerCase()) return true;
  const courseId = getRecordCourseId(item);
  if (courseId && courseId === subject.id) return true;
  const courseName = getRecordCourseName(item);
  return Boolean(courseName) && courseName.toLowerCase() === subject.name.toLowerCase();
};

const buildMatrix = (
  records: StudentAttendanceHistoryItem[],
  startDate: string,
  endDate: string
): SubjectAttendanceData["matrix"] => {
  const months = listMonthsInRange(startDate, endDate);
  return months.map((row) => {
    const days: Record<number, MatrixStatus | null> = {};
    records.forEach((item) => {
      const date = sessionDate(item);
      if (!date) return;
      if (date.getFullYear() !== row.year || date.getMonth() !== row.monthIndex) return;
      const day = date.getDate();
      days[day] = pickCellStatus(days[day], statusToMatrix(normalizeStatus(item.status)));
    });
    return { month: row.month, year: row.year, days };
  });
};

const formatTimeSlot = (start?: string | null, end?: string | null): string => {
  const from = (start || "").trim();
  const to = (end || "").trim();
  if (from && to) return `${from} - ${to}`;
  if (from) return from;
  return "Class time";
};

export const StudentAttendance: React.FC = () => {
  const academic = useStudentAcademicAccess();
  const { user } = useAuthStore();
  const studentId = academic.studentId || user?.studentId || null;

  const enrolledCourses = useMemo(() => {
    if (academic.assignedCourses && academic.assignedCourses.length > 0) {
      return academic.assignedCourses;
    }
    if (academic.primaryCourse) {
      return [academic.primaryCourse];
    }
    return [];
  }, [academic.assignedCourses, academic.primaryCourse]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    month: string;
    year: number;
    status: MatrixStatus | "OFF";
    subject: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedCourseId && enrolledCourses.length > 0) {
      setSelectedCourseId(enrolledCourses[0].id);
    }
  }, [enrolledCourses, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    if (selectedCourseId) {
      const found = enrolledCourses.find((course) => course.id === selectedCourseId);
      if (found) return found;
    }
    return enrolledCourses[0] || null;
  }, [enrolledCourses, selectedCourseId]);

  const {
    data: summaryRes,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useStudentAttendanceSummary(studentId);

  const {
    data: historyRes,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useStudentAttendanceHistory(studentId, {
    fromDate: startDate,
    toDate: endDate,
    courseId: selectedCourse?.id,
  });

  const apiSummary = summaryRes?.data ?? null;
  const apiHistory = historyRes?.data ?? [];
  const isLoading = academic.isLoading || summaryLoading || historyLoading;
  const isError = summaryError || historyError;

  const courseRecords = useMemo(
    () => apiHistory.filter((item) => recordMatchesCourse(item, selectedCourse)),
    [apiHistory, selectedCourse]
  );

  const dynamicSubjects: SubjectAttendanceData[] = useMemo(() => {
    if (!selectedCourse) return [];

    const months = listMonthsInRange(startDate, endDate);
    const emptyMatrix = months.map((row) => ({ month: row.month, year: row.year, days: {} as Record<number, MatrixStatus | null> }));

    const statsFor = (records: StudentAttendanceHistoryItem[], id: string, name: string): SubjectAttendanceData => {
      const present = records.filter((item) => normalizeStatus(item.status) === "PRESENT").length;
      const absent = records.filter((item) => normalizeStatus(item.status) === "ABSENT").length;
      const leave = records.filter((item) => normalizeStatus(item.status) === "LEAVE").length;
      const total = records.length;
      return {
        id,
        name,
        attended: present,
        total,
        missed: absent,
        leave,
        matrix: total > 0 ? buildMatrix(records, startDate, endDate) : emptyMatrix,
      };
    };

    const courseModules = academic.assignedModules.filter(
      (mod) =>
        mod.courseId === selectedCourse.id ||
        mod.courseName.toLowerCase() === selectedCourse.name.toLowerCase()
    );

    const allSubject = statsFor(courseRecords, ALL_SUBJECT_ID, selectedCourse.name);

    const moduleSubjects = courseModules
      .map((mod) => {
        const moduleRecords = courseRecords.filter((item) =>
          recordMatchesSubject(item, { id: mod.id, name: mod.name })
        );
        return statsFor(moduleRecords, mod.id, mod.name);
      })
      .filter((subject) => subject.total > 0);

    if (moduleSubjects.length === 0) {
      return [allSubject];
    }

    return [allSubject, ...moduleSubjects];
  }, [selectedCourse, academic.assignedModules, courseRecords, startDate, endDate]);

  useEffect(() => {
    if (dynamicSubjects.length === 0) return;
    const exists = dynamicSubjects.some((subject) => subject.id === selectedSubjectId);
    if (!exists || !selectedSubjectId) {
      setSelectedSubjectId(dynamicSubjects[0].id);
    }
  }, [dynamicSubjects, selectedSubjectId]);

  const currentSubject = useMemo(
    () =>
      dynamicSubjects.find((subject) => subject.id === selectedSubjectId) ||
      dynamicSubjects[0] || {
        id: "none",
        name: selectedCourse?.name || "Enrolled Course",
        attended: 0,
        total: 0,
        missed: 0,
        leave: 0,
        matrix: listMonthsInRange(startDate, endDate).map((row) => ({
          month: row.month,
          year: row.year,
          days: {},
        })),
      },
    [dynamicSubjects, selectedSubjectId, selectedCourse, startDate, endDate]
  );

  const percentage =
    currentSubject.total > 0
      ? Math.round((currentSubject.attended / currentSubject.total) * 100)
      : 0;
  const hasMarkedClasses = currentSubject.total > 0;
  const isGoodStanding = !hasMarkedClasses || percentage >= 75;

  const rawHistoryList = useMemo<HistoryRow[]>(() => {
    const subjectRecords =
      currentSubject.id === ALL_SUBJECT_ID
        ? courseRecords
        : courseRecords.filter((item) =>
            recordMatchesSubject(item, { id: currentSubject.id, name: currentSubject.name })
          );

    return subjectRecords.map((item) => {
      const date = sessionDate(item);
      const status = normalizeStatus(item.status);
      return {
        id: item.id,
        date: date
          ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        dateValue: date,
        timeSlot: formatTimeSlot(item.classSession?.startTime, item.classSession?.endTime),
        topic: item.classSession?.title || item.remarks || "Class Session",
        moduleName:
          item.classSession?.batchModule?.courseModule?.name ||
          selectedCourse?.name ||
          "Curriculum",
        batchCode: item.classSession?.batch?.code || academic.primaryBatch?.code || "—",
        courseName: getRecordCourseName(item) || selectedCourse?.name || "Enrolled Course",
        facultyName: item.classSession?.faculty?.user?.name || "Faculty",
        status,
        remarks:
          item.remarks ||
          (status === "PRESENT"
            ? "Marked Present"
            : status === "LEAVE"
              ? "Approved leave"
              : "Marked Absent"),
      };
    });
  }, [courseRecords, currentSubject, selectedCourse, academic.primaryBatch?.code]);

  const filteredHistory = useMemo(() => {
    return rawHistoryList.filter((item) => {
      if (historyFilter !== "ALL" && item.status !== historyFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.topic.toLowerCase().includes(query) ||
          item.facultyName.toLowerCase().includes(query) ||
          item.moduleName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [rawHistoryList, historyFilter, searchQuery]);

  if (academic.isLoading && enrolledCourses.length === 0) {
    return (
      <PageContainer className="animate-in fade-in duration-300 font-sans">
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-primary" />
          Loading your attendance...
        </div>
      </PageContainer>
    );
  }

  if (enrolledCourses.length === 0 && !academic.primaryCourse) {
    return (
      <PageContainer className="animate-in fade-in duration-300 font-sans">
        <div className="p-12 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-primary dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Enrolled Courses Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Attendance tracking will be available once you are enrolled in a course and assigned to a batch.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="animate-in fade-in duration-300 font-sans">
      <PageHeader
        title="Attendance"
        description="Your attendance percentage and session history."
        actions={
          <div className="flex items-center gap-2">
            {apiSummary && (
              <Badge variant="outline" className="text-xs font-medium">
                Overall {Math.round(Number(apiSummary.attendancePercentage ?? 0))}%
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-medium text-amber-800 border-amber-200 bg-amber-50">
              75% minimum for certification
            </Badge>
          </div>
        }
      />

      {enrolledCourses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Enrolled Course:</span>
          {enrolledCourses.map((course) => {
            const isCourseActive = course.id === selectedCourse?.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourseId(course.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isCourseActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                }`}
              >
                {course.name} {course.code ? `(${course.code})` : ""}
              </button>
            );
          })}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load attendance.
          <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-700" onClick={() => refetchHistory()}>
            Retry
          </Button>
        </div>
      )}

      <PageSection title="Attendance overview">
        <div className="bg-card text-foreground rounded-xl border border-border/80 shadow-xs p-5 space-y-6 overflow-hidden transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                ATTENDANCE
              </span>
              {selectedCourse && (
                <span className="text-xs font-bold text-primary dark:text-indigo-400">
                  • {selectedCourse.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
              <span className="text-blue-600 dark:text-sky-400 font-bold">→</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0 ml-1" />
            </div>
          </div>

          {dynamicSubjects.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {dynamicSubjects.map((subject) => {
                const isActive = subject.id === selectedSubjectId;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-blue-600/30 scale-102"
                        : "bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-[#1C2844] border border-slate-200/80 dark:border-slate-800/60"
                    }`}
                  >
                    {subject.id === ALL_SUBJECT_ID ? `All · ${subject.name}` : subject.name}
                  </button>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              Updating attendance...
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                      !hasMarkedClasses
                        ? "text-slate-400 dark:text-slate-500"
                        : isGoodStanding
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500 dark:text-[#F87171]"
                    }`}
                  >
                    {percentage}%
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">attended</span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {currentSubject.attended} of {currentSubject.total}
                    </strong>{" "}
                    classes attended •{" "}
                    <span className="text-slate-500 dark:text-slate-400">
                      {currentSubject.missed} missed
                      {currentSubject.leave > 0 ? ` • ${currentSubject.leave} leave` : ""}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-5 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="text-sm font-bold">✓</span>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500 dark:text-[#F87171]">
                    <span className="text-sm font-bold">✕</span>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <span className="text-sm font-bold">L</span>
                    <span>Leave</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <span className="text-base font-bold leading-none">—</span>
                    <span>No class</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto pb-3 pt-2 no-scrollbar">
                <div className="min-w-[780px] space-y-2.5">
                  <div className="grid grid-cols-[64px_repeat(31,_1fr)] gap-1 text-center items-center">
                    <div className="text-[11px] font-bold text-transparent select-none">Month</div>
                    {DAYS_HEADER.map((dayNum) => (
                      <div
                        key={dayNum}
                        className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        {dayNum}
                      </div>
                    ))}
                  </div>

                  {currentSubject.matrix.map((row) => (
                    <div
                      key={`${row.month}-${row.year}`}
                      className="grid grid-cols-[64px_repeat(31,_1fr)] gap-1 items-center"
                    >
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 pl-1">{row.month}</div>
                      {DAYS_HEADER.map((dayNum) => {
                        const status = row.days[dayNum];
                        return (
                          <div
                            key={dayNum}
                            onMouseEnter={() =>
                              setHoveredCell({
                                day: dayNum,
                                month: row.month,
                                year: row.year,
                                status: status ?? "OFF",
                                subject: currentSubject.name,
                              })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            className="h-7 rounded-md flex items-center justify-center transition-all cursor-pointer select-none group relative hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          >
                            {status === "P" && (
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold group-hover:scale-125 transition-transform">
                                ✓
                              </span>
                            )}
                            {status === "A" && (
                              <span className="text-rose-500 dark:text-[#F87171] text-xs font-semibold group-hover:scale-125 transition-transform">
                                ✕
                              </span>
                            )}
                            {status === "L" && (
                              <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold group-hover:scale-125 transition-transform">
                                L
                              </span>
                            )}
                            {status == null && (
                              <span className="text-slate-300 dark:text-slate-700/60 text-[10px] opacity-0 group-hover:opacity-40">
                                •
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                {hoveredCell ? (
                  <div className="flex items-center gap-3 animate-in fade-in">
                    <span className="text-slate-900 dark:text-slate-200 font-bold font-mono">
                      {hoveredCell.day} {hoveredCell.month} {hoveredCell.year}
                    </span>
                    <span>•</span>
                    <span>
                      Subject: <strong className="text-blue-600 dark:text-sky-400">{hoveredCell.subject}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status:{" "}
                      {hoveredCell.status === "P" ? (
                        <strong className="text-emerald-600 dark:text-emerald-400">✓ PRESENT</strong>
                      ) : hoveredCell.status === "A" ? (
                        <strong className="text-rose-600 dark:text-rose-400">✕ ABSENT</strong>
                      ) : hoveredCell.status === "L" ? (
                        <strong className="text-amber-600 dark:text-amber-400">LEAVE</strong>
                      ) : (
                        <strong className="text-slate-400 dark:text-slate-500">— No class scheduled</strong>
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="italic text-slate-400 dark:text-slate-500">
                    Hover over any date cell in the grid to view session details
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  {currentSubject.name} Cohort Attendance
                </span>
              </div>
            </>
          )}
        </div>
      </PageSection>

      <PageSection title="Session history">
        <Card className="bg-card border-border/80 shadow-xs rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs w-fit">
              {filteredHistory.length} Sessions Logged
            </Badge>

            <FilterToolbar>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
                {(["ALL", "PRESENT", "ABSENT", "LEAVE"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHistoryFilter(tab)}
                    className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      historyFilter === tab
                        ? "bg-primary text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topic or faculty..."
                  className="pl-8 h-9 text-xs bg-muted/30 border-border rounded-lg"
                />
              </div>
            </FilterToolbar>
          </div>

          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading session history...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No attendance records found for the selected filters.
                </div>
              ) : (
                filteredHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-[#162547]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          rec.status === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : rec.status === "ABSENT"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {rec.status === "PRESENT" && <Check className="w-5 h-5 stroke-[2.5]" />}
                        {rec.status === "ABSENT" && <X className="w-5 h-5 stroke-[2.5]" />}
                        {rec.status === "LEAVE" && <Clock className="w-5 h-5 stroke-[2.2]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {rec.topic}
                          </h4>
                          <span className="text-[11px] text-slate-400">• {rec.moduleName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>
                            Faculty: <strong className="text-slate-700 dark:text-slate-300">{rec.facultyName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Batch:{" "}
                            <strong className="font-mono text-slate-700 dark:text-slate-300">{rec.batchCode}</strong>
                          </span>
                          <span>•</span>
                          <span>Time: {rec.timeSlot}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                      <Badge
                        className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-lg border ${
                          rec.status === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : rec.status === "ABSENT"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {rec.status}
                      </Badge>
                      <span className="text-[11px] font-mono text-slate-400">{rec.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
};
