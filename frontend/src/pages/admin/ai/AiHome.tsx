import React, { useState } from "react";
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
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export const AiHome: React.FC = () => {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("This Month");
  const [inputValue, setInputValue] = useState("");

  // 6 Quick AI Prompts from reference image
  const quickActions = [
    {
      id: "perf",
      label: "View today's performance",
      query: "View today's performance summary across all academy branches",
      icon: BarChart2,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      id: "rev",
      label: "Show branch revenue",
      query: "Which branch has the highest revenue and show the revenue breakdown?",
      icon: IndianRupee,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      id: "attention",
      label: "Students needing attention",
      query: "Show students needing immediate academic attention or low attendance",
      icon: Users,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
    },
    {
      id: "fees",
      label: "Pending fees",
      query: "Show the pending fees summary across all students and branches",
      icon: Wallet,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      id: "adm",
      label: "Today's admissions",
      query: "Show today's admissions and new student enrollments",
      icon: GraduationCap,
      iconColor: "text-pink-600",
      iconBg: "bg-pink-50",
    },
    {
      id: "rep",
      label: "Generate performance report",
      query: "Generate monthly performance report for Aadya Institute",
      icon: FileText,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
    },
  ];

  const handleSend = (queryText?: string) => {
    const q = (queryText || inputValue).trim();
    if (!q) return;
    navigate(`/admin/ask-me?q=${encodeURIComponent(q)}`);
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
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>
          <div className="absolute -right-8 top-1 text-blue-200 pointer-events-none hidden sm:block">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            How can I help you today, <span className="text-[#1769AA]">Admin?</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-3 leading-relaxed">
            Ask anything about your institute. Get insights, reports and smart recommendations instantly.
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
              placeholder="Ask anything about your institute..."
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
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleSend(action.query)}
                  className="bg-white border border-slate-200/80 hover:border-[#1769AA]/40 hover:shadow-md hover:-translate-y-0.5 transition-all p-3.5 rounded-xl text-left flex items-center gap-3 group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.iconBg} ${action.iconColor} flex items-center justify-center shrink-0`}>
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
                
                {/* 1. Total Branches */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <Building2 className="h-5 w-5 text-blue-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">12</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Total Branches</p>
                  <p className="text-[11px] font-semibold text-[#1769AA] mt-1">Across all locations</p>
                </div>

                {/* 2. Total Students */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <Users className="h-5 w-5 text-emerald-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">1,248</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Total Students</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1">↑ 18% this month</p>
                </div>

                {/* 3. Total Admissions */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <GraduationCap className="h-5 w-5 text-purple-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">237</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Total Admissions</p>
                  <p className="text-[11px] font-semibold text-purple-600 mt-1">↑ 15% this month</p>
                </div>

                {/* 4. Total Faculty */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <UserCheck className="h-5 w-5 text-orange-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">86</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Total Faculty</p>
                  <p className="text-[11px] font-semibold text-orange-600 mt-1">↑ 8% this month</p>
                </div>

                {/* 5. Total Revenue */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <IndianRupee className="h-5 w-5 text-emerald-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">₹12.86L</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Total Revenue</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1">↑ 16% this month</p>
                </div>

                {/* 6. Pending Fees */}
                <div className="p-2 sm:px-3 flex flex-col items-center">
                  <Wallet className="h-5 w-5 text-amber-500 mb-2" />
                  <h3 className="text-2xl font-black text-slate-900">₹2.10L</h3>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">Pending Fees</p>
                  <p className="text-[11px] font-semibold text-amber-600 mt-1">↑ 6% this month</p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
};
