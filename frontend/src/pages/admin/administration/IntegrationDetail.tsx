import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  Unplug,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useConnectGoogle,
  useDisconnectGoogle,
  useDisconnectIntegration,
  useIntegrationDetail,
  useTestIntegration,
  useUpsertIntegration,
} from "@/hooks/useIntegrations";
import {
  useAiCallingAgents,
  useAiCallingConfig,
  useUpdateAiCallingConfig,
} from "@/hooks/useAiCalling";
import type { IntegrationType } from "@/services/integrations.api";
import { ROUTES } from "@/constants/routes";
import { getPortalBasePath } from "@/utils/portal-path";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Textarea } from "@/components/ui/textarea";

const CALLING_DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TYPE_MAP: Record<string, IntegrationType> = {
  ai: "AI",
  whatsapp: "WHATSAPP",
  ai_calling: "AI_CALLING",
  "ai-calling": "AI_CALLING",
  google_workspace: "GOOGLE_WORKSPACE",
  "google-workspace": "GOOGLE_WORKSPACE",
  google_sheets: "GOOGLE_SHEETS",
  "google-sheets": "GOOGLE_SHEETS",
  payment: "PAYMENT",
  email: "EMAIL",
};

function parseType(raw: string | undefined): IntegrationType | null {
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  const upper = raw.toUpperCase().replace(/-/g, "_") as IntegrationType;
  const valid: IntegrationType[] = [
    "AI",
    "WHATSAPP",
    "AI_CALLING",
    "GOOGLE_WORKSPACE",
    "GOOGLE_SHEETS",
    "PAYMENT",
    "EMAIL",
  ];
  return valid.includes(upper) ? upper : null;
}

function SecretField({
  label,
  configured,
  value,
  onChange,
  onReplace,
  replacing,
  placeholder = "••••••••",
}: {
  label: string;
  configured: boolean;
  value: string;
  onChange: (v: string) => void;
  onReplace: () => void;
  replacing: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <Label>{label}</Label>
        {configured && !replacing ? (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Configured
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onReplace}>
              Replace
            </Button>
          </span>
        ) : null}
      </div>
      {configured && !replacing ? (
        <Input type="password" value="" placeholder={placeholder} disabled />
      ) : (
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? "Enter new secret" : "Enter secret"}
          autoComplete="new-password"
        />
      )}
    </div>
  );
}

