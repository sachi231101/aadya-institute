import React from "react";
import { LayoutDashboard, Sparkles, Settings, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardBaselineViewProps {
  role: "CENTER_MANAGER" | "COUNSELLOR";
  userName?: string;
}

const ALWAYS_AVAILABLE = [
  { icon: LayoutDashboard, label: "Dashboard", description: "Overview and branch summary" },
  { icon: Sparkles, label: "ASK ME", description: "AI assistant for academy operations" },
  { icon: Settings, label: "Settings", description: "Profile and account preferences" },
];

export const DashboardBaselineView: React.FC<DashboardBaselineViewProps> = ({
  role,
  userName,
}) => {
  const roleLabel = role === "CENTER_MANAGER" ? "Center Manager" : "Counsellor";

  return (
    <Card className="border-dashed border-2 border-slate-200 bg-white/80 shadow-xs rounded-3xl">
      <CardContent className="p-8 sm:p-10 text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#1769AA]/10 text-[#1769AA] flex items-center justify-center">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your {roleLabel} account is active, but no operational modules have been assigned yet.
            An administrator must enable modules in the permission matrix before you can access leads,
            students, admissions, fees, and other ERP sections.
          </p>
        </div>

        <div className="max-w-md mx-auto text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
            Always available
          </p>
          {ALWAYS_AVAILABLE.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#1769AA] shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Module access updates automatically when your administrator saves permission changes.
        </p>
      </CardContent>
    </Card>
  );
};
