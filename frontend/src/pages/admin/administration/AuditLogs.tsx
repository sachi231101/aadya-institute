import React, { useState } from "react";
import { ScrollText, Search, Loader2, AlertCircle } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
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

export const AuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAuditLogs({ search: searchTerm || undefined, page, limit: 30 });

  const logs = data?.data?.data || data?.data || [];
  const meta = data?.data || data?.meta || { totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Audit Logs</h2>
        <p className="text-sm text-text-secondary">System activity and change history.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search audit logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
              ) : !Array.isArray(logs) || logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary"><ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />No audit logs.</TableCell></TableRow>
              ) : (
                logs.map((l: { id: string; createdAt: string; user?: { name: string }; module: string; action: string; description?: string }) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{new Date(l.createdAt).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{l.user?.name || "System"}</TableCell>
                    <TableCell>{l.module}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.description || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
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
