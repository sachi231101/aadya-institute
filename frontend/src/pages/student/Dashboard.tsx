import React from "react";
import { 
  Calendar, 
  UserCircle, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "../../store/auth.store";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const studentName = user?.name || "Student";
  const studentBatchCode = user?.branchId ? `BRANCH-${user.branchId.slice(-4).toUpperCase()}` : "AADYA INSTITUTE";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {studentName.split(" ")[0]}! 🎓</h1>
            <p className="text-blue-100 opacity-90 max-w-xl">
              Track your attendance, manage fees, and view your upcoming class schedule all in one place.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1">
            {studentBatchCode}
          </Badge>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-20 w-32 h-32 bg-[#F39A16]/20 rounded-full blur-2xl" />
      </div>

      <InstallDashboardBanner />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Attendance & Fees) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Top Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Attendance Card */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#10b981]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Overall Attendance</span>
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mt-2">
                  <div className="text-4xl font-bold text-text-primary">100%</div>
                  <div className="text-sm text-text-secondary mb-1">
                    Live Record
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#10b981] h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `100%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-3 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Maintain above 75% for certification.
                </p>
              </CardContent>
            </Card>

            {/* Course Card */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#1769AA]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Current Course</span>
                  <BookOpen className="h-4 w-4 text-[#1769AA]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-text-primary mt-2">Enrolled Academy Program</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-[#1769AA] border border-blue-100">Active</Badge>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Fees & Payments Section */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#F39A16]" />
                Fees & Payments
              </CardTitle>
              <CardDescription>Track your fee payments and download receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Total Fees</p>
                  <p className="text-2xl font-bold text-text-primary">₹0</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">₹0</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 relative overflow-hidden">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹0</p>
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border border-border/60 bg-bg-secondary/50">
                <div>
                  <h4 className="font-semibold text-text-primary">Payment Status</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    No pending installment payments due.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN (Schedule & Faculty) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Upcoming Classes */}
          <Card className="border-border/50 shadow-sm h-full max-h-[400px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" /> Class Schedule
                </span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">This Week</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center text-muted-foreground flex-1 flex items-center justify-center">
              No class sessions scheduled today.
            </CardContent>
          </Card>

          {/* Assigned Faculty */}
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-5 w-5 text-emerald-600" /> Assigned Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200 shadow-sm">
                  F
                </div>
                <div>
                  <h4 className="font-bold text-text-primary">Faculty Instructor</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Academic Lead</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
