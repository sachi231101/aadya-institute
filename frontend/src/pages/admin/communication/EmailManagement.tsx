import React, { useState } from "react";
import { Mail, Plus, Loader2, AlertCircle } from "lucide-react";
import { useEmailTemplates, useEmailLogs, useCreateEmailTemplate } from "@/hooks/useEmail";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tab = "templates" | "logs";

export const EmailManagement: React.FC = () => {
  const [tab, setTab] = useState<Tab>("templates");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const templatesQuery = useEmailTemplates(undefined);
  const logsQuery = useEmailLogs({ limit: 50 });
  const createMutation = useCreateEmailTemplate();

  const templates = templatesQuery.data?.data?.data || templatesQuery.data?.data || [];
  const logs = logsQuery.data?.data?.data || logsQuery.data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name, subject, body });
      setShowModal(false);
      templatesQuery.refetch();
    } catch {
      alert("Failed to create template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Email Management</h2>
          <p className="text-sm text-text-secondary">Email templates and delivery logs.</p>
        </div>
        {tab === "templates" && (
          <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b">
        {(["templates", "logs"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? "border-[#1769AA] text-[#1769AA]" : "border-transparent text-text-secondary"}`}>
            {t}
          </button>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          {tab === "templates" ? (
            templatesQuery.isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
            ) : templatesQuery.isError ? (
              <div className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load templates.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(templates) || templates.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-text-secondary"><Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />No templates.</TableCell></TableRow>
                  ) : (
                    templates.map((t: { id: string; name: string; subject: string; status?: string }) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.subject}</TableCell>
                        <TableCell><Badge variant="outline">{t.status || "ACTIVE"}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )
          ) : logsQuery.isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!Array.isArray(logs) || logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-text-secondary">No email logs.</TableCell></TableRow>
                ) : (
                  logs.map((l: { id: string; to: string; subject: string; status: string; sentAt?: string; createdAt: string }) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.to}</TableCell>
                      <TableCell>{l.subject}</TableCell>
                      <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                      <TableCell>{new Date(l.sentAt || l.createdAt).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Create Email Template</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Subject *</Label><Input required value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div><Label>Body *</Label><textarea required value={body} onChange={(e) => setBody(e.target.value)} className="w-full min-h-[120px] p-3 border rounded-md text-sm" /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white" disabled={createMutation.isPending}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
