import React from "react";
import { FacultyTimetable } from "@/pages/admin/faculty/FacultyTimetable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Code2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 max-w-[1680px] mx-auto space-y-6">
      <InstallDashboardBanner />

      {/* Today's Scheduled Active Class Banner */}
      <Card className="bg-gradient-to-r from-blue-900 to-[#1769AA] text-white border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Code2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-white/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                  Today's Next Class
                </Badge>
                <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 border-0 font-extrabold text-[11px] px-2 py-0.5">
                  DM-01
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Full Stack Web Development
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-blue-100 font-medium">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 09:00 AM – 11:00 AM</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Mon, 18 Aug 2026</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Room 301, Main Block</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => navigate("/faculty/class-session")}
            className="bg-white text-[#1769AA] hover:bg-blue-50 font-black text-xs px-6 py-3 h-auto rounded-xl shadow-md gap-2 shrink-0 cursor-pointer"
          >
            <span>Open Class Session & Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Main Timetable View */}
      <FacultyTimetable />
    </div>
  );
};
