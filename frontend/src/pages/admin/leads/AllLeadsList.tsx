import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, Loader2, AlertCircle, Users, LayoutList, Columns3 } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useAdminUsers } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { MasterSelect } from "@/components/common/MasterSelect";
import { useAuthStore } from "@/store/auth.store";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReadOnlyBanner } from "@/components/permissions/PermissionGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_LEAD_STAGE_PIPELINE,
  LeadStageBadge,
} from "@/components/common/LeadStageBadge";
import type { Lead } from "@/services/leads.api";

type ViewMode = "list" | "kanban";

export const AllLeadsList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes("ADMIN");

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sourceMasterId, setSourceMasterId] = useState("");
  const [stageMasterId, setStageMasterId] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("list");

  const { options: stageOptions } = useMasterDropdown("leadstage");
  const { options: sourceOptions } = useMasterDropdown("leadsource");
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const counsellors = (usersData?.data ?? []) as { id: string; name: string }[];
  const branches = branchesResponse?.data || [];

  const stagePipeline = useMemo(() => {
    if (stageOptions.length > 0) {
      return stageOptions.map((opt) => opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"));
    }
    return [...DEFAULT_LEAD_STAGE_PIPELINE, "LOST"];
  }, [stageOptions]);

  const { data, isLoading, isError, refetch } = useLeads({
    page: view === "list" ? page : 1,
    limit: view === "kanban" ? 100 : 20,
    search: searchTerm || undefined,
    stage: stageFilter !== "ALL" ? stageFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    source: sourceFilter !== "ALL" ? sourceFilter : undefined,
    assignedCounsellorId: counsellorFilter !== "ALL" ? counsellorFilter : undefined,
    priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
    branchId: isAdmin && branchFilter !== "ALL" ? branchFilter : undefined,
  });

  const leads: Lead[] = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const meta = data?.data?.meta || data?.meta || { totalPages: 1, page: 1 };

  const openLead = (id: string) => navigate(`${basePath}/leads/${id}`);

  return (
    <div className="space-y-6">
      <ReadOnlyBanner itemKey="leads.all" label="All Leads" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Leads</h2>
          <p className="text-sm text-text-secondary">
            AI call first, then assign a counsellor. Convert when they are ready to join.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("list")}
            >
              <LayoutList className="h-4 w-4 mr-1" /> List
            </Button>
            <Button
              type="button"
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-4 w-4 mr-1" /> Pipeline
            </Button>
          </div>
          <Button
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
            onClick={() => navigate(`${basePath}/leads/${basePath === "/admin" ? "new" : "add"}`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="min-w-[160px]">
              <MasterSelect
                entityType="leadstage"
                value={stageMasterId}
                onChange={(id) => {
                  setStageMasterId(id);
                  setPage(1);
                  if (!id) {
                    setStageFilter("ALL");
                    return;
                  }
                  const opt = stageOptions.find((o) => o.value === id);
                  setStageFilter(opt?.code || opt?.label.toUpperCase().replace(/\s+/g, "_") || "ALL");
                }}
                placeholder="All Stages"
                className="mt-0"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border rounded-md text-sm bg-background"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
            <div className="min-w-[160px]">
              <MasterSelect
                entityType="leadsource"
                value={sourceMasterId}
                onChange={(id) => {
                  setSourceMasterId(id);
                  setPage(1);
                  if (!id) {
                    setSourceFilter("ALL");
                    return;
                  }
                  const opt = sourceOptions.find((o) => o.value === id);
                  setSourceFilter(opt?.code || opt?.label || id);
                }}
                placeholder="All Sources"
                className="mt-0"
              />
            </div>
            <select
              value={counsellorFilter}
              onChange={(e) => { setCounsellorFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border rounded-md text-sm bg-background"
            >
              <option value="ALL">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border rounded-md text-sm bg-background"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {isAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                className="h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading leads...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Failed to load leads.
              <Button variant="link" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : view === "kanban" ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stagePipeline.map((stage) => {
                const columnLeads = leads.filter((l) => l.stage === stage);
                return (
                  <div key={stage} className="min-w-[240px] w-[240px] shrink-0 rounded-lg bg-slate-50 dark:bg-slate-900/40 border p-3">
                    <div className="flex items-center justify-between mb-3">
                      <LeadStageBadge stage={stage} />
                      <span className="text-xs text-text-muted">{columnLeads.length}</span>
                    </div>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                      {columnLeads.length === 0 ? (
                        <p className="text-xs text-text-muted py-6 text-center">No leads</p>
                      ) : columnLeads.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => openLead(lead.id)}
                          className="w-full text-left rounded-md border bg-white dark:bg-slate-950 p-3 hover:border-[#1769AA] transition-colors"
                        >
                          <p className="font-semibold text-sm">{lead.name}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{lead.phoneNumber}</p>
                          <p className="text-xs text-text-muted mt-1">{lead.course?.name || lead.interestedIn}</p>
                          <p className="text-[11px] text-text-muted mt-1">
                            {lead.assignedCounsellor?.name || "Unassigned"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Counsellor</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No leads found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-bg-secondary/30"
                          onClick={() => openLead(lead.id)}
                        >
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.phoneNumber}</TableCell>
                          <TableCell>{lead.course?.name || lead.interestedIn || "—"}</TableCell>
                          <TableCell><LeadStageBadge stage={lead.stage} /></TableCell>
                          <TableCell>{lead.source}</TableCell>
                          <TableCell>{lead.assignedCounsellor?.name || "Unassigned"}</TableCell>
                          <TableCell className="text-sm text-text-secondary">
                            {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {meta.totalPages > 1 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Page {meta.page} of {meta.totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
