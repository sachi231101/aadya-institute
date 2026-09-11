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

const fieldLabel = (key: string) =>
  key
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

const getVariableMap = (item: WhatsAppAutomation): Record<string, string> => {
  const map = item.configuration?.variableMap;
  if (!map || typeof map !== "object") return {};
  return map as Record<string, string>;
};

const resolveTemplateVariables = (
  item: WhatsAppAutomation,
  templates: AutomationsTemplates
): string[] => {
  if (item.template?.variables?.length) return item.template.variables;
  const selected = templates.find((t) => t.id === item.templateId);
  return selected?.variables ?? [];
};

type AutomationsTemplates = Array<{
  id: string;
  name: string;
  event: string;
  status: string;
  category?: string | null;
  variables?: string[];
}>;

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
  const templates = (payload?.templates ?? []) as AutomationsTemplates;

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
      body: {
        enabled?: boolean;
        templateId?: string | null;
        configuration?: Record<string, unknown>;
      };
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

  const saveVariableMap = (item: WhatsAppAutomation, variableMap: Record<string, string>) => {
    patchMutation.mutate({
      type: item.event,
      body: {
        configuration: {
          ...item.configuration,
          variableMap,
        },
      },
    });
  };

  const onTemplateChange = (item: WhatsAppAutomation, templateId: string) => {
    const selected = templates.find((t) => t.id === templateId);
    const slots = selected?.variables ?? [];
    const fields = Object.keys(item.sampleVariables || {});
    const variableMap: Record<string, string> = {};
    slots.forEach((slot, index) => {
      if (fields[index]) variableMap[slot] = fields[index];
    });

    patchMutation.mutate({
      type: item.event,
      body: {
        templateId: templateId || null,
        configuration: {
          ...item.configuration,
          variableMap,
        },
      },
    });
  };

  const mappingIncomplete = (item: WhatsAppAutomation) => {
    const slots = resolveTemplateVariables(item, templates);
    if (!slots.length) return false;
    const map = getVariableMap(item);
    return slots.some((s) => !map[s]);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enable only the system messages you want. Map MSG91 template variables to Aadya fields on
        each card. Everything stays off until you turn it on.
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
              {(grouped[cat] || []).map((item) => {
                const slots = resolveTemplateVariables(item, templates);
                const map = getVariableMap(item);
                const fields = Object.keys(item.sampleVariables || {});
                const incomplete = mappingIncomplete(item);
                const activeTemplates = templates.filter((t) => t.status === "ACTIVE");
                const otherTemplates = templates.filter((t) => t.status !== "ACTIVE");

                return (
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
                              disabled={
                                patchMutation.isPending ||
                                !globalEnabled ||
                                (incomplete && !item.enabled)
                              }
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
                          <span className="font-semibold text-foreground">Timing:</span>{" "}
                          {item.timingLabel}
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
                            className="h-9 rounded-md border border-border bg-background px-2 text-xs min-w-[220px]"
                            value={item.templateId || ""}
                            onChange={(e) => onTemplateChange(item, e.target.value)}
                          >
                            <option value="">Select template</option>
                            {activeTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (ACTIVE)
                              </option>
                            ))}
                            {otherTemplates.map((t) => (
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
                            disabled={!item.enabled || !globalEnabled || incomplete}
                          >
                            <Send className="h-3.5 w-3.5" /> Test Message
                          </Button>
                        </PermissionGate>
                      </div>

                      {item.templateId && slots.length > 0 && (
                        <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground">Variable mapping</p>
                          <p className="text-[11px] text-muted-foreground">
                            Map each MSG91 template slot to an Aadya field for this automation.
                          </p>
                          {slots.map((slot) => (
                            <div
                              key={slot}
                              className="flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <Label className="text-xs font-mono w-24 shrink-0">{slot}</Label>
                              <select
                                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                                value={map[slot] || ""}
                                disabled={patchMutation.isPending}
                                onChange={(e) => {
                                  const next = { ...map, [slot]: e.target.value };
                                  if (!e.target.value) delete next[slot];
                                  saveVariableMap(item, next);
                                }}
                              >
                                <option value="">Select field</option>
                                {fields.map((f) => (
                                  <option key={f} value={f}>
                                    {fieldLabel(f)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                          {incomplete && (
                            <p className="text-[11px] text-amber-700">
                              Map all variables before enabling or sending a test message.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {testFor && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-lg">
            <h3 className="text-lg font-bold">Test: {testFor.label}</h3>
            <p className="text-xs text-muted-foreground">
              Sends sample variables via WhatsApp using your variable mapping. Requires global +
              automation ON and a mapped template.
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
                {(testMutation.error as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message ||
                  (testMutation.error as Error)?.message ||
                  "Test failed"}
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
