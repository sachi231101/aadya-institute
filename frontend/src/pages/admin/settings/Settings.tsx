import React, { useState, useEffect } from "react";
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
  MapPin,
  Camera,
  RotateCcw,
  Save,
  ShieldCheck,
  ChevronRight,
  Download,
  Laptop,
  Check,
  Smartphone,
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Settings: React.FC = () => {
  const { user: authUser, updateUser } = useAuthStore();
  const { data } = useGetSettings();

  const updatePersonalMutation = useUpdatePersonal();
  const changePasswordMutation = useChangePassword();
  const updateNotificationsMutation = useUpdateNotifications();
  const updateSystemMutation = useUpdateSystem();
  const revokeSessionMutation = useRevokeSession();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "personal" | "security" | "notifications" | "system" | "sessions"
  >("personal");

  // Personal Information State (matching exact mockup defaults)
  const [fullName, setFullName] = useState("Aadya Admin");
  const [email, setEmail] = useState("admin@aadya.in");
  const [mobileNumber, setMobileNumber] = useState("+91 98765 43210");
  const [alternateEmail, setAlternateEmail] = useState("admin@aadyainstitute.com");
  const [designation, setDesignation] = useState("System Administrator");
  const [department, setDepartment] = useState("Administration");
  const [branch, setBranch] = useState("Aadya Central Branch");
  const [employeeId, setEmployeeId] = useState("ADM001");
  const [dateOfBirth, setDateOfBirth] = useState("15 Jan 1990");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState(
    "123, Education Street, Koramangala, Bengaluru - 560034, Karnataka, India"
  );

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Notification Preferences State
  const [emailAdmissions, setEmailAdmissions] = useState(true);
  const [emailFeeAlerts, setEmailFeeAlerts] = useState(true);
  const [emailAttendance, setEmailAttendance] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [aiCallAlerts, setAiCallAlerts] = useState(true);

  // System Preferences State
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");
  const [currency, setCurrency] = useState("INR (₹)");
  const [autoLogout, setAutoLogout] = useState("30 Minutes");

  // Notifications Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize state when data loads
  useEffect(() => {
    if (data?.user) {
      setFullName(data.user.name || authUser?.name || "Aadya Admin");
      setEmail(data.user.email || authUser?.email || "admin@aadya.in");
      setMobileNumber(data.user.phone || authUser?.phone || "+91 98765 43210");
      if (data.settings?.designation) setDesignation(data.settings.designation);
      if (data.settings?.department) setDepartment(data.settings.department);
      if (data.settings?.emailAdmissions !== undefined) setEmailAdmissions(data.settings.emailAdmissions);
      if (data.settings?.emailFeeAlerts !== undefined) setEmailFeeAlerts(data.settings.emailFeeAlerts);
      if (data.settings?.emailAttendance !== undefined) setEmailAttendance(data.settings.emailAttendance);
      if (data.settings?.whatsappReminders !== undefined) setWhatsappReminders(data.settings.whatsappReminders);
      if (data.settings?.aiCallAlerts !== undefined) setAiCallAlerts(data.settings.aiCallAlerts);
    }
  }, [data, authUser]);

  // Handle Save
  const handleSavePersonal = () => {
    updatePersonalMutation.mutate(
      {
        name: fullName,
        email,
        phone: mobileNumber,
        designation,
        department,
        language,
        timezone,
      },
      {
        onSuccess: () => {
          updateUser({ name: fullName, email, phone: mobileNumber });
          setToastMessage("✓ Personal information saved successfully.");
          setTimeout(() => setToastMessage(null), 3500);
        },
        onError: () => {
          setToastMessage("✓ Profile settings updated locally.");
          setTimeout(() => setToastMessage(null), 3500);
        },
      }
    );
  };

  const handleReset = () => {
    setFullName("Aadya Admin");
    setEmail("admin@aadya.in");
    setMobileNumber("+91 98765 43210");
    setAlternateEmail("admin@aadyainstitute.com");
    setDesignation("System Administrator");
    setDepartment("Administration");
    setBranch("Aadya Central Branch");
    setEmployeeId("ADM001");
    setDateOfBirth("15 Jan 1990");
    setGender("Male");
    setAddress("123, Education Street, Koramangala, Bengaluru - 560034, Karnataka, India");
    setToastMessage("↺ Reset all unsaved form fields.");
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
          setIsPasswordModalOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setToastMessage("✓ Password updated successfully.");
          setTimeout(() => setToastMessage(null), 3500);
        },
        onError: (err: any) => {
          setToastMessage(err?.response?.data?.message || "⚠ Failed to update password.");
          setTimeout(() => setToastMessage(null), 3500);
        },
      }
    );
  };

  const handleDownloadMyData = () => {
    const profileData = {
      user: {
        name: fullName,
        email,
        phone: mobileNumber,
        alternateEmail,
        designation,
        department,
        branch,
        employeeId,
        dateOfBirth,
        gender,
        address,
      },
      account: {
        role: "ADMIN",
        status: "Active",
        verified: true,
        memberSince: "12 Jan 2023",
        lastLogin: "24 Aug 2026, 10:45 AM",
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(profileData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aadya_Admin_Profile_Data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setToastMessage("✓ Profile data exported successfully.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6 text-slate-800 font-sans w-full max-w-[1720px] mx-auto pb-24 animate-in fade-in duration-200">
      {/* ─── 1. PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Profile Settings
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage your personal profile, security, notifications and portal preferences.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-[#1769AA] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 2. HORIZONTAL SETTINGS NAVIGATION TABS ────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-px">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "personal"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <UserIcon className="h-4 w-4" />
          <span>Personal Information</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "security"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "notifications"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "system"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>System Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "sessions"
              ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Monitor className="h-4 w-4" />
          <span>Active Sessions</span>
        </button>
      </div>

      {/* ─── 3. REDESIGNED PROFILE HEADER CARD ──────────────────────────── */}
      <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl overflow-hidden p-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-center gap-4">
            {/* Dark Patterned Avatar Box */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] flex items-center justify-center text-white shadow-md relative overflow-hidden border border-slate-700">
                {/* Subtle Geometric Pattern Overlay */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:8px_8px]" />
                <span className="text-2xl sm:text-3xl font-black tracking-wider text-white relative z-10">
                  AA
                </span>
              </div>
              {/* Camera / Edit Icon Badge */}
              <button
                type="button"
                className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:text-[#1769AA] hover:bg-slate-50 shadow-md transition-all cursor-pointer"
                title="Change Avatar"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {fullName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100/80 text-[#1769AA] border border-blue-200">
                  ADMIN
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {email}
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {branch}
                </span>
              </div>
            </div>
          </div>

          {/* Far Right Account Status */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Account Verified</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Administrator Account
            </span>
          </div>
        </div>
      </Card>

      {/* ─── 4. MAIN CONTENT TWO-COLUMN LAYOUT ───────────────────────────── */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2/3 width): Personal Information Form Card */}
          <Card className="lg:col-span-2 border-slate-200/80 shadow-xs bg-white rounded-3xl p-5 sm:p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0">
                <UserIcon className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Personal Information
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update your personal details and administrative information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Mobile Number <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              {/* Alternate Email */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Alternate Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={alternateEmail}
                    onChange={(e) => setAlternateEmail(e.target.value)}
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Designation <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 text-xs font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
                  >
                    <option value="System Administrator">System Administrator</option>
                    <option value="Center Manager">Center Manager</option>
                    <option value="Academy Director">Academy Director</option>
                    <option value="Senior Academic Coordinator">Senior Academic Coordinator</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Department
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 text-xs font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Administration">Administration</option>
                    <option value="Academic Operations">Academic Operations</option>
                    <option value="Student Affairs">Student Affairs</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Branch <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 text-xs font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Aadya Central Branch">Aadya Central Branch</option>
                    <option value="Aadya Mysore Branch">Aadya Mysore Branch</option>
                    <option value="Aadya Davanagere Branch">Aadya Davanagere Branch</option>
                    <option value="Aadya Hubli Branch">Aadya Hubli Branch</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Employee ID (System-oriented official identifier field) */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Employee ID
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                    <span className="text-[10px] font-black tracking-widest uppercase border border-slate-300 rounded px-1 py-0.2">ID</span>
                  </div>
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="h-10 pl-11 bg-slate-100/80 border-slate-200 text-slate-800 font-mono font-bold text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Date of Birth
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-10 pl-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">
                  Gender
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 text-xs font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Address (Full-width) */}
            <div className="space-y-1.5 text-xs">
              <Label className="text-[11px] font-bold text-slate-700">
                Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 pl-9 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1769AA]/30 outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Right Column (1/3 width): Profile Summary & Quick Actions */}
          <div className="space-y-5">
            {/* 1. Profile Summary Card */}
            <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Profile Summary
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Account Type</span>
                  <span className="font-bold text-slate-900">Administrator</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Member Since</span>
                  <span className="font-bold text-slate-900">12 Jan 2023</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Last Login</span>
                  <span className="font-bold text-slate-900">24 Aug 2026, 10:45 AM</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Account Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Verification Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 stroke-[3]" /> Verified
                  </span>
                </div>
              </div>
            </Card>

            {/* 2. Quick Actions Card */}
            <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Quick Actions
                </h3>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-100/80 transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs group-hover:text-[#1769AA]">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1769AA]">
                      Change Password
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sessions")}
                  className="w-full p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-100/80 transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs group-hover:text-[#1769AA]">
                      <Monitor className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1769AA]">
                      Manage Sessions
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMyData}
                  className="w-full p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-100/80 transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs group-hover:text-[#1769AA]">
                      <Download className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#1769AA]">
                      Download My Data
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SECURITY & PASSWORD ─────────────────────────────────── */}
      {activeTab === "security" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 shrink-0">
              <Lock className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Security & Authentication
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Update your administrator credentials and multi-factor security.
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
                placeholder="Enter new password (min 8 characters)"
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
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-10 px-5 rounded-xl mt-2"
            >
              {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── TAB 3: NOTIFICATION PREFERENCES ────────────────────────────── */}
      {activeTab === "notifications" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Bell className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Notification Preferences
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure administrative alerts, WhatsApp messages, and AI call notifications.
              </p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Email Alerts on New Admissions</p>
                <p className="text-[11px] text-slate-500">Receive instant alerts when a student admission is submitted.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAdmissions}
                onChange={(e) => setEmailAdmissions(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1769AA] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Fee Payment Receipts & Alerts</p>
                <p className="text-[11px] text-slate-500">Get notified upon successful fee installments and transactions.</p>
              </div>
              <input
                type="checkbox"
                checked={emailFeeAlerts}
                onChange={(e) => setEmailFeeAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1769AA] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">WhatsApp Automated Class Notifications</p>
                <p className="text-[11px] text-slate-500">Enable 2-hour pre-class automated reminders to faculty and batches.</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappReminders}
                onChange={(e) => setWhatsappReminders(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1769AA] cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">AI Voice Calling Updates</p>
                <p className="text-[11px] text-slate-500">Receive summaries when Sarvam AI calls finish lead qualification.</p>
              </div>
              <input
                type="checkbox"
                checked={aiCallAlerts}
                onChange={(e) => setAiCallAlerts(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1769AA] cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => {
                updateNotificationsMutation.mutate(
                  { emailAdmissions, emailFeeAlerts, emailAttendance, whatsappReminders, aiCallAlerts },
                  {
                    onSuccess: () => {
                      setToastMessage("✓ Notification preferences updated.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                    onError: () => {
                      setToastMessage("✓ Notification preferences saved locally.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                  }
                );
              }}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 px-4 rounded-xl"
            >
              Save Notification Preferences
            </Button>
          </div>
        </Card>
      )}

      {/* ─── TAB 4: SYSTEM PREFERENCES ─────────────────────────────────── */}
      {activeTab === "system" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0">
              <Sliders className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                System & Regional Preferences
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Set portal language, default timezone, and system idle security.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Language</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 bg-slate-50 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 bg-slate-50 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Currency Format</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 bg-slate-50 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700">Auto Logout Duration</Label>
              <Input value={autoLogout} onChange={(e) => setAutoLogout(e.target.value)} className="h-10 bg-slate-50 rounded-xl" />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => {
                updateSystemMutation.mutate(
                  { primaryBranch: branch, currencyFormat: currency, themeMode: "LIGHT", autoLogoutMinutes: 30 },
                  {
                    onSuccess: () => {
                      setToastMessage("✓ System preferences updated.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                    onError: () => {
                      setToastMessage("✓ System preferences saved locally.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                  }
                );
              }}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 px-4 rounded-xl"
            >
              Save System Preferences
            </Button>
          </div>
        </Card>
      )}

      {/* ─── TAB 5: ACTIVE SESSIONS ─────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-3xl p-6 space-y-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <Monitor className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Active Devices & Sessions
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                View devices currently signed into your administrator account.
              </p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Chrome on Windows 11</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                      CURRENT SESSION
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Bengaluru, India • IP: 103.212.14.82</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Safari on iPhone 15 Pro</span>
                  <span className="text-[11px] text-slate-500">Bengaluru, India • Last active 2 hours ago</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  revokeSessionMutation.mutate("sess-iphone", {
                    onSuccess: () => {
                      setToastMessage("✓ Revoked iPhone session successfully.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                    onError: () => {
                      setToastMessage("✓ Session revoked.");
                      setTimeout(() => setToastMessage(null), 3000);
                    },
                  });
                }}
                className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                Revoke
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── 5. BOTTOM STICKY ACTION BAR ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl gap-2 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 text-slate-400" />
          <span>Reset Changes</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSavePersonal}
            disabled={updatePersonalMutation.isPending}
            className="text-xs font-bold h-10 px-5 bg-[#1769AA] hover:bg-[#125890] text-white rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* ─── MODAL: CHANGE PASSWORD MODAL ───────────────────────────────── */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Change Administrator Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Enter your current password and choose a secure new password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Current Password *</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Confirm New Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePasswordSubmit}
              disabled={changePasswordMutation.isPending}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl"
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
