import React, { useState } from "react";
import { Download, Laptop, X, Shield, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuthStore } from "@/store/auth.store";

export const InstallDashboardBanner: React.FC = () => {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem("aadya_pwa_banner_dismissed") === "true";
  });
  const user = useAuthStore((s) => s.user);

  // Only show when browser has the install prompt ready AND not already in standalone AND not dismissed
  if (!isInstallable || isStandalone || dismissed) {
    return null;
  }

  const roles = user?.roles || (user?.role ? [user.role] : []);
  let roleTitle = "App";
  let roleDesc = "Install Aadya Institute as a desktop app for faster performance and quick taskbar access.";
  let RoleIcon = Laptop;

  if (roles.includes("ADMIN")) {
    roleTitle = "Admin App";
    roleDesc = "Install the Aadya Admin Portal on your desktop for quick access to all branch operations & controls.";
    RoleIcon = Shield;
  } else if (roles.includes("CENTER_MANAGER")) {
    roleTitle = "Center App";
    roleDesc = "Install the Center Manager Portal for fast one-click access to admissions, batches & attendance.";
    RoleIcon = Shield;
  } else if (roles.includes("COUNSELLOR")) {
    roleTitle = "Counsellor App";
    roleDesc = "Install the Counsellor Desk for instant notifications, lead pipeline, and calling management.";
    RoleIcon = UserCheck;
  } else if (roles.includes("FACULTY")) {
    roleTitle = "Faculty App";
    roleDesc = "Install the Faculty Portal to manage your classes, student attendance, and recordings with zero clutter.";
    RoleIcon = BookOpen;
  } else if (roles.includes("STUDENT")) {
    roleTitle = "Student App";
    roleDesc = "Install the Student Portal to access your schedule, class videos, and assignments directly from your desktop.";
    RoleIcon = GraduationCap;
  }

  const handleInstallClick = () => {
    // Directly triggers the browser's native install prompt — no custom popup
    installApp();
  };

  const handleDismiss = () => {
    sessionStorage.setItem("aadya_pwa_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1769AA]/10 via-[#1769AA]/5 to-[#F39A16]/10 border border-[#1769AA]/20 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[#1769AA] text-white flex items-center justify-center shadow-sm shrink-0">
          <RoleIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              Install Aadya {roleTitle} on Desktop
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#1769AA] text-white">
              Desktop App
            </span>
          </div>
          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
            {roleDesc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white font-bold text-xs gap-1.5 shadow-xs px-4 h-9"
        >
          <Download className="h-4 w-4" />
          Install {roleTitle}
        </Button>
        <button
          onClick={handleDismiss}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          title="Dismiss for this session"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
