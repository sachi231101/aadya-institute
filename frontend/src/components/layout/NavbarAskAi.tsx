import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Command } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";

export const NavbarAskAi: React.FC<{ className?: string }> = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );

  const getAiPath = () => {
    if (location.pathname.startsWith("/center") || userRoles.includes("CENTER_MANAGER")) {
      return "/center/ask-me";
    }
    if (location.pathname.startsWith("/counselor") || userRoles.includes("COUNSELLOR")) {
      return "/counselor/ask-me";
    }
    if (location.pathname.startsWith("/faculty") || userRoles.includes("FACULTY")) {
      return "/faculty/ask-me";
    }
    if (location.pathname.startsWith("/student") || userRoles.includes("STUDENT")) {
      return "/student/ask-me";
    }
    return "/admin/ask-me";
  };

  const aiPath = getAiPath();
  const isActive = location.pathname === aiPath;

  const handleOpenAi = () => {
    navigate(aiPath);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to launch Ask AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate(aiPath);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiPath, navigate]);

  return (
    <button
      onClick={handleOpenAi}
      className={`group relative flex items-center gap-1.5 h-7 px-2.5 rounded-full border transition-all duration-200 cursor-pointer select-none text-left ${
        isActive
          ? "bg-white text-[#1769AA] border-white shadow-md font-bold"
          : "bg-white/15 hover:bg-white/25 border-white/30 hover:border-white/60 text-white shadow-2xs hover:shadow-xs backdrop-blur-md"
      } ${className}`}
      title="Ask Aadya AI Assistant (Ctrl+K)"
      aria-label="Ask AI Assistant"
    >
      <div className="relative flex items-center justify-center text-amber-300">
        <Sparkles className="h-3 w-3 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 fill-amber-300/30" />
        <span className="absolute -top-0.5 -right-0.5 flex h-1 w-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-400"></span>
        </span>
      </div>

      <span className="text-[11px] font-bold tracking-tight text-white">
        Ask AI
      </span>
      <span className="text-[10px] font-normal text-white/75 hidden md:inline">
        — intelligent assistant
      </span>

      <div className={`hidden lg:flex items-center gap-0.5 ml-1 px-1 py-0.5 text-[9px] font-mono font-bold rounded border ${
        isActive
          ? "bg-[#1769AA]/10 border-[#1769AA]/30 text-[#1769AA]"
          : "bg-white/20 border-white/30 text-white"
      }`}>
        <span className="text-[9px]">⌘</span>K
      </div>

      <span className="flex sm:hidden text-[9px] font-black px-1 py-0.5 rounded-full bg-white text-[#1769AA]">
        AI
      </span>
    </button>
  );
};
