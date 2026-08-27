import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  UserCircle, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Video,
  Radio,
  ExternalLink,
  Clock,
  Sparkles,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../store/auth.store";
import { useSessionStore } from "../../store/session.store";
import { classSessionsApi } from "../../services/class-sessions.api";
import { attendanceApi } from "../../services/attendance.api";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { activeLiveClass } = useSessionStore();
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [attendanceMeta, setAttendanceMeta] = useState<{ total: number; present: number } | null>(null);
  const [courseName, setCourseName] = useState<string>("Enrolled Academy Program");

  // Fetch backend active live classes + attendance summary on mount
  useEffect(() => {
    let mounted = true;
    const studentId = user?.studentId || null;
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A,D',location:'student/Dashboard.tsx:mount',message:'Student dashboard mount',data:{userId:user?.id,hasStudentId:!!studentId,studentId,roles:user?.roles,attendanceKpiHardcoded:false,branchId:user?.branchId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const fetchLive = async () => {
      try {
        const res = await classSessionsApi.getActiveLive();
        // #region agent log
        fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Dashboard.tsx:live',message:'Live class fetch result',data:{count:res.data?.length??0,ok:true},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (mounted && res.data && res.data.length > 0) {
          setLiveSessions(res.data);
          const first = res.data[0];
          if (first?.batch?.course?.name) setCourseName(first.batch.course.name);
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Dashboard.tsx:live-err',message:'Live class fetch failed',data:{err:String(err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
    };

    const fetchAttendance = async () => {
      if (!studentId) return;
      try {
        const res = await attendanceApi.getStudentSummary(studentId);
        const summary = res?.data;
        if (mounted && summary) {
          setAttendancePct(Number(summary.attendancePercentage ?? 0));
          setAttendanceMeta({
            total: Number(summary.totalClasses ?? 0),
            present: Number(summary.presentCount ?? 0),
          });
          // #region agent log
          fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Dashboard.tsx:attendance',message:'Attendance summary loaded',data:{pct:summary.attendancePercentage,total:summary.totalClasses},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'post-fix',hypothesisId:'A',location:'student/Dashboard.tsx:attendance-err',message:'Attendance summary failed',data:{err:String(err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
    };

    fetchLive();
    fetchAttendance();
    const interval = setInterval(fetchLive, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.studentId, user?.id]);

  const studentName = user?.name || "Student";
  const studentBatchCode = user?.branchId ? `BRANCH-${user.branchId.slice(-4).toUpperCase()}` : "AADYA INSTITUTE";
  const displayAttendance = attendancePct ?? 0;
  const hasAttendanceData = attendancePct !== null;

  // Check if live class is active (either from session store or backend query)
  const isClassLive = activeLiveClass?.status === "LIVE" || liveSessions.length > 0;
  const currentLive = activeLiveClass?.status === "LIVE" 
    ? activeLiveClass 
    : liveSessions.length > 0 
    ? {
        id: liveSessions[0].id,
        courseName: liveSessions[0].batch?.course?.name || liveSessions[0].title || "Live Academy Class",
        facultyName: liveSessions[0].faculty?.user?.name || "Ramesh Kumar",
        batchName: liveSessions[0].batch?.name || liveSessions[0].batch?.code || "Digital Marketing – Batch A",
        time: `${liveSessions[0].startTime} – ${liveSessions[0].endTime}`,
        meetUrl: liveSessions[0].meetingUrl || "https://meet.google.com/aady-live-cls",
      }
    : null;

  const handleJoinGoogleMeet = () => {
    if (currentLive?.meetUrl) {
      window.open(currentLive.meetUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* ─── PROMINENT TOP LIVE CLASS BANNER (WHEN CLASS IS LIVE) ─── */}
      {isClassLive && currentLive && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-900 p-6 md:p-7 text-white shadow-xl shadow-rose-950/20 border-2 border-rose-400/40 animate-in slide-in-from-top-3 duration-300">
          {/* Animated Background Pulse */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="bg-white text-rose-700 hover:bg-white font-black text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  🔴 LIVE NOW
                </Badge>
                <span className="text-xs font-bold bg-rose-950/40 text-rose-100 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-rose-400/20">
                  Google Meet Session Active
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
                  {currentLive.courseName}
                </h2>
                <p className="text-rose-100 text-xs sm:text-sm font-medium mt-1">
                  Faculty: <strong className="text-white font-bold">{currentLive.facultyName}</strong> • Batch: <strong className="text-white font-bold">{currentLive.batchName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-rose-100/90 pt-1">
                <Clock className="w-4 h-4 text-amber-300" />
                <span>Class Slot: {currentLive.time}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <Button
                type="button"
                onClick={handleJoinGoogleMeet}
                className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-black text-sm h-12 px-7 rounded-2xl shadow-xl shadow-black/20 gap-2.5 transform hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
              >
                <Video className="w-5 h-5 text-rose-600" />
                <span>🎥 Join Google Meet</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {studentName.split(" ")[0]}! 🎓</h1>
            <p className="text-blue-100 opacity-90 max-w-xl">
              Track your attendance, manage fees, and view your upcoming class schedule all in one place.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1">
            {studentBatchCode}
          </Badge>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-20 w-32 h-32 bg-[#F39A16]/20 rounded-full blur-2xl" />
      </div>

      <InstallDashboardBanner />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Attendance & Fees) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Top Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Attendance Card */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#10b981]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Overall Attendance</span>
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mt-2">
                  <div className="text-4xl font-bold text-text-primary">
                    {hasAttendanceData ? `${displayAttendance}%` : "—"}
                  </div>
                  <div className="text-sm text-text-secondary mb-1">
                    {hasAttendanceData
                      ? `${attendanceMeta?.present ?? 0}/${attendanceMeta?.total ?? 0} classes`
                      : "No records yet"}
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#10b981] h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${hasAttendanceData ? displayAttendance : 0}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-3 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Maintain above 75% for certification.
                </p>
              </CardContent>
            </Card>

            {/* Course Card */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#1769AA]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Current Course</span>
                  <BookOpen className="h-4 w-4 text-[#1769AA]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-text-primary mt-2">{courseName}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-[#1769AA] border border-blue-100">Active</Badge>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Fees & Payments Section */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#F39A16]" />
                Fees & Payments
              </CardTitle>
              <CardDescription>Track your fee payments and download receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Total Fees</p>
                  <p className="text-2xl font-bold text-text-primary">₹0</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">₹0</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 relative overflow-hidden">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹0</p>
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border border-border/60 bg-bg-secondary/50">
                <div>
                  <h4 className="font-semibold text-text-primary">Payment Status</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    No pending installment payments due.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN (Schedule & Faculty) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Upcoming Classes */}
          <Card className="border-border/50 shadow-sm h-full max-h-[400px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" /> Class Schedule
                </span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">This Week</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center text-muted-foreground flex-1 flex items-center justify-center">
              No class sessions scheduled today.
            </CardContent>
          </Card>

          {/* Assigned Faculty */}
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-5 w-5 text-emerald-600" /> Assigned Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200 shadow-sm">
                  F
                </div>
                <div>
                  <h4 className="font-bold text-text-primary">Faculty Instructor</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Academic Lead</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
