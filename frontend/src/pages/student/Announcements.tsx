import React, { useState, useMemo, useEffect } from "react";
import {
  Megaphone,
  Bell,
  Search,
  CheckCheck,
  Calendar,
  Clock,
  User,
  Paperclip,
  Eye,
  Download,
  AlertCircle,
  BookOpen,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  FileText,
  X,
  Briefcase,
  GraduationCap,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useAnnouncementStore } from "@/store/announcement.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import type { AnnouncementItem, AuthorRole } from "@/store/announcement.store";

export const StudentAnnouncements: React.FC = () => {
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const { announcements, markAsRead, markAllAsRead } = useAnnouncementStore();

  const studentId = academic.studentId || user?.id || "std-current";
  const studentName = academic.studentName || user?.name || "Student";
  const enrolledCourse = academic.primaryCourse?.name || "Enrolled Program";
  const enrolledBatch = academic.primaryBatch?.name || "Assigned Batch";

  // Filter States
  const [activeTab, setActiveTab] = useState<
    "All" | "Faculty" | "Counsellor" | "Unread" | "Important"
  >("All");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<AnnouncementItem | null>(null);

  // Filter announcements strictly by student's enrolled course/batch and Published status
  const studentAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      // Must be Published (students never see drafts)
      if (a.status !== "Published") return false;

      // Strict course & batch isolation (or matches student's enrolled batch)
      const matchesBatch =
        (a.batchName && academic.isAuthorizedForBatch(a.batchName)) ||
        (a.batchCode && academic.isAuthorizedForBatch(a.batchCode)) ||
        (a.courseName && academic.isAuthorizedForCourse(a.courseName)) ||
        (a.targetRole === "ALL" || a.targetRole === "STUDENT");

      if (!matchesBatch) return false;

      // Search query
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.facultyDesignation.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Batch filter
      if (selectedBatchFilter !== "ALL" && a.batchName !== selectedBatchFilter) {
        return false;
      }

      // Tabs filter
      if (activeTab === "Faculty" && a.authorRole !== "Faculty") return false;
      if (activeTab === "Counsellor" && a.authorRole !== "Counsellor") return false;

      const isReadByMe = a.readBy.some((r) => r.studentId === studentId);
      if (activeTab === "Unread" && isReadByMe) return false;
      if (activeTab === "Important" && !a.isImportant) return false;

      return true;
    });
  }, [
    announcements,
    enrolledBatch,
    enrolledCourse,
    studentId,
    searchQuery,
    selectedBatchFilter,
    activeTab,
  ]);

  // Set default selected announcement
  useEffect(() => {
    if (studentAnnouncements.length > 0) {
      if (
        !selectedAnnouncementId ||
        !studentAnnouncements.some((a) => a.id === selectedAnnouncementId)
      ) {
        setSelectedAnnouncementId(studentAnnouncements[0].id);
      }
    }
  }, [studentAnnouncements, selectedAnnouncementId]);

  // Currently selected announcement
  const selectedAnnouncement = useMemo(() => {
    return (
      studentAnnouncements.find((a) => a.id === selectedAnnouncementId) ||
      studentAnnouncements[0] ||
      null
    );
  }, [studentAnnouncements, selectedAnnouncementId]);

  // Automatically mark as read when selecting
  useEffect(() => {
    if (selectedAnnouncement) {
      const isReadByMe = selectedAnnouncement.readBy.some(
        (r) => r.studentId === studentId
      );
      if (!isReadByMe) {
        markAsRead(selectedAnnouncement.id, studentId, studentName);
      }
    }
  }, [selectedAnnouncement?.id, studentId, studentName, markAsRead]);

  // Check student's read status on selected item
  const myReadRecord = useMemo(() => {
    if (!selectedAnnouncement) return null;
    return selectedAnnouncement.readBy.find((r) => r.studentId === studentId);
  }, [selectedAnnouncement, studentId]);

  // Handle Mark All As Read
  const handleMarkAllRead = () => {
    markAllAsRead(studentId, studentName, selectedBatchFilter !== "ALL" ? selectedBatchFilter : undefined);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto animate-in fade-in duration-300">
      {/* ─── LIVE NOTIFICATION BANNER (When newest announcement is present) ─── */}
      {bannerNotice && (
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
                New Announcement
              </span>
              <h4 className="text-sm font-black mt-0.5">{bannerNotice.title}</h4>
              <p className="text-xs text-blue-100 line-clamp-1">{bannerNotice.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setSelectedAnnouncementId(bannerNotice.id);
                setBannerNotice(null);
              }}
              className="h-8 px-3.5 bg-white text-[#1D4ED8] hover:bg-blue-50 text-xs font-bold rounded-xl"
            >
              View Announcement
            </Button>
            <button
              onClick={() => setBannerNotice(null)}
              className="p-1.5 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Announcements
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stay updated with important announcements from your Faculty and Counsellor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            className="h-9 px-3.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border-slate-200 gap-1.5 shadow-2xs cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[#1D4ED8]" />
            <span>Mark all as read</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. TWO-COLUMN WORKSPACE ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[760px] items-start">
        {/* ─── LEFT COLUMN: ANNOUNCEMENT LIST (5 cols) ─── */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-col h-full overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search announcements by title, faculty, or counsellor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-slate-50 border-slate-200/80 rounded-xl font-medium focus:bg-white focus:ring-1 focus:ring-[#1D4ED8]"
              />
            </div>

            {/* Filter Tabs & Batch Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {(["All", "Faculty", "Counsellor", "Unread", "Important"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="h-8 px-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer shrink-0"
              >
                <option value="ALL">All My Batches</option>
                <option value={enrolledBatch}>{enrolledBatch}</option>
              </select>
            </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {studentAnnouncements.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-64">
                <Megaphone className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No announcements found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  You're all caught up with your updates!
                </p>
              </div>
            ) : (
              studentAnnouncements.map((item) => {
                const isSelected = item.id === selectedAnnouncement?.id;
                const isRead = item.readBy.some((r) => r.studentId === studentId);
                const isCounsellor = item.authorRole === "Counsellor";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnnouncementId(item.id)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-l-[#1D4ED8]"
                        : "hover:bg-slate-50/70 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Unread Red Dot or Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`h-9 w-9 rounded-xl ${
                          isCounsellor ? "bg-emerald-50 text-emerald-700" : item.iconBg
                        } ${isCounsellor ? "" : item.iconColor} flex items-center justify-center`}
                      >
                        {isCounsellor ? (
                          <Briefcase className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Megaphone className="h-4 w-4" />
                        )}
                      </div>
                      {!isRead && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h3
                            className={`text-xs truncate ${
                              !isRead
                                ? "font-black text-slate-900"
                                : "font-bold text-slate-800"
                            }`}
                          >
                            {item.title}
                          </h3>
                          {!isRead && (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase shrink-0">
                              New
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {item.publishedAt?.split(",")[1] || "10:30 AM"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5 text-[10px]">
                        {/* Author Role Badge */}
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                            isCounsellor
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {item.authorRole || "Faculty"}
                        </span>
                        <span className="font-bold text-slate-700">{item.facultyName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{item.facultyDesignation}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[#1D4ED8] font-bold">{item.batchName}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing {studentAnnouncements.length} of {studentAnnouncements.length} announcements
            </span>
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
                Page 1
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: ANNOUNCEMENT DETAILS (7 cols) ─── */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-6 flex flex-col justify-between h-full overflow-y-auto">
          {selectedAnnouncement ? (
            <div className="space-y-6">
              {/* Top Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedAnnouncement.authorRole === "Counsellor"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-blue-50 text-[#1D4ED8] border border-blue-200"
                    }`}
                  >
                    {selectedAnnouncement.type}
                  </span>
                  {selectedAnnouncement.isImportant && (
                    <Badge className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200">
                      Important
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt}</span>
                </div>
              </div>

              {/* Title & Author Info */}
              <div className="space-y-3">
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  📢 {selectedAnnouncement.title}
                </h2>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
                  <div
                    className={`h-11 w-11 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-xs ${
                      selectedAnnouncement.authorRole === "Counsellor"
                        ? "bg-gradient-to-tr from-emerald-600 to-teal-600"
                        : "bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6]"
                    }`}
                  >
                    {selectedAnnouncement.facultyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Posted By {selectedAnnouncement.authorRole || "Faculty"}
                    </span>
                    <h4 className="text-xs font-black text-slate-900">
                      {selectedAnnouncement.facultyName}
                    </h4>
                    <span
                      className={`text-[11px] font-bold ${
                        selectedAnnouncement.authorRole === "Counsellor"
                          ? "text-emerald-700"
                          : "text-indigo-600"
                      }`}
                    >
                      {selectedAnnouncement.facultyDesignation}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Message Content */}
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/70 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                {selectedAnnouncement.message}
              </div>

              {/* Batch & Targeting Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Targeted Batch
                  </span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedAnnouncement.batchName}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Date & Time
                  </span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt}
                  </span>
                </div>
              </div>

              {/* Attachment if present */}
              {selectedAnnouncement.attachmentName && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 font-bold text-[#1D4ED8]">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1D4ED8] flex items-center justify-center">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-slate-900 font-bold">
                        {selectedAnnouncement.attachmentName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {selectedAnnouncement.attachmentSize || "245 KB"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold text-[#1D4ED8] bg-white border-blue-200 hover:bg-blue-50 rounded-xl gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>View / Download</span>
                  </Button>
                </div>
              )}

              {/* Read & Sent Stats & Personal Read Timestamp */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                  <span>
                    <strong className="text-slate-900 font-black">
                      {selectedAnnouncement.sentCount}
                    </strong>{" "}
                    Sent
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-900 font-black">
                      {selectedAnnouncement.readCount}
                    </strong>{" "}
                    Read
                  </span>
                </div>

                {myReadRecord && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>You read this at {myReadRecord.readAt}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Megaphone className="h-12 w-12 text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-600">Select an announcement to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
