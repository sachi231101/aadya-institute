import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Clock, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { useFollowUpDashboard } from "@/hooks/useLeads";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { LeadStageBadge } from "@/components/common/LeadStageBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TabKey = "overdue" | "today" | "upcoming";

export const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const [activeTab, setActiveTab] = useState<TabKey>("overdue");
  const { data, isLoading, isError, refetch } = useFollowUpDashboard();

  const dashboard = data?.data;
  const summary = dashboard?.summary || { overdue: 0, today: 0, upcoming: 0, totalPending: 0 };
  const lists = dashboard?.lists || { overdue: [], today: [], upcoming: [] };
  const activeList = lists[activeTab] || [];

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: "overdue", label: "Overdue", count: summary.overdue, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600" },
    { key: "today", label: "Today", count: summary.today, icon: <Clock className="w-4 h-4" />, color: "text-amber-600" },
    { key: "upcoming", label: "Upcoming", count: summary.upcoming, icon: <CalendarDays className="w-4 h-4" />, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Follow-ups Dashboard</h2>
        <p className="text-sm text-text-secondary">Track overdue, today, and upcoming counsellor follow-ups.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <Card
            key={tab.key}
            className={`cursor-pointer border-border/50 ${activeTab === tab.key ? "ring-2 ring-[#1769AA]" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-bg-secondary ${tab.color}`}>{tab.icon}</div>
              <div>
                <p className="text-xs text-text-secondary">{tab.label}</p>
                <h3 className="text-2xl font-bold">{tab.count}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Counsellor</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading follow-ups...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load follow-ups.
                      <Button variant="link" onClick={() => refetch()}>Retry</Button>
                    </TableCell>
                  </TableRow>
                ) : activeList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      No {activeTab} follow-ups.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeList.map((item: {
                    id: string;
                    type: string;
                    scheduledAt: string;
                    lead?: { id: string; name: string; phoneNumber: string; stage: string };
                    counsellor?: { name: string };
                  }) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-bg-secondary/30"
                      onClick={() => item.lead?.id && navigate(`${basePath}/leads/${item.lead.id}`)}
                    >
                      <TableCell className="font-medium">{item.lead?.name}</TableCell>
                      <TableCell>{item.lead?.phoneNumber}</TableCell>
                      <TableCell><LeadStageBadge stage={item.lead?.stage || "NEW"} /></TableCell>
                      <TableCell>{item.counsellor?.name || "—"}</TableCell>
                      <TableCell>{new Date(item.scheduledAt).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{item.type}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
