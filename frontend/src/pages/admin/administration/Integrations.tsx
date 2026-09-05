import React from "react";
import { Plug, Loader2, AlertCircle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { whatsappApi } from "@/services/whatsapp.api";
import { useEmailTemplates } from "@/hooks/useEmail";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GoogleStatus {
  isConnected: boolean;
  email?: string | null;
  status: "CONNECTED" | "REAUTH_REQUIRED" | "DISCONNECTED" | "EXPIRED";
  scopes?: string[];
  connectedAt?: string | null;
}

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={
        connected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }
    >
      {connected ? (
        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
      ) : (
        <XCircle className="h-3 w-3 mr-1 inline" />
      )}
      {label || (connected ? "Connected" : "Not Connected")}
    </Badge>
  );
}

export const Integrations: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: googleResponse,
    isLoading: googleLoading,
    isError: googleError,
    refetch: refetchGoogle,
  } = useQuery({
    queryKey: ["integrations", "google", "status"],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: GoogleStatus }>(
        "/integrations/google/status"
      );
      return response.data.data;
    },
    retry: 1,
  });

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get<{ success: boolean; data: { url?: string; authUrl?: string; connectUrl?: string } }>(
        "/integrations/google/connect"
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      const url = data?.url || data?.authUrl || data?.connectUrl;
      if (url) window.location.href = url;
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      await api.post("/integrations/google/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "google"] });
    },
  });

  const {
    data: whatsappResponse,
    isLoading: whatsappLoading,
    isError: whatsappError,
    refetch: refetchWhatsapp,
  } = useQuery({
    queryKey: ["integrations", "whatsapp", "templates"],
    queryFn: () => whatsappApi.listTemplates(),
    retry: 1,
  });

  const {
    data: emailResponse,
    isLoading: emailLoading,
    isError: emailError,
    refetch: refetchEmail,
  } = useEmailTemplates({ limit: 1 });

  const whatsappTemplates = whatsappResponse?.data || [];
  const whatsappConnected = !whatsappError && Array.isArray(whatsappTemplates);
  const emailTemplates = emailResponse?.data?.data || emailResponse?.data || [];
  const emailConfigured = !emailError && Array.isArray(emailTemplates);

  const sarvamConfigured = Boolean(import.meta.env.VITE_SARVAM_CONFIGURED === "true");

  const integrations = [
    {
      id: "google",
      name: "Google Workspace",
      module: "Schedule & Recordings",
      loading: googleLoading,
      error: googleError,
      refetch: refetchGoogle,
      connected: googleResponse?.isConnected ?? false,
      statusLabel: googleResponse?.status || "DISCONNECTED",
      detail: googleResponse?.email
        ? `Connected as ${googleResponse.email}`
        : googleResponse?.isConnected
          ? "Google Meet & Drive integration active"
          : "Connect Google account for Meet and recordings",
      actions: (
        <div className="flex gap-2">
          {googleResponse?.isConnected ? (
            <Button
              size="sm"
              variant="outline"
              disabled={disconnectGoogleMutation.isPending}
              onClick={() => disconnectGoogleMutation.mutate()}
            >
              {disconnectGoogleMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-[#1769AA] text-white"
              disabled={connectGoogleMutation.isPending}
              onClick={() => connectGoogleMutation.mutate()}
            >
              {connectGoogleMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <ExternalLink className="h-3 w-3 mr-1" />
              )}
              Connect
            </Button>
          )}
        </div>
      ),
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business API",
      module: "Communication",
      loading: whatsappLoading,
      error: whatsappError,
      refetch: refetchWhatsapp,
      connected: whatsappConnected,
      statusLabel: whatsappConnected ? "Connected" : "Unavailable",
      detail: whatsappConnected
        ? `${whatsappTemplates.length} template(s) available`
        : "Unable to reach WhatsApp template API",
      actions: null,
    },
    {
      id: "email",
      name: "Email SMTP",
      module: "Communication",
      loading: emailLoading,
      error: emailError,
      refetch: refetchEmail,
      connected: emailConfigured,
      statusLabel: emailConfigured ? "Configured" : "Unavailable",
      detail: emailConfigured
        ? `${Array.isArray(emailTemplates) ? emailTemplates.length : 0} email template(s) loaded`
        : "Email template service unavailable",
      actions: null,
    },
    {
      id: "sarvam",
      name: "Sarvam AI Calling",
      module: "Leads & AI",
      loading: false,
      error: false,
      refetch: () => {},
      connected: sarvamConfigured,
      statusLabel: sarvamConfigured ? "Configured" : "Not Configured",
      detail: sarvamConfigured
        ? "Sarvam voice agent enabled via server configuration"
        : "Configured on the server — no client secrets are shown here",
      actions: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Integrations</h2>
        <p className="text-sm text-text-secondary">
          Connection status for external services. API keys and secrets are never displayed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((i) => (
          <Card key={i.id} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-border/60 flex items-center justify-center shrink-0">
                    <Plug className="w-5 h-5 text-[#1769AA]" />
                  </div>
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-text-secondary">{i.module}</p>
                    <p className="text-xs text-text-secondary mt-2">{i.detail}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {i.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                  ) : i.error ? (
                    <>
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1 inline" />
                        Error
                      </Badge>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => i.refetch()}
                      >
                        Retry
                      </Button>
                    </>
                  ) : (
                    <StatusBadge connected={i.connected} label={i.statusLabel} />
                  )}
                </div>
              </div>
              {i.actions}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
