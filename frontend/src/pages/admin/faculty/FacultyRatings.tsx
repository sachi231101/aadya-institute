import React, { useState, useMemo } from "react";
import {
  Star,
  Search,
  Loader2,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            size={13}
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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen relative overflow-x-hidden animate-in fade-in duration-300">
      {/* ─── PAGE HEADER ─── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Faculty Ratings & Feedback
        </h1>
      </div>

      {/* ─── KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Rating</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-xl font-bold text-amber-500">{kpis.overallAvg}</h3>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Reviews</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{kpis.totalReviews}</h3>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Top Rated Instructors</p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.topRatedCount}</h3>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Evaluated Faculty</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{kpis.totalFacultyCount}</h3>
          </CardContent>
        </Card>
      </div>

      {/* ─── SEARCH & BRANCH FILTER BAR ─── */}
      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-medium bg-muted/30 border border-border text-foreground rounded-lg focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground h-[34px]"
            />
          </div>

          <div className="min-w-[200px]">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer h-[34px]"
            >
              <option value="ALL">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ─── RATINGS TABLE ─── */}
      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap border-collapse">
            <thead className="bg-muted/60 text-[11px] font-bold text-foreground uppercase tracking-wider">
              <tr className="border-b border-border/80">
                <th className="px-4 py-2.5 border-r border-border/80">Faculty Instructor</th>
                <th className="px-3 py-2.5 border-r border-border/80">Average Rating</th>
                <th className="px-3 py-2.5 border-r border-border/80">Total Feedbacks</th>
                <th className="px-3 py-2.5 border-r border-border/80">Star Distribution</th>
                <th className="px-4 py-2.5 text-center">Reviews</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground text-xs font-medium">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
                    Loading ratings...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-rose-500 text-xs font-medium">
                    Failed to load ratings.
                  </td>
                </tr>
              ) : filteredRatings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 px-4 text-muted-foreground text-xs font-medium">
                    No feedback data found.
                  </td>
                </tr>
              ) : (
                filteredRatings.map((r: any) => {
                  const avg = Number(r.averageRating) || 0;
                  const total = r.totalFeedbacks || 0;

                  return (
                    <tr
                      key={r.facultyId}
                      className="border-b border-border/70 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <td className="px-4 py-2.5 border-r border-border/70">
                        <p className="font-semibold text-foreground">{r.facultyName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.branchName || "Certified Instructor"}
                        </p>
                      </td>

                      <td className="px-3 py-2.5 border-r border-border/70">
                        <div className="flex items-center gap-2">
                          {renderStars(avg)}
                          <span className="text-xs font-bold text-foreground font-mono">
                            {avg.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 border-r border-border/70">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold bg-muted/40 border-border text-foreground"
                        >
                          {total} {total === 1 ? "review" : "reviews"}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 border-r border-border/70">
                        <div className="flex flex-wrap gap-1.5">
                          {(r.ratings || []).map((rd: any) => (
                            <span
                              key={rd.rating}
                              className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border"
                            >
                              {rd.rating}★ <strong className="text-foreground">({rd.count})</strong>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFacultyForReviews(r)}
                          className="h-7 px-3 text-xs border-border bg-card text-foreground hover:bg-primary hover:text-white font-semibold rounded-lg cursor-pointer"
                        >
                          View Reviews
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
