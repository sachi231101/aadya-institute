import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Plus,
  Mic,
  ArrowUp,
  ChevronDown,
  RotateCw,
  Building2,
  Users,
  Wallet,
  GraduationCap,
  FileText,
  BarChart2,
  ExternalLink,
  Download,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  cardType?: "branch-revenue" | "students-attention" | "pending-fees" | "admissions" | "performance-report" | "general";
  data?: any;
}

export const AskMe: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Handle incoming query parameter from AI Home
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && messages.length === 0) {
      handleSendQuery(initialQuery);
      // Clean query parameter after consumption
      setSearchParams({}, { replace: true });
    }
  }, [initialQuery]);

  // 6 Quick Suggestions when chat is empty
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
      icon: Building2,
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

  const handleSendQuery = (customQuery?: string) => {
    const query = (customQuery || inputValue).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsProcessing(true);

    setTimeout(() => {
      let aiMsg: Message;
      const lower = query.toLowerCase();

      if (lower.includes("revenue") || lower.includes("branch")) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Ramamurthy Nagar generated the highest revenue this month with ₹5.42L collected (88% collection efficiency). Here is the branch performance breakdown:",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "branch-revenue",
          data: {
            topRevenue: "₹5,42,000",
            branches: [
              { name: "Ramamurthy Nagar", revenue: "₹5.42L", rate: "88%", students: 512 },
              { name: "Bengaluru Central", revenue: "₹4.68L", rate: "84%", students: 486 },
              { name: "Malleswaram Branch", revenue: "₹2.76L", rate: "79%", students: 250 },
            ],
          },
        };
      } else if (lower.includes("attention") || lower.includes("attendance") || lower.includes("risk")) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Identified 16 students across all branches requiring immediate attention due to attendance falling below 70% or missing consecutive classes:",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "students-attention",
          data: {
            count: 16,
            students: [
              { name: "Karan Singh", id: "STU-004", branch: "Ramamurthy Nagar", course: "Python Programming", attendance: "61%", alert: "Missed 3 theory classes" },
              { name: "Pooja Patel", id: "ST007", branch: "Bengaluru Central", course: "Graphic Design", attendance: "52%", alert: "Low test score (30%)" },
              { name: "Mohammed Ali", id: "ST006", branch: "Malleswaram", course: "Digital Marketing", attendance: "68%", alert: "Pending fee & 2 absences" },
            ],
          },
        };
      } else if (lower.includes("fee") || lower.includes("pending")) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Total pending fees across all branches is ₹2.10L from 23 students. 84% of total billed tuition has been successfully collected this month.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "pending-fees",
          data: {
            totalPending: "₹2,10,000",
            totalCollected: "₹10,76,000",
            collectionRate: "84%",
          },
        };
      } else if (lower.includes("admission") || lower.includes("enrol")) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Total 237 admissions recorded this month (+15% MoM). 14 new admissions finalized today across Bengaluru Central and Ramamurthy Nagar.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "admissions",
          data: {
            todayCount: 14,
            monthCount: 237,
            topCourse: "Full Stack Web Development (94 seats)",
          },
        };
      } else if (lower.includes("report") || lower.includes("generate")) {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Monthly Executive Performance Report generated successfully for Aadya Institute. Includes complete branch metrics, admissions, revenue, and faculty attendance summary.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "performance-report",
          data: {
            reportTitle: "Aadya Institute Executive Summary — August 2026",
            fileSize: "2.4 MB PDF",
          },
        };
      } else {
        aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `Institute status for "${query}": All 12 branches are operational with 1,248 students enrolled, 86 faculty members, and 91% average student attendance this month.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: "general",
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
      setIsProcessing(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendQuery();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* ─── HEADER ─── */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center border border-blue-100 shadow-xs">
            <Sparkles className="h-5 w-5 fill-[#1769AA]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">AADYA AI</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1769AA] border border-blue-200">
                ● Connected
              </span>
            </div>
            <p className="text-xs text-slate-500">Your intelligent institute operations & academic assistant</p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="text-xs text-slate-500 hover:text-red-600 gap-1.5 h-8"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Chat
          </Button>
        )}
      </div>

      {/* ─── CHAT MESSAGES AREA (SCROLLABLE) ─── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafbfc]">
        
        {/* Empty State: Quick Suggestions */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto my-auto py-12 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1769AA] flex items-center justify-center border border-blue-100 shadow-sm">
              <Sparkles className="h-7 w-7 fill-[#1769AA]" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Welcome to AADYA AI Assistant</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Ask any questions about students, faculty, branch revenue, pending fees, or generate instant reports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSendQuery(action.query)}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-[#1769AA]/50 hover:shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-3 transition-all"
                  >
                    <div className={`p-1.5 rounded-lg ${action.iconBg} ${action.iconColor}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
          >
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 border border-blue-100 shadow-xs mt-0.5">
                <Sparkles className="h-4 w-4 fill-[#1769AA]" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#1769AA] text-white font-medium rounded-tr-sm shadow-sm"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm space-y-3"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Data Card: Branch Revenue */}
              {msg.cardType === "branch-revenue" && msg.data && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800 pb-1 border-b border-slate-200">
                    <span>Branch Breakdown</span>
                    <span className="text-emerald-600 font-black">{msg.data.topRevenue} Top</span>
                  </div>
                  <div className="space-y-1.5">
                    {msg.data.branches.map((b: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">{b.name}</span>
                        <div className="flex items-center gap-2 font-bold">
                          <span>{b.revenue}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">{b.rate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Card: Students Attention */}
              {msg.cardType === "students-attention" && msg.data && (
                <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-red-800 pb-1 border-b border-red-100">
                    <span>{msg.data.count} Students Needing Attention</span>
                    <button onClick={() => navigate("/admin/students/all")} className="text-[#1769AA] text-[11px] font-semibold hover:underline flex items-center gap-1">
                      View Directory <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {msg.data.students.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-red-100">
                        <div>
                          <p className="font-bold text-slate-800">{s.name} ({s.id})</p>
                          <p className="text-[10px] text-slate-500">{s.course} • {s.branch}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-[11px]">{s.attendance}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.alert}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Card: Pending Fees */}
              {msg.cardType === "pending-fees" && msg.data && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-amber-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                      <p className="text-sm font-black text-amber-600 mt-0.5">{msg.data.totalPending}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-amber-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Collected</p>
                      <p className="text-sm font-black text-emerald-600 mt-0.5">{msg.data.totalCollected}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-amber-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Rate</p>
                      <p className="text-sm font-black text-[#1769AA] mt-0.5">{msg.data.collectionRate}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Card: Performance Report */}
              {msg.cardType === "performance-report" && msg.data && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{msg.data.reportTitle}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{msg.data.fileSize}</p>
                  </div>
                  <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-[#1769AA] text-white gap-1">
                    <Download className="h-3 w-3" /> Download PDF
                  </Button>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-right">{msg.time}</p>
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                AD
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3.5 justify-start animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
              <RotateCw className="h-4 w-4 animate-spin text-[#1769AA]" />
            </div>
            <div className="bg-white text-slate-500 border border-slate-200 p-3.5 rounded-2xl rounded-tl-sm text-xs font-medium flex items-center gap-2">
              <span>Thinking and fetching institute data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── STICKY BOTTOM AI INPUT BAR ─── */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <div className="bg-white border-2 border-blue-200/90 hover:border-[#1769AA]/60 focus-within:border-[#1769AA] focus-within:ring-3 focus-within:ring-blue-100/50 rounded-full px-4 py-2.5 shadow-xs flex items-center gap-3 transition-all">
          
          <button 
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            title="Attach file"
          >
            <Plus className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your institute..."
            className="w-full text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            autoFocus
          />

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1769AA]"></span>
              <span>AADYA AI</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>

            <button type="button" className="p-1 text-slate-400 hover:text-[#1769AA] transition-colors">
              <Mic className="h-4 w-4" />
            </button>

            <div className="w-px h-4 bg-slate-200"></div>

            <button
              type="button"
              onClick={() => handleSendQuery()}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-[#1769AA] hover:bg-[#125890] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all shrink-0"
            >
              <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
