import React, { useState, useMemo } from "react";
import {
  Building2,
  Users,
  GraduationCap,
  Calendar,
  IndianRupee,
  Wallet,
  FileText,
  BarChart2,
  UserCheck,
  RotateCw,
  Plus,
  Mic,
  ArrowUp,
  ChevronDown,
  Sparkles,
  BookOpen,
  CheckCircle,
  Video,
  ClipboardList,
  MessageSquareQuote,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { useBranch } from "@/hooks/useBranches";

export const AiHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [dateFilter, setDateFilter] = useState("This Month");
  const [inputValue, setInputValue] = useState("");

  const { data: branchResponse } = useBranch(user?.branchId || undefined);
  const branchName = branchResponse?.data?.name || "Aadya Central Branch";

  // Determine current active role context & base path from current route and user
  const roleContext = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/center") || user?.roles?.includes("CENTER_MANAGER") || user?.role === "CENTER_MANAGER") {
      return {
        roleKey: "center",
        basePath: "/center",
        displayName: "Center Manager",
        greeting: `How can I help you today, ${user?.name ? user.name.split(" ")[0] : "Center Manager"}?`,
        subtitle: `Ask anything about ${branchName} operations, students, batches, faculty, and fees.`,
        placeholder: `Ask anything about ${branchName}...`,
        stats: [
          { icon: Building2, color: "text-blue-500", value: branchName.replace("Aadya ", ""), label: "Branch", sub: "Assigned Center", isText: true },
          { icon: Users, color: "text-emerald-500", value: "145", label: "Active Students", sub: "Currently Enrolled" },
          { icon: GraduationCap, color: "text-purple-500", value: "32", label: "Admissions", sub: "↑ 22.8% conversion" },
          { icon: UserCheck, color: "text-orange-500", value: "12", label: "Total Faculty", sub: "10 Active today" },
          { icon: IndianRupee, color: "text-emerald-500", value: "₹4.50L", label: "Revenue", sub: "This month total" },
          { icon: Wallet, color: "text-amber-500", value: "₹1.20L", label: "Pending Fees", sub: "Outstanding balance" },
        ],
        quickActions: [
          { id: "cm-1", label: "View today's branch performance", query: `View today's performance and operations summary for ${branchName}`, icon: BarChart2, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          { id: "cm-2", label: "Branch revenue & fee collection", query: `Show ${branchName} revenue collection status and pending fees`, icon: IndianRupee, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { id: "cm-3", label: "Students needing attention", query: `Show students with attendance below 75% or 3 consecutive absences in ${branchName}`, icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
          { id: "cm-4", label: "Pending fees & dues", query: `Show pending fee dues list for students in ${branchName}`, icon: Wallet, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
          { id: "cm-5", label: "Batch status overview", query: `Show all active and upcoming batches running in ${branchName}`, icon: BookOpen, iconColor: "text-pink-600", iconBg: "bg-pink-50" },
          { id: "cm-6", label: "Counsellor conversion report", query: `Show counsellor conversion rates and lead performance for ${branchName}`, icon: FileText, iconColor: "text-teal-600", iconBg: "bg-teal-50" },
        ],
      };
    }

    if (path.startsWith("/faculty") || user?.roles?.includes("FACULTY") || user?.role === "FACULTY") {
      return {
        roleKey: "faculty",
        basePath: "/faculty",
        displayName: "Faculty",
        greeting: `How can I help you today, ${user?.name ? "Prof. " + user.name.split(" ")[0] : "Faculty"}?`,
        subtitle: "Ask about your class schedules, student attendance, module progress, and doubt resolution.",
        placeholder: "Ask about your classes, attendance, or student progress...",
        stats: [
          { icon: BookOpen, color: "text-blue-500", value: "4", label: "Active Batches", sub: "Assigned Courses" },
          { icon: Users, color: "text-emerald-500", value: "86", label: "Total Students", sub: "Across all batches" },
          { icon: Calendar, color: "text-purple-500", value: "3", label: "Classes Today", sub: "Next at 02:00 PM" },
          { icon: CheckCircle, color: "text-orange-500", value: "88%", label: "Avg Attendance", sub: "Last 30 days" },
          { icon: ClipboardList, color: "text-emerald-500", value: "14", label: "Pending Reviews", sub: "Module assignments" },
          { icon: TrendingUp, color: "text-amber-500", value: "4.8 ★", label: "Student Rating", sub: "Excellent standing" },
        ],
        quickActions: [
          { id: "fa-1", label: "Today's class timetable", query: "Show my scheduled classes, batch timings and room assignments for today", icon: Calendar, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          { id: "fa-2", label: "Batch attendance report", query: "Show student attendance summary and identify students with low attendance", icon: Users, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { id: "fa-3", label: "Pending assignments to grade", query: "Show pending student assignment submissions waiting for review", icon: ClipboardList, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
          { id: "fa-4", label: "Curriculum module progress", query: "What is the completion percentage for my current active batches?", icon: BookOpen, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
          { id: "fa-5", label: "Student feedback summary", query: "Summarize recent student ratings and feedback comments for my classes", icon: MessageSquareQuote, iconColor: "text-pink-600", iconBg: "bg-pink-50" },
          { id: "fa-6", label: "Generate attendance sheet", query: "Generate printable attendance desk sheet for my upcoming class", icon: FileText, iconColor: "text-teal-600", iconBg: "bg-teal-50" },
        ],
      };
    }

    if (path.startsWith("/counselor") || user?.roles?.includes("COUNSELLOR") || user?.role === "COUNSELLOR") {
      return {
        roleKey: "counselor",
        basePath: "/counselor",
        displayName: "Counsellor",
        greeting: `How can I help you today, ${user?.name ? user.name.split(" ")[0] : "Counsellor"}?`,
        subtitle: "Ask about your student leads, walk-in enquiries, follow-up queues, and conversion metrics.",
        placeholder: "Ask about leads, follow-ups, or admissions...",
        stats: [
          { icon: Users, color: "text-blue-500", value: "68", label: "Assigned Leads", sub: "Active pipeline" },
          { icon: GraduationCap, color: "text-emerald-500", value: "16", label: "Converted", sub: "Admissions closed" },
          { icon: TrendingUp, color: "text-purple-500", value: "23.5%", label: "Conversion Rate", sub: "Top quartile" },
          { icon: Calendar, color: "text-orange-500", value: "8", label: "Follow-ups Today", sub: "4 High priority" },
          { icon: MessageSquareQuote, color: "text-emerald-500", value: "34", label: "AI Calls Placed", sub: "Sarvam AI voice agent" },
          { icon: Wallet, color: "text-amber-500", value: "₹2.40L", label: "Fee Realized", sub: "From admissions" },
        ],
        quickActions: [
          { id: "co-1", label: "High-priority follow-up leads", query: "Show leads requesting callback or marked as interested by AI caller", icon: Users, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          { id: "co-2", label: "Today's new enquiries", query: "Show newly registered course enquiries and walk-ins received today", icon: GraduationCap, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { id: "co-3", label: "AI voice call summaries", query: "Show AI calling conversation transcripts and positive intent leads", icon: MessageSquareQuote, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
          { id: "co-4", label: "Pending admission forms", query: "Show students with pending documents or partial fee payments", icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
          { id: "co-5", label: "Batch seat availability", query: "Which upcoming batches have available seats and schedule timings?", icon: BookOpen, iconColor: "text-pink-600", iconBg: "bg-pink-50" },
          { id: "co-6", label: "My monthly conversion report", query: "Generate my monthly lead-to-admission conversion performance summary", icon: BarChart2, iconColor: "text-teal-600", iconBg: "bg-teal-50" },
        ],
      };
    }

    if (path.startsWith("/student") || user?.roles?.includes("STUDENT") || user?.role === "STUDENT") {
      return {
        roleKey: "student",
        basePath: "/student",
        displayName: "Student",
        greeting: `How can I help you today, ${user?.name ? user.name.split(" ")[0] : "Learner"}?`,
        subtitle: "Ask about your class schedule, attendance, assignments, recordings, or academic doubts.",
        placeholder: "Ask about your timetable, assignments, recordings, or doubts...",
        stats: [
          { icon: BookOpen, color: "text-blue-500", value: "Full Stack", label: "Enrolled Course", sub: "MERN Program", isText: true },
          { icon: CheckCircle, color: "text-emerald-500", value: "92%", label: "My Attendance", sub: "Good standing" },
          { icon: Calendar, color: "text-purple-500", value: "10:00 AM", label: "Next Class", sub: "Mon, Wed, Fri" },
          { icon: Video, color: "text-orange-500", value: "24", label: "Recordings", sub: "Available to watch" },
          { icon: ClipboardList, color: "text-emerald-500", value: "2 Pending", label: "Assignments", sub: "Due Friday" },
          { icon: TrendingUp, color: "text-amber-500", value: "85%", label: "Course Progress", sub: "Module 4 of 6" },
        ],
        quickActions: [
          { id: "st-1", label: "View my class timetable", query: "What is my upcoming class schedule, timings, and faculty details?", icon: Calendar, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          { id: "st-2", label: "My attendance percentage", query: "Show my overall attendance percentage and list any missed classes", icon: CheckCircle, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { id: "st-3", label: "Watch recent class recordings", query: "List recent class session recordings available for my batch", icon: Video, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
          { id: "st-4", label: "Pending assignments & deadlines", query: "Show all active assignments, instructions, and submission deadlines", icon: ClipboardList, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
          { id: "st-5", label: "Explain a coding topic", query: "Explain React useEffect dependencies and clean-up functions with an example", icon: BookOpen, iconColor: "text-pink-600", iconBg: "bg-pink-50" },
          { id: "st-6", label: "Course syllabus progress", query: "How much of my course syllabus is completed and what is coming next?", icon: FileText, iconColor: "text-teal-600", iconBg: "bg-teal-50" },
        ],
      };
    }

    // Default: ADMIN
    return {
      roleKey: "admin",
      basePath: "/admin",
      displayName: "Admin",
      greeting: "How can I help you today, Admin?",
      subtitle: "Ask anything about your institute. Get insights, reports and smart recommendations instantly.",
      placeholder: "Ask anything about your institute...",
      stats: [
        { icon: Building2, color: "text-blue-500", value: "12", label: "Total Branches", sub: "Across all locations" },
        { icon: Users, color: "text-emerald-500", value: "1,248", label: "Total Students", sub: "↑ 18% this month" },
        { icon: GraduationCap, color: "text-purple-500", value: "237", label: "Total Admissions", sub: "↑ 15% this month" },
        { icon: UserCheck, color: "text-orange-500", value: "86", label: "Total Faculty", sub: "↑ 8% this month" },
        { icon: IndianRupee, color: "text-emerald-500", value: "₹12.86L", label: "Total Revenue", sub: "↑ 16% this month" },
        { icon: Wallet, color: "text-amber-500", value: "₹2.10L", label: "Pending Fees", sub: "↑ 6% this month" },
      ],
      quickActions: [
        { id: "perf", label: "View today's performance", query: "View today's performance summary across all academy branches", icon: BarChart2, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
        { id: "rev", label: "Show branch revenue", query: "Which branch has the highest revenue and show the revenue breakdown?", icon: IndianRupee, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
        { id: "attention", label: "Students needing attention", query: "Show students needing immediate academic attention or low attendance", icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
        { id: "fees", label: "Pending fees", query: "Show the pending fees summary across all students and branches", icon: Wallet, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
        { id: "adm", label: "Today's admissions", query: "Show today's admissions and new student enrollments", icon: GraduationCap, iconColor: "text-pink-600", iconBg: "bg-pink-50" },
        { id: "rep", label: "Generate performance report", query: "Generate monthly performance report for Aadya Institute", icon: FileText, iconColor: "text-teal-600", iconBg: "bg-teal-50" },
      ],
    };
  }, [location.pathname, user, branchName]);

  const handleSend = (queryText?: string) => {
    const q = (queryText || inputValue).trim();
    if (!q) return;
    navigate(`${roleContext.basePath}/ask-me?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto bg-[#fafbfc] min-h-screen relative flex flex-col justify-between space-y-6">
      {/* ─── TOP RIGHT CONTROLS ─── */}
      <div className="flex justify-end items-center gap-3 w-full">
        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs">
          <Calendar className="h-4 w-4 text-slate-500" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
          >
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
          </select>
        </div>

        {/* Refresh Action */}
        <button
          onClick={() => setInputValue("")}
          title="Reset"
          className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>

      {/* ─── MAIN AI COMMAND CENTER HERO ─── */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 md:my-10 space-y-8 w-full max-w-5xl mx-auto">
        {/* HERO TITLE AREA */}
        <div className="text-center relative max-w-2xl mx-auto px-4">
          {/* Subtle Decorative Star Sparkles */}
          <div className="absolute -left-8 -top-3 text-blue-200 pointer-events-none hidden sm:block">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
          <div className="absolute -right-8 top-1 text-blue-200 pointer-events-none hidden sm:block">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {roleContext.greeting.includes(",") ? (
              <>
                {roleContext.greeting.split(",")[0]},{" "}
                <span className="text-[#1769AA]">{roleContext.greeting.split(",")[1]}</span>
              </>
            ) : (
              roleContext.greeting
            )}
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-3 leading-relaxed">
            {roleContext.subtitle}
          </p>
        </div>

        {/* GEMINI-STYLE AI INPUT BOX */}
        <div className="w-full max-w-4xl px-2">
          <div className="bg-white border-2 border-blue-200/90 hover:border-[#1769AA]/60 focus-within:border-[#1769AA] focus-within:ring-4 focus-within:ring-blue-100/50 rounded-full px-5 py-3.5 shadow-[0_8px_30px_rgb(23,105,170,0.12)] flex items-center gap-3.5 transition-all">
            {/* Left '+' action */}
            <button
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors shrink-0"
              title="Add attachment"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Main Input */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={roleContext.placeholder}
              className="w-full text-sm sm:text-base font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              autoFocus
            />

            {/* Right Controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Model Tag */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
                <span className="w-2 h-2 rounded-full bg-[#1769AA]"></span>
                <span>AADYA AI</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>

              {/* Mic Icon */}
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-[#1769AA] transition-colors"
                title="Voice input"
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-slate-200"></div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                className="w-9 h-9 rounded-full bg-[#1769AA] hover:bg-[#125890] active:scale-95 text-white flex items-center justify-center shadow-md transition-all shrink-0"
                title="Send query"
              >
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* QUICK AI PROMPT SUGGESTIONS ("Try asking") */}
        <div className="w-full max-w-5xl space-y-3 px-2">
          <p className="text-xs font-bold text-slate-400 tracking-wide text-center uppercase">
            Try asking
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {roleContext.quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleSend(action.query)}
                  className="bg-white border border-slate-200/80 hover:border-[#1769AA]/40 hover:shadow-md hover:-translate-y-0.5 transition-all p-3.5 rounded-xl text-left flex items-center gap-3 group"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${action.iconBg} ${action.iconColor} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-[#1769AA] leading-snug line-clamp-2 transition-colors">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── BOTTOM KPI SUMMARY STRIP ─── */}
        <div className="w-full max-w-5xl mx-auto mt-4 px-2">
          <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-center gap-y-4 sm:gap-y-0">
                {roleContext.stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="p-2 sm:px-3 flex flex-col items-center">
                      <Icon className={`h-5 w-5 ${stat.color} mb-2`} />
                      <h3
                        className={`${
                          (stat as any).isText ? "text-base font-extrabold line-clamp-1" : "text-2xl font-black"
                        } text-slate-900`}
                      >
                        {stat.value}
                      </h3>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">{stat.label}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">{stat.sub}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
