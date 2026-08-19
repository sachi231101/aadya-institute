import React from "react";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFacultyRatings } from "@/hooks/useFeedback";

export const FacultyRatings: React.FC = () => {
  const { data: ratingsResponse, isLoading } = useFacultyRatings();
  const ratings = ratingsResponse?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          Faculty Ratings & Feedback
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Aggregated student feedback and faculty performance ratings
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Faculty</TableHead>
                <TableHead className="font-semibold">Avg Rating</TableHead>
                <TableHead className="font-semibold">Total Feedbacks</TableHead>
                <TableHead className="font-semibold">Rating Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-text-secondary">Loading...</TableCell>
                </TableRow>
              ) : ratings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Star className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No ratings data yet</p>
                    <p className="text-xs text-text-secondary mt-1">Ratings will appear after students submit post-class feedback</p>
                  </TableCell>
                </TableRow>
              ) : (
                ratings.map((r: any) => (
                  <TableRow key={r.facultyId}>
                    <TableCell className="font-medium">{r.facultyName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= Math.round(r.averageRating) ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                        ))}
                        <span className="text-sm font-semibold ml-1">{r.averageRating?.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.totalFeedbacks} reviews</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(r.ratings || []).map((rd: any) => (
                          <span key={rd.rating} className="text-xs text-text-secondary">
                            {rd.rating}★({rd.count})
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
