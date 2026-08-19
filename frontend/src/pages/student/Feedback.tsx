import React from "react";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useFeedbackByStudent } from "@/hooks/useFeedback";
import { useAuthStore } from "@/store/auth.store";

export const StudentFeedback: React.FC = () => {
  const { user } = useAuthStore();
  const { data: feedbackResponse, isLoading } = useFeedbackByStudent((user as any)?.studentId || user?.id || "");
  const feedbacks = feedbackResponse?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          Class Feedback
        </h1>
        <p className="text-sm text-text-secondary mt-1">Rate your classes and share feedback with faculty</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading...</div>
      ) : feedbacks.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No feedback submitted yet</p>
            <p className="text-xs text-text-secondary mt-1">After each class, you'll be asked to rate and provide feedback</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb: any) => (
            <Card key={fb.id} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">
                      {fb.classSession?.title || "Class Session"}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {fb.classSession?.batch?.name} •{" "}
                      {new Date(fb.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={star <= fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                      />
                    ))}
                  </div>
                </div>
                {fb.comment && (
                  <p className="mt-2 text-sm text-text-secondary bg-slate-50 p-2 rounded">{fb.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
