import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { 
  User as UserIcon, 
  Lock, 
  Bell, 
  Sliders, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Building, 
  Key, 
  Save,
  Camera,
  Loader2,
  AlertCircle,
  Smartphone,
  Trash2
} from "lucide-react";
import { useAuthStore } from "../../../store/auth.store";
import {
  useGetSettings,
  useUpdatePersonal,
  useChangePassword,
  useUpdateNotifications,
  useUpdateSystem,
  useRevokeSession,
} from "../../../hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Settings: React.FC = () => {
  const location = useLocation();
  const { user: authUser, updateUser } = useAuthStore();
  const { data, isLoading, isError, refetch } = useGetSettings();

  const updatePersonalMutation = useUpdatePersonal();
  const changePasswordMutation = useChangePassword();
  const updateNotificationsMutation = useUpdateNotifications();
  const updateSystemMutation = useUpdateSystem();
  const revokeSessionMutation = useRevokeSession();

  const isFaculty = location.pathname.startsWith("/faculty") || authUser?.role === "FACULTY";
  const isCounselor = location.pathname.startsWith("/counselor") || authUser?.role === "COUNSELLOR";
  const isCenter = location.pathname.startsWith("/center") || authUser?.role === "CENTER_MANAGER";
  const isStudent = location.pathname.startsWith("/student") || authUser?.role === "STUDENT";


  const [activeTab, setActiveTab] = useState<"personal" | "security" | "notifications" | "system">("personal");

  // Personal Info Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Notification Toggles State
  const [emailAdmissions, setEmailAdmissions] = useState(true);
  const [emailFeeAlerts, setEmailFeeAlerts] = useState(true);
  const [emailAttendance, setEmailAttendance] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [aiCallAlerts, setAiCallAlerts] = useState(true);

  // System Preferences State
  const [primaryBranch, setPrimaryBranch] = useState("Main Campus - Bengaluru");
  const [currencyFormat, setCurrencyFormat] = useState("INR (₹)");
  const [themeMode, setThemeMode] = useState("LIGHT");
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(30);

  const [personalSuccess, setPersonalSuccess] = useState(false);
  const [personalError, setPersonalError] = useState("");

  // Synchronize state when settings data is loaded from API
  useEffect(() => {
    if (data) {
      setName(data.user.name || authUser?.name || "");
      setEmail(data.user.email || authUser?.email || "");
      setPhone(data.user.phone || authUser?.phone || "");
      setDesignation(data.settings.designation || "");
      setDepartment(data.settings.department || "");
      setLanguage(data.settings.language || "English (US)");
      setTimezone(data.settings.timezone || "(GMT+05:30) India Standard Time");

      setTwoFactorEnabled(data.settings.twoFactorEnabled);
      setEmailAdmissions(data.settings.emailAdmissions);
      setEmailFeeAlerts(data.settings.emailFeeAlerts);
      setEmailAttendance(data.settings.emailAttendance);
      setWhatsappReminders(data.settings.whatsappReminders);
      setAiCallAlerts(data.settings.aiCallAlerts);

      setPrimaryBranch(data.settings.primaryBranch || "Main Campus - Bengaluru");
      setCurrencyFormat(data.settings.currencyFormat || "INR (₹)");
      setThemeMode(data.settings.themeMode || "LIGHT");
      setAutoLogoutMinutes(data.settings.autoLogoutMinutes || 30);
    }
  }, [data, authUser]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setPersonalError("");
    setPersonalSuccess(false);

    try {
      await updatePersonalMutation.mutateAsync({
        name,
        email,
        phone,
        designation,
        department,
        language,
        timezone,
      });

      updateUser({ name, email, phone });
      setPersonalSuccess(true);
      setTimeout(() => setPersonalSuccess(false), 4000);
    } catch (err: any) {
      setPersonalError(err.response?.data?.message || err.message || "Failed to update personal details");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Security password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || err.message || "Failed to update password");
    }
  };

  const handleToggle2FA = async () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    try {
      await updateNotificationsMutation.mutateAsync({});
    } catch (err) {
      console.error("Failed to update 2FA setting:", err);
    }
  };

  const handleNotificationToggle = async (key: string, val: boolean) => {
    const nextObj = {
      emailAdmissions: key === "admissions" ? val : emailAdmissions,
      emailFeeAlerts: key === "fee" ? val : emailFeeAlerts,
      emailAttendance: key === "attendance" ? val : emailAttendance,
      whatsappReminders: key === "whatsapp" ? val : whatsappReminders,
      aiCallAlerts: key === "aicall" ? val : aiCallAlerts,
    };

    if (key === "admissions") setEmailAdmissions(val);
    if (key === "fee") setEmailFeeAlerts(val);
    if (key === "attendance") setEmailAttendance(val);
    if (key === "whatsapp") setWhatsappReminders(val);
    if (key === "aicall") setAiCallAlerts(val);

    try {
      await updateNotificationsMutation.mutateAsync(nextObj);
    } catch (err) {
      console.error("Failed to update notification preference:", err);
    }
  };

  const handleSystemSettingChange = async (key: string, val: any) => {
    const payload = {
      primaryBranch: key === "branch" ? val : primaryBranch,
      currencyFormat: key === "currency" ? val : currencyFormat,
      themeMode: key === "theme" ? val : themeMode,
      autoLogoutMinutes: key === "logout" ? Number(val) : autoLogoutMinutes,
    };

    if (key === "branch") setPrimaryBranch(val);
    if (key === "currency") setCurrencyFormat(val);
    if (key === "theme") setThemeMode(val);
    if (key === "logout") setAutoLogoutMinutes(Number(val));

    try {
      await updateSystemMutation.mutateAsync(payload);
    } catch (err) {
      console.error("Failed to update system preference:", err);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to revoke this active session?")) {
      try {
        await revokeSessionMutation.mutateAsync(sessionId);
      } catch (err) {
        alert("Failed to revoke session");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1769AA]" />
        <p className="text-sm font-medium">Loading user settings & account profile...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3 max-w-2xl mx-auto my-12">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load account settings</h3>
        <p className="text-xs text-red-600">Could not retrieve account profile from backend server.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry Loading
        </Button>
      </div>
    );
  }

  const roleName = data?.user.role || authUser?.role || "ADMIN";
  const activeSessions = data?.activeSessions || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            {isFaculty ? "Faculty Profile & Settings" : isCounselor ? "Counsellor Profile & Settings" : isCenter ? "Center Manager Settings" : isStudent ? "Student Profile & Settings" : "Admin Account Settings"}
          </h2>
          <p className="text-sm text-text-secondary">
            {isFaculty
              ? "Manage your teaching profile, security credentials, notification preferences, and course instruction settings."
              : isCounselor
              ? "Manage your counsellor profile, security credentials, notification preferences, and desk settings."
              : isCenter
              ? "Manage your branch profile, security credentials, notification preferences, and center settings."
              : isStudent
              ? "Manage your student profile, security credentials, notification preferences, and portal settings."
              : "Manage your personal profile, security credentials, notification channels, and portal preferences."}
          </p>

        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "personal"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("personal")}
        >
          <UserIcon className="h-4 w-4" />
          Personal Information
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "security"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("security")}
        >
          <Lock className="h-4 w-4" />
          Security & Password
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "notifications"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell className="h-4 w-4" />
          Notification Preferences
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "system"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("system")}
        >
          <Sliders className="h-4 w-4" />
          System Preferences
        </Button>
      </div>

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Profile Card Header */}
          <Card className="border-border/50 bg-white shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-[#1769AA] to-[#0B4F8A]" />
            <CardContent className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-10">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-slate-900 text-white font-bold text-2xl flex items-center justify-center border-4 border-white shadow-md">
                    {(name || "AD").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <button 
                    type="button"
                    className="absolute bottom-0 right-0 bg-[#1769AA] text-white p-1.5 rounded-full shadow hover:bg-[#F39A16] transition-colors"
                    onClick={() => alert("Avatar upload feature connected.")}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{name || "Aadya User"}</h3>
                    <Badge variant="outline" className={roleName === "FACULTY" ? "bg-amber-50 text-amber-700 border-amber-200" : roleName === "COUNSELLOR" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : roleName === "CENTER_MANAGER" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-[#1769AA] border-blue-200"}>
                      {roleName}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {email}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5 text-slate-400" /> {primaryBranch}</span>
                  </p>
                </div>
              </div>

              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                ● Account Verified
              </Badge>
            </CardContent>
          </Card>

          {personalSuccess && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-semibold">Personal Information Saved Successfully!</p>
            </div>
          )}

          {personalError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-semibold">{personalError}</p>
            </div>
          )}

          {/* Personal Details Form */}
          <form onSubmit={handlePersonalSubmit}>
            <Card className="border-border/50 bg-white shadow-sm">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-[#1769AA]" />
                  Personal Information Specification
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your contact details, administrative role metadata, and regional locale settings.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Designation</label>
                    <Input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <Input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                    >
                      <option value="(GMT+05:30) India Standard Time">(GMT+05:30) India (Kolkata)</option>
                      <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button 
                    type="submit" 
                    disabled={updatePersonalMutation.isPending}
                    className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm"
                  >
                    {updatePersonalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Personal Info
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordSubmit}>
            <Card className="border-border/50 bg-white shadow-sm">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Key className="h-5 w-5 text-[#1769AA]" />
                  Change Password & Security Credentials
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your account password to ensure portal access security. Current password will be verified against system records.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {passwordSuccess && (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="text-sm font-semibold">{passwordSuccess}</p>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 animate-in fade-in">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 max-w-md"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* 2FA & Active Sessions */}
          <Card className="border-border/50 bg-white shadow-sm">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Two-Factor Authentication (2FA) & Active Login Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Enforce Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-slate-500">Require OTP verification on new device logins.</p>
                </div>
                <Button
                  variant={twoFactorEnabled ? "default" : "outline"}
                  size="sm"
                  className={twoFactorEnabled ? "bg-emerald-600 text-white" : ""}
                  onClick={handleToggle2FA}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {/* Active Sessions List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Active Authorized Refresh Token Sessions</h4>
                {activeSessions.length > 0 ? (
                  activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-slate-100 text-slate-700">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-800 block">
                            Session Token: {session.tokenHashPreview}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Created: {new Date(session.createdAt).toLocaleDateString("en-IN")} • Expires: {new Date(session.expiresAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Revoke
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No active secondary refresh token sessions found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: NOTIFICATION PREFERENCES */}
      {activeTab === "notifications" && (
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-6 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#1769AA]" />
              Notification & Alert Channels
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure system email, WhatsApp, and AI Calling automation alerts.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">New Student Admission Alerts</h5>
                  <p className="text-xs text-slate-500">Receive email whenever a new candidate application is submitted.</p>
                </div>
                <Button 
                  variant={emailAdmissions ? "default" : "outline"} 
                  size="sm"
                  className={emailAdmissions ? "bg-[#1769AA] text-white" : ""}
                  onClick={() => handleNotificationToggle("admissions", !emailAdmissions)}
                >
                  {emailAdmissions ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Fee Overdue Alerts</h5>
                  <p className="text-xs text-slate-500">Receive weekly summaries of overdue student installment dues.</p>
                </div>
                <Button 
                  variant={emailFeeAlerts ? "default" : "outline"} 
                  size="sm"
                  className={emailFeeAlerts ? "bg-[#1769AA] text-white" : ""}
                  onClick={() => handleNotificationToggle("fee", !emailFeeAlerts)}
                >
                  {emailFeeAlerts ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Daily Student Attendance Summary</h5>
                  <p className="text-xs text-slate-500">Receive daily digest of class attendance and absenteeism logs.</p>
                </div>
                <Button 
                  variant={emailAttendance ? "default" : "outline"} 
                  size="sm"
                  className={emailAttendance ? "bg-[#1769AA] text-white" : ""}
                  onClick={() => handleNotificationToggle("attendance", !emailAttendance)}
                >
                  {emailAttendance ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">WhatsApp Class Reminders</h5>
                  <p className="text-xs text-slate-500">Automated WhatsApp broadcast 2 hours before scheduled classes.</p>
                </div>
                <Button 
                  variant={whatsappReminders ? "default" : "outline"} 
                  size="sm"
                  className={whatsappReminders ? "bg-[#1769AA] text-white" : ""}
                  onClick={() => handleNotificationToggle("whatsapp", !whatsappReminders)}
                >
                  {whatsappReminders ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">AI Calling Campaign Real-time Alerts</h5>
                  <p className="text-xs text-slate-500">Instant notification when high-intent leads request immediate callback.</p>
                </div>
                <Button 
                  variant={aiCallAlerts ? "default" : "outline"} 
                  size="sm"
                  className={aiCallAlerts ? "bg-[#1769AA] text-white" : ""}
                  onClick={() => handleNotificationToggle("aicall", !aiCallAlerts)}
                >
                  {aiCallAlerts ? "ON" : "OFF"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SYSTEM PREFERENCES */}
      {activeTab === "system" && (
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-6 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-[#1769AA]" />
              System & Campus Preferences
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure default operating branch, currency formats, UI theme, and session timeouts.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Operating Branch</label>
                <select
                  value={primaryBranch}
                  onChange={(e) => handleSystemSettingChange("branch", e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="Main Campus - Bengaluru">Main Campus - Bengaluru</option>
                  <option value="North Branch - Indiranagar">North Branch - Indiranagar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Format</label>
                <select
                  value={currencyFormat}
                  onChange={(e) => handleSystemSettingChange("currency", e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="INR (₹)">Indian Rupee (₹)</option>
                  <option value="USD ($)">US Dollar ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Theme Mode</label>
                <select
                  value={themeMode}
                  onChange={(e) => handleSystemSettingChange("theme", e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="LIGHT">Light Theme</option>
                  <option value="DARK">Dark Theme</option>
                  <option value="SYSTEM">System Match</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-Logout Session Timeout (Minutes)</label>
                <select
                  value={autoLogoutMinutes}
                  onChange={(e) => handleSystemSettingChange("logout", e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
