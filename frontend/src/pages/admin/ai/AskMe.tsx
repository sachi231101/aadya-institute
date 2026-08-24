import React, { useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { aiAgentApi } from "@/services/ai-agent.api";
import { useAuthStore } from "@/store/auth.store";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  toolsUsed?: string[];
  isError?: boolean;
}

export const AskMe: React.FC = () => {

  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track if initial query has been fired to avoid double-send
  const initialQueryFired = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSendQuery = useCallback(
    async (customQuery?: string) => {
      const query = (customQuery || inputValue).trim();
      if (!query || isProcessing) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: query,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsProcessing(true);

      try {
        const response = await aiAgentApi.chat({
          message: query,
          conversationId,
        });

        // Persist conversationId for multi-turn
        setConversationId(response.conversationId);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: response.message,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          toolsUsed: response.toolsUsed,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const errorText =
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again.";

        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: errorText,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsProcessing(false);
      }
    },
    [inputValue, isProcessing, conversationId]
  );

  // Handle incoming query parameter from AI Home
  useEffect(() => {
    if (
      initialQuery &&
      initialQuery.trim() &&
      !initialQueryFired.current
    ) {
      initialQueryFired.current = true;
      handleSendQuery(initialQuery);
      // Clean query parameter after consumption
      setSearchParams({}, { replace: true });
    }
  }, [initialQuery, handleSendQuery]);

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendQuery();
    }
  };

  // Derive user initials for avatar
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  // 6 Quick Suggestions when chat is empty
  const quickActions = [
    {
      id: "perf",
      label: "View today's performance",
      query: "Give me today's performance summary across all academy branches",
      icon: BarChart2,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      id: "rev",
      label: "Show branch revenue",
      query: "Which branch has the highest revenue? Show the revenue breakdown.",
      icon: Building2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      id: "attention",
      label: "Students needing attention",
      query:
        "Show students needing immediate academic attention or with low attendance",
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
            <p className="text-xs text-slate-500">
              Your intelligent institute operations &amp; academic assistant
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
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
              <h3 className="text-xl font-bold text-slate-900">
                Welcome to AADYA AI Assistant
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Ask any questions about students, faculty, branch revenue,
                pending fees, or generate instant reports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSendQuery(action.query)}
                    disabled={isProcessing}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-[#1769AA]/50 hover:shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div
                      className={`p-1.5 rounded-lg ${action.iconBg} ${action.iconColor}`}
                    >
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
            className={`flex gap-3.5 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            } animate-in fade-in duration-200`}
          >
            {msg.sender === "ai" && (
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs mt-0.5 ${
                  msg.isError
                    ? "bg-red-50 text-red-500 border-red-100"
                    : "bg-blue-50 text-[#1769AA] border-blue-100"
                }`}
              >
                {msg.isError ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4 fill-[#1769AA]" />
                )}
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#1769AA] text-white font-medium rounded-tr-sm shadow-sm"
                  : msg.isError
                  ? "bg-red-50 text-red-700 border border-red-200 shadow-sm rounded-tl-sm space-y-2"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm space-y-3"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Tools used indicator */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {msg.toolsUsed.map((tool) => (
                    <span
                      key={tool}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#1769AA] border border-blue-100"
                    >
                      🔧 {tool.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              <p
                className={`text-[10px] text-right ${
                  msg.sender === "user"
                    ? "text-blue-200"
                    : "text-slate-400"
                }`}
              >
                {msg.time}
              </p>
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                {userInitials}
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
            disabled={isProcessing}
          />

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1769AA]"></span>
              <span>AADYA AI</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>

            <button
              type="button"
              className="p-1 text-slate-400 hover:text-[#1769AA] transition-colors"
            >
              <Mic className="h-4 w-4" />
            </button>

            <div className="w-px h-4 bg-slate-200"></div>

            <button
              type="button"
              onClick={() => handleSendQuery()}
              disabled={isProcessing || !inputValue.trim()}
              className="w-8 h-8 rounded-full bg-[#1769AA] hover:bg-[#125890] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
