import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Laptop, Globe, Compass, CheckCircle2, Shield, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstallAppDialog: React.FC<InstallAppDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles || (user?.role ? [user.role] : []);

  let roleLabel = "Institute Management";
  let RoleIcon = Laptop;
  let roleDashboardDesc = "Access your Aadya dashboard directly from your desktop.";

  if (roles.includes("ADMIN")) {
    roleLabel = "Admin Management Portal";
    RoleIcon = Shield;
    roleDashboardDesc = "Direct desktop access to multi-branch operations, analytics, staff, and institute controls.";
  } else if (roles.includes("CENTER_MANAGER")) {
    roleLabel = "Center Manager Portal";
    RoleIcon = Shield;
    roleDashboardDesc = "Direct desktop access to center admissions, batches, attendance, and branch schedules.";
  } else if (roles.includes("COUNSELLOR")) {
    roleLabel = "Counsellor Desk";
    RoleIcon = UserCheck;
    roleDashboardDesc = "Direct desktop access to lead pipelines, AI calling tasks, follow-ups, and student admissions.";
  } else if (roles.includes("FACULTY")) {
    roleLabel = "Faculty Portal";
    RoleIcon = BookOpen;
    roleDashboardDesc = "Direct desktop access to your class schedules, batch attendance, assignments, and recordings.";
  } else if (roles.includes("STUDENT")) {
    roleLabel = "Student Learning Portal";
    RoleIcon = GraduationCap;
    roleDashboardDesc = "Direct desktop access to your live timetable, recorded sessions, assignments, and progress.";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center border border-blue-100 shadow-xs">
              <RoleIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Install Aadya {roleLabel} App
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {roleDashboardDesc}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Globe className="h-4 w-4 text-[#1769AA]" />
              <span>Google Chrome / Brave / Chromium:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>Click the <strong>Install</strong> icon (computer with down arrow) in the address bar.</li>
              <li>Or click the <strong>three dots (⋮)</strong> menu &rarr; <strong>Save and share</strong> &rarr; <strong>Install Aadya Institute...</strong></li>
              <li>Click <strong>Install</strong> in the confirmation popup.</li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Compass className="h-4 w-4 text-emerald-600" />
              <span>Microsoft Edge:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>Click the <strong>App available</strong> icon in the address bar.</li>
              <li>Or click <strong>Settings and more (...)</strong> &rarr; <strong>Apps</strong> &rarr; <strong>Install Aadya Institute</strong>.</li>
              <li>Click <strong>Install</strong>.</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/60">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Opens in a standalone desktop window with instant launch and auto-updates.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
