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
import { ReadOnlyBanner, PermissionGate } from "@/components/permissions/PermissionGate";
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
  const [stageMasterId, setStageMasterId] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("list");

  const { options: stageOptions } = useMasterDropdown("leadstage");
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const counsellors = (usersData?.data ?? []) as { id: string; name: string }[];
  const branches = branchesResponse?.data || [];

  const stagePipeline = useMemo(() => {
    if (stageOptions.length > 0) {
      return stageOptions.map((opt) => ({
        key: opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"),
        label: opt.label,
      }));
    }
    return [...DEFAULT_LEAD_STAGE_PIPELINE, "LOST"].map((s) => ({
      key: s,
      label: s.replace(/_/g, " "),
    }));
  }, [stageOptions]);

  const { data, isLoading, isError, refetch } = useLeads({
    page: view === "list" ? page : 1,
    limit: view === "kanban" ? 100 : 20,
    search: searchTerm || undefined,
    stage: stageFilter !== "ALL" ? stageFilter : undefined,
    assignedCounsellorId: counsellorFilter !== "ALL" ? counsellorFilter : undefined,
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
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">All Leads</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-xl border border-border bg-muted/40 p-0.5 overflow-hidden shadow-xs">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg text-xs font-bold h-8 px-3 transition-all ${
                view === "list" ? "bg-white dark:bg-slate-800 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("list")}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1.5" /> List
            </Button>
            <Button
              type="button"
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg text-xs font-bold h-8 px-3 transition-all ${
                view === "kanban" ? "bg-white dark:bg-slate-800 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5 mr-1.5" /> Pipeline
            </Button>
          </div>
          <PermissionGate itemKey="leads.all" mode="write">
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5 shadow-sm h-9 px-3.5 rounded-xl cursor-pointer"
              onClick={() => navigate(`${basePath}/leads/${basePath === "/admin" ? "new" : "add"}`)}
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card className="border-border/60 shadow-xs rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 h-10 rounded-xl bg-background border-border"
              />
            </div>
            <div className="w-full sm:w-[170px]">
              <MasterSelect
                entityType="leadstage"
                value={stageMasterId}
                allowCreate={false}
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
              value={counsellorFilter}
              onChange={(e) => { setCounsellorFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border border-border rounded-xl text-xs sm:text-sm bg-card font-medium text-foreground cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {isAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                className="h-10 px-3 border border-border rounded-xl text-xs sm:text-sm bg-card font-medium text-foreground cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
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
              {stagePipeline.map(({ key: stage, label }) => {
                const columnLeads = leads.filter((l) => l.stage === stage);
                return (
                  <div key={stage} className="min-w-[250px] w-[250px] shrink-0 rounded-2xl bg-muted/20 border border-border p-3.5 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <LeadStageBadge stage={stage} label={label} />
                      <span className="text-xs font-bold text-muted-foreground">{columnLeads.length}</span>
                    </div>
                    <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
                      {columnLeads.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-8 text-center font-medium">No leads</p>
                      ) : columnLeads.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => openLead(lead.id)}
                          className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer"
                        >
                          <p className="font-bold text-sm text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{lead.phoneNumber}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">{lead.course?.name || lead.interestedIn}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
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
                          <TableCell className="text-sm">
                            {lead.course?.name || lead.interestedIn || "—"}
                          </TableCell>
                          <TableCell>
                            <LeadStageBadge
                              stage={lead.stage}
                              label={stageOptions.find((o) => o.code === lead.stage || o.value === lead.stage)?.label}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{lead.source || "—"}</TableCell>
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
