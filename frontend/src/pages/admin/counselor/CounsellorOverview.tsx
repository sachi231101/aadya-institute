import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserCheck,
  Phone,
  Calendar,
  CheckCircle2,
  ThumbsUp,
  XCircle,
  Activity,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useBranch } from "@/hooks/useBranches";
import { useLeads, useCounsellorPerformance } from "@/hooks/useLeads";
import type { Lead } from "@/services/leads.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CounsellorPerf {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  branchName: string;
  avatar: string;
  assigned: number;
  contacted: number;
  interested: number;
  followUps: number;
  converted: number;
  lost: number;
  rate: string;
}

export const CounsellorOverview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { selectedBranchId } = useBranchStore();

  const isCenterScope = location.pathname.startsWith("/center");
  const basePath = isCenterScope ? "/center" : "/admin";
  const activeBranchId = isCenterScope
    ? user?.branchId || undefined
    : selectedBranchId === "ALL" || !selectedBranchId
      ? undefined
      : selectedBranchId;

  const { data: branchResponse } = useBranch(user?.branchId || undefined);
  const branchName = branchResponse?.data?.name || "Aadya Central Branch";

  const { data: performanceResponse, isLoading: loadingPerf } = useCounsellorPerformance(activeBranchId);
  const { data: leadsResponse, isLoading: loadingLeads } = useLeads({
    limit: 100,
    branchId: activeBranchId,
  });

  const [selectedCounsellor, setSelectedCounsellor] = useState<CounsellorPerf | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const allLeads: Lead[] = useMemo(() => {
    return (leadsResponse?.data as Lead[]) || [];
  }, [leadsResponse?.data]);

  // Prefer server-side counsellor performance; fall back gracefully
  const counsellorPerformance: CounsellorPerf[] = useMemo(() => {
    const rows = (performanceResponse?.data as Array<{
      counsellorId: string;
      name: string;
      email?: string | null;
      branch?: { name?: string } | null;
      totalLeads: number;
      contacted: number;
      interested: number;
      followUps: number;
      converted: number;
      lost: number;
      conversionRate: string;
    }>) || [];

    return rows.map((c) => ({
      id: c.counsellorId,
      name: c.name,
      email: c.email || null,
      phone: null,
      branchName: c.branch?.name || branchName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
      assigned: c.totalLeads,
      contacted: c.contacted,
      interested: c.interested,
      followUps: c.followUps,
      converted: c.converted,
      lost: c.lost,
      rate: c.conversionRate,
    }));
  }, [performanceResponse?.data, branchName]);

  const isLoading = loadingPerf || loadingLeads;

  // Live Recent Lead Activities derived from real PostgreSQL leads
  const recentActivities = useMemo(() => {
    const sorted = [...allLeads].sort((a: Lead, b: Lead) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return sorted.slice(0, 5).map((lead: Lead) => {
      let action = "Contacted";
      let icon = Phone;
      let iconColor = "text-purple-600 bg-purple-50";

      if (lead.stage === "CONVERTED") {
        action = "Converted to Admission";
        icon = CheckCircle2;
        iconColor = "text-emerald-600 bg-emerald-50";
      } else if (lead.stage === "LOST") {
        action = "Marked as Lost";
        icon = XCircle;
        iconColor = "text-red-600 bg-red-50";
      } else if (lead.stage === "FOLLOW_UP") {
        action = "Follow-up scheduled";
        icon = Calendar;
        iconColor = "text-blue-600 bg-blue-50";
      } else if (lead.stage === "INTERESTED") {
        action = "Expressed Interest";
        icon = ThumbsUp;
        iconColor = "text-amber-600 bg-amber-50";
      } else {
        action = `Contacted by ${lead.assignedCounsellor?.name || "Counsellor"}`;
      }

      const dateObj = new Date(lead.updatedAt || lead.createdAt);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const timeStr = isToday
        ? `Today, ${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

      return {
        id: lead.id,
        lead: lead.name,
        course: lead.course?.name || lead.interestedIn || "—",
        action,
        time: timeStr,
        icon,
        iconColor,
      };
    });
  }, [allLeads]);

  // Live Lead Tracking Data
  const leadTrackingData = useMemo(() => {
    const filtered = allLeads.filter((l: Lead) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        l.name.toLowerCase().includes(term) ||
        (l.course?.name || l.interestedIn || "").toLowerCase().includes(term) ||
        (l.phoneNumber || "").includes(term) ||
        (l.assignedCounsellor?.name || "").toLowerCase().includes(term)
      );
    });

    return filtered.map((l: Lead) => {
      let stageColor = "bg-slate-50 text-slate-700 border-slate-200";
      if (l.stage === "CONVERTED") stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      else if (l.stage === "INTERESTED") stageColor = "bg-amber-50 text-amber-700 border-amber-200";
      else if (l.stage === "FOLLOW_UP") stageColor = "bg-blue-50 text-blue-700 border-blue-200";
      else if (l.stage === "CONTACTED") stageColor = "bg-purple-50 text-purple-700 border-purple-200";
      else if (l.stage === "LOST") stageColor = "bg-red-50 text-red-700 border-red-200";

      return {
        id: l.id,
        name: l.name,
        course: l.course?.name || l.interestedIn || "—",
        contact: l.phoneNumber,
        assignedTo: l.assignedCounsellor?.name || "Unassigned",
        assignedDate: new Date(l.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        newChecked: true,
        contactedChecked: l.stage !== "NEW" && l.stage !== "ASSIGNED",
        interestedChecked: ["INTERESTED", "FOLLOW_UP", "CONVERTED"].includes(l.stage),
        followUpChecked: ["FOLLOW_UP", "CONVERTED"].includes(l.stage),
        convertedChecked: l.stage === "CONVERTED",
        isLost: l.stage === "LOST",
        stage: l.stage,
        stageColor,
        nextFollowUp: l.nextFollowUpAt
          ? new Date(l.nextFollowUpAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
      };
    });
  }, [allLeads, searchTerm]);

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/counselor/all`)}
              className="text-xs h-7 text-[#1769AA] border-blue-200 hover:bg-blue-50"
            >
              Manage Counsellors
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
                <span className="text-xs font-semibold text-slate-500">Loading performance data...</span>
              </div>
            ) : counsellorPerformance.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                No counsellors found for this center.
              </div>
            ) : (
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
                  {counsellorPerformance.map((c: CounsellorPerf) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-[13px] block">{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{c.branchName}</span>
                          </div>
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
            )}
          </CardContent>
          <div className="px-5 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium bg-white">
            Showing {counsellorPerformance.length} counsellors
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
              onClick={() => navigate(`${basePath}/leads`)}
              className="text-xs font-bold text-[#1769AA] hover:underline"
            >
              View All
            </button>
          </CardHeader>
          <CardContent className="pt-3 px-5 pb-3 flex-1 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                <span className="text-xs text-slate-500 font-medium">Loading activities...</span>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No recent lead interactions recorded.
              </div>
            ) : (
              recentActivities.map((act) => {
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
                        {act.course} <span className="text-slate-300">•</span>{" "}
                        <strong className="text-slate-700 font-semibold">{act.action}</strong>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── BOTTOM SECTION: LEAD TRACKING (ALL LEADS) TABLE ─── */}
      <Card className="border border-slate-200/70 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm md:text-base font-bold text-[#0A2540] flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#1769AA]" />
            Lead Tracking (All Leads)
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads or counsellor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
              <span className="text-xs font-semibold text-slate-500">Loading leads...</span>
            </div>
          ) : leadTrackingData.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-medium">
              No leads found matching your criteria.
            </div>
          ) : (
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
                {leadTrackingData.map((lead) => (
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
          )}
        </CardContent>
        <div className="px-5 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium bg-white">
          Showing {leadTrackingData.length} leads
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
                  <p className="text-slate-500">Counsellor • {selectedCounsellor.branchName}</p>
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
