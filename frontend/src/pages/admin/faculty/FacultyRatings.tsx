import React, { useState, useMemo } from "react";
import {
  Star,
  Search,
  Building2,
  ChevronRight,
  MessageSquare,
  Award,
  ThumbsUp,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFacultyRatings } from "@/hooks/useFeedback";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStore } from "@/store/branch.store";
import { feedbackApi, type Feedback } from "@/services/feedback.api";
import { useQuery } from "@tanstack/react-query";

export const FacultyRatings: React.FC = () => {
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFacultyForReviews, setSelectedFacultyForReviews] = useState<{
    facultyId: string;
    facultyName: string;
    averageRating: number;
    totalFeedbacks: number;
  } | null>(null);

  // Queries
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  const { data: ratingsResponse, isLoading, isError } = useFacultyRatings({
    branchId: selectedBranchId !== "ALL" ? selectedBranchId : undefined,
  });
  const rawRatings = ratingsResponse?.data || [];

  // Query individual student reviews when a faculty is selected
  const { data: facultyReviewsRes, isLoading: isReviewsLoading } = useQuery({
    queryKey: ["faculty-reviews", selectedFacultyForReviews?.facultyId],
    queryFn: () => feedbackApi.getFeedbackByFaculty(selectedFacultyForReviews!.facultyId),
    enabled: Boolean(selectedFacultyForReviews?.facultyId),
  });

  const facultyReviews: Feedback[] = facultyReviewsRes?.data || [];

  // Filter ratings by search query
  const filteredRatings = useMemo(() => {
    if (!searchQuery.trim()) return rawRatings;
    const q = searchQuery.toLowerCase();
    return rawRatings.filter((r: any) =>
      r.facultyName?.toLowerCase().includes(q)
    );
  }, [rawRatings, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFacultyCount = rawRatings.length;
    const totalReviews = rawRatings.reduce((sum: number, r: any) => sum + (r.totalFeedbacks || 0), 0);
    const sumAvg = rawRatings.reduce((sum: number, r: any) => sum + (r.averageRating || 0), 0);
    const overallAvg = totalFacultyCount > 0 ? (sumAvg / totalFacultyCount).toFixed(1) : "5.0";
    const topRatedCount = rawRatings.filter((r: any) => (r.averageRating || 0) >= 4.5).length;

    return {
      overallAvg,
      totalReviews,
      topRatedCount,
      totalFacultyCount,
    };
  }, [rawRatings]);

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={
              star <= rounded
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30"
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-[1680px] mx-auto space-y-6 min-h-screen relative overflow-x-hidden animate-in fade-in duration-300">
      {/* ─── HEADER & BREADCRUMB ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <span>Faculty</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary font-bold">Performance & Ratings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500 fill-amber-500/20" />
            Faculty Ratings & Student Feedback
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5">
            Aggregated student feedback, satisfaction scores, star distribution, and post-class reviews.
          </p>
        </div>
      </div>

      {/* ─── KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Overall Rating</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <h3 className="text-2xl font-black text-amber-500">{kpis.overallAvg}</h3>
                <span className="text-xs text-muted-foreground font-bold">/ 5.0</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Academy average score</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-500 shadow-2xs">
              <Star className="h-5 w-5 fill-amber-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Reviews</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{kpis.totalReviews}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Submitted by students</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 flex items-center justify-center text-primary dark:text-sky-400">
              <MessageSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Top Rated Instructors</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.topRatedCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Score ≥ 4.5 / 5.0</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Evaluated Faculty</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{kpis.totalFacultyCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Active trainers rated</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ThumbsUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SEARCH & BRANCH FILTER BAR ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search faculty by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-muted/30 border-border"
            />
          </div>

          <div className="min-w-[200px]">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full h-9 px-3 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
            >
              <option value="ALL">🌐 All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ─── RATINGS TABLE ─── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pl-6">Faculty Instructor</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Average Rating</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Total Feedbacks</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Star Distribution</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pr-6 text-center">Reviews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground text-xs font-medium">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    Calculating faculty ratings and student satisfaction scores...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-rose-500 text-xs font-medium">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-500" />
                    Failed to load faculty ratings from server.
                  </TableCell>
                </TableRow>
              ) : filteredRatings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center mx-auto mb-3 text-amber-500 shadow-2xs">
                      <Star className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-black text-foreground">No Feedback Data Found</h4>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Ratings will be aggregated automatically once students submit post-class feedback forms.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRatings.map((r: any) => {
                  const avg = Number(r.averageRating) || 0;
                  const total = r.totalFeedbacks || 0;

                  return (
                    <TableRow
                      key={r.facultyId}
                      className="border-b border-border/70 hover:bg-muted/30 transition-colors text-xs"
                    >
                      <TableCell className="font-bold text-foreground pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                            {r.facultyName?.charAt(0) || "F"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{r.facultyName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.branchName || "Certified Instructor"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          {renderStars(avg)}
                          <span className="text-sm font-black text-foreground font-mono">
                            {avg.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className="text-xs font-bold bg-muted/40 border-border text-foreground"
                        >
                          {total} {total === 1 ? "review" : "reviews"}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {(r.ratings || []).map((rd: any) => (
                            <span
                              key={rd.rating}
                              className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-lg border border-border"
                            >
                              {rd.rating}★ <strong className="text-foreground">({rd.count})</strong>
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="pr-6 py-3.5 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFacultyForReviews(r)}
                          className="h-7 px-3 text-xs border-border bg-card text-foreground hover:bg-primary hover:text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Reviews
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

      {/* ─── STUDENT REVIEWS INSPECTION MODAL ─── */}
      <Dialog
        open={!!selectedFacultyForReviews}
        onOpenChange={(open) => !open && setSelectedFacultyForReviews(null)}
      >
        <DialogContent className="max-w-xl bg-card border-border max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              Student Reviews — {selectedFacultyForReviews?.facultyName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Direct student feedback and ratings submitted for class sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {isReviewsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                Loading student reviews...
              </div>
            ) : facultyReviews.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  No individual written comments recorded yet.
                </p>
              </div>
            ) : (
              facultyReviews.map((fb) => (
                <div
                  key={fb.id}
                  className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {fb.student?.user?.name || "Student"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        • {fb.classSession?.batch?.name || "Batch Session"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(fb.rating)}
                      <span className="font-bold text-foreground ml-1">{fb.rating}★</span>
                    </div>
                  </div>

                  {fb.comment && (
                    <p className="text-xs text-muted-foreground italic bg-background/60 p-2.5 rounded-lg border border-border/50">
                      "{fb.comment}"
                    </p>
                  )}

                  <div className="text-[10px] text-muted-foreground font-mono flex justify-between pt-1">
                    <span>Topic: {fb.classSession?.title || "Class Session"}</span>
                    <span>
                      {fb.submittedAt
                        ? new Date(fb.submittedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedFacultyForReviews(null)}
              className="text-xs font-bold border-border"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
