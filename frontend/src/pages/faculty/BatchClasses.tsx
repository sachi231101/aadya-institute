import React from "react";
import { BookOpen, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const FacultyBatchClasses: React.FC = () => {
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["faculty", "class-sessions"],
    queryFn: async () => {
      const response = await api.get("/class-sessions", { params: { limit: 50 } });
      return response.data;
    },
  });

  const sessions = sessionsResponse?.data || [];
  const today = new Date().toDateString();
  const todaySessions = sessions.filter((s: any) => new Date(s.scheduledDate).toDateString() === today);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-amber-600" />
          My Batches & Classes
        </h1>
        <p className="text-sm text-text-secondary mt-1">Manage class sessions, mark attendance, and create assignments</p>
      </div>

      {/* Today's Sessions */}
      <Card className="border-amber-200/50 shadow-sm bg-amber-50/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700">
            <Clock size={16} /> Today's Classes ({todaySessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No classes scheduled for today</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-100">
                  <div>
                    <p className="font-semibold text-sm">{session.title || "Class Session"}</p>
                    <p className="text-xs text-text-secondary">
                      {session.startTime} - {session.endTime} • {session.batch?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <Users size={12} /> Mark Attendance
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-amber-600 border-amber-300">
                      Create Assignment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Sessions */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Class Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-text-secondary text-center py-8">Loading...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-text-secondary font-medium">No class sessions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{session.title || "Session"}</p>
                      <p className="text-xs text-text-secondary">
                        {session.batch?.name} • {session.startTime} - {session.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {new Date(session.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                    <Badge className={`text-xs border ${
                      session.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                      session.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {session.status || "SCHEDULED"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
