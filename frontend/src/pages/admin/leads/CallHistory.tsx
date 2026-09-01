import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneCall, Search, Plus, Loader2, AlertCircle } from "lucide-react";
import { useCallHistory } from "@/hooks/useLeads";
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

export const CallHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useCallHistory({
    page,
    limit: 20,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const callLogs = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  const filtered = callLogs.filter((log: {
    lead?: { name?: string; phoneNumber?: string };
    status?: string;
    aiSummary?: string;
  }) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (log.lead?.name || "").toLowerCase().includes(q) ||
      (log.lead?.phoneNumber || "").includes(q) ||
      (log.aiSummary || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">AI Call History</h2>
          <p className="text-sm text-text-secondary">View all AI calling logs, transcripts, and outcomes.</p>
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
                placeholder="Search by lead name, phone, or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 border rounded-md text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>AI Summary</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading call history...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load call history.
                      <Button variant="link" onClick={() => refetch()}>Retry</Button>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                      <PhoneCall className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No call records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log: {
                    id: string;
                    status: string;
                    duration: number;
                    aiSummary?: string;
                    createdAt: string;
                    lead?: { id?: string; name?: string; phoneNumber?: string };
                    leadId?: string;
                  }) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-bg-secondary/30"
                      onClick={() => log.leadId && navigate(ROUTES.ADMIN.LEADS.DETAIL(log.leadId))}
                    >
                      <TableCell>
                        <div className="font-medium">{log.lead?.name || "Unknown"}</div>
                        <div className="text-xs text-text-secondary">{log.lead?.phoneNumber}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.status}</Badge>
                      </TableCell>
                      <TableCell>{log.duration}s</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{log.aiSummary || "—"}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
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
