import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  FileText,
  Star,
  ArrowLeft,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { api } from "@/services/api";

const PLACEMENT_PORTAL_URL = "https://placement.aadyainstitution.com/";

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const academic = useStudentAcademicAccess();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.put("/settings/security/password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Password changed successfully! You can now log in with your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to update password. Please verify current password.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 pb-10">
      {/* Top Bar with Back and Logout */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="rounded-xl border-border text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer text-foreground hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          <span>Back</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="rounded-xl border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span>Logout Account</span>
        </Button>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {(academic.studentName || user?.name)?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{academic.studentName || user?.name || "Student"}</h1>
            <p className="text-blue-100">{user?.email || user?.phone || "Aadya Student"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-white/30 border">
                <GraduationCap size={12} className="mr-1" /> Student
              </Badge>
              {academic.studentCode && (
                <Badge className="bg-white/10 text-white/90 border-white/20 font-mono text-[11px]">
                  ID: {academic.studentCode}
                </Badge>
              )}
              {(academic.assignedCourses.length > 0
                ? academic.assignedCourses
                : academic.primaryCourse
                  ? [academic.primaryCourse]
                  : []
              ).map((course) => (
                <Badge
                  key={course.id}
                  className="bg-white/25 text-white border-white/40 font-semibold text-[11px]"
                >
                  {course.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <User size={16} className="text-[#1769AA]" /> Personal & Enrollment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Full Name", value: academic.studentName || user?.name },
              { label: "Student Code / ID", value: academic.studentCode || user?.id },
              {
                label: academic.assignedCourses.length > 1 ? "Enrolled Courses" : "Enrolled Program",
                value:
                  academic.assignedCourses.length > 0
                    ? academic.assignedCourses.map((c) => c.name).join(", ")
                    : academic.primaryCourse?.name || "Enrolled Course",
              },
              { label: "Assigned Batch", value: academic.primaryBatch?.name || academic.primaryBatch?.code || "Current Batch" },
              { label: "Email", value: user?.email },
              { label: "Phone", value: user?.phone },
              { label: "Branch", value: user?.branchId ? `Branch ${user.branchId.slice(-4)}` : "Main Branch" },
            ].map(({ label, value }) => (
              <div key={label} className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value || "—"}</p>
              </div>
            ))}
            {academic.assignedCourses.length > 1 && (
              <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Package Courses</p>
                <div className="flex flex-wrap gap-1.5">
                  {academic.assignedCourses.map((course) => (
                    <Badge
                      key={course.id}
                      variant="outline"
                      className="text-[11px] font-semibold border-primary/30 text-primary bg-card"
                    >
                      {course.name}
                      {course.code ? ` (${course.code})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Summary */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <BookOpen size={16} className="text-[#1769AA]" /> Academic Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-center border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Active</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Good Standing</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg text-center border border-blue-500/20">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {Math.max(academic.assignedCourses.length, academic.primaryCourse ? 1 : 0)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Enrolled Courses</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg text-center border border-amber-500/20">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{academic.assignedModules.length || "—"}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Assigned Modules</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg text-center border border-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">Regular</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Batch Schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SECURITY / CHANGE PASSWORD SECTION ─── */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <KeyRound size={16} className="text-[#1769AA]" /> Change Password
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Update your student portal password. The initial default password (<span className="font-mono font-semibold text-foreground">Aadya@123</span>) will be replaced with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Current Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password (e.g. Aadya@123)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10 text-xs h-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 text-xs h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Confirm New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 text-xs h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={passwordLoading}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold gap-1.5 h-9 px-4 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{passwordLoading ? "Updating Password..." : "Change Password"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Placement Portal Link */}
      <Card className="border-[#F39A16]/30 shadow-xs bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-[#F39A16]/10 flex items-center justify-center shrink-0">
                <ExternalLink className="h-7 w-7 text-[#F39A16]" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base sm:text-lg">Placement Portal</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Access the Aadya Institute Placement Portal to view job opportunities and career resources
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-[#F39A16] hover:bg-[#e08a0e] text-white font-semibold gap-2 shadow-xs shrink-0 cursor-pointer"
            >
              <a href={PLACEMENT_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                Open Placement Portal
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

