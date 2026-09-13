import React, { useMemo, useState } from "react";
import {
  Star,
  MessageSquare,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { useFeedbackStore, type ClassFeedbackItem } from "@/store/feedback.store";
import { useFeedbackByFaculty, useFacultyRatings } from "@/hooks/useFeedback";
import {
  PageContainer,
  PageHeader,
  MetricGrid,
  FilterToolbar,
  PageSection,
} from "@/components/layout";

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
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Student Class Feedback"
        description="Ratings and reviews from students after your classes."
        actions={
          <Badge variant="outline" className="font-semibold text-xs px-3 py-1.5 rounded-xl">
            {metrics.totalCount} reviews
          </Badge>
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Rating</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-xl font-bold text-amber-500">{metrics.averageOverall}</h3>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{metrics.totalCount} responses</p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Teaching Clarity</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-xl font-bold text-foreground">{metrics.averageTeaching}</h3>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pacing &amp; Engagement</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-xl font-bold text-foreground">{metrics.averageUnderstanding}</h3>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lab / Practicals</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-xl font-bold text-foreground">{metrics.averageLab}</h3>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
          </CardContent>
        </Card>
      </MetricGrid>

      <FilterToolbar>
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student, course, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs font-medium bg-muted/30 border border-border rounded-lg focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as typeof ratingFilter)}
          className="h-9 px-3 text-xs font-semibold border border-border rounded-lg bg-muted/30 focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="ALL">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </FilterToolbar>

      <PageSection title="Student reviews">
        {filteredFeedbacks.length === 0 ? (
          <Card className="rounded-xl border-border/80 p-12 text-center bg-card shadow-2xs">
            <div className="w-14 h-14 rounded-xl bg-muted text-primary flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Student Feedback Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              {searchQuery || ratingFilter !== "ALL"
                ? "No reviews match your selected filter criteria. Try adjusting your search or rating filters."
                : "Students submit ratings and comments after joining and completing your class sessions."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
          {filteredFeedbacks.map((fb) => (
            <Card
              key={fb.id}
              className="bg-card border-border/80 shadow-xs rounded-xl overflow-hidden hover:shadow-md transition-all"
            >
              <CardContent className="p-5 space-y-4">
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
                        <h4 className="text-sm font-semibold text-slate-900">{fb.studentName}</h4>
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
                      <div className="flex items-center gap-1 justify-end font-semibold text-sm text-amber-600">
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
                    <span className="font-semibold text-amber-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {fb.teachingRating || 5} / 5 Stars
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">Pacing &amp; Engagement:</span>
                    <span className="font-semibold text-indigo-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {fb.understandingRating || 5} / 5 Stars
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">Lab / Practicals:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
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
          ))}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
};

