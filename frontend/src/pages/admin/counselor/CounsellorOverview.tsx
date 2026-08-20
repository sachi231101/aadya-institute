import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserCheck,
  Phone,
  Calendar,
  CheckCircle2,
  ThumbsUp,
  XCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useBranch } from "@/hooks/useBranches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── DATA MATCHING SCREENSHOT 2 ──────────────────────────────────────────

const COUNSELLOR_PERFORMANCE = [
  {
    id: "c1",
    name: "Priya",
    avatar: "https://i.pravatar.cc/150?u=priya_singh",
    assigned: 65,
    contacted: 58,
    interested: 35,
    followUps: 18,
    converted: 15,
    lost: 5,
    rate: "23.1%",
  },
  {
    id: "c2",
    name: "Rahul",
    avatar: "https://i.pravatar.cc/150?u=rahul_kumar",
    assigned: 52,
    contacted: 44,
    interested: 27,
    followUps: 15,
    converted: 9,
    lost: 8,
    rate: "17.3%",
  },
  {
    id: "c3",
    name: "Sneha",
    avatar: "https://i.pravatar.cc/150?u=sneha_patil",
    assigned: 48,
    contacted: 41,
    interested: 21,
    followUps: 12,
    converted: 7,
    lost: 6,
    rate: "14.6%",
  },
  {
    id: "c4",
    name: "Arjun",
    avatar: "https://i.pravatar.cc/150?u=arjun_reddy",
    assigned: 55,
    contacted: 42,
    interested: 18,
    followUps: 13,
    converted: 7,
    lost: 8,
    rate: "12.7%",
  },
];

const RECENT_LEAD_ACTIVITIES = [
  {
    id: "a1",
    lead: "Rahul Kumar",
    course: "Digital Marketing",
    action: "Contacted by Priya",
    time: "Today, 10:30 AM",
    icon: Phone,
    iconColor: "text-purple-600 bg-purple-50",
  },
  {
    id: "a2",
    lead: "Anjali Sharma",
    course: "Graphic Designing",
    action: "Follow-up scheduled",
    time: "Today, 09:45 AM",
    icon: Calendar,
    iconColor: "text-pink-600 bg-pink-50",
  },
  {
    id: "a3",
    lead: "Vikram Rao",
    course: "Tally Prime",
    action: "Converted to Admission",
    time: "Yesterday, 05:20 PM",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "a4",
    lead: "Sneha Iyer",
    course: "Web Designing",
    action: "Interested",
    time: "Yesterday, 04:10 PM",
    icon: ThumbsUp,
    iconColor: "text-amber-600 bg-amber-50",
  },
  {
    id: "a5",
    lead: "Karan Singh",
    course: "Python Programming",
    action: "Marked as Lost",
    time: "Yesterday, 02:30 PM",
    icon: XCircle,
    iconColor: "text-red-600 bg-red-50",
  },
];

const LEAD_TRACKING_DATA = [
  {
    id: "lt-1",
    name: "Rahul Kumar",
    course: "Digital Marketing",
    contact: "9876543210",
    assignedTo: "Priya",
    assignedDate: "14 Aug 2026",
    newChecked: true,
    contactedChecked: true,
    interestedChecked: true,
    followUpChecked: false,
    convertedChecked: false,
    isLost: false,
    stage: "Interested",
    stageColor: "bg-amber-50 text-amber-700 border-amber-200",
    nextFollowUp: "18 Aug 2026",
  },
  {
    id: "lt-2",
    name: "Anjali Sharma",
    course: "Graphic Designing",
    contact: "9123456789",
    assignedTo: "Rahul",
    assignedDate: "14 Aug 2026",
    newChecked: true,
    contactedChecked: true,
    interestedChecked: false,
    followUpChecked: false,
    convertedChecked: false,
    isLost: false,
    stage: "Contacted",
    stageColor: "bg-purple-50 text-purple-700 border-purple-200",
    nextFollowUp: "17 Aug 2026",
  },
  {
    id: "lt-3",
    name: "Vikram Rao",
    course: "Tally Prime",
    contact: "9988776655",
    assignedTo: "Sneha",
    assignedDate: "13 Aug 2026",
    newChecked: true,
    contactedChecked: true,
    interestedChecked: true,
    followUpChecked: true,
    convertedChecked: true,
    isLost: false,
    stage: "Converted",
    stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    nextFollowUp: "—",
  },
  {
    id: "lt-4",
    name: "Karan Singh",
    course: "Python Programming",
    contact: "8899001122",
    assignedTo: "Arjun",
    assignedDate: "12 Aug 2026",
    newChecked: true,
    contactedChecked: true,
    interestedChecked: false,
    followUpChecked: false,
    convertedChecked: false,
    isLost: true,
    stage: "Lost",
    stageColor: "bg-red-50 text-red-700 border-red-200",
    nextFollowUp: "—",
  },
];

