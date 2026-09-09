import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { whatsappApi, type WhatsAppAutomation } from "@/services/whatsapp.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionGate } from "@/components/permissions/PermissionGate";

const CATEGORY_ORDER = ["ADMISSIONS", "FEES", "CLASSES", "ACADEMICS"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  ADMISSIONS: "Admissions",
  FEES: "Fees",
  CLASSES: "Classes",
  ACADEMICS: "Academics",
};

export const WhatsAppAutomations: React.FC = () => {
  const queryClient = useQueryClient();
  const [testFor, setTestFor] = useState<WhatsAppAutomation | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testName, setTestName] = useState("Test User");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp", "automations"],
    queryFn: () => whatsappApi.listAutomations(),
  });

  const payload = data?.data;
  const globalEnabled = payload?.globalEnabled ?? false;
  const automations = payload?.automations ?? [];
  const templates = payload?.templates ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, WhatsAppAutomation[]> = {};
    for (const a of automations) {
      (map[a.category] ||= []).push(a);
    }
    return map;
  }, [automations]);

  const globalMutation = useMutation({
    mutationFn: (enabled: boolean) => whatsappApi.patchAutomationConfig(enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "automations"] }),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: string;
      body: { enabled?: boolean; templateId?: string | null };
    }) => whatsappApi.patchAutomation(type, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "automations"] }),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      whatsappApi.testAutomation(testFor!.event, testPhone, testName || undefined),
    onSuccess: () => {
      setTestFor(null);
      setTestPhone("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "history"] });
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enable only the system messages you want. Everything stays off until you turn it on.
      </p>

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">WhatsApp Automation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Global master switch — pauses every automation when off.
            </p>
          </div>
          <PermissionGate itemKey="communication.whatsapp" mode="write">
            <div className="flex items-center gap-3">
              <Badge variant={globalEnabled ? "success" : "outline"}>
                {globalEnabled ? "ON" : "OFF"}
              </Badge>
              <Switch
                checked={globalEnabled}
                disabled={globalMutation.isPending}
                onCheckedChange={(v) => globalMutation.mutate(v)}
              />
            </div>
          </PermissionGate>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
          Loading automations...
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-red-600">
          Failed to load automations.{" "}
          <Button variant="link" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        CATEGORY_ORDER.map((cat) => (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[cat]}
            </h3>
            <div className="grid gap-3">
              {(grouped[cat] || []).map((item) => (
                <Card key={item.event} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{item.label}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                      <PermissionGate itemKey="communication.whatsapp" mode="write">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {item.enabled ? "ON" : "OFF"}
                          </span>
                          <Switch
                            checked={item.enabled}
                            disabled={patchMutation.isPending || !globalEnabled}
                            onCheckedChange={(v) =>
                              patchMutation.mutate({ type: item.event, body: { enabled: v } })
                            }
                          />
                        </div>
                      </PermissionGate>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground">Timing:</span> {item.timingLabel}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Recipient:</span>{" "}
                        {item.recipientLabel}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Template:</span>{" "}
                        {item.template?.name || "Not mapped"}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <PermissionGate itemKey="communication.whatsapp" mode="write">
                        <select
                          className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                          value={item.templateId || ""}
                          onChange={(e) =>
                            patchMutation.mutate({
                              type: item.event,
                              body: { templateId: e.target.value || null },
                            })
                          }
                        >
                          <option value="">Select template</option>
                          {templates
                            .filter((t) => t.event === item.event || !t.event)
                            .concat(templates.filter((t) => t.event !== item.event))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.status})
                              </option>
                            ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setTestFor(item)}
                          disabled={!item.enabled || !globalEnabled}
                        >
                          <Send className="h-3.5 w-3.5" /> Test Message
                        </Button>
                      </PermissionGate>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {testFor && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-lg">
            <h3 className="text-lg font-bold">Test: {testFor.label}</h3>
            <p className="text-xs text-muted-foreground">
              Sends sample variables via WhatsApp. Requires global + automation ON and a mapped template.
            </p>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>
            {testMutation.isError && (
              <p className="text-xs text-red-600">
                {(testMutation.error as Error)?.message || "Test failed"}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTestFor(null)}>
                Cancel
              </Button>
              <Button
                className="bg-[#2563EB] text-white"
                disabled={!testPhone || testMutation.isPending}
                onClick={() => testMutation.mutate()}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Test"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && automations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No system automations configured.
        </div>
      )}
    </div>
  );
};
