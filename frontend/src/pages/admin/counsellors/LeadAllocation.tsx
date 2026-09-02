import React, { useMemo, useState } from "react";
import { UserPlus, Search, Loader2, AlertCircle } from "lucide-react";
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
import type { Lead } from "@/services/leads.api";

export const LeadAllocation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState<Record<string, string>>({});
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Assign Leads to Counsellors</h2>
        <p className="text-sm text-text-secondary">
          Assign counsellors after the AI qualification call has finished.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant={tab === "ready" ? "default" : "outline"} size="sm" onClick={() => setTab("ready")}>
          Ready to assign ({ready.length})
        </Button>
        <Button type="button" variant={tab === "awaiting" ? "default" : "outline"} size="sm" onClick={() => setTab("awaiting")}>
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
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-text-secondary">No leads in this queue.</TableCell></TableRow>
              ) : (
                visible.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
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
                      <Button
                        size="sm"
                        className="bg-[#1769AA] text-white"
                        disabled={tab === "awaiting" || !selectedCounsellor[lead.id]}
                        onClick={() => handleAssign(lead.id)}
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
