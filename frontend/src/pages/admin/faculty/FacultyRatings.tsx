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
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500 fill-amber-500/20" />
          Faculty Ratings & Feedback
        </h1>
        <p className="text-xs text-muted-foreground font-medium mt-1">
          Aggregated student feedback and faculty performance ratings
        </p>
      </div>

      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pl-6">Faculty</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Avg Rating</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider">Total Feedbacks</TableHead>
                <TableHead className="font-bold text-xs text-foreground uppercase tracking-wider pr-6">Rating Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium text-xs">
                    Loading faculty ratings...
                  </TableCell>
                </TableRow>
              ) : ratings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center mx-auto mb-3 text-amber-500 shadow-2xs">
                      <Star className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-black text-foreground">No ratings data yet</h4>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Ratings and performance insights will appear after students submit post-class feedback.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                ratings.map((r: any) => (
                  <TableRow key={r.facultyId} className="border-b border-border/70 hover:bg-muted/30 transition-colors text-xs">
                    <TableCell className="font-bold text-foreground pl-6">{r.facultyName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= Math.round(r.averageRating) ? "text-amber-400 fill-amber-400" : "text-muted"} />
                        ))}
                        <span className="text-sm font-black text-foreground ml-1">{r.averageRating?.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-bold bg-muted/40 border-border text-foreground">{r.totalFeedbacks} reviews</Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex gap-1.5">
                        {(r.ratings || []).map((rd: any) => (
                          <span key={rd.rating} className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border">
                            {rd.rating}★ ({rd.count})
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
