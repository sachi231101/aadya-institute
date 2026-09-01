import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Loader2, AlertCircle, Plus } from "lucide-react";
import { whatsappApi } from "@/services/whatsapp.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AutomationRules: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [eventType, setEventType] = useState("");
  const [templateId, setTemplateId] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp", "rules"],
    queryFn: () => whatsappApi.listRules(),
  });

  const { data: templatesData } = useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: () => whatsappApi.listTemplates(),
  });

  const upsertMutation = useMutation({
    mutationFn: whatsappApi.upsertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "rules"] });
      setShowModal(false);
    },
  });

  const rules = data?.data || data || [];
  const templates = templatesData?.data || templatesData || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertMutation.mutateAsync({ eventType, templateId, isEnabled: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Automation Rules</h2>
          <p className="text-sm text-text-secondary">Configure WhatsApp notification rules for academy events.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!Array.isArray(rules) || rules.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-text-secondary"><Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />No automation rules configured.</TableCell></TableRow>
                ) : (
                  rules.map((r: { id: string; eventType: string; templateId?: string; isEnabled: boolean }) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.eventType}</TableCell>
                      <TableCell>{r.templateId || "—"}</TableCell>
                      <TableCell><Badge variant={r.isEnabled ? "success" : "outline"}>{r.isEnabled ? "Enabled" : "Disabled"}</Badge></TableCell>
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Create Automation Rule</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Event Type *</Label>
                <Input required value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. CLASS_REMINDER" />
              </div>
              <div>
                <Label>Template *</Label>
                <select required value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                  <option value="">Select template</option>
                  {Array.isArray(templates) && templates.map((t: { id: string; name: string }) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white" disabled={upsertMutation.isPending}>Save Rule</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
