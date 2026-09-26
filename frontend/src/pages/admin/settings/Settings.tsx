import React, { useState, useEffect, useMemo } from "react";
import {
  User as UserIcon,
  Lock,
  Bell,
  Sliders,
  Monitor,
  CheckCircle2,
  Mail,
  Phone,
  Briefcase,
  Building,
  Building2,
  Calendar,
  RotateCcw,
  Save,
  ChevronRight,
  Laptop,
  Check,
  Smartphone,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/auth.store";
import { Link } from "react-router-dom";
import {
  useGetSettings,
  useUpdatePersonal,
  useChangePassword,
  useUpdateNotifications,
  useUpdateSystem,
  useRevokeSession,
} from "../../../hooks/useSettings";
import { securityApi, type SecuritySession } from "@/services/security.api";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUIStore } from "@/store/ui.store";
import { sanitizeMobileInput } from "@/utils/validation";
import { useBranches } from "@/hooks/useBranches";

const getStoredRefreshToken = () => {
  try {
    return (
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken") ||
      null
    );
  } catch {
    return null;
  }
};

function formatDeviceLabel(userAgent: string | null | undefined): {
  label: string;
  kind: "mobile" | "desktop";
} {
  if (!userAgent?.trim()) {
    return { label: "Unknown device", kind: "desktop" };
  }
  const ua = userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  let os = "";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return {
    label: os ? `${browser} on ${os}` : browser,
    kind: isMobile ? "mobile" : "desktop",
  };
}

