import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Loader2, AlertCircle, Users } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { ROUTES } from "@/constants/routes";
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

export const AllLeadsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useLeads({
    page,
    limit: 20,
    search: searchTerm || undefined,
    stage: stageFilter !== "ALL" ? stageFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const leads = data?.data?.data || data?.data || [];
  const meta = data?.data?.meta || data?.meta || { totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Leads</h2>
          <p className="text-sm text-text-secondary">Search, filter, and manage institute leads.</p>
        </div>
        <Button
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
          onClick={() => navigate(ROUTES.ADMIN.LEADS.NEW)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border rounded-md text-sm"
            >
              <option value="ALL">All Stages</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 border rounded-md text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load leads.
                      <Button variant="link" onClick={() => refetch()}>Retry</Button>
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(leads) || leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No leads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead: {
                    id: string;
                    name: string;
                    phoneNumber: string;
                    stage: string;
                    source: string;
                    createdAt: string;
                    course?: { name: string };
                    assignedCounsellor?: { name: string };
                  }) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-bg-secondary/30"
                      onClick={() => navigate(ROUTES.ADMIN.LEADS.DETAIL(lead.id))}
                    >
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phoneNumber}</TableCell>
                      <TableCell>{lead.course?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{lead.stage}</Badge></TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};
