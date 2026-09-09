import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { whatsappApi, type WhatsAppHistoryItem } from "@/services/whatsapp.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant = (status: string) => {
  if (status === "SENT" || status === "DELIVERED" || status === "READ") return "success";
  if (status === "FAILED" || status === "SKIPPED") return "outline";
  return "secondary";
};

export const WhatsAppHistory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["whatsapp", "history", page, status, event, search],
    queryFn: () =>
      whatsappApi.getHistory({
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(event ? { event } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      }),
  });

  const items: WhatsAppHistoryItem[] = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Delivery log for system automations, including skipped and failed sends.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-9 max-w-xs"
              placeholder="Search phone, reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="QUEUED">QUEUED</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>
            <Input
              className="h-9 max-w-[220px]"
              placeholder="Event e.g. FEE_DUE_REMINDER"
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">Failed to load history.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Automation</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No WhatsApp messages yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(n.sentAt || n.createdAt).toLocaleString("en-IN")}
                          {n.isTest ? (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              TEST
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{n.event || "—"}</TableCell>
                        <TableCell>{n.recipientName || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{n.phone || "—"}</TableCell>
                        <TableCell className="text-xs">{n.template?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(n.status) as "success" | "outline" | "secondary"}>
                            {n.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {n.skipReason || n.errorMessage || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {n.provider === "AISENSY"
                            ? "WhatsApp (legacy)"
                            : n.provider === "MSG91"
                              ? "MSG91"
                              : n.provider || "MSG91"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {meta.page} of {meta.totalPages} · {meta.total} total
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (meta.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
