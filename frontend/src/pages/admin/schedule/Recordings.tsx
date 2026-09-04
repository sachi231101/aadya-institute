import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Video, Play, Clock, Search, Trash2, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecordings, useDeleteRecording, useRecordingAccess } from "@/hooks/useRecordings";
import { useBatches } from "@/hooks/useBatches";
import type { Recording } from "@/services/recordings.api";
import { ROUTES } from "@/constants/routes";

const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

export const Recordings: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [playTarget, setPlayTarget] = useState<Recording | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const { batches } = useBatches();

  useEffect(() => {
    const batchIdFromUrl = searchParams.get("batchId");
    if (batchIdFromUrl) setBatchFilter(batchIdFromUrl);
  }, [searchParams]);

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

  const { data: recordingsResponse, isLoading } = useRecordings(queryParams);
  const deleteMutation = useDeleteRecording();
  const accessMutation = useRecordingAccess();

  const recordings: Recording[] = recordingsResponse?.data || [];
  const meta = recordingsResponse?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

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

  const handlePlay = async (rec: Recording) => {
    setPlayTarget(rec);
    setPlaybackUrl(null);
    setPlayError(null);
    try {
      const res = await accessMutation.mutateAsync(rec.id);
      const url = res?.data?.playbackUrl;
      if (url) {
        setPlaybackUrl(url);
      } else {
        setPlayError("No playback URL available for this recording.");
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

  const getStatus = (rec: Recording) =>
    (rec as Recording & { recordingStatus?: string }).recordingStatus || rec.status;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Video className="h-6 w-6 text-[#1769AA]" />
            Class Recordings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage class session recordings — 30 day retention policy
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to={classesPath}>Open Classes & Sessions</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Video className="h-6 w-6 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{meta.total}</p>
              <p className="text-xs text-text-secondary font-medium">Total Recordings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Play className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {recordings.filter((r) => getStatus(r) === "READY" || getStatus(r) === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Ready / Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {recordings.filter((r) => getDaysRemaining(r.expiresAt) <= 7).length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Expiring Soon (≤7 days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search by session title or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 border border-border rounded-md bg-background text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="EXPIRED">Expired</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 border border-border rounded-md bg-background text-sm max-w-[16rem]"
          >
            <option value="ALL">All Batches</option>
            {batches.map((b: { id: string; name: string; code: string }) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Session</TableHead>
                <TableHead className="font-semibold">Batch</TableHead>
                <TableHead className="font-semibold">Faculty</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Expires In</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-text-secondary">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading recordings...
                  </TableCell>
                </TableRow>
              ) : filteredRecordings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Video className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No recordings found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Recordings will appear here after class sessions are recorded
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecordings.map((rec) => {
                  const daysRemaining = getDaysRemaining(rec.expiresAt);
                  const status = getStatus(rec);
                  return (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium text-sm">
                        {rec.classSession?.title || "Class Session"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.batch?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.faculty?.user?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.scheduledDate
                          ? new Date(rec.classSession.scheduledDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(rec.duration)}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs border ${
                            daysRemaining <= 3
                              ? "bg-red-50 text-red-700 border-red-200"
                              : daysRemaining <= 7
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs border ${
                            status === "READY" || status === "ACTIVE"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#1769AA]"
                            title="Play recording"
                            onClick={() => handlePlay(rec)}
                            disabled={accessMutation.isPending && playTarget?.id === rec.id}
                          >
                            {accessMutation.isPending && playTarget?.id === rec.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Play size={14} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            title="Delete recording"
                            onClick={() => handleDelete(rec)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
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
              <DialogTitle className="text-sm font-bold">
                {playTarget?.classSession?.title || "Class Recording"}
              </DialogTitle>
              <button type="button" onClick={handleClosePlayer} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="bg-black aspect-video flex items-center justify-center">
            {accessMutation.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : playError ? (
              <p className="text-sm text-red-400 px-4 text-center">{playError}</p>
            ) : playbackUrl ? (
              <video
                src={playbackUrl}
                controls
                autoPlay
                controlsList="nodownload"
                className="w-full h-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