export const IntegrationDetail: React.FC = () => {
  const { type: typeParam } = useParams<{ type: string }>();
  const type = parseType(typeParam);
  const navigate = useNavigate();
  const location = useLocation();
  const integrationsBase =
    getPortalBasePath(location.pathname) === "/center"
      ? "/center/integrations"
      : ROUTES.ADMIN.ADMINISTRATION.INTEGRATIONS;

  const { data, isLoading, isError, refetch } = useIntegrationDetail(type ?? undefined);
  const upsert = useUpsertIntegration(type ?? "AI");
  const test = useTestIntegration(type ?? "AI");
  const disconnect = useDisconnectIntegration(type ?? "AI");
  const connectGoogle = useConnectGoogle();
  const disconnectGoogle = useDisconnectGoogle();

  const isAiCalling = type === "AI_CALLING";
  const { data: aiConfigRes, refetch: refetchAiConfig } = useAiCallingConfig(isAiCalling);
  const { data: agentsRes } = useAiCallingAgents(isAiCalling);
  const updateAiConfig = useUpdateAiCallingConfig();
  const agents = agentsRes?.data || [];

  const [isEnabled, setIsEnabled] = useState(true);
  const [config, setConfig] = useState<Record<string, string | number | boolean>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [replaceSecrets, setReplaceSecrets] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiAgentId, setAiAgentId] = useState("");
  const [aiFromNumber, setAiFromNumber] = useState("");
  const [aiScript, setAiScript] = useState("");
  const [aiHoursStart, setAiHoursStart] = useState("09:00");
  const [aiHoursEnd, setAiHoursEnd] = useState("20:00");
  const [aiCallingDays, setAiCallingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [aiDailyLimit, setAiDailyLimit] = useState("");
  const [aiMaxAttempts, setAiMaxAttempts] = useState("3");
  const [aiRetryDelay, setAiRetryDelay] = useState("60");
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (!data) return;
    setIsEnabled(data.isEnabled);
    const cfg = data.configuration || {};
    const next: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        next[k] = v;
      }
    }
    setConfig(next);
    setSecrets({});
    setReplaceSecrets({});
    setMessage(null);
    setErrorMsg(null);
  }, [data]);

  useEffect(() => {
    const cfg = aiConfigRes?.data;
    if (!cfg) return;
    setAiAgentId(cfg.agentId || "");
    setAiFromNumber(cfg.fromNumber || "");
    setAiScript(cfg.callingScript || "");
    setAiHoursStart(cfg.callingHoursStart || "09:00");
    setAiHoursEnd(cfg.callingHoursEnd || "20:00");
    const days = Array.isArray(cfg.callingDays)
      ? (cfg.callingDays as number[])
      : [1, 2, 3, 4, 5, 6];
    setAiCallingDays(days);
    setAiDailyLimit(cfg.dailyCallLimit != null ? String(cfg.dailyCallLimit) : "");
    setAiMaxAttempts(String(cfg.maxAttemptsPerLead ?? 3));
    setAiRetryDelay(String(cfg.retryDelayMinutes ?? 60));
    setAiEnabled(Boolean(cfg.isEnabled));
  }, [aiConfigRes?.data]);

  if (!type) {
    return (
      <div className="text-center py-20 text-red-600">
        Unknown integration type.
        <Button variant="link" asChild>
          <Link to={integrationsBase}>Back</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const isGoogle = type === "GOOGLE_WORKSPACE" || type === "GOOGLE_SHEETS";
  const hasCredential = Boolean(data.maskedCredential || data.isConfigured);

  const setConfigField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setConfig((prev) => ({ ...prev, [key]: raw }));
  };

  const setSecret = (key: string) => (value: string) => {
    setSecrets((prev) => ({ ...prev, [key]: value }));
  };

  const markReplace = (key: string) => {
    setReplaceSecrets((prev) => ({ ...prev, [key]: true }));
    setSecrets((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleCallingDay = (day: number) => {
    setAiCallingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    try {
      const credentials: Record<string, string> = {};
      let replaceCredentials = false;
      for (const [k, v] of Object.entries(secrets)) {
        if (v.trim()) {
          credentials[k] = v.trim();
          replaceCredentials = true;
        }
      }
      if (Object.values(replaceSecrets).some(Boolean) && Object.keys(credentials).length === 0) {
        replaceCredentials = true;
      }

      await upsert.mutateAsync({
        isEnabled: isAiCalling ? aiEnabled : isEnabled,
        configuration: isAiCalling
          ? {
              ...config,
              fromNumber: aiFromNumber || config.fromNumber,
            }
          : config,
        ...(Object.keys(credentials).length ? { credentials } : {}),
        ...(replaceCredentials ? { replaceCredentials: true } : {}),
      });

      if (isAiCalling) {
        await updateAiConfig.mutateAsync({
          agentId: aiAgentId || null,
          fromNumber: aiFromNumber.trim() || null,
          callingScript: aiScript.trim() || null,
          callingHoursStart: aiHoursStart || null,
          callingHoursEnd: aiHoursEnd || null,
          callingDays: aiCallingDays.length ? aiCallingDays : null,
          dailyCallLimit: aiDailyLimit.trim() ? Number(aiDailyLimit) : null,
          maxAttemptsPerLead: Number(aiMaxAttempts) || 3,
          retryDelayMinutes: Number(aiRetryDelay) || 60,
          isEnabled: aiEnabled,
        });
        await refetchAiConfig();
      }

      setMessage(isAiCalling ? "AI Calling config and credentials saved." : "Integration saved.");
      setSecrets({});
      setReplaceSecrets({});
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Save failed";
      setErrorMsg(msg);
    }
  };

  const handleTest = async () => {
    setMessage(null);
    setErrorMsg(null);
    try {
      const result = await test.mutateAsync();
      if (result.success) setMessage(result.message || "Connection test succeeded.");
      else setErrorMsg(result.message || "Connection test failed.");
      await refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Test failed";
      setErrorMsg(msg);
    }
  };

  const handleDisconnect = async () => {
    setMessage(null);
    setErrorMsg(null);
    try {
      if (isGoogle) {
        await disconnectGoogle.mutateAsync();
      } else {
        await disconnect.mutateAsync();
      }
      setMessage("Integration disconnected.");
      await refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Disconnect failed";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(integrationsBase)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-text-primary">{data.name}</h2>
            <Badge variant="outline">{data.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-text-secondary">{data.description}</p>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {message}
        </p>
      ) : null}
      {errorMsg ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {errorMsg}
        </p>
      ) : null}

      <Card className="border-border/50">
        <CardContent className="p-6">
          {isGoogle ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Google authentication uses OAuth. Tokens are stored securely and never shown here.
              </p>
              {(data.configuration?.email as string | undefined) ? (
                <p className="text-sm">
                  Connected as <span className="font-medium">{String(data.configuration.email)}</span>
                </p>
              ) : null}
              {type === "GOOGLE_SHEETS" ? (
                <div>
                  <Label>Spreadsheet ID (optional)</Label>
                  <Input
                    value={String(config.spreadsheetId ?? "")}
                    onChange={setConfigField("spreadsheetId")}
                    placeholder="Google Sheets document ID"
                  />
                  <PermissionGate itemKey="admin.integrations" mode="write">
                    <Button
                      type="button"
                      className="mt-3"
                      variant="outline"
                      disabled={upsert.isPending}
                      onClick={async () => {
                        try {
                          await upsert.mutateAsync({
                            configuration: { spreadsheetId: config.spreadsheetId },
                            isEnabled,
                          });
                          setMessage("Spreadsheet settings saved.");
                        } catch (err: unknown) {
                          setErrorMsg((err as Error)?.message || "Save failed");
                        }
                      }}
                    >
                      {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save spreadsheet ID
                    </Button>
                  </PermissionGate>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {data.status === "CONNECTED" ? (
                  <PermissionGate itemKey="admin.integrations" mode="write">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disconnectGoogle.isPending || disconnect.isPending}
                      onClick={handleDisconnect}
                    >
                      {(disconnectGoogle.isPending || disconnect.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      )}
                      <Unplug className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </PermissionGate>
                ) : (
                  <PermissionGate itemKey="admin.integrations" mode="write">
                    <Button
                      type="button"
                      className="bg-[#2563EB] text-white"
                      disabled={connectGoogle.isPending}
                      onClick={() => connectGoogle.mutate()}
                    >
                      {connectGoogle.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-1" />
                      )}
                      Connect with Google
                    </Button>
                  </PermissionGate>
                )}
                <Button type="button" variant="outline" disabled={test.isPending} onClick={handleTest}>
                  {test.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Test connection
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {!isAiCalling && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enabled</Label>
                    <p className="text-xs text-text-secondary">Disable to stop using this integration.</p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>
              )}

              {type === "AI" && (
                <>
                  <div>
                    <Label>Model</Label>
                    <Input
                      value={String(config.model ?? "gpt-4o-mini")}
                      onChange={setConfigField("model")}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  <div>
                    <Label>Base URL (optional)</Label>
                    <Input
                      value={String(config.baseUrl ?? "")}
                      onChange={setConfigField("baseUrl")}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <SecretField
                    label="API Key"
                    configured={hasCredential && !replaceSecrets.apiKey}
                    value={secrets.apiKey ?? ""}
                    onChange={setSecret("apiKey")}
                    onReplace={() => markReplace("apiKey")}
                    replacing={Boolean(replaceSecrets.apiKey)}
                  />
                </>
              )}

              {type === "WHATSAPP" && (
                <>
                  <div>
                    <Label>Campaign name (optional)</Label>
                    <Input
                      value={String(config.campaignName ?? "")}
                      onChange={setConfigField("campaignName")}
                    />
                  </div>
                  <div>
                    <Label>Phone number (optional)</Label>
                    <Input
                      value={String(config.phoneNumber ?? "")}
                      onChange={setConfigField("phoneNumber")}
                    />
                  </div>
                  <SecretField
                    label="AiSensy API Key"
                    configured={hasCredential && !replaceSecrets.apiKey}
                    value={secrets.apiKey ?? ""}
                    onChange={setSecret("apiKey")}
                    onReplace={() => markReplace("apiKey")}
                    replacing={Boolean(replaceSecrets.apiKey)}
                  />
                </>
              )}

              {type === "AI_CALLING" && (
                <>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">Institute dialer settings</p>
                    <p className="text-xs text-text-secondary">
                      Saved to AI Calling config. Credential overrides below are optional when using
                      shared platform keys.
                    </p>
                    {aiConfigRes?.data?.resolved && (
                      <p className="text-xs text-slate-600">
                        Resolved source: <strong>{aiConfigRes.data.resolved.source}</strong>
                        {aiConfigRes.data.resolved.hasTelephony
                          ? " · telephony ready"
                          : " · telephony not configured"}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Label>AI Calling enabled</Label>
                      <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                    </div>
                    <div>
                      <Label>Voice agent</Label>
                      <select
                        value={aiAgentId}
                        onChange={(e) => setAiAgentId(e.target.value)}
                        className="w-full h-10 px-3 border rounded-md text-sm bg-background"
                      >
                        <option value="">Select agent…</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>From number</Label>
                      <Input
                        value={aiFromNumber}
                        onChange={(e) => setAiFromNumber(e.target.value)}
                        placeholder="+91…"
                      />
                    </div>
                    <div>
                      <Label>Calling script</Label>
                      <Textarea
                        value={aiScript}
                        onChange={(e) => setAiScript(e.target.value)}
                        rows={4}
                        placeholder="Script / prompt for the voice agent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Hours start (HH:MM)</Label>
                        <Input
                          value={aiHoursStart}
                          onChange={(e) => setAiHoursStart(e.target.value)}
                          placeholder="09:00"
                        />
                      </div>
                      <div>
                        <Label>Hours end (HH:MM)</Label>
                        <Input
                          value={aiHoursEnd}
                          onChange={(e) => setAiHoursEnd(e.target.value)}
                          placeholder="20:00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Calling days</Label>
                      <div className="flex flex-wrap gap-2">
                        {CALLING_DAY_OPTIONS.map((d) => {
                          const on = aiCallingDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => toggleCallingDay(d.value)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                on
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-background text-foreground border-border"
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Daily call limit</Label>
                        <Input
                          type="number"
                          min={1}
                          value={aiDailyLimit}
                          onChange={(e) => setAiDailyLimit(e.target.value)}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <Label>Max attempts / lead</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={aiMaxAttempts}
                          onChange={(e) => setAiMaxAttempts(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Retry delay (min)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={aiRetryDelay}
                          onChange={(e) => setAiRetryDelay(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Base URL override (optional)</Label>
                    <Input
                      value={String(config.baseUrl ?? "")}
                      onChange={setConfigField("baseUrl")}
                    />
                  </div>
                  <SecretField
                    label="Sarvam API Key (institute override)"
                    configured={hasCredential && !replaceSecrets.apiKey}
                    value={secrets.apiKey ?? ""}
                    onChange={setSecret("apiKey")}
                    onReplace={() => markReplace("apiKey")}
                    replacing={Boolean(replaceSecrets.apiKey)}
                  />
                  <SecretField
                    label="Telephony API Key (institute override)"
                    configured={Boolean(data.maskedCredential) && !replaceSecrets.telephonyApiKey}
                    value={secrets.telephonyApiKey ?? ""}
                    onChange={setSecret("telephonyApiKey")}
                    onReplace={() => markReplace("telephonyApiKey")}
                    replacing={Boolean(replaceSecrets.telephonyApiKey)}
                  />
                </>
              )}

              {type === "PAYMENT" && (
                <>
                  <div>
                    <Label>Key ID</Label>
                    <Input
                      value={String(config.keyId ?? "")}
                      onChange={setConfigField("keyId")}
                      placeholder="rzp_live_..."
                    />
                  </div>
                  <SecretField
                    label="Key Secret"
                    configured={hasCredential && !replaceSecrets.keySecret}
                    value={secrets.keySecret ?? ""}
                    onChange={setSecret("keySecret")}
                    onReplace={() => markReplace("keySecret")}
                    replacing={Boolean(replaceSecrets.keySecret)}
                  />
                  <SecretField
                    label="Webhook Secret (optional)"
                    configured={false}
                    value={secrets.webhookSecret ?? ""}
                    onChange={setSecret("webhookSecret")}
                    onReplace={() => markReplace("webhookSecret")}
                    replacing
                  />
                </>
              )}

              {type === "EMAIL" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Host</Label>
                      <Input
                        value={String(config.host ?? "")}
                        onChange={setConfigField("host")}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={String(config.port ?? 587)}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            port: Number(e.target.value) || 587,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={String(config.username ?? "")}
                      onChange={setConfigField("username")}
                    />
                  </div>
                  <SecretField
                    label="Password"
                    configured={hasCredential && !replaceSecrets.password}
                    value={secrets.password ?? ""}
                    onChange={setSecret("password")}
                    onReplace={() => markReplace("password")}
                    replacing={Boolean(replaceSecrets.password)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>From name</Label>
                      <Input
                        value={String(config.fromName ?? "")}
                        onChange={setConfigField("fromName")}
                      />
                    </div>
                    <div>
                      <Label>From email</Label>
                      <Input
                        type="email"
                        value={String(config.fromEmail ?? "")}
                        onChange={setConfigField("fromEmail")}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Use TLS / secure</Label>
                    <Switch
                      checked={Boolean(config.secure)}
                      onCheckedChange={(v) => setConfig((prev) => ({ ...prev, secure: v }))}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <PermissionGate itemKey="admin.integrations" mode="write">
                <Button
                  type="submit"
                  disabled={upsert.isPending || updateAiConfig.isPending}
                  className="bg-[#2563EB] text-white"
                >
                  {upsert.isPending || updateAiConfig.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
                <Button type="button" variant="outline" disabled={test.isPending} onClick={handleTest}>
                  {test.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Test connection
                </Button>
                {data.isConfigured ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disconnect.isPending}
                    onClick={handleDisconnect}
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-1" />
                    )}
                    Disconnect
                  </Button>
                ) : null}
                </PermissionGate>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
