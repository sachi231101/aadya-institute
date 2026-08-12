import React from "react";
import { useAuthStore } from "../../store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, Plus, ArrowUpRight, CheckCircle2, Clock, Video } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Mock Data
const stats = [
  { label: "Total classes", value: "34", growth: "+32%", active: false },
  { label: "Attended classes", value: "25", growth: "+32%", active: false },
  { label: "Total hours", value: "2,349", growth: "+32%", active: false },
];

const classesList = [
  {
    id: 1,
    date: "March 03, 2026",
    status: "attended",
    startTime: "08:30 am",
    endTime: "10:30 am",
    action: "Attend class",
    isPrimary: true
  },
  {
    id: 2,
    date: "March 05, 2026",
    status: "missed",
    startTime: "08:30 am",
    endTime: "10:30 am",
    action: "Play recorded class",
    isPrimary: false
  },
  {
    id: 3,
    date: "March 10, 2026",
    status: "attended",
    startTime: "08:30 am",
    endTime: "10:30 am",
    action: "Attend class",
    isPrimary: true
  }
];

// Attendance Flow logic - 30 days
const generateFlow = () => {
  const days = [];
  for (let i = 1; i <= 30; i++) {
    let status = "attended";
    if ([5, 12, 19, 26, 27].includes(i)) status = "missed";
    if (i > 27) status = "upcoming";
    if (i === 30) status = "current";
    days.push({ day: i, status });
  }
  return days;
};
const flowDays = generateFlow();
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Gauge Chart Data
const gaugeData = [
  { name: 'Attended', value: 82 },
  { name: 'Missed', value: 18 },
];
const COLORS = ['#ef4444', '#f1f5f9'];

export const StudentAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Howdy {firstName}!</h1>
          <p className="text-text-secondary mt-1">See all your Insights here</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-text-secondary h-10 px-4 shadow-sm border-border/50 bg-white hover:bg-slate-50">
            <Calendar className="mr-2 h-4 w-4" /> April 1 - April 30
          </Button>
          <Button variant="outline" className="text-text-secondary h-10 px-4 shadow-sm border-border/50 bg-white hover:bg-slate-50">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm h-10 px-6">
            <Plus className="mr-1.5 h-4 w-4" /> Attend class
          </Button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-text-secondary font-medium mb-4">{stat.label}</p>
              <h3 className="text-4xl font-bold text-text-primary mb-3">{stat.value}</h3>
              <p className="text-emerald-500 text-sm font-medium flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" /> {stat.growth} <span className="text-text-secondary font-normal">vs last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Row: Flow and Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Flow */}
        <Card className="border-border/50 shadow-sm rounded-xl">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-lg text-text-primary font-medium">Attendance flow</CardTitle>
            <div className="flex items-center gap-6 mt-2">
              <div>
                <p className="text-lg font-bold text-text-primary flex items-end gap-1">30 <span className="text-xs font-normal text-text-secondary mb-1">classes</span></p>
                <p className="text-[10px] text-text-muted uppercase">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary flex items-end gap-1">25 <span className="text-xs font-normal text-text-secondary mb-1">classes</span></p>
                <p className="text-[10px] text-text-muted uppercase">Attended</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary flex items-end gap-1">05 <span className="text-xs font-normal text-text-secondary mb-1">classes</span></p>
                <p className="text-[10px] text-text-muted uppercase">Missed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Grid Header */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs text-text-muted font-medium uppercase">{day}</div>
              ))}
            </div>
            {/* Grid Body */}
            <div className="grid grid-cols-7 gap-y-3 gap-x-2">
              {flowDays.map((d, i) => (
                <div key={i} className="flex justify-center items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110 cursor-pointer
                    ${d.status === "attended" ? "bg-[#ef4444] text-white shadow-sm shadow-red-200" : ""}
                    ${d.status === "missed" ? "bg-slate-200 text-transparent" : ""}
                    ${d.status === "upcoming" ? "bg-[#ef4444] text-white shadow-sm shadow-red-200 opacity-30" : ""}
                    ${d.status === "current" ? "border border-[#ef4444] text-[#ef4444] bg-white font-bold" : ""}
                  `}>
                    {d.status === "attended" || d.status === "upcoming" ? (
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L12.5 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : d.status === "current" ? d.day : ""}
                    {d.status === "missed" && (
                       <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M1 5L4.5 8.5L12.5 1" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total Score */}
        <Card className="border-border/50 shadow-sm rounded-xl flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-text-primary font-medium">Total score</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center relative p-6 mt-4">
            <div className="w-full h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="85%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Gauge Needle/Pointer (Simulated) */}
              <div className="absolute left-1/2 bottom-[15%] -translate-x-1/2 w-4 h-4 bg-slate-800 rounded-full z-10 shadow-lg border-2 border-white"></div>
              <div 
                className="absolute left-1/2 bottom-[15%] w-[80px] h-2 bg-slate-800 rounded-r-full origin-left z-0"
                style={{ transform: "rotate(-35deg) translateY(-50%)" }}
              ></div>
            </div>
            
            <div className="text-center -mt-6 z-20 bg-white px-8 pt-2">
              <h2 className="text-4xl font-bold text-text-primary">82%</h2>
              <p className="text-text-secondary mt-1">Attendance percentage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#ef4444] rounded-full"></div>
            <h2 className="text-xl font-medium text-text-primary">Classes</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 border-border/50 shadow-sm"><div className="grid grid-cols-2 gap-0.5"><div className="w-1.5 h-1.5 bg-text-secondary rounded-[1px]" /><div className="w-1.5 h-1.5 bg-text-secondary rounded-[1px]" /><div className="w-1.5 h-1.5 bg-text-secondary rounded-[1px]" /><div className="w-1.5 h-1.5 bg-text-secondary rounded-[1px]" /></div></Button>
            <Button variant="outline" size="icon" className="h-9 w-9 border-border/50 shadow-sm"><div className="w-4 h-0.5 bg-text-secondary shadow-[0_4px_0_var(--text-secondary),0_8px_0_var(--text-secondary)]"></div></Button>
            <Button variant="outline" className="h-9 border-border/50 shadow-sm text-text-secondary font-normal"><ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Sort</Button>
            <Button variant="outline" className="h-9 border-border/50 shadow-sm text-text-secondary font-normal"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filter</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesList.map((cls) => (
            <Card key={cls.id} className="border-border/50 shadow-sm rounded-xl overflow-hidden group hover:border-[#ef4444]/30 transition-colors">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 text-text-primary font-medium text-sm">
                    <CheckCircle2 className="h-4 w-4 text-text-secondary" /> {cls.date}
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center ${cls.status === 'attended' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <div className={`w-2 h-2 rounded-full ${cls.status === 'attended' ? 'bg-emerald-500' : 'bg-[#ef4444]'}`}></div>
                  </div>
                </div>
                
                <div className="flex justify-between mb-8">
                  <div>
                    <p className="text-[11px] text-text-muted mb-1 font-medium">Class start time</p>
                    <p className="font-bold text-text-primary text-sm">{cls.startTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-text-muted mb-1 font-medium">Class end time</p>
                    <p className="font-bold text-text-primary text-sm">{cls.endTime}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-2">
                  <Button 
                    className={`w-full font-medium ${cls.isPrimary 
                      ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white border-0' 
                      : 'bg-white text-[#ef4444] border border-[#ef4444]/30 hover:bg-red-50'}`}
                  >
                    {cls.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
