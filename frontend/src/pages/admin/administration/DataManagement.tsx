import React, { useState } from "react";
import {
  Database,
  Upload,
  Download,
  Trash2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import {
  useImportJobs,
  useDeletedRecords,
  useBackupStatus,
  usePreviewImport,
  useConfirmImport,
  useExportData,
  useRestoreBranch,
} from "@/hooks/useDataManagement";
import { dataManagementApi, type ImportEntityType, type ExportEntityType } from "@/services/data-management.api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth.store";

export const DataManagement: React.FC = () => {
  const { token } = useAuthStore();
  const [entityType, setEntityType] = useState<ImportEntityType>("students");
  const [exportType, setExportType] = useState<ExportEntityType>("students");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [preview, setPreview] = useState<{
    jobId: string;
    totalRows: number;
    validRows: number;
    errorRows: number;
    preview: Record<string, string>[];
    errors: Array<{ row: number; field?: string; message: string }>;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: importsData, isLoading: importsLoading, refetch: refetchImports } = useImportJobs({ limit: 20 });
  const { data: deletedData, isLoading: deletedLoading, refetch: refetchDeleted } = useDeletedRecords();
  const { data: backupData, isLoading: backupLoading, refetch: refetchBackup } = useBackupStatus();

  const previewMutation = usePreviewImport();
  const confirmMutation = useConfirmImport();
  const exportMutation = useExportData();
  const restoreMutation = useRestoreBranch();

  const importJobs = importsData?.data?.data || importsData?.data || [];
  const deletedBranches = deletedData?.data?.branches || [];
  const blockedUsers = deletedData?.data?.users || [];
  const backup = backupData?.data;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await dataManagementApi.getTemplate(entityType);
      const csv = res.data?.csv || "";
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data?.fileName || `${entityType}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Failed to download template");
    }
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      setMessage("Paste or upload CSV content first");
      return;
    }
    try {
      const res = await previewMutation.mutateAsync({ entityType, csv: csvText, fileName });
      setPreview(res.data);
      setMessage(`Preview ready: ${res.data.validRows} valid / ${res.data.errorRows} errors`);
      refetchImports();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Preview failed";
      setMessage(msg);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.jobId) return;
    try {
      const res = await confirmMutation.mutateAsync(preview.jobId);
      setMessage(`Import ${res.data?.status || "completed"}`);
      setPreview(null);
      setCsvText("");
      refetchImports();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Confirm failed";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Database className="w-6 h-6" /> Data Management
        </h2>
        <p className="text-sm text-text-secondary">
          Import, export, restore soft-deleted records, and view backup health.
        </p>
      </div>

      {message && (
        <div className="text-sm rounded-lg border border-border/50 bg-slate-50 px-3 py-2 text-text-secondary">
          {message}
        </div>
      )}

      {/* 1. Import */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as ImportEntityType);
                setPreview(null);
              }}
            >
              <option value="students">Students</option>
              <option value="leads">Leads</option>
              <option value="users">Users</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Template
            </Button>
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>
          <textarea
            className="w-full min-h-[120px] border rounded-xl p-3 text-xs font-mono"
            placeholder="Paste CSV content here..."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="bg-[#1769AA] text-white"
              size="sm"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirm}
              disabled={!preview?.jobId || confirmMutation.isPending || (preview?.validRows ?? 0) === 0}
            >
              {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm Import
            </Button>
          </div>
          {preview && (
            <div className="space-y-2 text-sm">
              <p>
                Rows: {preview.totalRows} · Valid: {preview.validRows} · Errors: {preview.errorRows}
              </p>
              {preview.errors.length > 0 && (
                <div className="text-red-600 text-xs space-y-1 max-h-28 overflow-auto">
                  {preview.errors.slice(0, 10).map((e, i) => (
                    <div key={i}>
                      Row {e.row}
                      {e.field ? ` (${e.field})` : ""}: {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2">Recent Import Jobs</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(importJobs) || importJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-text-secondary">
                      No import jobs yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  importJobs.map(
                    (job: {
                      id: string;
                      entityType: string;
                      status: string;
                      totalRows: number;
                      successRows: number;
                      errorRows: number;
                      createdAt: string;
                    }) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.entityType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {job.successRows}/{job.totalRows}
                          {job.errorRows > 0 ? ` (${job.errorRows} err)` : ""}
                        </TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Export */}
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
              className="bg-[#1769AA] text-white"
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

      {/* 3. Soft-deleted / blocked */}
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
                      <li key={b.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                        <span>
                          {b.name} <span className="text-text-secondary">({b.code})</span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreMutation.mutate(b.id)}
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

      {/* 4. Backup status */}
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
    </div>
  );
};
