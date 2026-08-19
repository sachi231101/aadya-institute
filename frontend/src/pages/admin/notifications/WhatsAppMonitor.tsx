import React, { useState } from "react";
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const MESSAGE_TYPES = [
  { key: "all", label: "All Messages" },
  { key: "CLASS_REMINDER", label: "Class Reminders" },
  { key: "FIRST_CLASS", label: "First Class Rules" },
  { key: "NEW_MODULE", label: "New Module" },
  { key: "ABSENCE", label: "Absence Alerts" },
  { key: "FEEDBACK", label: "Feedback Requests" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SENT: { label: "Sent", color: "bg-blue-50 text-blue-700 border-blue-200" },
  DELIVERED: { label: "Delivered", color: "bg-green-50 text-green-700 border-green-200" },
  READ: { label: "Read", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED: { label: "Failed", color: "bg-red-50 text-red-700 border-red-200" },
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export const WhatsAppMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");

  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ["notifications", "whatsapp", activeTab],
    queryFn: async () => {
      const params: Record<string, string> = { channel: "WHATSAPP", limit: "50" };
      if (activeTab !== "all") params.event = activeTab;
      const response = await api.get("/notifications", { params });
      return response.data;
    },
  });

  const notifications = notificationsResponse?.data || [];

  const stats = {
    total: notifications.length,
    sent: notifications.filter((n: any) => n.status === "SENT" || n.status === "DELIVERED").length,
    failed: notifications.filter((n: any) => n.status === "FAILED").length,
    pending: notifications.filter((n: any) => n.status === "PENDING").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          WhatsApp Automation Monitor
        </h1>
        <p className="text-sm text-text-secondary mt-1">Track all automated WhatsApp messages and delivery status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-text-secondary">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.sent}</p>
              <p className="text-xs text-text-secondary">Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.failed}</p>
              <p className="text-xs text-text-secondary">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.pending}</p>
              <p className="text-xs text-text-secondary">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs by Message Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
          {MESSAGE_TYPES.map((mt) => (
            <TabsTrigger key={mt.key} value={mt.key} className="text-xs">
              {mt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Messages Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Recipient</TableHead>
                <TableHead className="font-semibold">Event</TableHead>
                <TableHead className="font-semibold">Message</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-text-secondary">Loading...</TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No WhatsApp messages found</p>
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n: any) => {
                  const statusCfg = STATUS_CONFIG[n.status] || STATUS_CONFIG.PENDING;
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="text-sm">
                        <p className="font-medium">{n.student?.user?.name || n.title || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{(n.event || "").replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">
                        {n.message || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${statusCfg.color}`}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {n.sentAt ? new Date(n.sentAt).toLocaleString("en-IN") : n.scheduledAt ? `Scheduled: ${new Date(n.scheduledAt).toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
