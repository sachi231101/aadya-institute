import React, { useState } from "react";
import { 
  GraduationCap, 
  Calendar, 
  Video, 
  Download, 
  Clock, 
  UserCircle, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Phone,
  Mail,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "../../store/auth.store";

// Mock Data
const MOCK_ATTENDANCE = {
  total: 40,
  attended: 34,
  percentage: 85
};

const MOCK_FEES = {
  total: 40000,
  paid: 20000,
  pending: 20000,
  dueDate: "2026-09-01T00:00:00.000Z",
  lastPayment: {
    amount: 20000,
    date: "2026-08-01T10:30:00.000Z",
    receiptNo: "REC-2026-0899"
  }
};

const MOCK_SCHEDULE = [
  {
    id: 1,
    title: "Node.js & Prisma ORM",
    date: "Today",
    time: "16:00 - 18:00",
    type: "Theory",
    status: "UPCOMING"
  },
  {
    id: 2,
    title: "React Hooks Deep Dive",
    date: "Tomorrow",
    time: "14:00 - 16:00",
    type: "Lab",
    status: "UPCOMING"
  },
  {
    id: 3,
    title: "Advanced Tailwind CSS",
    date: "Friday, 14 Aug",
    time: "10:00 - 12:00",
    type: "Theory",
    status: "UPCOMING"
  }
];

const MOCK_BATCH = {
  name: "Fullstack Web Dev (MERN)",
  code: "BATCH-A1-2026",
  faculty: {
    name: "Prof. Dr. Rajesh Sharma",
    specialization: "Senior MERN Stack Developer",
    email: "rajesh.sharma@aadya.in",
    phone: "+91 98765 99887"
  }
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReceipt = () => {
    setDownloading(true);
    // Simulate download delay
    setTimeout(() => {
      setDownloading(false);
      alert(`Receipt ${MOCK_FEES.lastPayment.receiptNo} downloaded successfully!`);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(" ")[0] || "Student"}! 🎓</h1>
            <p className="text-blue-100 opacity-90 max-w-xl">
              Track your attendance, manage fees, and view your upcoming class schedule all in one place.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1">
            {MOCK_BATCH.code}
          </Badge>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-20 w-32 h-32 bg-[#F39A16]/20 rounded-full blur-2xl" />
      </div>

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
                  <div className="text-4xl font-bold text-text-primary">{MOCK_ATTENDANCE.percentage}%</div>
                  <div className="text-sm text-text-secondary mb-1">
                    {MOCK_ATTENDANCE.attended} / {MOCK_ATTENDANCE.total} Classes
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#10b981] h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${MOCK_ATTENDANCE.percentage}%` }}
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
                <h3 className="text-xl font-bold text-text-primary mt-2">{MOCK_BATCH.name}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-[#1769AA] border border-blue-100">Active</Badge>
                  <Badge variant="secondary" className="bg-slate-50 border border-slate-200">Module 2: React</Badge>
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
                  <p className="text-2xl font-bold text-text-primary">₹{MOCK_FEES.total.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">₹{MOCK_FEES.paid.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 relative overflow-hidden">
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹{MOCK_FEES.pending.toLocaleString()}</p>
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border border-border/60 bg-bg-secondary/50">
                <div>
                  <h4 className="font-semibold text-text-primary">Last Payment: ₹{MOCK_FEES.lastPayment.amount.toLocaleString()}</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    Paid on {new Date(MOCK_FEES.lastPayment.date).toLocaleDateString()} • Receipt: {MOCK_FEES.lastPayment.receiptNo}
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                  className="mt-4 sm:mt-0 bg-white text-[#1769AA] border border-[#1769AA]/30 hover:bg-blue-50 shadow-sm"
                >
                  {downloading ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-[#1769AA] animate-spin mr-2" />
                      Downloading...
                    </div>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download Receipt
                    </>
                  )}
                </Button>
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
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="divide-y divide-border/50">
                {MOCK_SCHEDULE.map((cls) => (
                  <div key={cls.id} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide">
                        {cls.date}
                      </p>
                      <Badge variant="outline" className="text-xs font-normal">
                        {cls.type}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-text-primary group-hover:text-[#1769AA] transition-colors">{cls.title}</h4>
                    <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-2">
                      <Clock className="h-3.5 w-3.5" /> {cls.time}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-3 border-t border-border/50 bg-slate-50 rounded-b-lg">
              <Button variant="ghost" className="w-full text-sm text-[#1769AA] hover:text-[#2088d8] flex items-center justify-center">
                View Full Timetable <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>

          {/* Assigned Faculty */}
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-5 w-5 text-emerald-600" /> Assigned Faculty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200 shadow-sm">
                  {MOCK_BATCH.faculty.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-text-primary">{MOCK_BATCH.faculty.name}</h4>
                  <p className="text-xs text-text-secondary mt-0.5">{MOCK_BATCH.faculty.specialization}</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-text-secondary truncate">{MOCK_BATCH.faculty.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-text-secondary">{MOCK_BATCH.faculty.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
