import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil } from "lucide-react";
import { whatsappApi, type WhatsAppTemplate } from "@/services/whatsapp.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/permissions/PermissionGate";

const EVENT_OPTIONS = [
  "STUDENT_WELCOME",
  "STUDENT_BATCH_ASSIGNED",
  "STUDENT_CREDENTIALS",
  "FEE_DUE_REMINDER",
  "FEE_OVERDUE_REMINDER",
  "PAYMENT_CONFIRMATION",
  "CLASS_REMINDER",
  "CLASS_CANCELLED",
  "RECORDING_AVAILABLE",
  "ASSIGNMENT_CREATED",
  "EXAM_REMINDER",
  "RESULT_PUBLISHED",
];

const emptyForm = {
  name: "",
  event: "STUDENT_WELCOME",
  providerTemplateName: "",
  language: "en",
  category: "",
  body: "",
  variables: "",
  status: "ACTIVE",
};

export const WhatsAppTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: () => whatsappApi.listTemplates(),
  });

  const templates: WhatsAppTemplate[] = (data?.data || data || []) as WhatsAppTemplate[];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const variables = form.variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        event: form.event,
        providerTemplateName: form.providerTemplateName,
        language: form.language,
        category: form.category || undefined,
        body: form.body || undefined,
        variables,
        status: form.status,
      };
      if (editing) return whatsappApi.updateTemplate(editing.id, payload);
      return whatsappApi.createTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "automations"] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      whatsappApi.toggleTemplateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (t: WhatsAppTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      event: t.event,
      providerTemplateName: t.providerTemplateName,
      language: t.language || "en",
      category: t.category || "",
      body: t.body || "",
      variables: Array.isArray(t.variables) ? t.variables.join(", ") : "",
      status: t.status || "ACTIVE",
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Map provider campaign names and required variables for each automation.
        </p>
        <PermissionGate itemKey="communication.whatsapp" mode="write">
          <Button className="bg-[#2563EB] text-white" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        </PermissionGate>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              Failed to load.{" "}
              <Button variant="link" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No templates yet. Create one and link it from Automations.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="font-mono text-xs">{t.event}</TableCell>
                      <TableCell>{t.category || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.providerTemplateName}</TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "ACTIVE" ? "success" : "outline"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.updatedAt
                          ? new Date(t.updatedAt).toLocaleString("en-IN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <PermissionGate itemKey="communication.whatsapp" mode="write">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleMutation.mutate({
                                id: t.id,
                                status: t.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                              })
                            }
                          >
                            {t.status === "ACTIVE" ? "Disable" : "Enable"}
                          </Button>
                        </PermissionGate>
                      </TableCell>
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
          <div className="bg-card rounded-xl max-w-lg w-full p-6 space-y-4 border border-border max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">{editing ? "Edit Template" : "Create Template"}</h3>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Event *</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md text-sm bg-background"
                  value={form.event}
                  onChange={(e) => setForm({ ...form, event: e.target.value })}
                >
                  {EVENT_OPTIONS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Campaign Name *</Label>
                <Input
                  value={form.providerTemplateName}
                  onChange={(e) => setForm({ ...form, providerTemplateName: e.target.value })}
                  placeholder="Exact Live campaign name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <Input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Body (preview)</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  placeholder="Hello {{student_name}}, welcome to {{organization_name}}..."
                />
              </div>
              <div>
                <Label>Variables (comma-separated)</Label>
                <Input
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                  placeholder="student_name, organization_name, batch_name"
                />
              </div>
            </div>
            {saveMutation.isError && (
              <p className="text-xs text-red-600">{(saveMutation.error as Error).message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#2563EB] text-white"
                disabled={
                  !form.name ||
                  !form.providerTemplateName ||
                  saveMutation.isPending
                }
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
