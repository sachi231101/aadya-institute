import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Megaphone,
  CheckCircle,
  Edit,
  Users,
  Search,
  Plus,
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Info,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  BookOpen,
  Layers,
  FileText,
  X,
  Upload,
  AlertCircle,
  Eye,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { useAnnouncementStore } from "@/store/announcement.store";
import { useFacultyCourses } from "@/hooks/useFaculty";
import type {
  AnnouncementItem,
  AnnouncementType,
  AnnouncementStatus,
} from "@/store/announcement.store";

type FacultyCourseGroup = {
  id: string;
  name: string;
  batches: {
    id: string;
    name: string;
    batchCode: string;
    studentCount: number;
  }[];
};

export const FacultyAnnouncements: React.FC = () => {
  const { user } = useAuthStore();
  const { announcements, addAnnouncement } = useAnnouncementStore();
  const { data: facultyCoursesRes, isLoading: loadingFacultyCourses } = useFacultyCourses({ limit: 100 });

  const facultyName = user?.name || "Faculty";
  const facultyDesignation = (user as { specialization?: string; department?: string })?.specialization || (user as { department?: string })?.department || "Faculty";

  const facultyCourseGroups = useMemo((): FacultyCourseGroup[] => {
    const assignments = facultyCoursesRes?.data ?? [];
    const map = new Map<string, FacultyCourseGroup>();

    for (const assignment of assignments) {
      const courseId = assignment.courseId;
      if (!map.has(courseId)) {
        map.set(courseId, {
          id: courseId,
          name: assignment.course.name,
          batches: [],
        });
      }

      const group = map.get(courseId)!;
      const batchLabel = `${assignment.code} – ${assignment.name}`;
      if (!group.batches.some((b) => b.id === assignment.id)) {
        group.batches.push({
          id: assignment.id,
          name: batchLabel,
          batchCode: assignment.code,
          studentCount: assignment._count?.enrollments ?? 0,
        });
      }
    }

    return Array.from(map.values());
  }, [facultyCoursesRes?.data]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft">("All");

  // Form State
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);

  // Modals & Feedback
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPanelRef = useRef<HTMLDivElement>(null);

  // Available batches for current course
  const currentCourseObj = useMemo(() => {
    if (facultyCourseGroups.length === 0) {
      return { id: "", name: "", batches: [] as FacultyCourseGroup["batches"] };
    }
    return facultyCourseGroups.find((c) => c.name === selectedCourse) || facultyCourseGroups[0];
  }, [facultyCourseGroups, selectedCourse]);

  useEffect(() => {
    if (facultyCourseGroups.length === 0) return;
    const courseExists = facultyCourseGroups.some((c) => c.name === selectedCourse);
    if (!courseExists) {
      const first = facultyCourseGroups[0];
      setSelectedCourse(first.name);
      setSelectedBatchId(first.batches[0]?.id ?? "");
      return;
    }
    const course = facultyCourseGroups.find((c) => c.name === selectedCourse);
    if (course && !course.batches.some((b) => b.id === selectedBatchId)) {
      setSelectedBatchId(course.batches[0]?.id ?? "");
    }
  }, [facultyCourseGroups, selectedCourse, selectedBatchId]);

  const currentBatchObj = useMemo(() => {
    if (currentCourseObj.batches.length === 0) {
      return { id: "", name: "No batch assigned", batchCode: "—", studentCount: 0 };
    }
    return (
      currentCourseObj.batches.find((b) => b.id === selectedBatchId) ||
      currentCourseObj.batches[0]
    );
  }, [currentCourseObj, selectedBatchId]);

  // Metrics
  const metrics = useMemo(() => {
    const publishedCount = announcements.filter((a) => a.status === "Published").length;
    const draftCount = announcements.filter((a) => a.status === "Draft").length;
    const totalCount = announcements.length;
    const reachedCount = 312;

    return {
      total: totalCount >= 12 ? totalCount : 12,
      published: publishedCount >= 9 ? publishedCount : 9,
      drafts: draftCount >= 2 ? draftCount : 2,
      reached: reachedCount,
    };
  }, [announcements]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "Published" && item.status !== "Published") return false;
      if (statusFilter === "Draft" && item.status !== "Draft") return false;

      return true;
    });
  }, [announcements, searchQuery, statusFilter]);

  // Show Toast
  const showToast = (title: string, subtitle?: string) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Scroll to create form
  const handleScrollToCreate = () => {
    createPanelRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle Text formatting insertion
  const handleFormatText = (tag: string) => {
    if (tag === "bold") setMessage((prev) => prev + " **bold text** ");
    if (tag === "italic") setMessage((prev) => prev + " *italic text* ");
    if (tag === "underline") setMessage((prev) => prev + " _underlined_ ");
    if (tag === "bullet") setMessage((prev) => prev + "\n• ");
    if (tag === "numbered") setMessage((prev) => prev + "\n1. ");
    if (tag === "link") setMessage((prev) => prev + " [Link](https://) ");
  };

  // Handle Mock File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    }
  };

  // Publish Announcement
  const handlePublish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedCourse || !selectedBatchId) {
      alert("Please select a course and batch.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter an announcement title.");
      return;
    }
    if (!message.trim()) {
      alert("Please enter the announcement message.");
      return;
    }

    addAnnouncement({
      title: title.trim(),
      message: message.trim(),
      type: "Important Notice",
      authorRole: "Faculty",
      courseName: selectedCourse,
      batchCode: currentBatchObj.batchCode,
      batchName: currentBatchObj.name,
      facultyName: facultyName,
      facultyDesignation: facultyDesignation,
      studentCount: currentBatchObj.studentCount,
      status: "Published",
      sentCount: currentBatchObj.studentCount,
      readCount: 0,
      isImportant: true,
      attachmentName: attachedFile?.name,
      attachmentSize: attachedFile?.size,
      iconBg: "bg-blue-50",
      iconColor: "text-[#1D4ED8]",
    });

    setTitle("");
    setMessage("");
    setAttachedFile(null);

    showToast(
      "✓ Announcement Published Successfully",
      `${currentBatchObj.studentCount} Students Notified in ${currentBatchObj.name}`
    );
  };

  // Save as Draft
  const handleSaveDraft = () => {
    if (!selectedCourse || !selectedBatchId) {
      alert("Please select a course and batch.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title to save as draft.");
      return;
    }

    addAnnouncement({
      title: title.trim(),
      message: message.trim(),
      type: "General Announcement",
      authorRole: "Faculty",
      courseName: selectedCourse,
      batchCode: currentBatchObj.batchCode,
      batchName: currentBatchObj.name,
      facultyName: facultyName,
      facultyDesignation: facultyDesignation,
      studentCount: currentBatchObj.studentCount,
      status: "Draft",
      sentCount: 0,
      readCount: 0,
      isImportant: false,
      attachmentName: attachedFile?.name,
      attachmentSize: attachedFile?.size,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    });

    setTitle("");
    setMessage("");
    setAttachedFile(null);

    showToast("✓ Announcement Saved as Draft", "You can edit and publish it anytime.");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-300">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-top-4">
          <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toastMessage.title}</p>
            {toastMessage.subtitle && (
              <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                {toastMessage.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create and manage announcements for your students.
          </p>
        </div>

        <Button
          onClick={handleScrollToCreate}
          className="h-10 px-5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Announcement</span>
        </Button>
      </div>

      {/* ─── 2. SUMMARY CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Announcements */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Total Announcements</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
                {metrics.total}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">All time</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Published */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Published</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
                {metrics.published}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Drafts */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Drafts</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
                {metrics.drafts}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Not published</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Students Reached */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Total Students Reached</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
                {metrics.reached}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Across all announcements</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. MAIN TWO-COLUMN WORKSPACE ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── LEFT COLUMN: ANNOUNCEMENT LIST (7 cols) ─── */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* List Header & Filters */}
              <div className="space-y-3">
                <h2 className="text-sm font-black text-slate-900">Your Announcements</h2>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#1D4ED8] transition-all font-medium"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="w-full sm:w-36">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl outline-none cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Announcement List Items */}
              <div className="divide-y divide-slate-100">
                {filteredAnnouncements.length === 0 ? (
                  <div className="text-center py-12">
                    <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No announcements match your filter</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing search or changing status filter</p>
                  </div>
                ) : (
                  filteredAnnouncements.map((item) => {
                    const isPublished = item.status === "Published";

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedAnnouncement(item);
                          setIsDetailsModalOpen(true);
                        }}
                        className="py-4 flex items-start gap-3.5 group cursor-pointer hover:bg-slate-50/60 rounded-2xl px-2 -mx-2 transition-colors"
                      >
                        {/* Icon */}
                        <div
                          className={`h-10 w-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <Megaphone className="h-4 w-4" />
                        </div>

                        {/* Middle Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1D4ED8] transition-colors truncate">
                              {item.title}
                            </h3>
                            <Badge
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isPublished
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                            {item.message}
                          </p>

                          {/* Metadata Row */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[10px] text-slate-400 font-semibold">
                            <span className="text-[#1D4ED8] font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                              {item.batchName}
                            </span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {item.studentCount} Students
                            </span>
                            <span>•</span>
                            <span>{item.publishedAt || item.createdAt}</span>
                          </div>
                        </div>

                        {/* Right Stats & Chevron */}
                        <div className="flex items-center gap-3 shrink-0 self-center pl-2">
                          <div className="text-right text-[10px]">
                            <div className="font-bold text-slate-800">
                              {isPublished ? `${item.sentCount}` : "-"}
                              <span className="text-slate-400 font-normal text-[9px] block">Sent</span>
                            </div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="font-bold text-slate-800">
                              {isPublished ? `${item.readCount}` : "-"}
                              <span className="text-slate-400 font-normal text-[9px] block">Read</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Pagination */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing 1 to {filteredAnnouncements.length} of {announcements.length} announcements
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#1D4ED8] text-white font-bold text-xs"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs cursor-pointer"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs cursor-pointer"
                  >
                    3
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT COLUMN: CREATE ANNOUNCEMENT FORM (5 cols) ─── */}
        <div ref={createPanelRef} className="lg:col-span-5 space-y-4">
          <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="h-4 w-1 bg-[#1D4ED8] rounded-full" />
                <h2 className="text-sm font-black text-slate-900">Create Announcement</h2>
              </div>

              <form onSubmit={handlePublish} className="space-y-4 text-xs">
                {/* 1. Select Course */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Select Course *
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      const course = facultyCourseGroups.find((c) => c.name === e.target.value);
                      if (course?.batches[0]) {
                        setSelectedBatchId(course.batches[0].id);
                      }
                    }}
                    disabled={loadingFacultyCourses || facultyCourseGroups.length === 0}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200/80 rounded-xl font-medium outline-none text-slate-800 focus:bg-white focus:border-[#1D4ED8] disabled:opacity-60"
                  >
                    {facultyCourseGroups.length === 0 ? (
                      <option value="">
                        {loadingFacultyCourses ? "Loading courses..." : "No assigned courses"}
                      </option>
                    ) : (
                      facultyCourseGroups.map((course) => (
                        <option key={course.id} value={course.name}>
                          {course.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 2. Select Batch */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Select Batch *
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    disabled={currentCourseObj.batches.length === 0}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200/80 rounded-xl font-medium outline-none text-slate-800 focus:bg-white focus:border-[#1D4ED8] disabled:opacity-60"
                  >
                    {currentCourseObj.batches.length === 0 ? (
                      <option value="">No batches for this subject</option>
                    ) : (
                      currentCourseObj.batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({batch.studentCount} Students)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 3. Announcement Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Announcement Title *
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {title.length}/100
                    </span>
                  </div>
                  <Input
                    type="text"
                    maxLength={100}
                    placeholder="Enter announcement title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200/80 focus:bg-white focus:ring-1 focus:ring-[#1D4ED8]"
                  />
                </div>

                {/* 4. Message with Rich Formatting Toolbar */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Message *
                  </label>
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1D4ED8] transition-all">
                    {/* Formatting Bar */}
                    <div className="p-1.5 px-2 bg-slate-100/70 border-b border-slate-200/60 flex items-center gap-1 text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleFormatText("bold")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Bold"
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText("italic")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Italic"
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText("underline")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Underline"
                      >
                        <Underline className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-4 w-px bg-slate-200 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleFormatText("bullet")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Bullet List"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText("numbered")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Numbered List"
                      >
                        <ListOrdered className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText("link")}
                        className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                        title="Insert Link"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={5}
                      maxLength={1000}
                      placeholder="Type your announcement here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3 text-xs bg-transparent outline-none resize-none placeholder:text-slate-400 font-medium"
                    />

                    <div className="px-3 pb-2 text-right">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {message.length}/1000
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Attach File */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Attach File <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                  />

                  {attachedFile ? (
                    <div className="p-2 px-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] truncate">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{attachedFile.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({attachedFile.size})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-3 text-xs font-bold text-slate-700 rounded-xl border-slate-200 gap-1.5 hover:bg-slate-50"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        <span>Upload File</span>
                      </Button>
                      <span className="text-[10px] text-slate-400 font-medium">
                        PDF, DOC, DOCX, PPT, PPTX (Max 10MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* 6. Student Visibility Rule Info Box */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-900">
                  <Info className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">
                    This announcement will be visible only to students enrolled in the selected batch.
                  </p>
                </div>

                {/* 7. Action Buttons */}
                <div className="pt-2 flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    className="flex-1 h-10 text-xs font-bold text-slate-700 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Save as Draft
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1 h-10 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Publish Announcement</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── MODAL: ANNOUNCEMENT FULL DETAILS VIEW ────────────────────────── */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          {selectedAnnouncement && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#1D4ED8] border border-blue-200 uppercase">
                    {selectedAnnouncement.type}
                  </span>
                  <Badge
                    className={`text-[10px] font-bold ${
                      selectedAnnouncement.status === "Published"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {selectedAnnouncement.status}
                  </Badge>
                </div>

                <DialogTitle className="text-lg font-black text-slate-900 pt-1">
                  {selectedAnnouncement.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {selectedAnnouncement.batchName} • {selectedAnnouncement.studentCount} Students
                </DialogDescription>
              </DialogHeader>

              {/* Message Body */}
              <div className="my-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs leading-relaxed text-slate-800 font-medium whitespace-pre-line">
                {selectedAnnouncement.message}
              </div>

              {/* Attachment if present */}
              {selectedAnnouncement.attachmentName && (
                <div className="p-2.5 px-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#1D4ED8]">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{selectedAnnouncement.attachmentName}</span>
                    <span className="text-[10px] text-slate-400">
                      ({selectedAnnouncement.attachmentSize})
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1D4ED8] font-bold">
                    Download
                  </Button>
                </div>
              )}

              {/* Sent & Read Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Notification Sent</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedAnnouncement.status === "Published"
                      ? `${selectedAnnouncement.sentCount} Students`
                      : "Not sent (Draft)"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Read by Students</span>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">
                    {selectedAnnouncement.status === "Published"
                      ? `${selectedAnnouncement.readCount} Students (${
                          selectedAnnouncement.sentCount > 0
                            ? Math.round(
                                (selectedAnnouncement.readCount / selectedAnnouncement.sentCount) * 100
                              )
                            : 0
                        }%)`
                      : "0"}
                  </p>
                </div>
              </div>

              {/* Read list records */}
              {selectedAnnouncement.readBy && selectedAnnouncement.readBy.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Read Log</span>
                  <div className="mt-1 max-h-28 overflow-y-auto space-y-1">
                    {selectedAnnouncement.readBy.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px]"
                      >
                        <span className="font-semibold text-slate-700">{r.studentName}</span>
                        <span className="text-slate-400 text-[10px]">{r.readAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
