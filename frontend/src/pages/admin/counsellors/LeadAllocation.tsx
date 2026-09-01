import React, { useState } from "react";
import { UserPlus, Search, Loader2, AlertCircle } from "lucide-react";
import { useLeads, useAssignLead } from "@/hooks/useLeads";
import { useAdminUsers } from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const LeadAllocation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useLeads({
    search: searchTerm || undefined,
    limit: 50,
    status: "ACTIVE",
  });
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const assignMutation = useAssignLead();

  const leads = data?.data?.data || data?.data || [];
  const counsellors = usersData?.data ?? [];

  const handleAssign = async (leadId: string) => {
    const counsellorId = selectedCounsellor[leadId];
    if (!counsellorId) return;
    try {
      await assignMutation.mutateAsync({ id: leadId, data: { counsellorId } });
      refetch();
    } catch {
      alert("Failed to assign lead");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Lead Allocation</h2>
        <p className="text-sm text-text-secondary">Assign leads to counsellors across branches.</p>
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
                <TableHead>Current Counsellor</TableHead>
                <TableHead>Assign To</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : !Array.isArray(leads) || leads.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-text-secondary">No leads to allocate.</TableCell></TableRow>
              ) : (
                leads.map((lead: { id: string; name: string; phoneNumber: string; stage: string; assignedCounsellor?: { name: string } }) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phoneNumber}</TableCell>
                    <TableCell><Badge variant="outline">{lead.stage}</Badge></TableCell>
                    <TableCell>{lead.assignedCounsellor?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      <select
                        value={selectedCounsellor[lead.id] || ""}
                        onChange={(e) => setSelectedCounsellor((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                        className="h-9 px-2 border rounded-md text-sm"
                      >
                        <option value="">Select counsellor</option>
                        {Array.isArray(counsellors) && counsellors.map((c: { id: string; name: string }) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="bg-[#1769AA] text-white" disabled={!selectedCounsellor[lead.id]} onClick={() => handleAssign(lead.id)}>
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
