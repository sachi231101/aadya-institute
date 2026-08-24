import React from "react";
import { Download, Laptop, Shield, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuthStore } from "@/store/auth.store";

export interface InstallAppButtonProps {
  variant?: "header" | "sidebar" | "default" | "banner";
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  variant = "header",
  className = "",
}) => {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const user = useAuthStore((s) => s.user);

  // Only show when browser has the install prompt ready AND we are not already in standalone mode
  if (!isInstallable || isStandalone) {
    return null;
  }

  const roles = user?.roles || (user?.role ? [user.role] : []);
  let roleTitle = "App";
  let fullTitle = "Install Desktop App";
  let RoleIcon = Laptop;

  if (roles.includes("ADMIN")) {
    roleTitle = "Admin App";
    fullTitle = "Install Admin Desktop App";
    RoleIcon = Shield;
  } else if (roles.includes("CENTER_MANAGER")) {
    roleTitle = "Center App";
    fullTitle = "Install Center Desktop App";
    RoleIcon = Shield;
  } else if (roles.includes("COUNSELLOR")) {
    roleTitle = "Counsellor App";
    fullTitle = "Install Counsellor Desktop App";
    RoleIcon = UserCheck;
  } else if (roles.includes("FACULTY")) {
    roleTitle = "Faculty App";
    fullTitle = "Install Faculty Desktop App";
    RoleIcon = BookOpen;
  } else if (roles.includes("STUDENT")) {
    roleTitle = "Student App";
    fullTitle = "Install Student Desktop App";
    RoleIcon = GraduationCap;
  }

  const handleClick = () => {
    installApp();
  };

  if (variant === "header") {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className={`h-9 gap-1.5 bg-[#1769AA]/10 hover:bg-[#1769AA] text-[#1769AA] hover:text-white border border-[#1769AA]/30 font-bold text-xs transition-all shadow-xs px-3 ${className}`}
        title={`Install Aadya ${roleTitle} as a standalone desktop application`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install {roleTitle}</span>
      </Button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-[#1769AA] bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl transition-all shadow-xs ${className}`}
        title={`Install Aadya ${roleTitle} as a standalone desktop application`}
      >
        <RoleIcon className="h-4 w-4 shrink-0 text-[#1769AA]" />
        <span className="truncate">{fullTitle}</span>
      </button>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 flex items-center justify-between gap-4 shadow-xs ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1769AA] text-white flex items-center justify-center shadow-xs shrink-0">
            <RoleIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Install Aadya {roleTitle}</h4>
            <p className="text-xs text-slate-500">Run your dashboard in a fast, dedicated desktop app window.</p>
          </div>
        </div>
        <Button
          onClick={handleClick}
          size="sm"
          className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white font-semibold text-xs gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5" /> Install Now
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={`gap-2 bg-[#1769AA] hover:bg-[#0B4F8A] text-white font-semibold ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>Install {roleTitle}</span>
    </Button>
  );
};
