import React, { useMemo, useState } from "react";
import { Video, Play, Clock, Lock, Calendar, X, Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRecordings, useRecordingAccess } from "@/hooks/useRecordings";
import type { Recording } from "@/services/recordings.api";
import { useSearchParams } from "react-router-dom";
import { isDirectVideoUrl, isGoogleDriveViewerUrl } from "@/utils/recording-playback";
import { PageContainer, PageHeader, PageSection } from "@/components/layout";

const formatDuration = (minutes?: number) => {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const mins = Math.max(0, Math.round(Number(minutes)));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const StudentRecordings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const classSessionId = searchParams.get("classSessionId") || undefined;
  const { data: recordingsRes, isLoading, isError } = useRecordings({
    limit: 50,
    classSessionId,
    recordingStatus: "AVAILABLE",
  });
  const accessMutation = useRecordingAccess();
  const [recordingsNow] = useState(() => Date.now());

  const [activeRecording, setActiveRecording] = useState<any>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [showWatchModal, setShowWatchModal] = useState(false);

  const enrichedRecordings = useMemo(() => {
    const rawApiRecordings: Recording[] = recordingsRes?.data ?? [];

    const scoped = rawApiRecordings
      .filter((rec) => {
        const session = rec.classSession;
        if (!session) return false;
        // Backend already scopes students to ACTIVE enrollments; trust API rows.
        return (
          rec.recordingStatus === "AVAILABLE" &&
          new Date(rec.expiresAt).getTime() > recordingsNow
        );
      })
      .map((rec) => ({
        ...rec,
        batchLabel: rec.classSession?.batch?.name || rec.classSession?.batch?.code || "Batch",
        courseLabel:
          rec.classSession?.batchModule?.courseModule?.name ||
          rec.classSession?.title ||
          "Class Session",
        moduleLabel: rec.classSession?.batchModule?.courseModule?.name || "Class Session",
        facultyName: rec.classSession?.faculty?.user?.name || "Faculty",
        dateLabel: rec.classSession?.scheduledDate
          ? new Date(rec.classSession.scheduledDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        durationLabel: formatDuration(rec.duration),
        expiresLabel: rec.expiresAt
          ? new Date(rec.expiresAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        status: rec.recordingStatus,
      }));

    return scoped;
  }, [recordingsRes, recordingsNow]);

  const handleWatchRecording = async (rec: any) => {
    setActiveRecording(rec);
    setPlaybackUrl(null);
    setPlayError(null);
    setShowWatchModal(true);

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
    } catch (err: unknown) {
      setPlayError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Unable to load recording. It may have expired."
      );
    }
  };

  const handleCloseModal = () => {
    setShowWatchModal(false);
    setActiveRecording(null);
    setPlaybackUrl(null);
    setPlayError(null);
  };

  return (
    <PageContainer maxWidth="narrow" className="animate-in fade-in duration-500">
      <PageHeader
        title="Class Recordings"
        description="Watch available sessions from your enrolled batches. Recordings are retained for 7 days."
      />

      <div className="p-3.5 px-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="font-medium">
          Recordings are view-only under Aadya Institute Academic Policy. Direct downloading is strictly prohibited.
        </span>
      </div>

      <PageSection title="Available recordings">
      {isLoading ? (
        <Card className="bg-card rounded-xl border-border/80 p-12 text-center shadow-2xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading recordings...</p>
        </Card>
      ) : isError ? (
        <Card className="bg-card rounded-xl border-border/80 p-12 text-center shadow-2xs">
          <p className="text-foreground font-semibold text-base">Unable to load recordings</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page and try again.</p>
        </Card>
      ) : enrichedRecordings.length === 0 ? (
        <Card className="bg-card rounded-xl border-border/80 p-12 text-center shadow-2xs">
          <Video className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-semibold text-base">No recordings available</p>
          <p className="text-xs text-muted-foreground mt-1">Recordings from your batch classes will appear here</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {enrichedRecordings.map((rec) => (
            <Card
              key={rec.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div
                  onClick={() => handleWatchRecording(rec)}
                  className="relative h-44 bg-slate-900 p-4 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 text-[10.5px] font-semibold px-2.5 py-0.5">
                      Batch: {rec.batchLabel}
                    </Badge>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-mono text-[10px] font-semibold shadow-xs">
                      Available
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <div className="w-13 h-13 rounded-full bg-white/90 group-hover:bg-white text-primary flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-6 h-6 fill-current ml-1 text-primary" />
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-white/90 text-[11px] font-medium">
                    <span className="flex items-center gap-1 font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      <Clock className="w-3 h-3 text-emerald-400" /> {rec.durationLabel}
                    </span>
                    <span className="text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-md text-slate-300">
                      View Only
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    Status: Available
                  </Badge>

                  <h3 className="font-semibold text-slate-900 text-sm leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                    {rec.courseLabel} — {rec.moduleLabel}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold pt-1">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> {rec.dateLabel}
                    </span>
                    <span className="text-slate-500 font-medium text-[11px]">By {rec.facultyName}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 px-5 bg-slate-50/80 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => handleWatchRecording(rec)}
                  disabled={accessMutation.isPending && activeRecording?.id === rec.id}
                  className="w-full bg-primary hover:bg-primary text-white text-xs font-bold rounded-xl h-9.5 gap-1.5 shadow-sm cursor-pointer"
                >
                  {accessMutation.isPending && activeRecording?.id === rec.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Recording
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      </PageSection>

      <Dialog open={showWatchModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-3xl sm:max-w-4xl bg-slate-950 text-white rounded-xl p-0 overflow-hidden shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col z-50">
          {activeRecording && (
            <>
              <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-400" />
                    {activeRecording.classSession?.title || "Class Recording"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {activeRecording.classSession?.batch?.name || "Batch"} •{" "}
                    {activeRecording.classSession?.scheduledDate
                      ? new Date(activeRecording.classSession.scheduledDate).toLocaleDateString("en-IN")
                      : "—"}{" "}
                    • Taught by {activeRecording.classSession?.faculty?.user?.name || "Faculty"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden p-6">
                {accessMutation.isPending ? (
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
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

              <div className="p-5 sm:p-6 bg-slate-900 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                    Duration: {formatDuration(activeRecording.duration)}
                  </span>
                  {activeRecording.expiresAt && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Expires:{" "}
                      {new Date(activeRecording.expiresAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
