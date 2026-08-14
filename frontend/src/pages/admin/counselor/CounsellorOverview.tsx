import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  PhoneCall,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ThumbsUp,
  ChevronDown,
  Phone,
  Calendar,
  AlertCircle,
  Trophy,
  Activity,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── MOCK DATA ─────────────────────────────────────────────────────────────

const KPI_DATA = {
  totalLeads: 245,
  assignedLeads: 220,
  contactedLeads: 185,
  interestedLeads: 96,
  followUpLeads: 58,
  convertedLeads: 38,
  lostLeads: 27,
  conversionRate: 15.5
};

const TOP_PERFORMERS = [
  { id: 1, name: "Priya", metric: "Conversion Rate", value: "23.1%", color: "text-emerald-600", avatar: "https://i.pravatar.cc/150?u=priya" },
  { id: 2, name: "Rahul", metric: "Most Leads Handled", value: "52 Leads", color: "text-[#1769AA]", avatar: "https://i.pravatar.cc/150?u=rahul" },
  { id: 3, name: "Sneha", metric: "Most Converted Leads", value: "15 Leads", color: "text-emerald-600", avatar: "https://i.pravatar.cc/150?u=sneha" },
  { id: 4, name: "Arjun", metric: "Needs Attention", value: "12.7%", color: "text-red-500", avatar: "https://i.pravatar.cc/150?u=arjun" },
];

const COUNSELLOR_PERFORMANCE = [
  { id: "c1", name: "Priya", avatar: "https://i.pravatar.cc/150?u=priya", assigned: 65, contacted: 58, interested: 35, followUps: 18, converted: 15, lost: 5, rate: 23.1 },
  { id: "c2", name: "Rahul", avatar: "https://i.pravatar.cc/150?u=rahul", assigned: 52, contacted: 44, interested: 27, followUps: 15, converted: 9, lost: 8, rate: 17.3 },
  { id: "c3", name: "Sneha", avatar: "https://i.pravatar.cc/150?u=sneha", assigned: 48, contacted: 41, interested: 21, followUps: 12, converted: 7, lost: 6, rate: 14.6 },
  { id: "c4", name: "Arjun", avatar: "https://i.pravatar.cc/150?u=arjun", assigned: 55, contacted: 42, interested: 18, followUps: 13, converted: 7, lost: 8, rate: 12.7 },
];