export const CounsellorOverview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const isCenterScope = location.pathname.startsWith("/center");
  const basePath = isCenterScope ? "/center" : "/admin";

  const { data: branchResponse } = useBranch(user?.branchId || undefined);
  const branchName = branchResponse?.data?.name || "Aadya Central Branch";

  const [selectedCounsellor, setSelectedCounsellor] = useState<any | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      
      {/* ─── TOP ROW: COUNSELLOR PERFORMANCE & RECENT ACTIVITIES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Counsellor Performance Table */}
        <Card className="lg:col-span-8 border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm md:text-base font-bold text-[#0A2540] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#1769AA]" />
              Counsellor Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Counsellor</th>
                  <th className="py-3 px-2 text-center">Assigned</th>
                  <th className="py-3 px-2 text-center">Contacted</th>
                  <th className="py-3 px-2 text-center">Interested</th>
                  <th className="py-3 px-2 text-center">Follow-ups</th>
                  <th className="py-3 px-2 text-center">Converted</th>
                  <th className="py-3 px-2 text-center">Lost</th>
                  <th className="py-3 px-3 text-center">Conversion Rate</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COUNSELLOR_PERFORMANCE.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <span className="font-bold text-slate-800 text-[13px]">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-slate-700">{c.assigned}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{c.contacted}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{c.interested}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{c.followUps}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{c.converted}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{c.lost}</td>
                    <td className="py-3 px-3 text-center font-extrabold text-emerald-600 text-xs">
                      {c.rate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCounsellor(c)}
                        className="h-7 text-[11px] font-semibold border-slate-200 text-[#1769AA] hover:bg-blue-50 hover:border-blue-200 transition-colors px-2.5 rounded-lg"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="px-5 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium bg-white">
            Showing 1 to {COUNSELLOR_PERFORMANCE.length} of {COUNSELLOR_PERFORMANCE.length} counsellors
          </div>
        </Card>

        {/* Right: Recent Lead Activities Card */}
        <Card className="lg:col-span-4 border border-slate-200/70 shadow-xs bg-white rounded-2xl flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm md:text-base font-bold text-[#0A2540]">
              Recent Lead Activities
            </CardTitle>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/admissions/enquiries`)}
              className="text-xs font-bold text-[#1769AA] hover:underline"
            >
              View All
            </button>
          </CardHeader>
          <CardContent className="pt-3 px-5 pb-3 flex-1 space-y-3">
            {RECENT_LEAD_ACTIVITIES.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 ${act.iconColor}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 truncate">{act.lead}</p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {act.course} <span className="text-slate-300">•</span> <strong className="text-slate-700 font-semibold">{act.action}</strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ─── BOTTOM SECTION: LEAD TRACKING (ALL LEADS) TABLE ─── */}
      <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm md:text-base font-bold text-[#0A2540] flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#1769AA]" />
            Lead Tracking (All Leads)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-3 px-4 font-bold">Lead</th>
                <th className="py-3 px-3 font-bold">Course</th>
                <th className="py-3 px-3 font-bold">Contact</th>
                <th className="py-3 px-3 font-bold">Assigned To</th>
                <th className="py-3 px-3 font-bold">Assigned Date</th>
                <th className="py-3 px-2 font-bold text-center">New</th>
                <th className="py-3 px-2 font-bold text-center">Contacted</th>
                <th className="py-3 px-2 font-bold text-center">Interested</th>
                <th className="py-3 px-2 font-bold text-center">Follow-up</th>
                <th className="py-3 px-2 font-bold text-center">Converted</th>
                <th className="py-3 px-2 font-bold text-center">Lost</th>
                <th className="py-3 px-3 font-bold text-center">Stage</th>
                <th className="py-3 px-3 font-bold text-center">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {LEAD_TRACKING_DATA.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{lead.name}</td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">{lead.course}</td>
                  <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">{lead.contact}</td>
                  <td className="py-3.5 px-3 text-slate-700 font-semibold">{lead.assignedTo}</td>
                  <td className="py-3.5 px-3 text-slate-400 text-[11px]">{lead.assignedDate}</td>

                  {/* Stage Step Checkboxes */}
                  <td className="py-3.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.newChecked}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-default"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.contactedChecked}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-default"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.interestedChecked}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-default"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.followUpChecked}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-default"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.convertedChecked}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-default"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {lead.isLost ? (
                      <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={false}
                        readOnly
                        className="h-4 w-4 rounded border-slate-300 text-slate-300 accent-slate-300 opacity-40 cursor-default"
                      />
                    )}
                  </td>

                  {/* Stage Badge */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${lead.stageColor}`}
                    >
                      {lead.stage}
                    </span>
                  </td>

                  {/* Next Follow-up */}
                  <td className="py-3.5 px-3 text-center text-[11px] font-medium text-slate-600">
                    {lead.nextFollowUp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
        <div className="px-5 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium bg-white">
          Showing 1 to {LEAD_TRACKING_DATA.length} of {LEAD_TRACKING_DATA.length} leads
        </div>
      </Card>

      {/* ─── MODAL: COUNSELLOR DETAILS ─── */}
      <Dialog open={!!selectedCounsellor} onOpenChange={() => setSelectedCounsellor(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#1769AA]" />
              {selectedCounsellor?.name} — Performance Profile
            </DialogTitle>
          </DialogHeader>
          {selectedCounsellor && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <img
                  src={selectedCounsellor.avatar}
                  alt={selectedCounsellor.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedCounsellor.name}</h4>
                  <p className="text-slate-500">Counsellor • {branchName}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-emerald-700 font-extrabold text-sm bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    {selectedCounsellor.rate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-semibold text-[10px] uppercase">Assigned Leads</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{selectedCounsellor.assigned}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-semibold text-[10px] uppercase">Contacted</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{selectedCounsellor.contacted}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-semibold text-[10px] uppercase">Interested</p>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">{selectedCounsellor.interested}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-semibold text-[10px] uppercase">Converted</p>
                  <p className="text-lg font-black text-blue-600 mt-0.5">{selectedCounsellor.converted}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
