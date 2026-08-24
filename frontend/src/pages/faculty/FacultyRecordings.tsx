import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Filter, Video, Play, Pause, Volume2, VolumeX,
  Calendar, Clock, Users, BookOpen, MoreHorizontal, Sparkles,
  Download, Eye, CheckCircle2, FileText, AlertCircle, RefreshCw, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";

export const FacultyRecordings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { recordings: storeRecordings } = useSessionStore();

  const loggedFacultyName = user?.name || "Ramesh Kumar";

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [timePeriodFilter, setTimePeriodFilter] = useState("THIS_MONTH");

  // Video Watch Modal State
  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered recordings taught ONLY by this faculty member
  const filteredRecordings = useMemo(() => {
    return storeRecordings.filter((rec) => {
      // Must be taught by logged-in faculty
      if (rec.facultyName.toLowerCase() !== loggedFacultyName.toLowerCase()) return false;

      const titleText = rec.title || `${rec.course} – ${rec.module || "Class Session"}`;

      // 1. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = titleText.toLowerCase().includes(q);
        const matchesCourse = rec.course.toLowerCase().includes(q);
        const matchesBatch = (rec.batch || "").toLowerCase().includes(q) || (rec.batchName || "").toLowerCase().includes(q);
        const matchesTopic = (rec.topics || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCourse && !matchesBatch && !matchesTopic) return false;
      }

      // 2. Course Filter
      if (courseFilter !== "ALL" && rec.course !== courseFilter) return false;

      // 3. Batch Filter
      if (batchFilter !== "ALL" && rec.batch !== batchFilter) return false;

      // 4. Time Period Filter
      if (timePeriodFilter === "THIS_WEEK") {
        if (!rec.date.includes("Aug 24") && !rec.date.includes("Aug 23") && !rec.date.includes("Aug 21")) return false;
      }

      return true;
    });
  }, [storeRecordings, loggedFacultyName, searchTerm, courseFilter, batchFilter, timePeriodFilter]);

  // Open Watch Recording Modal
  const handleWatchRecording = (rec: any) => {
    setActiveRecording(rec);
    setIsPlaying(true);
    setShowWatchModal(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1769AA] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 shadow-2xs inline-flex">
              <Video className="h-6 w-6" />
            </span>
            Class Recordings
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Access and review all your recorded classes in one place. Showing classes taught by <span className="font-bold text-slate-800">{loggedFacultyName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={timePeriodFilter}
            onChange={(e) => setTimePeriodFilter(e.target.value)}
            className="h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
          >
            <option value="THIS_MONTH">📅 This Month</option>
            <option value="THIS_WEEK">⚡ This Week</option>
            <option value="ALL_TIME">📚 All Recordings</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => showToast("✓ Recordings synced with classroom server.")}
            className="h-10 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="p-3.5 px-4 rounded-2xl bg-blue-50 border border-blue-200 text-[#1769AA] flex items-center justify-between gap-2 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-[#1769AA] shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-blue-700 hover:text-blue-950 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── 2. SEARCH & FILTERS BAR ─── */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-2xs p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by class, course, batch or topic..."
              className="pl-10 h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Courses Dropdown */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🎓 All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Web Development">Web Development</option>
            </select>

            {/* Batches Dropdown */}
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1769AA]/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">📦 All Batches</option>
              <option value="DM-2026-A">DM-2026-A</option>
              <option value="WD-2026-B">WD-2026-B</option>
              <option value="GA-2026-A">GA-2026-A</option>
              <option value="SEO-2026-A">SEO-2026-A</option>
            </select>

            {(searchTerm || courseFilter !== "ALL" || batchFilter !== "ALL" || timePeriodFilter !== "THIS_MONTH") && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setCourseFilter("ALL");
                  setBatchFilter("ALL");
                  setTimePeriodFilter("THIS_MONTH");
                }}
                className="h-10 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl px-3 cursor-pointer"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── 3. CLASS RECORDINGS GRID ─── */}
      {filteredRecordings.length === 0 ? (
        <Card className="bg-white rounded-3xl p-12 text-center border-slate-200/80 shadow-2xs">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No recordings found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No class session recordings match your filter criteria for {loggedFacultyName}.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecordings.map((rec) => (
            <Card
              key={rec.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                {/* Video Thumbnail Header */}
                <div className={`relative h-48 ${rec.thumbnailBg} p-4 flex flex-col justify-between overflow-hidden`}>
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 text-[10.5px] font-extrabold px-2.5 py-0.5">
                      Batch: {rec.batch}
                    </Badge>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-mono text-[10px] font-black shadow-xs">
                      HD 1080p
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <button
                      type="button"
                      onClick={() => handleWatchRecording(rec)}
                      className="w-14 h-14 rounded-full bg-white/90 hover:bg-white text-[#1769AA] flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-current ml-1 text-[#1769AA]" />
                    </button>
                  </div>

                  {/* Bottom Duration & Views */}
                  <div className="relative z-10 flex items-center justify-between text-white/90 text-[11px] font-medium pt-2">
                    <span className="flex items-center gap-1 font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      <Clock className="w-3 h-3 text-emerald-400" /> {rec.duration}
                    </span>
                    <span className="flex items-center gap-1 font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      <Eye className="w-3 h-3 text-cyan-400" /> {rec.viewsCount} views
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        Status: Available
                      </Badge>
                      {rec.source === "Google Meet" && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Google Meet
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug tracking-tight group-hover:text-[#1769AA] transition-colors line-clamp-2">
                      {rec.course} — {rec.module || rec.title || "Class Session"}
                    </h3>
                    <p className="text-[11.5px] text-slate-500 font-semibold mt-1">
                      Batch: {rec.batch} {rec.batchName ? `(${rec.batchName})` : ""}
                    </p>
                  </div>

                  {/* Date & Time Row */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-slate-700 text-xs">
                    <div className="flex items-center justify-between font-bold text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-[#1769AA]" /> {rec.date}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" /> {rec.time}
                      </span>
                    </div>
                  </div>

                  {/* Students & Duration Stat Pills */}
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold pt-0.5">
                    <span className="flex items-center gap-1.5 bg-blue-50/70 text-[#1769AA] px-2.5 py-1 rounded-xl border border-blue-100">
                      <Users className="w-3.5 h-3.5" /> {rec.studentsCount} Students Attended
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                      ⏱ {rec.duration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 px-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={() => handleWatchRecording(rec)}
                  className="flex-1 bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9.5 gap-1.5 shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Watch Recording
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs font-semibold bg-white rounded-xl shadow-xl border border-slate-100 p-1">
                    <DropdownMenuItem
                      onClick={() => handleWatchRecording(rec)}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <Play className="w-3.5 h-3.5 text-[#1769AA]" /> Play Video
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => showToast(`✓ Attendance log for ${rec.title} exported.`)}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" /> Export Attendance PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => showToast(`✓ Share link copied for ${rec.batch} students.`)}
                      className="cursor-pointer gap-2 py-2 text-blue-700"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Copy Student Video Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── 4. INTERACTIVE WATCH RECORDING MODAL POPUP ─── */}
      <Dialog open={showWatchModal} onOpenChange={setShowWatchModal}>
        <DialogContent className="max-w-3xl sm:max-w-4xl bg-slate-950 text-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col z-50">
          {activeRecording && (
            <>
              {/* Modal Video Header */}
              <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-400" />
                    {activeRecording.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {activeRecording.batch} • {activeRecording.date} ({activeRecording.time}) • Taught by {activeRecording.facultyName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWatchModal(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                <video
                  src={activeRecording.videoUrl}
                  controls
                  autoPlay
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Video Details & Topics */}
              <div className="p-5 sm:p-6 bg-slate-900 space-y-4 text-xs overflow-y-auto max-h-[220px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                      {activeRecording.course}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                      {activeRecording.studentsCount} Students Attended
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Expires in 30 days ({activeRecording.expiresAt})
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Key Session Topics Covered:
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeRecording.topics.map((tp: string, idx: number) => (
                      <span key={idx} className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-300 font-medium text-[11px]">
                        ✓ {tp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Policy Banner */}
                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-200 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Class recordings are view-only under Aadya Institute Academic Policy. Direct downloads are restricted.
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
