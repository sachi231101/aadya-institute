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

  // Counsellors do not get Ask AI (button + Ctrl+K).
  const isCounsellorOnly =
    userRoles.includes("COUNSELLOR") &&
    !userRoles.includes("ADMIN") &&
    !userRoles.includes("SUPER_ADMIN") &&
    !userRoles.includes("CENTER_MANAGER");

  const getAiPath = () => {
    if (location.pathname.startsWith("/center") || userRoles.includes("CENTER_MANAGER")) {
      return "/center/home";
    }
    if (location.pathname.startsWith("/faculty") || userRoles.includes("FACULTY")) {
      return "/faculty/home";
    }
    // Students / counsellors do not have Ask AI — staff fall through to admin
    return "/admin/home";
  };

  const aiPath = getAiPath();
  const isActive = location.pathname === aiPath;

  const handleOpenAi = () => {
    navigate(aiPath);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K opens AI Home
  useEffect(() => {
    if (isCounsellorOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate(aiPath);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiPath, navigate, isCounsellorOnly]);

  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)));
  }, []);

  if (isCounsellorOnly) return null;

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