function formatLastSeen(iso: string | null | undefined, createdAt: string): string {
  const raw = iso || createdAt;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Last active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last active ${hours}h ago`;
  return `Last active ${date.toLocaleString("en-IN")}`;
}

function formatRoleLabel(role: string | undefined | null): string {
  if (!role) return "User";
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Settings: React.FC = () => {
  const { user: authUser, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { data } = useGetSettings();

  const updatePersonalMutation = useUpdatePersonal();
  const changePasswordMutation = useChangePassword();
  const updateNotificationsMutation = useUpdateNotifications();
  const updateSystemMutation = useUpdateSystem();
  const revokeSessionMutation = useRevokeSession();

  const [activeTab, setActiveTab] = useState<
    "personal" | "security" | "notifications" | "system" | "sessions"
  >("personal");

  const sessionsQuery = useQuery({
    queryKey: ["security", "sessions", "mine"],
    queryFn: () => securityApi.getSessions(getStoredRefreshToken()),
    enabled: activeTab === "sessions",
  });

  const mySessions = useMemo(() => {
    const all = sessionsQuery.data ?? [];
    if (!authUser?.id) return all;
    return all.filter((s: SecuritySession) => s.userId === authUser.id);
  }, [sessionsQuery.data, authUser?.id]);

  const logoutOthersMutation = useMutation({
    mutationFn: () => securityApi.logoutOtherSessions(getStoredRefreshToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setToastMessage("✓ Other sessions signed out.");
      setTimeout(() => setToastMessage(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to sign out other sessions.";
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [branchId, setBranchId] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailFeeAlerts, setEmailFeeAlerts] = useState(true);
  const [emailAttendance, setEmailAttendance] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [aiCallAlerts, setAiCallAlerts] = useState(true);

  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");
  const [currency, setCurrency] = useState("INR (₹)");
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(30);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: branchesRes, isLoading: branchesLoading } = useBranches({
    limit: 100,
    status: "ACTIVE",
  });
  const branches = useMemo(() => branchesRes?.data || [], [branchesRes]);

  const primaryRole = useMemo(() => {
    const roles = authUser?.roles || [];
    if (roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")) return "ADMIN";
    if (roles.includes("CENTER_MANAGER")) return "CENTER_MANAGER";
    if (roles.includes("COUNSELLOR")) return "COUNSELLOR";
    if (roles.includes("FACULTY")) return "FACULTY";
    return data?.user?.role || authUser?.role || roles[0] || "USER";
  }, [authUser, data?.user?.role]);

  const roleDesignation = formatRoleLabel(primaryRole);

  const isBranchLocked = useMemo(() => {
    const roles = (authUser?.roles || []).map((r) => String(r).toUpperCase());
    if (roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")) return false;
    return roles.some((r) =>
      ["CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"].includes(r)
    );
  }, [authUser?.roles]);

  const accountStatus = String(data?.user?.status || "ACTIVE").toUpperCase();
  const selectedBranchName =
    branches.find((b) => b.id === branchId)?.name ||
    data?.settings?.primaryBranch ||
    "";

  useEffect(() => {
    if (!data?.user) return;
    setFullName(data.user.name || authUser?.name || "");
    setEmail(data.user.email || authUser?.email || "");
    setMobileNumber(sanitizeMobileInput(data.user.phone || authUser?.phone || ""));
    if (data.settings?.department) setDepartment(data.settings.department);
    if (data.settings?.language) setLanguage(data.settings.language);
    if (data.settings?.timezone) setTimezone(data.settings.timezone);
    if (data.settings?.currencyFormat) setCurrency(data.settings.currencyFormat);
    if (data.settings?.autoLogoutMinutes) {
      setAutoLogoutMinutes(data.settings.autoLogoutMinutes);
    }
    if (data.settings?.emailFeeAlerts !== undefined) {
      setEmailFeeAlerts(data.settings.emailFeeAlerts);
    }
    if (data.settings?.emailAttendance !== undefined) {
      setEmailAttendance(data.settings.emailAttendance);
    }
    if (data.settings?.whatsappReminders !== undefined) {
      setWhatsappReminders(data.settings.whatsappReminders);
    }
    if (data.settings?.aiCallAlerts !== undefined) {
      setAiCallAlerts(data.settings.aiCallAlerts);
    }
  }, [data, authUser]);

  useEffect(() => {
    if (branches.length === 0) return;
    if (authUser?.branchId && branches.some((b) => b.id === authUser.branchId)) {
      setBranchId(authUser.branchId);
      return;
    }
    const primaryName = data?.settings?.primaryBranch?.trim();
    if (primaryName) {
      const matched = branches.find(
        (b) => b.name.toLowerCase() === primaryName.toLowerCase()
      );
      if (matched) {
        setBranchId(matched.id);
        return;
      }
    }
    if (!branchId) setBranchId("");
  }, [branches, authUser?.branchId, data?.settings?.primaryBranch, branchId]);

  const handleSavePersonal = () => {
    updatePersonalMutation.mutate(
      {
        name: fullName,
        email,
        phone: mobileNumber,
        designation: roleDesignation,
        department,
        language,
        timezone,
      },
      {
        onSuccess: () => {
          updateUser({ name: fullName, email, phone: mobileNumber });
          if (selectedBranchName) {
            updateSystemMutation.mutate({ primaryBranch: selectedBranchName });
          }
          setToastMessage("✓ Personal information saved successfully.");
          setTimeout(() => setToastMessage(null), 3500);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Failed to save personal information.";
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        },
      }
    );
  };

  const handleReset = () => {
    setFullName(data?.user?.name || authUser?.name || "");
    setEmail(data?.user?.email || authUser?.email || "");
    setMobileNumber(sanitizeMobileInput(data?.user?.phone || authUser?.phone || ""));
    setDepartment(data?.settings?.department || "");
    if (authUser?.branchId && branches.some((b) => b.id === authUser.branchId)) {
      setBranchId(authUser.branchId);
    } else if (data?.settings?.primaryBranch) {
      const matched = branches.find(
        (b) => b.name.toLowerCase() === data.settings.primaryBranch.toLowerCase()
      );
      setBranchId(matched?.id || "");
    } else {
      setBranchId("");
    }
    setLanguage(data?.settings?.language || "English (US)");
    setTimezone(data?.settings?.timezone || "(GMT+05:30) India Standard Time");
    setCurrency(data?.settings?.currencyFormat || "INR (₹)");
    setAutoLogoutMinutes(data?.settings?.autoLogoutMinutes || 30);
    setToastMessage("↺ Reset unsaved form fields.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleChangePasswordSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToastMessage("⚠ Please fill in all password fields.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setToastMessage("⚠ New passwords do not match.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setToastMessage("✓ Password updated successfully.");
          setTimeout(() => setToastMessage(null), 3500);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "⚠ Failed to update password.";
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        },
      }
    );
  };

  return (
    <PageContainer className="text-slate-800 font-sans animate-in fade-in duration-200">
      <PageHeader
        title="System Settings"
        description="Manage your personal profile, security, notifications, and portal preferences."
      />

      {(authUser?.roles?.includes("FACULTY") || authUser?.role === "FACULTY") &&
        !authUser?.roles?.includes("ADMIN") && (
          <div className="mb-4">
            <Link
              to="/faculty/my-attendance"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Calendar className="h-4 w-4" />
              My Desk Attendance
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-px">
        {(
          [
            { key: "personal", label: "Personal Information", icon: UserIcon },
            { key: "security", label: "Security & Password", icon: Lock },
            { key: "notifications", label: "Notification Preferences", icon: Bell },
            { key: "system", label: "System Preferences", icon: Sliders },
            { key: "sessions", label: "Active Sessions", icon: Monitor },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden p-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {fullName || "—"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100/80 text-primary border border-blue-200">
                {formatRoleLabel(primaryRole)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {email || "—"}
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {selectedBranchName || "No branch assigned"}
              </span>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                accountStatus === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>{accountStatus === "ACTIVE" ? "Active" : accountStatus}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {formatRoleLabel(primaryRole)} Account
            </span>
          </div>
        </div>
      </Card>

      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2 border-slate-200/80 shadow-xs bg-white rounded-xl p-5 sm:p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-primary shrink-0">
                <UserIcon className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Personal Information
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update your name, contact details, and branch assignment.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(sanitizeMobileInput(e.target.value))
                    }
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Designation
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={roleDesignation}
                    readOnly
                    disabled
                    className="h-10 pl-9 bg-slate-100/80 border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed opacity-90"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Taken from your assigned role — cannot be edited
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Department
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Administration"
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Branch
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={isBranchLocked || branchesLoading}
                    className="w-full h-10 pl-9 pr-8 text-xs font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {branchesLoading ? "Loading branches..." : "Select branch"}
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    {!branchesLoading && branches.length === 0 && (
                      <option value="" disabled>
                        No branches found
                      </option>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                {isBranchLocked && (
                  <p className="text-[10px] text-slate-400">
                    Assigned branch — cannot be changed here
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Profile Summary
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Account Type</span>
                  <span className="font-bold text-slate-900 text-right">
                    {formatRoleLabel(primaryRole)}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Branch</span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[160px]">
                    {selectedBranchName || "—"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Mobile</span>
                  <span className="font-bold text-slate-900 text-right">
                    {mobileNumber || "—"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Account Status</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${
                      accountStatus === "ACTIVE" ? "text-emerald-600" : "text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        accountStatus === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {accountStatus === "ACTIVE" ? "Active" : accountStatus}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 shrink-0">
              <Lock className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Security & Authentication
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Update your login password.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs max-w-md">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-10 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-10 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-10 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <Button
              onClick={handleChangePasswordSubmit}
              disabled={changePasswordMutation.isPending}
              className="bg-primary hover:bg-primary text-white text-xs font-bold h-10 px-5 rounded-xl mt-2"
            >
              {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Bell className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Notification Preferences
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure alerts for admissions, fees, WhatsApp, and AI calling.
              </p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Fee Payment Receipts & Alerts</p>
                <p className="text-[11px] text-slate-500">
                  Get notified on fee installments and transactions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailFeeAlerts}
                onChange={(e) => setEmailFeeAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">WhatsApp Automated Class Notifications</p>
                <p className="text-[11px] text-slate-500">
                  Enable automated class reminder messages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={whatsappReminders}
                onChange={(e) => setWhatsappReminders(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">AI Voice Calling Updates</p>
                <p className="text-[11px] text-slate-500">
                  Receive summaries when AI voice calls complete.
                </p>
              </div>
              <input
                type="checkbox"
                checked={aiCallAlerts}
                onChange={(e) => setAiCallAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB] cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => {
                updateNotificationsMutation.mutate(
                  {
                    emailFeeAlerts,
                    emailAttendance,
                    whatsappReminders,
                    aiCallAlerts,
                  },
                  {
                    onSuccess: () => {
                      setToastMessage("✓ Notification preferences updated.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                    onError: (err: unknown) => {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response
                          ?.data?.message || "Failed to save notification preferences.";
                      setToastMessage(msg);
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                  }
                );
              }}
              className="bg-primary hover:bg-primary text-white text-xs font-bold h-9 px-4 rounded-xl"
            >
              Save Notification Preferences
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "system" && (
        <Card className="border-slate-200/80 dark:border-border shadow-xs bg-white dark:bg-card rounded-xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-primary dark:text-sky-400 shrink-0">
              <Sliders className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-foreground tracking-tight">
                System & Regional Preferences
              </h3>
              <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium mt-0.5">
                Set appearance, language, timezone, and idle logout.
              </p>
            </div>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-border/60">
            <div>
              <Label className="text-xs font-bold text-slate-800 dark:text-foreground">
                Portal Appearance
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5">
                Choose light or dark theme across portals.
              </p>
            </div>
            <div className="pt-1 max-w-sm">
              <ThemeToggle variant="segmented" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Language</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="English (US)">English (US)</option>
                <option value="English (IN)">English (IN)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Timezone</Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="(GMT+05:30) India Standard Time">
                  (GMT+05:30) India Standard Time
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Currency Format</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="INR (₹)">INR (₹)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">
                Auto Logout (minutes)
              </Label>
              <select
                value={String(autoLogoutMinutes)}
                onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="120">120</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => {
                const currentTheme = useUIStore.getState().theme;
                updateSystemMutation.mutate(
                  {
                    primaryBranch: selectedBranchName || undefined,
                    currencyFormat: currency,
                    themeMode: currentTheme.toUpperCase(),
                    autoLogoutMinutes,
                  },
                  {
                    onSuccess: () => {
                      updatePersonalMutation.mutate({
                        name: fullName || authUser?.name || "",
                        email: email || authUser?.email || "",
                        phone: mobileNumber,
                        language,
                        timezone,
                      });
                      setToastMessage("✓ System preferences updated.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                    onError: (err: unknown) => {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response
                          ?.data?.message || "Failed to save system preferences.";
                      setToastMessage(msg);
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                  }
                );
              }}
              className="bg-primary hover:bg-primary text-white text-xs font-bold h-9 px-4 rounded-xl"
            >
              Save System Preferences
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "sessions" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <Monitor className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Active Devices & Sessions
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Devices currently signed into your account.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={
                logoutOthersMutation.isPending ||
                mySessions.filter((s) => !s.isCurrent).length === 0
              }
              onClick={() => logoutOthersMutation.mutate()}
              className="h-8 text-xs shrink-0"
            >
              {logoutOthersMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Sign out others
            </Button>
          </div>

          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sessions...
            </div>
          ) : sessionsQuery.isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Could not load sessions. Try again or open Administration → Security.
            </div>
          ) : mySessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-500">
              No active sessions found for your account.
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              {mySessions.map((session) => {
                const device = formatDeviceLabel(session.userAgent);
                const Icon = device.kind === "mobile" ? Smartphone : Laptop;
                return (
                  <div
                    key={session.id}
                    className="pt-3 first:pt-2 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{device.label}</span>
                          {session.isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              CURRENT SESSION
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {session.ipAddress ? `IP: ${session.ipAddress}` : "IP: —"}
                          {" • "}
                          {session.isCurrent
                            ? "This device"
                            : formatLastSeen(session.lastSeenAt, session.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() => {
                          revokeSessionMutation.mutate(session.id, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: ["security", "sessions"],
                              });
                              setToastMessage("✓ Session revoked.");
                              setTimeout(() => setToastMessage(null), 3000);
                            },
                            onError: (err: unknown) => {
                              const msg =
                                (err as { response?: { data?: { message?: string } } })
                                  ?.response?.data?.message || "Failed to revoke session.";
                              setToastMessage(msg);
                              setTimeout(() => setToastMessage(null), 3000);
                            },
                          });
                        }}
                        className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "personal" && (
        <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" />
            <span>Reset Changes</span>
          </Button>

          <Button
            type="button"
            onClick={handleSavePersonal}
            disabled={updatePersonalMutation.isPending}
            className="text-xs font-bold h-10 px-5 bg-primary hover:bg-primary text-white rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>
              {updatePersonalMutation.isPending ? "Saving..." : "Save Changes"}
            </span>
          </Button>
        </div>
      )}
    </PageContainer>
  );
};
