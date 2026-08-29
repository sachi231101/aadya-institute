import React from "react";
import { Star, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useFacultyRatings, useFeedbackByFaculty } from "@/hooks/useFeedback";

export const FacultyFeedback: React.FC = () => {
  const { user } = useAuthStore();
  const facultyId = (user as any)?.facultyId as string | undefined;

  const { data: ratingsRes, isLoading: ratingsLoading } = useFacultyRatings(
    facultyId ? { facultyId } : undefined
  );
  const { data: feedbackRes, isLoading, isError, refetch } = useFeedbackByFaculty(facultyId);

  const ratings = ratingsRes?.data?.[0];
  const feedbacks = feedbackRes?.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#1769AA]" />
          My Feedback
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ratings and comments from students in your classes.
        </p>
      </div>

      {ratingsLoading ? null : ratings ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/40">
          <CardContent className="p-5 flex items-center gap-6">
            <div className="text-4xl font-black text-amber-600 flex items-center gap-2">
              <Star className="w-8 h-8 fill-current" />
              {ratings.averageRating?.toFixed?.(1) ?? ratings.averageRating}
            </div>
            <div className="text-sm text-slate-700">
              <div className="font-bold">Average rating</div>
              <div className="text-slate-500">{ratings.totalFeedbacks} feedback responses</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-bold">Recent comments</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1769AA]" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500 opacity-70" />
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No feedback yet. Students submit ratings after class sessions.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((f: any) => (
                <div key={f.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-amber-600 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      {f.rating}/5
                      <span className="text-slate-700 font-semibold ml-2">
                        {f.student?.user?.name || "Student"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {f.submittedAt
                        ? new Date(f.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {f.classSession?.batch?.name || f.classSession?.title || "Class"}
                  </p>
                  {f.comment && <p className="text-sm text-slate-700 mt-2">{f.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
