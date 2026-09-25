import React, { useState } from "react";
import {
  Database,
  Download,
  Trash2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  useDeletedRecords,
  useBackupStatus,
  useExportData,
  useRestoreBranch,
} from "@/hooks/useDataManagement";
import { type ExportEntityType } from "@/services/data-management.api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";

type RestoreBranchTarget = { id: string; name: string; code: string };

/** Soft-delete mangles codes as `CODE__del__id`; show the original for UI. */
const displayBranchCode = (code: string) => code.split("__del__")[0] || code;

export const DataManagement: React.FC = () => {
  const { token } = useAuthStore();
  const [exportType, setExportType] = useState<ExportEntityType>("students");
  const [message, setMessage] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RestoreBranchTarget | null>(null);

  const { data: deletedData, isLoading: deletedLoading, refetch: refetchDeleted } = useDeletedRecords();
  const { data: backupData, isLoading: backupLoading, refetch: refetchBackup } = useBackupStatus();

  const exportMutation = useExportData();
  const restoreMutation = useRestoreBranch();

  const deletedBranches = deletedData?.data?.branches || [];
  const blockedUsers = deletedData?.data?.users || [];
  const backup = backupData?.data;

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      setMessage(`Branch "${restoreTarget.name}" restored successfully.`);
      setRestoreTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to restore branch";
      setMessage(msg);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportMutation.mutateAsync({ entityType: exportType });
      const tokenValue = res.data?.downloadToken;
      if (tokenValue && token) {
        const url = `${import.meta.env.VITE_API_URL || "/api/v1"}/data-management/export/${tokenValue}/download`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${exportType}-export.csv`;
        a.click();
        URL.revokeObjectURL(objectUrl);
        setMessage(`Exported ${res.data?.rowCount ?? 0} rows`);
      } else {
        setMessage("Export created");
      }
    } catch {
      setMessage("Export failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Database className="w-6 h-6" /> Data Management
          </span>
        }
        description="Export data, restore soft-deleted records, and view backup health."
      />

      {message && (
        <div className="text-sm rounded-lg border border-border/50 bg-slate-50 px-3 py-2 text-text-secondary">
          {message}
        </div>
      )}

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportEntityType)}
            >
              <option value="students">Students</option>
              <option value="leads">Leads</option>
              <option value="users">Users</option>
              <option value="branches">Branches</option>
            </select>
            <Button
              className="bg-primary text-white"
              size="sm"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Generate & Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Soft-deleted & Blocked
            </h3>
            <Button variant="ghost" size="sm" onClick={() => refetchDeleted()}>
              Refresh
            </Button>
          </div>
          {deletedLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Deleted Branches</h4>
                {deletedBranches.length === 0 ? (
                  <p className="text-sm text-text-secondary">None</p>
                ) : (
                  <ul className="space-y-2">
                    {deletedBranches.map((b: { id: string; name: string; code: string }) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm min-w-0"
                      >
                        <span className="min-w-0 flex-1 break-words">
                          <span className="font-medium">{b.name}</span>{" "}
                          <span className="text-text-secondary break-all">
                            ({displayBranchCode(b.code)})
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => setRestoreTarget(b)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Blocked Users</h4>
                {blockedUsers.length === 0 ? (
                  <p className="text-sm text-text-secondary">None</p>
                ) : (
                  <ul className="space-y-2">
                    {blockedUsers.map((u: { id: string; name: string; email?: string }) => (
                      <li key={u.id} className="border rounded-lg px-3 py-2 text-sm">
                        {u.name}
                        {u.email ? <span className="text-text-secondary"> · {u.email}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Backup Status
            </h3>
            <Button variant="ghost" size="sm" onClick={() => refetchBackup()}>
              Refresh
            </Button>
          </div>
          {backupLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : backup ? (
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-secondary">Status</p>
                <Badge variant="outline">{backup.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Last Successful</p>
                <p className="font-medium">
                  {backup.lastSuccessfulAt
                    ? new Date(backup.lastSuccessfulAt).toLocaleString("en-IN")
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Message</p>
                <p className="font-medium">{backup.message || "—"}</p>
              </div>
            </div>
          ) : (
            <div className="text-red-600 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> Unable to load backup status
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open && !restoreMutation.isPending) setRestoreTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Restore
            </DialogTitle>
            <DialogDescription>
              Restore branch <strong>"{restoreTarget?.name}"</strong>
              {restoreTarget?.code ? (
                <>
                  {" "}
                  (<span className="font-mono text-xs">{displayBranchCode(restoreTarget.code)}</span>)
                </>
              ) : null}
              ? It will become active again and available across the application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={restoreMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-white"
              onClick={handleConfirmRestore}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
