import React, { useState } from "react";
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
  Camera
} from "lucide-react";
import { useAuthStore } from "../../../store/auth.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"personal" | "security" | "notifications" | "system">("personal");

  // Personal Info Form State
  const [name, setName] = useState(user?.name || "Aadya Admin");
  const [email, setEmail] = useState(user?.email || "admin@aadya.in");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [designation, setDesignation] = useState("Academy Operations Director");
  const [department, setDepartment] = useState("Institute Administration");
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("(GMT+05:30) India Standard Time");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification Toggles State
  const [emailAdmissions, setEmailAdmissions] = useState(true);
  const [emailFeeAlerts, setEmailFeeAlerts] = useState(true);
  const [emailAttendance, setEmailAttendance] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(true);

  // System Preferences State
  const [primaryBranch, setPrimaryBranch] = useState("Main Campus - Bengaluru");
  const [currencyFormat, setCurrencyFormat] = useState("INR (₹)");

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePersonalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    updateUser({
      name,
      email,
      phone,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) return;

    alert("Security password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Admin Account Settings</h2>
          <p className="text-sm text-text-secondary">
            Manage your personal profile, security credentials, notification channels, and portal preferences.
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

      {savedSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">Personal Information Saved Successfully!</p>
        </div>
      )}

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
                    {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <button 
                    type="button"
                    className="absolute bottom-0 right-0 bg-[#1769AA] text-white p-1.5 rounded-full shadow hover:bg-[#F39A16] transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{name}</h3>
                    <Badge variant="outline" className="bg-blue-50 text-[#1769AA] border-blue-200">
                      ADMIN
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {email}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5 text-slate-400" /> Aadya Institute Main</span>
                  </p>
                </div>
              </div>

              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                ● Account Verified
              </Badge>
            </CardContent>
          </Card>

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
                    className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Personal Info
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
                  Update your admin account password to ensure portal access security.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
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
                    className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm"
                  >
                    Update Password
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
                Two-Factor Authentication (2FA) & Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Enforce Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-slate-500">Require OTP verification on new device logins.</p>
                </div>
                <Button
                  variant={twoFactorEnabled ? "default" : "outline"}
                  size="sm"
                  className={twoFactorEnabled ? "bg-emerald-600 text-white" : ""}
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </Button>
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
              Configure system email and WhatsApp automation alerts.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">New Student Admission Alerts</h5>
                  <p className="text-xs text-slate-500">Receive email whenever a new candidate application is submitted.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEmailAdmissions(!emailAdmissions)}
                >
                  {emailAdmissions ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Fee Overdue Alerts</h5>
                  <p className="text-xs text-slate-500">Receive weekly summaries of overdue student installment dues.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEmailFeeAlerts(!emailFeeAlerts)}
                >
                  {emailFeeAlerts ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Daily Student Attendance Summary</h5>
                  <p className="text-xs text-slate-500">Receive daily digest of class attendance and absenteeism logs.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEmailAttendance(!emailAttendance)}
                >
                  {emailAttendance ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">WhatsApp Class Reminders</h5>
                  <p className="text-xs text-slate-500">Automated WhatsApp broadcast 2 hours before scheduled classes.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setWhatsappReminders(!whatsappReminders)}
                >
                  {whatsappReminders ? "ON" : "OFF"}
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
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Operating Branch</label>
                <select
                  value={primaryBranch}
                  onChange={(e) => setPrimaryBranch(e.target.value)}
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
                  onChange={(e) => setCurrencyFormat(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="INR (₹)">Indian Rupee (₹)</option>
                  <option value="USD ($)">US Dollar ($)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
