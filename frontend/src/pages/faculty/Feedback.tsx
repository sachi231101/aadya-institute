import React, { useMemo, useState } from "react";
import {
  Star,
  MessageSquare,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Filter,
  CheckCircle2,
  ThumbsUp,
  BarChart3,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { useFeedbackStore, type ClassFeedbackItem } from "@/store/feedback.store";
import { useFeedbackByFaculty, useFacultyRatings } from "@/hooks/useFeedback";

export const FacultyFeedback: React.FC = () => {
  const { user } = useAuthStore();
  const facultyName = user?.name || "Ramesh Kumar";
  const facultyId = (user as any)?.facultyId as string | undefined;

  const { feedbacks: localFeedbacks } = useFeedbackStore();
  const { data: apiFeedbackRes } = useFeedbackByFaculty(facultyId);
  const { data: ratingsRes } = useFacultyRatings(facultyId ? { facultyId } : undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"ALL" | "5" | "4" | "3" | "2" | "1">("ALL");

  // Merge and filter feedbacks for current faculty
  const allFacultyFeedbacks = useMemo(() => {
    const apiFeedbacks: ClassFeedbackItem[] = (apiFeedbackRes?.data ?? []).map((f: any) => ({
      id: f.id,
      sessionId: f.classSessionId || f.classSession?.id || "",
      courseName: f.classSession?.title || f.classSession?.batch?.name || "Class Session",
      batchCode: f.classSession?.batch?.name || "Batch",
      facultyName: f.faculty?.user?.name || facultyName,
      classDate: f.classSession?.scheduledDate
        ? new Date(f.classSession.scheduledDate).toISOString().split("T")[0]
        : "Today",
      classTime: "Class Slot",
      studentId: f.studentId || f.student?.id || "std",
      studentName: f.student?.user?.name || "Enrolled Student",
      rating: f.rating || 5.0,
      ratingLabel: f.rating >= 4.5 ? "Excellent" : f.rating >= 3.5 ? "Very Good" : "Good",
      teachingRating: f.teachingRating || f.rating || 5,
      understandingRating: f.understandingRating || f.rating || 5,
      overallExperienceRating: f.overallExperienceRating || f.rating || 5,
      comments: f.comment || "Great class!",
      submittedAt: f.submittedAt
        ? new Date(f.submittedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Recent",
    }));

    // Filter local feedbacks matching faculty name (or show if faculty matches)
    const matchingLocal = localFeedbacks.filter((f) => {
      if (!f.facultyName) return true;
      const fn = f.facultyName.toLowerCase();
      const currentFn = facultyName.toLowerCase();
      return (
        fn.includes(currentFn) ||
        currentFn.includes(fn) ||
        fn === "ramesh kumar" ||
        currentFn === "ramesh kumar" ||
        fn === "adithya hm"
      );
    });

    const combined = [...matchingLocal];
    for (const af of apiFeedbacks) {
      if (!combined.some((c) => c.id === af.id)) {
        combined.push(af);
      }
    }

    return combined;
  }, [localFeedbacks, apiFeedbackRes, facultyName]);

  // Compute Metrics across 3 criteria
  const metrics = useMemo(() => {
    if (allFacultyFeedbacks.length === 0) {
      return {
        totalCount: 0,
        averageOverall: 5.0,
        averageTeaching: 5.0,
        averageUnderstanding: 5.0,
        averageLab: 5.0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
      };
    }

    const total = allFacultyFeedbacks.length;
    const sumOverall = allFacultyFeedbacks.reduce((acc, f) => acc + (f.rating || 5), 0);
    const sumTeaching = allFacultyFeedbacks.reduce((acc, f) => acc + (f.teachingRating || f.rating || 5), 0);
    const sumUnderstanding = allFacultyFeedbacks.reduce((acc, f) => acc + (f.understandingRating || f.rating || 5), 0);
    const sumLab = allFacultyFeedbacks.reduce((acc, f) => acc + (f.overallExperienceRating || f.rating || 5), 0);

    const fiveStar = allFacultyFeedbacks.filter((f) => Math.round(f.rating) >= 5).length;
    const fourStar = allFacultyFeedbacks.filter((f) => Math.round(f.rating) === 4).length;
    const threeStar = allFacultyFeedbacks.filter((f) => Math.round(f.rating) <= 3).length;

    return {
      totalCount: total,
      averageOverall: Number((sumOverall / total).toFixed(1)),
      averageTeaching: Number((sumTeaching / total).toFixed(1)),
      averageUnderstanding: Number((sumUnderstanding / total).toFixed(1)),
      averageLab: Number((sumLab / total).toFixed(1)),
      fiveStarCount: fiveStar,
      fourStarCount: fourStar,
      threeStarCount: threeStar,
    };
  }, [allFacultyFeedbacks]);

  // Filtered List
  const filteredFeedbacks = useMemo(() => {
    return allFacultyFeedbacks.filter((f) => {
      // Rating filter
      if (ratingFilter !== "ALL") {
        const star = Math.round(f.rating);
        if (String(star) !== ratingFilter) return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = f.studentName.toLowerCase().includes(q);
        const matchesCourse = f.courseName.toLowerCase().includes(q);
        const matchesBatch = f.batchCode.toLowerCase().includes(q);
        const matchesComment = (f.comments || "").toLowerCase().includes(q);
        return matchesName || matchesCourse || matchesBatch || matchesComment;
      }

      return true;
    });
  }, [allFacultyFeedbacks, ratingFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ─── 1. TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-50 text-[#5B50EC] border border-indigo-100 shadow-2xs">
              <MessageSquare className="w-5 h-5 stroke-[2.2]" />
            </span>
            Student Class Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Ratings, criteria evaluations, and reviews submitted by students after completing your classes.
          </p>
        </div>

        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80 font-bold text-xs px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{metrics.totalCount} Student Reviews Received</span>
        </Badge>
      </div>

      {/* ─── 2. 3-CRITERIA RATING METRICS DASHBOARD ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Average */}
        <Card className="bg-gradient-to-br from-[#1769AA] to-[#0B4F8A] text-white border-0 shadow-md rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Overall Rating</span>
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">{metrics.averageOverall}</span>
                <span className="text-sm font-bold text-blue-200">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-amber-300">
                {[1, 2, 3, 4, 5].map((st) => (
                  <Star
                    key={st}
                    className={`w-3.5 h-3.5 ${
                      st <= Math.round(metrics.averageOverall) ? "fill-amber-300 text-amber-300" : "text-white/30"
                    }`}
                  />
                ))}
                <span className="text-[11px] font-semibold text-blue-100 ml-1.5">
                  ({metrics.totalCount} responses)
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 1. Teaching Clarity */}
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teaching Clarity</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.averageTeaching}</span>
              <span className="text-xs font-semibold text-slate-400">/ 5.0 ★</span>
            </div>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Concept &amp; syllabus explanation
            </p>
          </div>
        </Card>

        {/* 2. Pacing & Engagement */}
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacing &amp; Engagement</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5B50EC] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.averageUnderstanding}</span>
              <span className="text-xs font-semibold text-slate-400">/ 5.0 ★</span>
            </div>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Class speed &amp; interactive delivery
            </p>
          </div>
        </Card>

        {/* 3. Lab / Practical Understanding */}
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab / Practicals</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.averageLab}</span>
              <span className="text-xs font-semibold text-slate-400">/ 5.0 ★</span>
            </div>
            <p className="text-[11px] font-medium text-teal-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Hands-on exercises &amp; code demos
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 3. SEARCH & STAR RATING FILTER BAR ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, course, batch, or review comments..."
            className="pl-9 text-xs h-10 rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white"
          />
        </div>

        {/* Rating Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: "ALL", label: `All (${allFacultyFeedbacks.length})` },
              { key: "5", label: `5 ★ (${metrics.fiveStarCount})` },
              { key: "4", label: `4 ★ (${metrics.fourStarCount})` },
              { key: "3", label: `3 ★ (${metrics.threeStarCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRatingFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ratingFilter === tab.key
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. FEEDBACK CARDS LIST ────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/80 p-12 text-center bg-white shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#5B50EC] flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Student Feedback Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || ratingFilter !== "ALL"
                ? "No reviews match your selected filter criteria. Try adjusting your search or rating filters."
                : "Students submit ratings and comments after joining and completing your class sessions."}
            </p>
          </Card>
        ) : (
          filteredFeedbacks.map((fb) => (
            <Card
              key={fb.id}
              className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-all"
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Card Top: Student Info & Star Rating Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-200 shadow-2xs">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fb.studentName)}`} />
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                        {fb.studentName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{fb.studentName}</h4>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50 text-slate-600 px-1.5 py-0">
                          {fb.studentId}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {fb.courseName} • <span className="font-bold text-slate-700">{fb.batchCode}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rating Badge & Submitted Time */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end font-black text-sm text-amber-600">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{fb.rating.toFixed(1)} / 5.0</span>
                        <span className="text-xs font-bold text-slate-700 ml-1">({fb.ratingLabel})</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        Submitted: {fb.submittedAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Criteria Score Breakdown Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900">Teaching Clarity:</span>
                    <span className="font-black text-amber-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {fb.teachingRating || 5} / 5 Stars
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">Pacing &amp; Engagement:</span>
                    <span className="font-black text-indigo-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {fb.understandingRating || 5} / 5 Stars
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">Lab / Practicals:</span>
                    <span className="font-black text-emerald-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {fb.overallExperienceRating || 5} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Student Comment / Review */}
                {fb.comments && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <span className="font-bold text-slate-500 block text-[11px]">Student Comment:</span>
                    <p className="text-slate-800 font-medium italic">
                      "{fb.comments}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

