import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserPlus, Search, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useLeads, useAssignLead } from "@/hooks/useLeads";
import { useAdminUsers } from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadStageBadge, isTerminalAiCallStatus } from "@/components/common/LeadStageBadge";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { getPortalBasePath } from "@/utils/portal-path";
import type { Lead } from "@/services/leads.api";
import { BulkAssignDialog } from "@/pages/admin/leads/components/BulkAssignDialog";

export const LeadAllocation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [tab, setTab] = useState<"ready" | "awaiting">("ready");

  const { data, isLoading, isError, refetch } = useLeads({
    search: searchTerm || undefined,
    limit: 100,
    status: "ACTIVE",
  });
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const assignMutation = useAssignLead();

  const leads: Lead[] = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const counsellors = (usersData?.data ?? []) as { id: string; name: string }[];

  const { awaiting, ready } = useMemo(() => {
    const unassigned = leads.filter((l) => !l.assignedCounsellorId && l.stage !== "LOST" && l.stage !== "CONVERTED");
    return {
      awaiting: unassigned.filter((l) => l.stage === "NEW" && !l.callLogs?.some((c) => isTerminalAiCallStatus(c.status))),
      ready: unassigned.filter((l) => l.stage !== "NEW" || l.callLogs?.some((c) => isTerminalAiCallStatus(c.status))),
    };
  }, [leads]);

  const visible = tab === "ready" ? ready : awaiting;

  const handleAssign = async (leadId: string) => {
    const counsellorId = selectedCounsellor[leadId];
    if (!counsellorId) return;
    try {
      await assignMutation.mutateAsync({ id: leadId, data: { counsellorId } });
      refetch();
    } catch {
      alert("Lead cannot be assigned until the AI call has finished.");
    }
  };

  const toggleSelect = (id: string) => {
    if (tab === "awaiting") return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (tab === "awaiting") return;
    if (selectedIds.length === visible.length) setSelectedIds([]);
    else setSelectedIds(visible.map((l) => l.id));
  };

  const openLead = (leadId: string) => {
    navigate(`${basePath}/leads/${leadId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Assign Leads to Counsellors</h2>
          <p className="text-sm text-text-secondary">
            Assign counsellors after the AI qualification call has finished.
          </p>
        </div>
        {tab === "ready" && selectedIds.length > 0 && (
          <PermissionGate itemKey="counsellor.lead_allocation" mode="write">
            <Button
              type="button"
              className="bg-[#2563EB] text-white gap-2"
              onClick={() => setBulkAssignOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Bulk assign ({selectedIds.length})
            </Button>
          </PermissionGate>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "ready" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setTab("ready");
            setSelectedIds([]);
          }}
        >
          Ready to assign ({ready.length})
        </Button>
        <Button
          type="button"
          variant={tab === "awaiting" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setTab("awaiting");
            setSelectedIds([]);
          }}
        >
          Awaiting AI call ({awaiting.length})
        </Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && selectedIds.length === visible.length}
                    onChange={toggleSelectAll}
                    disabled={tab === "awaiting"}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>AI Call</TableHead>
                <TableHead>Assign To</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-text-secondary">No leads in this queue.</TableCell></TableRow>
              ) : (
                visible.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-bg-secondary/30">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        disabled={tab === "awaiting"}
                        aria-label={`Select ${lead.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left hover:text-[#2563EB] hover:underline"
                        onClick={() => openLead(lead.id)}
                      >
                        {lead.name}
                        <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    </TableCell>
                    <TableCell>{lead.phoneNumber}</TableCell>
                    <TableCell><LeadStageBadge stage={lead.stage} /></TableCell>
                    <TableCell className="text-xs">{lead.callLogs?.[0]?.status || "Queued"}</TableCell>
                    <TableCell>
                      <select
                        value={selectedCounsellor[lead.id] || ""}
                        onChange={(e) => setSelectedCounsellor((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                        className="h-9 px-2 border rounded-md text-sm bg-background"
                        disabled={tab === "awaiting"}
                      >
                        <option value="">Select counsellor</option>
                        {counsellors.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate itemKey="counsellor.lead_allocation" mode="write">
                        <Button
                          size="sm"
                          className="bg-[#2563EB] text-white"
                          disabled={tab === "awaiting" || !selectedCounsellor[lead.id]}
                          onClick={() => handleAssign(lead.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" /> Assign
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        leadIds={selectedIds}
        counsellors={counsellors}
        onSuccess={() => {
          setSelectedIds([]);
          refetch();
        }}
      />
    </div>
  );
};
