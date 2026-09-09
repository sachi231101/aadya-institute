import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  useAiCallingPlatform,
  useAiCallingUsage,
  useCreatePlatformAgent,
  useDeletePlatformAgent,
  usePlatformAgents,
  useUpdateAiCallingPlatform,
  useUpdatePlatformAgent,
} from "@/hooks/useAiCalling";
import type { AiCallingAgent } from "@/services/ai-calling.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AiCallingPlatform: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  const {
    data: platformRes,
    isLoading: platformLoading,
    isError: platformError,
    refetch: refetchPlatform,
  } = useAiCallingPlatform(isSuperAdmin);
  const {
    data: agentsRes,
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = usePlatformAgents(isSuperAdmin);
  const { data: usageRes, isLoading: usageLoading, refetch: refetchUsage } = useAiCallingUsage({
    days: 14,
  });

  const updatePlatform = useUpdateAiCallingPlatform();
  const createAgent = useCreatePlatformAgent();
  const updateAgent = useUpdatePlatformAgent();
  const deleteAgent = useDeletePlatformAgent();

  const platform = platformRes?.data;
  const agents: AiCallingAgent[] = agentsRes?.data || [];
  const usage = usageRes?.data;

  const [telephonyBaseUrl, setTelephonyBaseUrl] = useState("");
  const [defaultConcurrency, setDefaultConcurrency] = useState(3);
  const [telephonyApiKey, setTelephonyApiKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [replaceCredentials, setReplaceCredentials] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiCallingAgent | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentProvider, setAgentProvider] = useState("SARVAM");
  const [agentAppId, setAgentAppId] = useState("");
  const [agentScript, setAgentScript] = useState("");
  const [agentActive, setAgentActive] = useState(true);

  useEffect(() => {
    if (!platform) return;
    setTelephonyBaseUrl(platform.telephonyBaseUrl || "");
    setDefaultConcurrency(platform.defaultConcurrency ?? 3);
    setTelephonyApiKey("");
    setApiKey("");
    setWebhookSecret("");
    setReplaceCredentials(false);
  }, [platform]);

  if (!isSuperAdmin) {
    return (
      <div className="space-y-4 py-12 text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold">Super Admin only</h2>
        <p className="text-sm text-text-secondary">
          Platform AI Calling credentials and the agent catalog are managed by Super Admins.
        </p>
      </div>
    );
  }

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    try {
      const credentials: Record<string, string> = {};
      if (telephonyApiKey.trim()) credentials.telephonyApiKey = telephonyApiKey.trim();
      if (apiKey.trim()) credentials.apiKey = apiKey.trim();
      if (webhookSecret.trim()) credentials.webhookSecret = webhookSecret.trim();

      await updatePlatform.mutateAsync({
        telephonyBaseUrl: telephonyBaseUrl.trim() || null,
        defaultConcurrency,
        ...(Object.keys(credentials).length ? { credentials } : {}),
        ...(replaceCredentials ? { replaceCredentials: true } : {}),
        ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
      });
      setMessage("Platform settings saved.");
      setTelephonyApiKey("");
      setApiKey("");
      setWebhookSecret("");
      setReplaceCredentials(false);
      refetchPlatform();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save platform settings";
      setErrorMsg(msg);
    }
  };

  const openCreateAgent = () => {
    setEditingAgent(null);
    setAgentName("");
    setAgentProvider("SARVAM");
    setAgentAppId("");
    setAgentScript("");
    setAgentActive(true);
    setShowAgentModal(true);
  };

  const openEditAgent = (agent: AiCallingAgent) => {
    setEditingAgent(agent);
    setAgentName(agent.name);
    setAgentProvider(agent.provider || "SARVAM");
    setAgentAppId(agent.providerAppId || "");
    setAgentScript(agent.defaultScript || "");
    setAgentActive(agent.isActive);
    setShowAgentModal(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    try {
      const payload = {
        name: agentName.trim(),
        provider: agentProvider.trim() || "SARVAM",
        providerAppId: agentAppId.trim() || null,
        defaultScript: agentScript.trim() || null,
        isActive: agentActive,
      };
      if (editingAgent) {
        await updateAgent.mutateAsync({ id: editingAgent.id, data: payload });
        setMessage("Agent updated.");
      } else {
        await createAgent.mutateAsync(payload);
        setMessage("Agent created.");
      }
      setShowAgentModal(false);
      refetchAgents();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save agent";
      setErrorMsg(msg);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Delete this agent from the platform catalog?")) return;
    setMessage(null);
    setErrorMsg(null);
    try {
      await deleteAgent.mutateAsync(id);
      setMessage("Agent deleted.");
      refetchAgents();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete agent";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Bot className="w-6 h-6" /> AI Calling Platform
        </h2>
        <p className="text-sm text-text-secondary">
          Shared telephony credentials, agent catalog, and institute usage overview.
        </p>
      </div>

      {message ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
        </p>
      ) : null}
      {errorMsg ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
        </p>
      ) : null}

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Phone className="w-5 h-5" /> Platform telephony
          </h3>
          {platformLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : platformError ? (
            <div className="text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> Failed to load platform settings.{" "}
              <Button variant="link" onClick={() => refetchPlatform()}>
                Retry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSavePlatform} className="space-y-4 max-w-xl">
              <div>
                <Label>Telephony base URL</Label>
                <Input
                  value={telephonyBaseUrl}
                  onChange={(e) => setTelephonyBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
              <div>
                <Label>Default concurrency</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={defaultConcurrency}
                  onChange={(e) => setDefaultConcurrency(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Telephony API key</Label>
                {platform?.maskedCredential && !replaceCredentials ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1">
                    <CheckCircle2 className="h-3 w-3" /> Configured ({platform.maskedCredential})
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setReplaceCredentials(true)}
                    >
                      Replace
                    </Button>
                  </div>
                ) : null}
                {(replaceCredentials || !platform?.maskedCredential) && (
                  <Input
                    type="password"
                    value={telephonyApiKey}
                    onChange={(e) => setTelephonyApiKey(e.target.value)}
                    placeholder="Enter telephony API key"
                    autoComplete="new-password"
                  />
                )}
              </div>
              <div>
                <Label>Sarvam / provider API key (optional)</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Optional provider API key"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label>Webhook secret</Label>
                {platform?.webhookConfigured ? (
                  <p className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Configured{" "}
                    {platform.maskedWebhookSecret ? `(${platform.maskedWebhookSecret})` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mb-1">Not configured</p>
                )}
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Enter new webhook secret to update"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={updatePlatform.isPending} className="bg-[#2563EB] text-white">
                {updatePlatform.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save platform settings
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold flex items-center gap-2">
              <Bot className="w-5 h-5" /> Agent catalog
            </h3>
            <Button type="button" size="sm" onClick={openCreateAgent} className="bg-[#2563EB] text-white">
              <Plus className="h-4 w-4 mr-1" /> Add agent
            </Button>
          </div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading agents…
                    </TableCell>
                  </TableRow>
                ) : agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-text-secondary">
                      No agents yet. Create one for institutes to select.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.provider}</TableCell>
                      <TableCell className="font-mono text-xs">{agent.providerAppId || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditAgent(agent)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-rose-600"
                          onClick={() => handleDeleteAgent(agent.id)}
                          disabled={deleteAgent.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Usage (current institute, last 14 days)</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => refetchUsage()}>
              Refresh
            </Button>
          </div>
          <p className="text-xs text-text-secondary">
            Cross-institute usage rollup is not exposed by the API yet — this shows usage for the
            institute on your Super Admin session JWT.
          </p>
          {usageLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : usage ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Initiated</p>
                <p className="text-2xl font-extrabold">{usage.totals.initiatedCount}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Completed</p>
                <p className="text-2xl font-extrabold">{usage.totals.completedCount}</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Duration (sec)</p>
                <p className="text-2xl font-extrabold">{usage.totals.durationSeconds}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No usage data.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit agent" : "Add agent"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAgent} className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input required value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Input value={agentProvider} onChange={(e) => setAgentProvider(e.target.value)} />
              </div>
              <div>
                <Label>Provider app ID</Label>
                <Input value={agentAppId} onChange={(e) => setAgentAppId(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Default script</Label>
              <Textarea
                value={agentScript}
                onChange={(e) => setAgentScript(e.target.value)}
                rows={4}
                placeholder="Optional default calling script"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={agentActive} onCheckedChange={setAgentActive} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAgentModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
                disabled={createAgent.isPending || updateAgent.isPending}
              >
                {(createAgent.isPending || updateAgent.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
