import React, { useState } from "react";
import { 
  Clock, 
  Calendar, 
  Video, 
  MapPin, 
  UserCheck, 
  MessageSquare, 
  AlertCircle,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { useScheduleStore } from "../../../store/schedule.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const UpcomingClasses: React.FC = () => {
  const { classes, cancelClassSession } = useScheduleStore();
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const upcomingClasses = classes
    .filter((c) => c.status === "UPCOMING" || c.status === "ONGOING")
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const classesToday = upcomingClasses.filter((c) => c.date === todayStr);

  const getRelativeTag = (dateStr: string) => {
    if (dateStr === todayStr) return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Today</Badge>;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split("T")[0]) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tomorrow</Badge>;
    }
    return <Badge variant="outline" className="bg-slate-100 text-slate-700">{dateStr}</Badge>;
  };

  const handleSendReminder = (id: string) => {
    setReminderSentId(id);
    setTimeout(() => {
      setReminderSentId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Upcoming Classes</h2>
          <p className="text-sm text-text-secondary">
            Operational dashboard for today's lectures, upcoming 7-day schedules, and automated WhatsApp class reminders.
          </p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Classes Scheduled Today</p>
              <h3 className="text-2xl font-bold text-text-primary">{classesToday.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Upcoming This Week</p>
              <h3 className="text-2xl font-bold text-text-primary">{upcomingClasses.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">WhatsApp Automation</p>
              <h3 className="text-2xl font-bold text-text-primary">Active (2h Before)</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {reminderSentId && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">WhatsApp Class Reminder Broadcasted to Student Batch!</p>
        </div>
      )}

      {/* Upcoming Cards Feed */}
      <div className="space-y-4">
        {upcomingClasses.length > 0 ? (
          upcomingClasses.map((cls) => (
            <Card key={cls.id} className="border-border/50 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getRelativeTag(cls.date)}
                      <Badge variant="outline" className="font-mono text-xs text-[#1769AA] bg-blue-50 border-blue-200">
                        {cls.batchCode}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {cls.mode}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {cls.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-semibold text-slate-800">{cls.date} • {cls.startTime} - {cls.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-slate-400" />
                        <span>Instructor: <strong>{cls.facultyName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{cls.roomNo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Buttons */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {cls.meetingUrl && (
                      <a href={cls.meetingUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="text-xs border-blue-200 text-[#1769AA] bg-blue-50 hover:bg-blue-100">
                          <Video className="mr-1.5 h-3.5 w-3.5" />
                          Launch Virtual Class
                        </Button>
                      </a>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      onClick={() => handleSendReminder(cls.id)}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Send WhatsApp Alert
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs text-destructive hover:bg-red-50"
                      onClick={() => cancelClassSession(cls.id)}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50 bg-white py-12 text-center shadow-sm">
            <CardContent>
              <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No Upcoming Classes</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no upcoming lectures or lab sessions scheduled for the coming week.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
