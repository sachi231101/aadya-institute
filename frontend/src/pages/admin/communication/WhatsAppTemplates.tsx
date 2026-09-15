import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { whatsappApi, type WhatsAppTemplate } from "@/services/whatsapp.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export const WhatsAppTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: () => whatsappApi.listTemplates(),
  });

  const templates: WhatsAppTemplate[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      whatsappApi.toggleTemplateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => whatsappApi.syncTemplates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "automations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "readiness"] });
    },
  });

  const syncErrorMessage = (() => {
    const err = syncMutation.error as
      | Error
      | { response?: { data?: { message?: string } } }
      | null;
    if (!err) return null;
    if (typeof err === "object" && "response" in err) {
      return err.response?.data?.message || (err as Error).message || "Sync failed";
    }
    return (err as Error).message || "Sync failed";
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Templates are created and approved in MSG91. Sync them here, then enable a template when
          you want to use it from Automations. Expand a row to read the message body.
        </p>
        <div className="flex gap-2">
          <PermissionGate itemKey="communication.whatsapp" mode="write">
            <Button
              className="bg-primary text-white"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync from MSG91
            </Button>
          </PermissionGate>
        </div>
      </div>

      {syncMutation.isSuccess && (
        <p className="text-xs text-emerald-700">
          Synced {(syncMutation.data as { data?: { created?: number; updated?: number } })?.data?.created ?? 0}{" "}
          new, updated{" "}
          {(syncMutation.data as { data?: { created?: number; updated?: number } })?.data?.updated ?? 0}.
        </p>
      )}
      {syncMutation.isError && (
        <p className="text-xs text-red-600">{syncErrorMessage}</p>
      )}

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
                  <TableHead className="w-8" />
                  <TableHead>Internal Name</TableHead>
                  <TableHead>MSG91 Template</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No templates yet. Create and approve them in MSG91, then click Sync from MSG91.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => {
                    const expanded = expandedId === t.id;
                    const preview = t.body?.trim()
                      ? t.body.length > 80
                        ? `${t.body.slice(0, 80)}…`
                        : t.body
                      : null;
                    return (
                      <React.Fragment key={t.id}>
                        <TableRow>
                          <TableCell className="pr-0">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              aria-label={expanded ? "Hide message" : "Show message"}
                              onClick={() => setExpandedId(expanded ? null : t.id)}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="font-mono text-xs">{t.providerTemplateName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                            {preview || (
                              <span className="italic">
                                No body yet — re-sync from MSG91
                              </span>
                            )}
                          </TableCell>
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
                          <TableCell className="text-right">
                            <PermissionGate itemKey="communication.whatsapp" mode="write">
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
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <p className="text-xs font-semibold text-foreground mb-1.5">
                                Template message
                              </p>
                              {t.body?.trim() ? (
                                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                                  {t.body}
                                </pre>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Message text was not returned by MSG91 for this template. Open it
                                  in the MSG91 dashboard, or re-sync after MSG91 includes body content
                                  in the API.
                                </p>
                              )}
                              {Array.isArray(t.variables) && t.variables.length > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-2">
                                  Variables:{" "}
                                  <span className="font-mono">{t.variables.join(", ")}</span>
                                </p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
