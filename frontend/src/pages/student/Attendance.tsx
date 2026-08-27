import React, { useState, useMemo } from "react";
import {
  Calendar,
  Check,
  X,
  Clock,
  Search,
  Filter,
  MoreVertical,
  ShieldCheck,
  ChevronDown,
  Info,
  BookOpen,
  CheckCircle2,
  XCircle,
  Download
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttendanceRecord {
  id: string;
  date: string;
  timeSlot: string;
  topic: string;
  moduleName: string;
  batchCode: string;
  courseName: string;
  facultyName: string;
  facultyAvatar?: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "NO_CLASS";
  remarks: string;
  markedAt: string;
}

interface DualTrackDay {
  dayInitial: string;
  dateStr: string;
  displayDate: string;
  dotTop: "PRESENT" | "ABSENT" | "EXCUSED" | "NO_CLASS";
  dotBottom: "PRESENT" | "ABSENT" | "EXCUSED" | "NO_CLASS";
  topicTop?: string;
  topicBottom?: string;
}

// 24 Day Columns with dual-track dots matching the screenshot precisely
const DUAL_TRACK_TIMELINE: DualTrackDay[] = [
  { dayInitial: "M", dateStr: "2026-07-14", displayDate: "14 Jul", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Intro to SEO", topicBottom: "Lab: Keyword Discovery" },
  { dayInitial: "T", dateStr: "2026-07-15", displayDate: "15 Jul", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Market Research", topicBottom: "Lab: Competitor Analysis" },
  { dayInitial: "W", dateStr: "2026-07-16", displayDate: "16 Jul", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Search Intent", topicBottom: "Lab: Search Console Setup" },
  { dayInitial: "T", dateStr: "2026-07-17", displayDate: "17 Jul", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Content Strategy", topicBottom: "Lab: Copywriting Practice" },
  { dayInitial: "F", dateStr: "2026-07-18", displayDate: "18 Jul", dotTop: "PRESENT", dotBottom: "NO_CLASS", topicTop: "Lecture: Backlinks & DA", topicBottom: "No Afternoon Session" },
  { dayInitial: "S", dateStr: "2026-07-19", displayDate: "19 Jul", dotTop: "NO_CLASS", dotBottom: "EXCUSED", topicTop: "Weekend Self-Study", topicBottom: "Special Q&A (Excused)" },
  { dayInitial: "S", dateStr: "2026-07-20", displayDate: "20 Jul", dotTop: "NO_CLASS", dotBottom: "PRESENT", topicTop: "Sunday Review", topicBottom: "Evening Practice" },
  { dayInitial: "M", dateStr: "2026-07-21", displayDate: "21 Jul", dotTop: "EXCUSED", dotBottom: "PRESENT", topicTop: "Morning Lab (Excused)", topicBottom: "Lecture: Technical SEO" },
  { dayInitial: "M", dateStr: "2026-07-22", displayDate: "22 Jul", dotTop: "PRESENT", dotBottom: "EXCUSED", topicTop: "Lecture: Indexing & Crawling", topicBottom: "Lab Session (Excused)" },
  { dayInitial: "W", dateStr: "2026-07-23", displayDate: "23 Jul", dotTop: "PRESENT", dotBottom: "EXCUSED", topicTop: "Lecture: Canonical URLs", topicBottom: "Lab Practice (Excused)" },
  { dayInitial: "T", dateStr: "2026-07-24", displayDate: "24 Jul", dotTop: "EXCUSED", dotBottom: "PRESENT", topicTop: "Theory Class (Excused)", topicBottom: "Lab: Sitemaps XML" },
  { dayInitial: "W", dateStr: "2026-07-25", displayDate: "25 Jul", dotTop: "NO_CLASS", dotBottom: "PRESENT", topicTop: "Study Break", topicBottom: "Evening Hackathon" },
  { dayInitial: "T", dateStr: "2026-07-26", displayDate: "26 Jul", dotTop: "NO_CLASS", dotBottom: "NO_CLASS", topicTop: "No Class", topicBottom: "No Class" },
  { dayInitial: "F", dateStr: "2026-07-27", displayDate: "27 Jul", dotTop: "ABSENT", dotBottom: "PRESENT", topicTop: "Morning Lab (Absent)", topicBottom: "Lecture: Mobile SEO" },
  { dayInitial: "F", dateStr: "2026-07-28", displayDate: "28 Jul", dotTop: "ABSENT", dotBottom: "PRESENT", topicTop: "Lecture: Page Speed (Absent)", topicBottom: "Lab Practice" },
  { dayInitial: "S", dateStr: "2026-07-29", displayDate: "29 Jul", dotTop: "ABSENT", dotBottom: "NO_CLASS", topicTop: "Workshop (Absent)", topicBottom: "No Class" },
  { dayInitial: "S", dateStr: "2026-07-30", displayDate: "30 Jul", dotTop: "PRESENT", dotBottom: "NO_CLASS", topicTop: "Live SEO Audit", topicBottom: "No Class" },
  { dayInitial: "Y", dateStr: "2026-07-31", displayDate: "31 Jul", dotTop: "PRESENT", dotBottom: "NO_CLASS", topicTop: "Review Session", topicBottom: "No Class" },
  { dayInitial: "W", dateStr: "2026-08-01", displayDate: "01 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Google Analytics 4", topicBottom: "Lab: Event Tracking" },
  { dayInitial: "T", dateStr: "2026-08-02", displayDate: "02 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Conversion Funnels", topicBottom: "Lab: GA4 Reports" },
  { dayInitial: "F", dateStr: "2026-08-03", displayDate: "03 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Tag Manager", topicBottom: "Lab: Trigger Config" },
  { dayInitial: "S", dateStr: "2026-08-04", displayDate: "04 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Local SEO", topicBottom: "Lab: GBP Setup" },
  { dayInitial: "M", dateStr: "2026-08-05", displayDate: "05 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Link Building", topicBottom: "Lab: Outreach Templates" },
  { dayInitial: "T", dateStr: "2026-08-06", displayDate: "06 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Content Optimization", topicBottom: "Lab: Live Editing" },
  { dayInitial: "W", dateStr: "2026-08-07", displayDate: "07 Aug", dotTop: "PRESENT", dotBottom: "PRESENT", topicTop: "Lecture: Schema Data", topicBottom: "Lab: Rich Snippets" },
  { dayInitial: "T", dateStr: "2026-08-08", displayDate: "08 Aug", dotTop: "ABSENT", dotBottom: "EXCUSED", topicTop: "Lecture: Technical SEO (Absent)", topicBottom: "Lab (Excused)" },
  { dayInitial: "F", dateStr: "2026-08-09", displayDate: "09 Aug", dotTop: "NO_CLASS", dotBottom: "NO_CLASS", topicTop: "No Scheduled Class", topicBottom: "No Scheduled Class" },
  { dayInitial: "S", dateStr: "2026-08-10", displayDate: "10 Aug", dotTop: "NO_CLASS", dotBottom: "NO_CLASS", topicTop: "Public Holiday", topicBottom: "Public Holiday" },
];

const ATTENDANCE_HISTORY_DATA: AttendanceRecord[] = [
  {
    id: "att-1",
    date: "12 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "On-Page SEO Techniques",
    moduleName: "Module: SEO Fundamentals",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Active participation in session",
    markedAt: "12 Aug 2026, 11:05 AM",
  },
  {
    id: "att-2",
    date: "10 Aug 2026",
    timeSlot: "02:00 PM – 03:30 PM",
    topic: "Keyword Research Strategy",
    moduleName: "Module: SEO Fundamentals",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "Good engagement",
    markedAt: "10 Aug 2026, 02:05 PM",
  },
  {
    id: "att-3",
    date: "08 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "Technical SEO Audit",
    moduleName: "Module: Technical SEO",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "ABSENT",
    remarks: "-",
    markedAt: "08 Aug 2026, 11:00 AM",
  },
  {
    id: "att-4",
    date: "06 Aug 2026",
    timeSlot: "02:00 PM – 03:30 PM",
    topic: "Content Optimization",
    moduleName: "Module: On-Page SEO",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "EXCUSED",
    remarks: "Medical reason",
    markedAt: "06 Aug 2026, 02:10 PM",
  },
  {
    id: "att-5",
    date: "05 Aug 2026",
    timeSlot: "09:30 AM – 11:00 AM",
    topic: "Link Building Basics",
    moduleName: "Module: Off-Page SEO",
    batchCode: "DM-01",
    courseName: "Digital Marketing",
    facultyName: "Ramesh Kumar",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "NO_CLASS",
    remarks: "Public Holiday",
    markedAt: "-",
  },
];

export const StudentAttendance: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredDot, setHoveredDot] = useState<{ date: string; topic: string; status: string } | null>(null);

  // Filter records based on segmented button and search input
  const filteredRecords = useMemo(() => {
    return ATTENDANCE_HISTORY_DATA.filter((record) => {
      // Filter status
      if (selectedFilter !== "ALL" && record.status !== selectedFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTopic = record.topic.toLowerCase().includes(q);
        const matchFaculty = record.facultyName.toLowerCase().includes(q);
        const matchModule = record.moduleName.toLowerCase().includes(q);
        const matchCourse = record.courseName.toLowerCase().includes(q);
        return matchTopic || matchFaculty || matchModule || matchCourse;
      }
      return true;
    });
  }, [selectedFilter, searchQuery]);

  const renderDot = (status: "PRESENT" | "ABSENT" | "EXCUSED" | "NO_CLASS") => {
    switch (status) {
      case "PRESENT":
        return <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block shadow-2xs" />;
      case "ABSENT":
        return <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block shadow-2xs" />;
      case "EXCUSED":
        return <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block shadow-2xs" />;
      case "NO_CLASS":
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />;
    }
  };

  const renderStatusBadge = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Present
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            Absent
          </span>
        );
      case "EXCUSED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            Excused
          </span>
        );
      case "NO_CLASS":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            -- No Class
          </span>
        );
    }
  };

  const getBorderColorClass = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "PRESENT":
        return "border-l-4 border-l-[#10B981]";
      case "ABSENT":
        return "border-l-4 border-l-[#EF4444]";
      case "EXCUSED":
        return "border-l-4 border-l-[#F59E0B]";
      case "NO_CLASS":
      default:
        return "border-l-4 border-l-slate-300";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300 pb-12 font-sans">
      {/* ── 5 Horizontal Summary Cards (Matching Mockup with Left Icons) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. Total Classes */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50/90 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Total Classes
              </span>
              <div className="text-2xl font-black text-slate-900 leading-none">
                32
              </div>
              <span className="text-[11px] font-medium text-slate-400 block pt-0.5">
                Scheduled
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Present */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50/90 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Present
              </span>
              <div className="text-2xl font-black text-slate-900 leading-none">
                26
              </div>
              <span className="text-[11px] font-bold text-emerald-600 block pt-0.5">
                81.25%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Absent */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50/90 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
              <XCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Absent
              </span>
              <div className="text-2xl font-black text-slate-900 leading-none">
                4
              </div>
              <span className="text-[11px] font-bold text-slate-600 block pt-0.5">
                12.50%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Excused */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50/90 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Excused
              </span>
              <div className="text-2xl font-black text-slate-900 leading-none">
                2
              </div>
              <span className="text-[11px] font-bold text-slate-600 block pt-0.5">
                6.25%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 5. Attendance Rate (with Gauge on Right) */}
        <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md transition-shadow sm:col-span-2 md:col-span-3 lg:col-span-1">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Attendance Rate
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                81.25%
              </div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 pt-0.5">
                <span>✓</span> Good Standing
              </span>
            </div>

            {/* Circular Gauge Ring */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0284C7]"
                  strokeDasharray="81.25, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-800">
                81%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance Overview (Last 30 Days) Dual-Track Consistency Card ──── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Card Header with Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5B50EC] flex items-center justify-center text-white shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Attendance Overview</span>
                  <span className="text-slate-500 font-medium text-sm">(Last 30 Days)</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 text-xs font-semibold text-slate-700 rounded-xl border-slate-200/80 bg-white hover:bg-slate-50 gap-2 shadow-2xs"
              >
                <span>Last 30 Days</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </div>
          </div>

          {/* Dual-Track Visual Grid with Legend */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 overflow-x-auto pb-2 no-scrollbar">
            {/* Timeline Track */}
            <div className="space-y-3 min-w-[620px] flex-1">
              {/* Day Columns Container */}
              <div className="flex items-center justify-between w-full">
                {DUAL_TRACK_TIMELINE.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    {/* Day Initial */}
                    <span className="text-[11px] font-bold text-slate-400 uppercase select-none block">
                      {day.dayInitial}
                    </span>
                    {/* Track 1 Dot (Morning) */}
                    <div
                      onMouseEnter={() => setHoveredDot({ date: `${day.displayDate} (Morning)`, topic: day.topicTop || "Regular Session", status: day.dotTop })}
                      onMouseLeave={() => setHoveredDot(null)}
                      className="p-0.5 cursor-pointer transition-transform hover:scale-135"
                    >
                      {renderDot(day.dotTop)}
                    </div>
                    {/* Track 2 Dot (Afternoon) */}
                    <div
                      onMouseEnter={() => setHoveredDot({ date: `${day.displayDate} (Afternoon)`, topic: day.topicBottom || "Practical Lab", status: day.dotBottom })}
                      onMouseLeave={() => setHoveredDot(null)}
                      className="p-0.5 cursor-pointer transition-transform hover:scale-135"
                    >
                      {renderDot(day.dotBottom)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Date Markers Row */}
              <div className="flex justify-between text-[11px] font-bold text-slate-400 pt-1 px-1">
                <span>15 Jul</span>
                <span>22 Jul</span>
                <span>29 Jul</span>
                <span>05 Aug</span>
                <span>12 Aug</span>
              </div>
            </div>

            {/* Right Legend Column */}
            <div className="flex lg:flex-col items-center lg:items-start gap-4 lg:gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-8 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                <span className="text-xs font-medium">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" />
                <span className="text-xs font-medium">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" />
                <span className="text-xs font-medium">Excused</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="text-xs font-medium">No Class</span>
              </div>
            </div>
          </div>

          {/* Interactive Hovered Day Tooltip Box */}
          {hoveredDot && (
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between text-slate-700 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                {renderDot(hoveredDot.status as any)}
                <span className="font-bold text-slate-900">{hoveredDot.date}</span>
                <span className="text-slate-400">•</span>
                <span>{hoveredDot.topic}</span>
              </div>
              <span className="font-bold uppercase text-[10px] tracking-wider text-slate-500">
                {hoveredDot.status.replace("_", " ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Segmented Filters & Search Bar (Matching Mockup) ─────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs whitespace-nowrap ${selectedFilter === "ALL"
                ? "bg-[#5B50EC] text-white shadow-indigo-200"
                : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
              }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Classes</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("PRESENT")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs whitespace-nowrap ${selectedFilter === "PRESENT"
                ? "bg-[#5B50EC] text-white shadow-indigo-200"
                : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
              }`}
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Present (26)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("ABSENT")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs whitespace-nowrap ${selectedFilter === "ABSENT"
                ? "bg-[#5B50EC] text-white shadow-indigo-200"
                : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
              }`}
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Absent (4)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("EXCUSED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs whitespace-nowrap ${selectedFilter === "EXCUSED"
                ? "bg-[#5B50EC] text-white shadow-indigo-200"
                : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
              }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Excused (2)</span>
          </button>
        </div>

        {/* Right Search Input & Filter Button */}
        <div className="flex items-center gap-2.5 flex-1 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by class or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 h-10 text-xs rounded-xl border-slate-200/80 bg-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Attendance filter modal")}
            className="h-10 px-3.5 rounded-xl border-slate-200/80 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold gap-1.5 shrink-0 shadow-2xs"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filter</span>
          </Button>
        </div>
      </div>

      {/* ── Attendance History Card & Table ───────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {/* Card Title Header */}
          <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Attendance History
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Detailed record of your class attendance.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => alert("Exporting attendance records...")}
              className="h-8 text-xs font-semibold text-slate-600 hover:text-indigo-600 gap-1.5 hidden sm:flex"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Date & Time</th>
                  <th className="py-3 px-4 sm:px-6">Class Topic & Module</th>
                  <th className="py-3 px-4 sm:px-6">Batch & Course</th>
                  <th className="py-3 px-4 sm:px-6">Faculty Instructor</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6">Remarks</th>
                  <th className="py-3 px-4 sm:px-6">Marked At</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Info className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No attendance records found</p>
                        <p className="text-xs text-slate-400">Try adjusting your filter or search terms</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${getBorderColorClass(record.status)}`}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block text-xs">
                          {record.date}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {record.timeSlot}
                        </span>
                      </td>

                      {/* Class Topic & Module */}
                      <td className="py-3.5 px-4 sm:px-6 min-w-[200px]">
                        <span className="font-bold text-slate-900 block text-xs">
                          {record.topic}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {record.moduleName}
                        </span>
                      </td>

                      {/* Batch & Course */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#1769AA] border-blue-200 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md"
                        >
                          {record.batchCode}
                        </Badge>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {record.courseName}
                        </span>
                      </td>

                      {/* Faculty Instructor */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 rounded-full border border-slate-200">
                            <AvatarImage src={record.facultyAvatar} alt={record.facultyName} />
                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                              {record.facultyName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800 text-xs">
                            {record.facultyName}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {renderStatusBadge(record.status)}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-600 text-xs max-w-xs truncate">
                        {record.remarks}
                      </td>

                      {/* Marked At */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-[11px] text-slate-500">
                        {record.markedAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 bg-white rounded-xl shadow-lg border border-slate-200 p-1">
                            <DropdownMenuItem
                              onClick={() => alert(`Viewing details for ${record.topic}`)}
                              className="text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              View Class Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => alert(`Requesting attendance review for ${record.date}`)}
                              className="text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              Request Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom Motivational Progress Section ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Motivational Banner */}
        <div className="lg:col-span-7 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] border border-indigo-100/90 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#5B50EC] flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="force-black">
            <h4 
              className="text-sm sm:text-base font-bold text-black !text-black dark:!text-black"
              style={{ color: "#000000" }}
            >
              Consistent Attendance, Strong Learning!
            </h4>
            <p 
              className="text-xs text-black !text-black dark:!text-black mt-0.5 leading-relaxed font-medium"
              style={{ color: "#000000" }}
            >
              You need at least <strong className="font-bold text-black !text-black dark:!text-black underline decoration-indigo-500/60" style={{ color: "#000000" }}>75% attendance</strong> to maintain good standing.
            </p>
          </div>
        </div>

        {/* Right Motivational Card with Student Graphic */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1 force-black">
            <div 
              className="flex items-center gap-1.5 text-xs font-bold text-black !text-black dark:!text-black"
              style={{ color: "#000000" }}
            >
              <span>You're doing great!</span>
              <span>🎉</span>
            </div>
            <p 
              className="text-[11px] text-black !text-black dark:!text-black font-medium"
              style={{ color: "#000000" }}
            >
              Keep it up and aim for 100%
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 81% Circular Progress */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#5B50EC]"
                  strokeDasharray="81.25, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-slate-800">
                81%
              </span>
            </div>

            {/* Studying Student Illustration Badge */}
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg">
              👨‍💻
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
