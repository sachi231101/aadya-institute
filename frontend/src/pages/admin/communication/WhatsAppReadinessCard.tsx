import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { whatsappApi, type WhatsAppReadiness } from "@/services/whatsapp.api";
import { integrationsApi } from "@/services/integrations.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPortalBasePath } from "@/utils/portal-path";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { cn } from "@/utils";

type CheckRow = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  action?: { label: string; to: string };
};

const StatusIcon = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
  );

function buildChecks(data: WhatsAppReadiness, hubBase: string, integrationsHref: string): CheckRow[] {
  return [
    {
      id: "provider",
      label: "MSG91 credentials",
      ok: data.provider.configured,
      detail: data.provider.configured
        ? `Configured${data.provider.integratedNumberMasked ? ` (${data.provider.integratedNumberMasked})` : ""} · ${data.provider.status}`
        : "Auth key or integrated WhatsApp number missing",
      action: { label: "Open Integrations", to: integrationsHref },
    },
    {
      id: "redis",
      label: "Redis",
      ok: data.redis.ok,
      detail: data.redis.message,
    },
    {
      id: "worker",
      label: "WhatsApp worker",
      ok: data.worker.online,
      detail: data.worker.message,
    },
    {
      id: "global",
      label: "Global automation",
      ok: data.globalEnabled,
      detail: data.globalEnabled ? "Master switch is ON" : "Master switch is OFF",
      action: { label: "Automations", to: `${hubBase}/automations` },
    },
    {
      id: "templates",
      label: "Active templates",
      ok: data.templates.activeCount > 0,
      detail: `${data.templates.activeCount} active of ${data.templates.total} synced`,
      action: { label: "Templates", to: `${hubBase}/templates` },
    },
    {
      id: "automations",
      label: "Ready automations",
      ok: data.automations.readyCount > 0,
      detail: `${data.automations.readyCount} ready · ${data.automations.enabledCount} enabled · ${data.automations.catalogCount} catalog`,
      action: { label: "Automations", to: `${hubBase}/automations` },
    },
  ];
}

export function WhatsAppReadinessCard() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const portalBase = getPortalBasePath(pathname);
  const hubBase =
    pathname.replace(/\/(automations|templates|history)\/?$/, "") ||
    `${portalBase}/communication/whatsapp`;
  const integrationsHref = `${portalBase}/administration/integrations/whatsapp`;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["whatsapp", "readiness"],
    queryFn: async () => {
      const res = await whatsappApi.getReadiness();
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const verifyMutation = useMutation({
    mutationFn: () => integrationsApi.test("WHATSAPP"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "readiness"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const checks = data ? buildChecks(data, hubBase, integrationsHref) : [];
  const verifyMessage = verifyMutation.data?.message;
  const verifyOk = verifyMutation.data?.success;

  return (
    <Card className="border-border/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Setup readiness
              {data && (
                <Badge variant={data.overallReady ? "success" : "outline"}>
                  {data.overallReady ? "Ready" : "Needs attention"}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Checks MSG91, Redis, worker, templates, and automations before sending to students.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Refresh
            </Button>
            <PermissionGate itemKey="communication.whatsapp" mode="write">
              <Button
                size="sm"
                variant="secondary"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate()}
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plug className="h-3.5 w-3.5 mr-1.5" />
                )}
                Verify MSG91
              </Button>
            </PermissionGate>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading readiness…
          </p>
        ) : isError ? (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed to load readiness.{" "}
            <button type="button" className="underline" onClick={() => refetch()}>
              Retry
            </button>
          </p>
        ) : (
          <>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checks.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                    row.ok ? "border-border/60 bg-background" : "border-amber-200/80 bg-amber-50/40"
                  )}
                >
                  <StatusIcon ok={row.ok} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground leading-tight">{row.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
                    {row.action && !row.ok && (
                      <Link
                        to={row.action.to}
                        className="text-xs font-medium text-primary hover:underline mt-1 inline-block"
                      >
                        {row.action.label}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {data && data.blockingIssues.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-amber-900">Blocking issues</p>
                <ul className="list-disc pl-4 text-xs text-amber-900/90 space-y-0.5">
                  {data.blockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                {!data.worker.online && (
                  <p className="text-[11px] text-amber-800/80 pt-1 font-mono">
                    backend → npm run worker
                  </p>
                )}
              </div>
            )}

            {verifyMutation.isSuccess && verifyMessage && (
              <p
                className={cn(
                  "text-xs",
                  verifyOk ? "text-emerald-700" : "text-red-600"
                )}
              >
                {verifyOk ? "MSG91 verify: " : "MSG91 verify failed: "}
                {verifyMessage}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
