import React from "react";
import { Calendar, Clock, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const StudentSchedule: React.FC = () => {
  const { data: scheduleResponse, isLoading } = useQuery({
    queryKey: ["student", "schedule"],
    queryFn: async () => {
      const response = await api.get("/class-sessions", { params: { limit: 50 } });
      return response.data;
    },
  });

  const sessions = scheduleResponse?.data || [];

  const today = new Date().toDateString();
  const todaySessions = sessions.filter((s: any) =>
    new Date(s.scheduledDate).toDateString() === today
  );

  const upcomingSessions = sessions.filter((s: any) =>
    new Date(s.scheduledDate) > new Date()
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Calendar className="h-6 w-6 text-[#1769AA]" />
          My Class Schedule
        </h1>
        <p className="text-sm text-text-secondary mt-1">Your upcoming classes and timetable</p>
      </div>

      {/* Today's Classes */}
      <Card className="border-[#1769AA]/30 shadow-sm bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-[#1769AA]">
            <Clock size={16} /> Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No classes scheduled for today</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#1769AA]/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[#1769AA]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{session.title || "Class Session"}</p>
                      <p className="text-xs text-text-secondary">
                        {session.startTime} - {session.endTime}
                        {session.faculty?.user?.name && ` • ${session.faculty.user.name}`}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-[#1769AA]/10 text-[#1769AA] border-[#1769AA]/20 border text-xs">
                    Today
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-text-secondary text-center py-8">Loading schedule...</p>
          ) : upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-text-secondary font-medium">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.slice(0, 20).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-200/50 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{session.title || "Class Session"}</p>
                      <p className="text-xs text-text-secondary">
                        {session.startTime} - {session.endTime}
                        {session.faculty?.user?.name && ` • ${session.faculty.user.name}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {new Date(session.scheduledDate).toLocaleDateString("en-IN", {
                      weekday: "short", day: "2-digit", month: "short"
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
