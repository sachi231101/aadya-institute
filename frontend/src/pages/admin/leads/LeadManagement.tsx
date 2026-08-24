import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Search, PhoneCall, UserCheck, ArrowRight,
  MoreHorizontal, Bot, Target, Clock, CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLeads } from "@/hooks/useLeads";
import { useBranchStore } from "@/store/branch.store";

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  ASSIGNED: { label: "Assigned", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  CONTACTED: { label: "Contacted", color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  INTERESTED: { label: "Interested", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  FOLLOW_UP: { label: "Follow Up", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  CONVERTED: { label: "Converted", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  LOST: { label: "Lost", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const SCORE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  GOOD: { label: "Good", color: "text-green-700 bg-green-50 border-green-200", icon: "🟢" },
  AVERAGE: { label: "Average", color: "text-amber-700 bg-amber-50 border-amber-200", icon: "🟡" },
  WEAK: { label: "Weak", color: "text-red-700 bg-red-50 border-red-200", icon: "🔴" },
};

const SOURCE_OPTIONS = ["WALK_IN", "PHONE_CALL", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "GOOGLE", "REFERRAL", "ONLINE", "OTHER"];
const STAGE_OPTIONS = ["NEW", "ASSIGNED", "CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERTED", "LOST"];

export const LeadManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBranchId } = useBranchStore();

  const isAiCallingView = location.pathname.endsWith("/ai-calling");
  const isFollowUpView = location.pathname.endsWith("/follow-ups");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(() => (isFollowUpView ? "FOLLOW_UP" : ""));
  const [sourceFilter, setSourceFilter] = useState(() => (isAiCallingView ? "PHONE_CALL" : ""));
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    if (isFollowUpView) {
      setStageFilter("FOLLOW_UP");
      setSourceFilter("");
    } else if (isAiCallingView) {
      setStageFilter("");
      setSourceFilter("PHONE_CALL");
    } else {
      setStageFilter("");
      setSourceFilter("");
    }
  }, [location.pathname]);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const { data: leadsResponse, isLoading } = useLeads({
    page,
    limit: 20,
    search: search || undefined,
    stage: stageFilter || undefined,
    source: sourceFilter || undefined,
    branchId: selectedBranchId !== "ALL" ? selectedBranchId : undefined,
  });

  const leads = leadsResponse?.data || [];
  const meta = leadsResponse?.meta || leadsResponse?.pagination;

  // Summary stats
  const stats = {
    total: meta?.total ?? leads.length,
    new: leads.filter((l: any) => l.stage === "NEW").length,
    contacted: leads.filter((l: any) => l.stage === "CONTACTED" || l.stage === "INTERESTED").length,
    converted: leads.filter((l: any) => l.stage === "CONVERTED").length,
  };

  const headerTitle = isAiCallingView
    ? "AI Calling & Voice Qualification"
    : isFollowUpView
    ? "Lead Follow-ups & Reminders"
    : "Lead Management & AI Calling";

  const headerSubtitle = isAiCallingView
    ? "Automated AI voice calling campaigns, interest scoring & telephony logs"
    : isFollowUpView
    ? "Track and manage leads pending counselor follow-up and next touchpoints"
    : "Capture leads, AI voice qualification, scoring & admission handoff";

  const HeaderIcon = isAiCallingView ? Bot : isFollowUpView ? Clock : Target;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <HeaderIcon className="h-6 w-6 text-[#1769AA]" />
            {headerTitle}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {headerSubtitle}
          </p>
        </div>
        <Button
          onClick={() => navigate(`${basePath}/leads/add`)}
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 font-semibold shadow-sm"
        >
          <Plus size={16} />
          Add New Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-secondary font-medium">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.new}</p>
              <p className="text-xs text-text-secondary font-medium">New / Pending Call</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <PhoneCall className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.contacted}</p>
              <p className="text-xs text-text-secondary font-medium">Contacted / Interested</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.converted}</p>
              <p className="text-xs text-text-secondary font-medium">Converted to Admission</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 h-9"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-md border border-border text-sm bg-background"
            >
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map(s => (
                <option key={s} value={s}>{STAGE_CONFIG[s]?.label || s}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-md border border-border text-sm bg-background"
            >
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Lead Name</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Interested In</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">Stage</TableHead>
                <TableHead className="font-semibold">AI Score</TableHead>
                <TableHead className="font-semibold">Counsellor</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-text-secondary">
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Target className="h-10 w-10 text-slate-300" />
                      <p className="text-text-secondary font-medium">No leads found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`${basePath}/leads/add`)}
                        className="gap-1 mt-2"
                      >
                        <Plus size={14} /> Add First Lead
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead: any) => {
                  const stage = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.NEW;
                  const aiScore = lead.callLogs?.[0]?.aiScore
                    ? SCORE_CONFIG[lead.callLogs[0].aiScore]
                    : null;

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => navigate(`${basePath}/leads/${lead.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#1769AA]/10 flex items-center justify-center text-[#1769AA] font-bold text-xs">
                            {lead.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary text-sm">{lead.name}</p>
                            {lead.email && (
                              <p className="text-xs text-text-secondary">{lead.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{lead.phoneNumber}</TableCell>
                      <TableCell className="text-sm">{lead.interestedIn || lead.course?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-medium">
                          {(lead.source || "").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${stage.bg} ${stage.color} border text-xs font-semibold`}>
                          {stage.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {aiScore ? (
                          <Badge className={`${aiScore.color} border text-xs font-semibold`}>
                            {aiScore.icon} {aiScore.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-secondary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.assignedCounsellor?.name || (
                          <span className="text-xs text-orange-600 font-medium">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`${basePath}/leads/${lead.id}`)}>
                              <ArrowRight size={14} className="mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Bot size={14} className="mr-2" /> Trigger AI Call
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCheck size={14} className="mr-2" /> Assign Counsellor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <CheckCircle2 size={14} className="mr-2" /> Convert to Admission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <p className="text-xs text-text-secondary">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
