import React from "react";
import { useNavigate } from "react-router-dom";
import { User, GraduationCap, Calendar, CheckCircle2, ExternalLink, BookOpen, FileText, Star, ArrowLeft, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

const PLACEMENT_PORTAL_URL = "https://placement.aadyainstitution.com/";

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Top Bar with Back and Logout */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
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
            {user?.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name || "Student"}</h1>
            <p className="text-blue-100">{user?.email}</p>
            <Badge className="mt-2 bg-white/20 text-white border-white/30 border">
              <GraduationCap size={12} className="mr-1" /> Student
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} className="text-[#1769AA]" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Full Name", value: user?.name },
              { label: "Email", value: user?.email },
              { label: "Role", value: user?.role },
              { label: "Branch", value: user?.branchId ? `Branch ${user.branchId.slice(-4)}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-text-secondary">{label}</p>
                <p className="text-sm font-medium text-text-primary">{value || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Academic Summary */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={16} className="text-[#1769AA]" /> Academic Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">—</p>
                <p className="text-xs text-green-600">Attendance %</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
                <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">—</p>
                <p className="text-xs text-blue-600">Assignments</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                <Star className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-700">—</p>
                <p className="text-xs text-amber-600">Avg Score</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center border border-purple-200">
                <Calendar className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-700">—</p>
                <p className="text-xs text-purple-600">Classes Attended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placement Portal Link — Phase 3 Bridge */}
      <Card className="border-[#F39A16]/30 shadow-sm bg-gradient-to-r from-amber-50/50 to-orange-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-[#F39A16]/10 flex items-center justify-center">
                <ExternalLink className="h-7 w-7 text-[#F39A16]" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-lg">Placement Portal</h3>
                <p className="text-sm text-text-secondary">
                  Access the Aadya Institute Placement Portal to view job opportunities and career resources
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-[#F39A16] hover:bg-[#e08a0e] text-white font-semibold gap-2 shadow-sm"
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
