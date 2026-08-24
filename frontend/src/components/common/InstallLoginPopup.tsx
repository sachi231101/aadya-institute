import React, { useState, useEffect } from "react";
import {
  Download,
  X,
  Laptop,
  Shield,
  UserCheck,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Monitor,
  Zap,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuthStore } from "@/store/auth.store";

const SESSION_KEY = "aadya_pwa_login_popup_shown";

export const InstallLoginPopup: React.FC = () => {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Show once per login session when the browser is ready to install
  useEffect(() => {
    if (
      isInstallable &&
      !isStandalone &&
      !sessionStorage.getItem(SESSION_KEY)
    ) {
      // Small delay so the dashboard loads first
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [isInstallable, isStandalone]);

  if (!open) return null;

  const roles = user?.roles || (user?.role ? [user.role] : []);
  let roleTitle = "Aadya";
  let portalName = "Aadya Institute Portal";
  let description = "Install Aadya Institute as a desktop app for faster access.";
  let RoleIcon = Laptop;
  let gradientFrom = "from-[#1769AA]";
  let gradientTo = "to-[#1565C0]";

  if (roles.includes("ADMIN")) {
    roleTitle = "Admin";
    portalName = "Aadya Admin Portal";
    description = "Manage all branches, faculty, students, admissions, and finances from one powerful desktop app.";
    RoleIcon = Shield;
    gradientFrom = "from-[#1769AA]";
    gradientTo = "to-[#0D47A1]";
  } else if (roles.includes("CENTER_MANAGER")) {
    roleTitle = "Center Manager";
    portalName = "Center Manager Portal";
    description = "Access admissions, batch management, attendance reports, and branch operations from your desktop.";
    RoleIcon = Shield;
    gradientFrom = "from-[#1769AA]";
    gradientTo = "to-[#0277BD]";
  } else if (roles.includes("COUNSELLOR")) {
    roleTitle = "Counsellor";
    portalName = "Counsellor Desk";
    description = "Manage your lead pipeline, track follow-ups, and log calls right from your desktop taskbar.";
    RoleIcon = UserCheck;
    gradientFrom = "from-[#059669]";
    gradientTo = "to-[#047857]";
  } else if (roles.includes("FACULTY")) {
    roleTitle = "Faculty";
    portalName = "Faculty Teaching Portal";
    description = "Mark attendance, upload assignments, and manage class recordings without opening a browser.";
    RoleIcon = BookOpen;
    gradientFrom = "from-[#D97706]";
    gradientTo = "to-[#B45309]";
  } else if (roles.includes("STUDENT")) {
    roleTitle = "Student";
    portalName = "Student Learning Portal";
    description = "Access your classes, schedule, recordings, and fees directly from your desktop — always one click away.";
    RoleIcon = GraduationCap;
    gradientFrom = "from-[#7C3AED]";
    gradientTo = "to-[#6D28D9]";
  }

  const handleInstall = async () => {
    setInstalling(true);
    sessionStorage.setItem(SESSION_KEY, "true");
    await installApp();
    setInstalling(false);
    setOpen(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient hero section */}
          <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} px-7 pt-7 pb-10 relative overflow-hidden`}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute top-4 right-16 w-12 h-12 bg-white/10 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-black/10 rounded-full" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon + Badge */}
            <div className="relative z-10 flex items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                <RoleIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">
                  Aadya Institute
                </span>
                <p className="text-white font-bold text-base leading-tight">
                  {portalName}
                </p>
              </div>
            </div>

            {/* Headline */}
            <h2 className="relative z-10 text-2xl font-extrabold text-white leading-tight mb-2">
              Install your {roleTitle} App
            </h2>
            <p className="relative z-10 text-sm text-white/80 leading-relaxed">
              {description}
            </p>
          </div>

          {/* White card body */}
          <div className="bg-white px-7 pt-6 pb-7">
            {/* Feature bullets */}
            <ul className="space-y-3 mb-7">
              {[
                { icon: Monitor, text: "Opens as a standalone desktop window — no browser tabs" },
                { icon: Zap, text: "Instant launch from taskbar or desktop shortcut" },
                { icon: Bell, text: "Stay updated automatically in the background" },
                { icon: CheckCircle2, text: "Works offline for recent data" },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>

            {/* Action buttons */}
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="w-full h-12 text-sm font-bold gap-2 bg-[#1769AA] hover:bg-[#0B4F8A] text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {installing ? (
                <>Installing...</>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Install {roleTitle} Desktop App
                </>
              )}
            </Button>

            <button
              onClick={handleDismiss}
              className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Maybe later — continue in browser
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
