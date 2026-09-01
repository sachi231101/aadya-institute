import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { whatsappApi } from "@/services/whatsapp.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tab = "notifications" | "templates" | "rules";

export const WhatsAppHub: React.FC = () => {
  const [tab, setTab] = useState<Tab>("notifications");

  const notificationsQuery = useQuery({
    queryKey: ["whatsapp", "notifications"],
    queryFn: () => whatsappApi.getNotifications({ limit: 50 }),
    enabled: tab === "notifications",
  });

  const templatesQuery = useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: () => whatsappApi.listTemplates(),
    enabled: tab === "templates",
  });

  const rulesQuery = useQuery({
    queryKey: ["whatsapp", "rules"],
    queryFn: () => whatsappApi.listRules(),
    enabled: tab === "rules",
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "notifications", label: "Notification History" },
    { key: "templates", label: "Templates" },
    { key: "rules", label: "Automation Rules" },
  ];

  const activeQuery = tab === "notifications" ? notificationsQuery : tab === "templates" ? templatesQuery : rulesQuery;
  const items = activeQuery.data?.data || activeQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">WhatsApp Hub</h2>
          <p className="text-sm text-text-secondary">Templates, rules, and notification delivery history.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => activeQuery.refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t.key ? "border-[#1769AA] text-[#1769AA]" : "border-transparent text-text-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          {activeQuery.isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin inline mr-2" />Loading...</div>
          ) : activeQuery.isError ? (
            <div className="text-center py-12 text-red-600"><AlertCircle className="w-6 h-6 inline mr-2" />Failed to load data.</div>
          ) : !Array.isArray(items) || items.length === 0 ? (
            <div className="text-center py-12 text-text-secondary"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />No records found.</div>
          ) : tab === "notifications" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((n: { id: string; phone?: string; message?: string; status: string; sentAt?: string; createdAt: string }) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.phone || "—"}</TableCell>
                    <TableCell className="max-w-md truncate">{n.message || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{n.status}</Badge></TableCell>
                    <TableCell>{new Date(n.sentAt || n.createdAt).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : tab === "templates" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t: { id: string; name: string; category?: string; status: string }) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.category || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r: { id: string; eventType: string; templateId?: string; isEnabled: boolean }) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.eventType}</TableCell>
                    <TableCell className="font-mono text-sm">{r.templateId || "—"}</TableCell>
                    <TableCell><Badge variant={r.isEnabled ? "success" : "outline"}>{r.isEnabled ? "Yes" : "No"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
