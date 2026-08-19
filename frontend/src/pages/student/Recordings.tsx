import React from "react";
import { Video, Play, Clock, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecordings } from "@/hooks/useRecordings";

export const StudentRecordings: React.FC = () => {
  const { data: recordingsResponse, isLoading } = useRecordings({});
  const recordings = recordingsResponse?.data || [];

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Video className="h-6 w-6 text-[#1769AA]" />
          Class Recordings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Watch your class session recordings. Recordings expire after 30 days.
        </p>
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          Recordings are view-only. Downloading is not permitted as per institute policy.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading recordings...</div>
      ) : recordings.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No recordings available</p>
            <p className="text-xs text-text-secondary mt-1">Recordings from your classes will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recordings.map((rec: any) => {
            const daysRemaining = getDaysRemaining(rec.expiresAt);
            return (
              <Card key={rec.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-text-primary text-sm">
                        {rec.classSession?.title || "Class Session"}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {rec.classSession?.batchModule?.courseModule?.name || rec.classSession?.batch?.name || ""}
                      </p>
                    </div>
                    <Badge className={`text-xs border ${
                      daysRemaining <= 3 ? "bg-red-50 text-red-700 border-red-200" :
                      daysRemaining <= 7 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-green-50 text-green-700 border-green-200"
                    }`}>
                      <Clock size={10} className="mr-1" />
                      {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
                    <span>{rec.classSession?.scheduledDate
                      ? new Date(rec.classSession.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}</span>
                    {rec.duration && <span>• {Math.floor(rec.duration / 60)}m {rec.duration % 60}s</span>}
                    <span>• {rec.classSession?.faculty?.user?.name || "Faculty"}</span>
                  </div>

                  {/* Video Player - no download */}
                  <div
                    className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center cursor-pointer group"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1769AA]/20 to-transparent" />
                    <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Play className="h-7 w-7 text-white ml-1" />
                    </div>
                    <p className="absolute bottom-2 right-2 text-xs text-white/60">View Only</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
