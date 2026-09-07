import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export const NavbarAskAi: React.FC<{ className?: string }> = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );

  const getAiPath = () => {
    if (location.pathname.startsWith("/center") || userRoles.includes("CENTER_MANAGER")) {
      return "/center/home";
    }
    if (location.pathname.startsWith("/counselor") || userRoles.includes("COUNSELLOR")) {
      return "/counselor/home";
    }
    if (location.pathname.startsWith("/faculty") || userRoles.includes("FACULTY")) {
      return "/faculty/home";
    }
    // Students do not have Ask AI — fall through to admin only for staff roles
    return "/admin/home";
  };

  const aiPath = getAiPath();
  const isActive = location.pathname === aiPath;

  const handleOpenAi = () => {
    navigate(aiPath);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K opens AI Home
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

  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)));
  }, []);

  return (
    <button
      onClick={handleOpenAi}
      className={`h-7 w-7 rounded-lg border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${
        isActive
          ? "bg-white text-[#2563EB] border-white shadow-sm"
          : "bg-white/10 hover:bg-white/20 text-white"
      } ${className}`}
      title={`Ask AI Assistant (${isMac ? "⌘K" : "Ctrl+K"})`}
      aria-label="Ask AI Assistant"
    >
      <Sparkles
        className={`h-3.5 w-3.5 transition-transform duration-200 hover:scale-110 ${
          isActive ? "text-[#2563EB] fill-[#2563EB]/20" : "text-amber-300 fill-amber-300/20"
        }`}
      />
    </button>
  );
};
