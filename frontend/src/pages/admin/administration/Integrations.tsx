import React from "react";
import { Link } from "react-router-dom";
import {
  Plug,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIntegrationsCatalog } from "@/hooks/useIntegrations";
import type { IntegrationStatus } from "@/services/integrations.api";
import { ROUTES } from "@/constants/routes";

const STATUS_STYLES: Record<
  IntegrationStatus,
  { className: string; icon: React.ReactNode }
> = {
  CONNECTED: {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3 mr-1 inline" />,
  },
  CONFIGURED: {
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <CheckCircle2 className="h-3 w-3 mr-1 inline" />,
  },
  ERROR: {
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <AlertCircle className="h-3 w-3 mr-1 inline" />,
  },
  DISCONNECTED: {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <XCircle className="h-3 w-3 mr-1 inline" />,
  },
  NOT_CONFIGURED: {
    className: "bg-slate-50 text-slate-600 border-slate-200",
    icon: <XCircle className="h-3 w-3 mr-1 inline" />,
  },
};

function formatStatus(status: IntegrationStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export const Integrations: React.FC = () => {
  const { data, isLoading, isError, refetch } = useIntegrationsCatalog();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load integrations.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const cards = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Integrations</h2>
        <p className="text-sm text-text-secondary">
          Configure external services for your institute. API keys and secrets are never displayed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((item) => {
          const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.NOT_CONFIGURED;
          const detailPath = `${ROUTES.ADMIN.ADMINISTRATION.INTEGRATIONS}/${item.type.toLowerCase()}`;
          const actionLabel =
            item.status === "NOT_CONFIGURED"
              ? "Configure"
              : item.type.startsWith("GOOGLE") && item.status !== "CONNECTED"
                ? "Connect"
                : "Manage";

          return (
            <Card key={item.type} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-border/60 flex items-center justify-center shrink-0">
                      <Plug className="w-5 h-5 text-[#1769AA]" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-text-secondary mt-1">{item.description}</p>
                      {item.maskedCredential ? (
                        <p className="text-xs text-text-secondary mt-2 font-mono">
                          {item.maskedCredential}
                        </p>
                      ) : null}
                      {item.lastError && item.status === "ERROR" ? (
                        <p className="text-xs text-red-600 mt-2 line-clamp-2">{item.lastError}</p>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant="outline" className={style.className}>
                    {style.icon}
                    {formatStatus(item.status)}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={detailPath}>
                      <Settings2 className="h-3 w-3 mr-1" />
                      {actionLabel}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