const RECENT_ACTIVITIES = [
  { id: 1, lead: "Rahul Kumar", course: "Digital Marketing", action: "Contacted by Priya", time: "Today, 10:30 AM", icon: Phone, color: "bg-purple-100 text-purple-600" },
  { id: 2, lead: "Anjali Sharma", course: "Graphic Designing", action: "Follow-up scheduled", time: "Today, 09:45 AM", icon: Calendar, color: "bg-pink-100 text-pink-600" },
  { id: 3, lead: "Vikram Rao", course: "Tally Prime", action: "Converted to Admission", time: "Yesterday, 06:20 PM", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  { id: 4, lead: "Sneha Iyer", course: "Web Designing", action: "Interested", time: "Yesterday, 04:10 PM", icon: ThumbsUp, color: "bg-orange-100 text-orange-600" },
  { id: 5, lead: "Karan Singh", course: "Python Programming", action: "Marked as Lost", time: "Yesterday, 02:30 PM", icon: XCircle, color: "bg-red-100 text-red-600" },
];

const LEAD_TRACKING = [
  { id: "l1", name: "Rahul Kumar", course: "Digital Marketing", phone: "9876543210", assignedTo: "Priya", assignedDate: "14 Aug 2026", progress: { assigned: true, contacted: true, interested: true, followUp: false, converted: false, lost: false }, stage: "Interested", nextFollowUp: "18 Aug 2026", stageColor: "bg-orange-100 text-orange-700" },
  { id: "l2", name: "Anjali Sharma", course: "Graphic Designing", phone: "9123456780", assignedTo: "Rahul", assignedDate: "14 Aug 2026", progress: { assigned: true, contacted: true, interested: false, followUp: false, converted: false, lost: false }, stage: "Contacted", nextFollowUp: "17 Aug 2026", stageColor: "bg-purple-100 text-purple-700" },
  { id: "l3", name: "Vikram Rao", course: "Tally Prime", phone: "9988776655", assignedTo: "Sneha", assignedDate: "13 Aug 2026", progress: { assigned: true, contacted: true, interested: true, followUp: true, converted: true, lost: false }, stage: "Converted", nextFollowUp: "-", stageColor: "bg-emerald-100 text-emerald-700" },
  { id: "l4", name: "Karan Singh", course: "Python Programming", phone: "8899001122", assignedTo: "Arjun", assignedDate: "12 Aug 2026", progress: { assigned: true, contacted: true, interested: false, followUp: false, converted: false, lost: true }, stage: "Lost", nextFollowUp: "-", stageColor: "bg-red-100 text-red-700" },
];

// ─── COMPONENTS ────────────────────────────────────────────────────────────

export const CounsellorOverview: React.FC = () => {
  const navigate = useNavigate();
  const basePath = "/admin";

  const [funnelFilters, setFunnelFilters] = useState({
    assigned: true,
    contacted: true,
    interested: true,
    followUp: true,
    converted: true,
    lost: false
  });

  const toggleFilter = (key: keyof typeof funnelFilters) => {
    setFunnelFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor Portal & Operations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage counsellors, assign leads, and track lead performance of your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-slate-700 border-slate-300 font-medium" onClick={() => navigate(`${basePath}/counselor/all`)}>
            <Users className="h-4 w-4 mr-2 text-slate-500" /> Manage Counsellors
          </Button>
          <Button className="bg-[#1769AA] hover:bg-[#125890] text-white font-medium shadow-sm">
            + Assign Lead
          </Button>
          <Button variant="outline" className="text-slate-700 border-slate-300 font-medium ml-2">
            <CalendarCheck className="h-4 w-4 mr-2 text-slate-500" /> This Month <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* KPI CARDS (8-COL GRID) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Leads", value: KPI_DATA.totalLeads, sub: "100%", icon: Users, color: "text-[#1769AA]", bg: "bg-blue-50" },
          { label: "Assigned Leads", value: KPI_DATA.assignedLeads, sub: "89.8%", icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Contacted Leads", value: KPI_DATA.contactedLeads, sub: "75.5%", icon: PhoneCall, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Interested Leads", value: KPI_DATA.interestedLeads, sub: "39.2%", icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Follow-up Leads", value: KPI_DATA.followUpLeads, sub: "23.7%", icon: Calendar, color: "text-pink-500", bg: "bg-pink-50" },
          { label: "Converted Leads", value: KPI_DATA.convertedLeads, sub: "15.5%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Lost Leads", value: KPI_DATA.lostLeads, sub: "11.0%", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Conversion Rate", value: `${KPI_DATA.conversionRate}%`, sub: "(38 / 245)", icon: TrendingUp, color: "text-[#1769AA]", bg: "bg-blue-50" },
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} /> {kpi.label}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900">{kpi.value}</h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{kpi.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MIDDLE SECTION: FUNNEL & TOP PERFORMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEAD FUNNEL */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              Lead Funnel <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            
            {/* Checkbox Filters */}
            <div className="flex flex-wrap items-center gap-6 mb-8 text-sm font-medium text-slate-700">
              {[
                { key: 'assigned', label: 'Assigned', color: 'accent-[#1769AA]' },
                { key: 'contacted', label: 'Contacted', color: 'accent-purple-600' },
                { key: 'interested', label: 'Interested', color: 'accent-orange-500' },
                { key: 'followUp', label: 'Follow-up', color: 'accent-pink-500' },
                { key: 'converted', label: 'Converted', color: 'accent-emerald-600' },
                { key: 'lost', label: 'Lost', color: 'accent-red-500' }
              ].map(filter => (
                <label key={filter.key} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={funnelFilters[filter.key as keyof typeof funnelFilters]}
                    onChange={() => toggleFilter(filter.key as keyof typeof funnelFilters)}
                    className={`h-4 w-4 rounded border-slate-300 ${filter.color}`} 
                  />
                  {filter.label}
                </label>
              ))}
            </div>

            {/* Funnel Visual */}
            <div className="flex items-stretch justify-between gap-1 w-full relative">
              
              {funnelFilters.assigned && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-[#1769AA] uppercase tracking-wide">Assigned</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.assignedLeads}</p>
                  </div>
                  <div className="w-full h-16 bg-blue-100/60 rounded-l-lg flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1769AA]">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}
              
              {funnelFilters.assigned && funnelFilters.contacted && (
                <div className="flex flex-col justify-end pb-5 px-1"><ArrowRight className="h-4 w-4 text-slate-300" /></div>
              )}

              {funnelFilters.contacted && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Contacted</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.contactedLeads}</p>
                  </div>
                  <div className="w-full h-16 bg-purple-100/60 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {funnelFilters.contacted && funnelFilters.interested && (
                <div className="flex flex-col justify-end pb-5 px-1"><ArrowRight className="h-4 w-4 text-slate-300" /></div>
              )}

              {funnelFilters.interested && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wide">Interested</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.interestedLeads}</p>
                  </div>
                  <div className="w-full h-16 bg-orange-100/60 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-500">
                      <ThumbsUp className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {funnelFilters.interested && funnelFilters.followUp && (
                <div className="flex flex-col justify-end pb-5 px-1"><ArrowRight className="h-4 w-4 text-slate-300" /></div>
              )}

              {funnelFilters.followUp && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-pink-500 uppercase tracking-wide">Follow-up</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.followUpLeads}</p>
                  </div>
                  <div className="w-full h-16 bg-pink-100/60 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-pink-500">
                      <Calendar className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {funnelFilters.followUp && funnelFilters.converted && (
                <div className="flex flex-col justify-end pb-5 px-1"><ArrowRight className="h-4 w-4 text-slate-300" /></div>
              )}

              {funnelFilters.converted && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Converted</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.convertedLeads}</p>
                  </div>
                  <div className="w-full h-16 bg-emerald-100/60 flex items-center justify-center rounded-r-lg">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* LOST (Separate) */}
              {funnelFilters.lost && (
                <>
                  <div className="flex flex-col justify-end pb-5 px-3"></div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-center mb-3">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Lost</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{KPI_DATA.lostLeads}</p>
                    </div>
                    <div className="w-full h-16 bg-red-100/60 rounded-lg flex items-center justify-center border border-red-100 border-dashed">
                      <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-red-500">
                        <XCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </CardContent>
        </Card>

        {/* TOP PERFORMERS */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {TOP_PERFORMERS.map(perf => (
                <div key={perf.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={perf.avatar} alt={perf.name} className="w-8 h-8 rounded-full bg-slate-200 object-cover border border-slate-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{perf.name}</p>
                      <p className="text-[11px] text-slate-500">{perf.metric}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${perf.color}`}>
                    {perf.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LOWER MIDDLE SECTION: PERFORMANCE TABLE & ACTIVITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COUNSELLOR PERFORMANCE TABLE */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <Users className="h-4 w-4 text-[#1769AA]" /> Counsellor Performance
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase bg-white border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Counsellor</th>
                  <th className="px-3 py-3 text-center">Assigned</th>
                  <th className="px-3 py-3 text-center">Contacted</th>
                  <th className="px-3 py-3 text-center">Interested</th>
                  <th className="px-3 py-3 text-center">Follow-ups</th>
                  <th className="px-3 py-3 text-center">Converted</th>
                  <th className="px-3 py-3 text-center">Lost</th>
                  <th className="px-4 py-3 text-right">Conversion Rate</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COUNSELLOR_PERFORMANCE.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full bg-slate-200 object-cover" />
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 font-medium">{c.assigned}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.contacted}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.interested}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.followUps}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.converted}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.lost}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{c.rate}%</td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="outline" size="sm" className="h-7 text-xs border-[#1769AA]/30 text-[#1769AA] hover:bg-[#1769AA]/5">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Showing 1 to 4 of 4 counsellors
          </div>
        </Card>

        {/* RECENT LEAD ACTIVITIES */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              Recent Lead Activities
            </CardTitle>
            <span className="text-xs font-bold text-[#1769AA] cursor-pointer hover:underline">View All</span>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="space-y-4">
              {RECENT_ACTIVITIES.map(act => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full mt-0.5 ${act.color}`}>
                    <act.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{act.lead}</p>
                    <p className="text-[11px] text-slate-500 truncate">{act.course}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-700">{act.action}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* BOTTOM SECTION: LEAD TRACKING TABLE */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <Activity className="h-4 w-4 text-[#1769AA]" /> Lead Tracking (All Leads)
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead className="text-[10px] text-slate-500 font-bold uppercase bg-white border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Course</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Assigned To</th>
                <th className="px-3 py-3">Assigned Date</th>
                <th className="px-2 py-3 text-center">New</th>
                <th className="px-2 py-3 text-center">Contacted</th>
                <th className="px-2 py-3 text-center">Interested</th>
                <th className="px-2 py-3 text-center">Follow-up</th>
                <th className="px-2 py-3 text-center">Converted</th>
                <th className="px-2 py-3 text-center">Lost</th>
                <th className="px-3 py-3 text-center">Stage</th>
                <th className="px-3 py-3 text-center">Next Follow-up</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {LEAD_TRACKING.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors group text-[12px] whitespace-nowrap">
                  <td className="px-3 py-3 font-semibold text-slate-900">{lead.name}</td>
                  <td className="px-3 py-3 text-slate-600">{lead.course}</td>
                  <td className="px-3 py-3 text-slate-600 font-mono text-[11px]">{lead.phone}</td>
                  <td className="px-3 py-3 text-slate-700 font-medium">{lead.assignedTo}</td>
                  <td className="px-3 py-3 text-slate-500 text-[11px]">{lead.assignedDate}</td>
                  
                  {/* Progress Checkboxes */}
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={lead.progress.assigned} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-0 opacity-80 cursor-default" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={lead.progress.contacted} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-0 opacity-80 cursor-default" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={lead.progress.interested} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-0 opacity-80 cursor-default" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={lead.progress.followUp} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-0 opacity-80 cursor-default" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={lead.progress.converted} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-0 opacity-80 cursor-default" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    {lead.progress.lost ? (
                      <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                    ) : (
                      <input type="checkbox" checked={false} readOnly className="h-3.5 w-3.5 rounded border-slate-300 text-red-500 focus:ring-0 opacity-40 cursor-default" />
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-sm ${lead.stageColor}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-[11px] font-medium text-slate-600">
                    {lead.nextFollowUp}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] border-slate-200 text-[#1769AA] group-hover:border-[#1769AA]/30">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
          Showing 1 to 4 of 4 leads
        </div>
      </Card>
      
    </div>
  );
};
