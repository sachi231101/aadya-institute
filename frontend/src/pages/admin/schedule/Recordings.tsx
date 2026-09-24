import React, { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Video,
  Play,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
  Ban,
  HardDrive,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecordings, useDeleteRecording, useExpireRecording, useRecordingAccess, useSyncRecording } from "@/hooks/useRecordings";
import { useBatches } from "@/hooks/useBatches";
import type { Recording } from "@/services/recordings.api";
import { ROUTES } from "@/constants/routes";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { isDirectVideoUrl, isGoogleDriveViewerUrl } from "@/utils/recording-playback";

const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatRecordingDuration = (minutes?: number | null) => {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const mins = Math.max(0, Math.round(Number(minutes)));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    case "FAILED":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25";
    case "PROCESSING":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
    case "EXPIRED":
    case "DELETED":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const Recordings: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState(
    () => searchParams.get("batchId") || "ALL"
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [playTarget, setPlayTarget] = useState<Recording | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const { batches } = useBatches();

  const classesPath = location.pathname.startsWith("/center")
    ? "/center/schedule/classes"
    : ROUTES.ADMIN.SCHEDULE.CLASSES;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      ...(statusFilter !== "ALL" ? { recordingStatus: statusFilter } : {}),
      ...(batchFilter !== "ALL" ? { batchId: batchFilter } : {}),
    }),
    [page, limit, statusFilter, batchFilter]
  );

  const { data: recordingsResponse, isLoading, isError, refetch } = useRecordings(queryParams);
  const deleteMutation = useDeleteRecording();
  const syncMutation = useSyncRecording();
  const expireMutation = useExpireRecording();
  const accessMutation = useRecordingAccess();

  const recordings: Recording[] = recordingsResponse?.data || [];
  const meta = recordingsResponse?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const getStatus = (rec: Recording) =>
    (rec as Recording & { recordingStatus?: string }).recordingStatus || rec.status;

  const filteredRecordings = useMemo(() => {
    if (!search.trim()) return recordings;
    const q = search.toLowerCase();
    return recordings.filter((rec) => {
      const title = rec.classSession?.title || "";
      const batch = rec.classSession?.batch?.name || rec.classSession?.batch?.code || "";
      const faculty = rec.classSession?.faculty?.user?.name || "";
      return (
        title.toLowerCase().includes(q) ||
        batch.toLowerCase().includes(q) ||
        faculty.toLowerCase().includes(q)
      );
    });
  }, [recordings, search]);

  const availableCount = recordings.filter((r) => getStatus(r) === "AVAILABLE").length;
  const expiringSoonCount = recordings.filter((r) => getDaysRemaining(r.expiresAt) <= 7).length;

  const metricItems = [
    { label: "Total", value: isLoading ? "—" : meta.total },
    { label: "Available", value: isLoading ? "—" : availableCount },
    { label: "Expiring ≤7 days", value: isLoading ? "—" : expiringSoonCount },
  ];

  const handlePlay = async (rec: Recording) => {
    setPlayTarget(rec);
    setPlaybackUrl(null);
    setPlayError(null);
    try {
      const res = await accessMutation.mutateAsync(rec.id);
      const url = res?.data?.playbackUrl;
      if (!url) {
        setPlayError("No playback URL available for this recording.");
        return;
      }
      setPlaybackUrl(url);
      if (isGoogleDriveViewerUrl(url) || !isDirectVideoUrl(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      setPlayError("Unable to load recording playback.");
    }
  };

  const handleClosePlayer = () => {
    setPlayTarget(null);
    setPlaybackUrl(null);
    setPlayError(null);
  };

  const handleDelete = async (rec: Recording) => {
    const title = rec.classSession?.title || "this recording";
    if (!window.confirm(`Delete recording for "${title}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(rec.id);
    } catch {
      alert("Failed to delete recording.");
    }
  };

  const handleSync = async (rec: Recording) => {
    try {
      await syncMutation.mutateAsync(rec.id);
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Recording sync failed. Google Workspace may need reauthorization."
      );
    }
  };

  const handleExpire = async (rec: Recording) => {
    const title = rec.classSession?.title || "this recording";
    if (!window.confirm(`Expire "${title}" now and remove its Drive file?`)) return;
    try {
      await expireMutation.mutateAsync(rec.id);
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to expire recording."
      );
    }
  };

  const selectClassName =
    "h-9 min-w-[130px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-200">
      <PageHeader
        title="Class Recordings"
        description="Google Drive recordings · 7-day retention"
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 text-muted-foreground">
            <Link to={classesPath}>Classes & Sessions</Link>
          </Button>
        }
      />

      <MetricGrid columns="grid-cols-1 sm:grid-cols-3" density="compact">
        {metricItems.map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className="border border-border bg-card shadow-none rounded-lg"
          >
            <CardContent size="compact">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search session, batch, or faculty…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm border-border"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="ALL">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="PROCESSING">Processing</option>
          <option value="EXPIRED">Expired</option>
          <option value="DELETED">Deleted</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          value={batchFilter}
          onChange={(e) => {
            setBatchFilter(e.target.value);
            setPage(1);
          }}
          className={`${selectClassName} max-w-[16rem]`}
        >
          <option value="ALL">All batches</option>
          {batches.map((b: { id: string; name: string; code: string }) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
      </FilterToolbar>

      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4 pl-5">Class</th>
                <th className="py-3 px-3">Batch</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3">Expiration</th>
                <th className="py-3 px-3">Drive</th>
                <th className="py-3 px-3 pr-5 text-right w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs bg-card">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading recordings…</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <h3 className="text-sm font-semibold text-foreground">Unable to load recordings</h3>
                      <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
                      <Button variant="outline" size="sm" className="mt-2 h-9" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredRecordings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Video className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <h3 className="text-sm font-semibold text-foreground">No recordings found</h3>
                      <p className="text-xs text-muted-foreground">
                        Recordings appear after class sessions are recorded.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecordings.map((rec) => {
                  const daysRemaining = getDaysRemaining(rec.expiresAt);
                  const status = getStatus(rec);
                  return (
                    <tr key={rec.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-4 pl-5 align-middle">
                        <span className="font-semibold text-foreground text-xs truncate block max-w-[14rem]">
                          {rec.classSession?.title || "Class Session"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border inline-block">
                          {rec.classSession?.batch?.name || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 align-middle text-xs text-foreground font-medium">
                        {rec.classSession?.faculty?.user?.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-xs tabular-nums text-muted-foreground">
                        {formatRecordingDuration(rec.duration)}
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border inline-block ${statusBadgeClass(status)}`}
                        >
                          {status}
                        </span>
                        {rec.lastSyncError && (
                          <p
                            className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-40 truncate"
                            title={rec.lastSyncError}
                          >
                            {rec.lastSyncError}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-xs text-muted-foreground tabular-nums">
                        {new Date(rec.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-xs text-muted-foreground">
                        {status === "DELETED"
                          ? "Deleted"
                          : daysRemaining > 0
                            ? `${daysRemaining} days`
                            : "Expired"}
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                          title={rec.googleDriveFileId || undefined}
                        >
                          <HardDrive className="h-3 w-3 shrink-0" />
                          {status === "DELETED" ? "Deleted" : rec.googleDriveFileId ? "Present" : "Missing"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 pr-5 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Play recording"
                            onClick={() => handlePlay(rec)}
                            disabled={
                              status !== "AVAILABLE" ||
                              daysRemaining <= 0 ||
                              (accessMutation.isPending && playTarget?.id === rec.id)
                            }
                          >
                            {accessMutation.isPending && playTarget?.id === rec.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Play size={14} />
                            )}
                          </Button>
                          <PermissionGate itemKey="schedule.recordings" mode="write">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Retry Drive sync"
                              onClick={() => handleSync(rec)}
                              disabled={syncMutation.isPending || status === "DELETED"}
                            >
                              <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />
                            </Button>
                          </PermissionGate>
                          <PermissionGate itemKey="schedule.recordings" mode="write">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Expire and delete Drive file"
                              onClick={() => handleExpire(rec)}
                              disabled={
                                expireMutation.isPending || status === "DELETED" || status === "EXPIRED"
                              }
                            >
                              <Ban size={14} />
                            </Button>
                          </PermissionGate>
                          <PermissionGate itemKey="schedule.recordings" mode="write">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete recording"
                              onClick={() => handleDelete(rec)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!playTarget} onOpenChange={(open) => !open && handleClosePlayer()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold">
                {playTarget?.classSession?.title || "Class Recording"}
              </DialogTitle>
              <button type="button" onClick={handleClosePlayer} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="bg-black aspect-video flex items-center justify-center p-6">
            {accessMutation.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : playError ? (
              <p className="text-sm text-red-400 px-4 text-center">{playError}</p>
            ) : playbackUrl && isDirectVideoUrl(playbackUrl) ? (
              <video
                src={playbackUrl}
                controls
                autoPlay
                controlsList="nodownload"
                className="w-full h-full object-contain"
              />
            ) : playbackUrl ? (
              <div className="text-center space-y-3 max-w-sm">
                <p className="text-sm text-slate-200">
                  {isGoogleDriveViewerUrl(playbackUrl)
                    ? "This recording opens in Google Drive (view-only)."
                    : "Open the recording in a new tab to watch."}
                </p>
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary text-white"
                  onClick={() => window.open(playbackUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Open recording
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
