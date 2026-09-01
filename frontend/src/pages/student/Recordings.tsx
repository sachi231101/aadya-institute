import React, { useMemo, useState } from "react";
import { Video, Play, Clock, Lock, Calendar, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecordings, useRecordingAccess } from "@/hooks/useRecordings";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import type { Recording } from "@/services/recordings.api";

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs > 0 ? `${secs}s` : ""}` : `${secs}s`;
};

export const StudentRecordings: React.FC = () => {
  const academic = useStudentAcademicAccess();
  const { data: recordingsRes, isLoading, isError } = useRecordings({ limit: 50 });
  const accessMutation = useRecordingAccess();

  const recordings: Recording[] = recordingsRes?.data ?? [];

  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [showWatchModal, setShowWatchModal] = useState(false);

  const enrichedRecordings = useMemo(() => {
    const scoped = recordings.filter((rec) => {
      const session = rec.classSession;
      if (!session) return false;
      return academic.isAuthorizedForSession(session);
    });

    return scoped.map((rec) => ({
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
      status:
        (rec as Recording & { recordingStatus?: string }).recordingStatus || rec.status,
    }));
  }, [recordings, academic]);

  const handleWatchRecording = async (rec: Recording) => {
    setActiveRecording(rec);
    setPlaybackUrl(null);
    setPlayError(null);
    setShowWatchModal(true);
    try {
      const res = await accessMutation.mutateAsync(rec.id);
      const url = res?.data?.playbackUrl;
      if (url) {
        setPlaybackUrl(url);
      } else {
        setPlayError("No playback URL available for this recording.");
      }
    } catch {
      setPlayError("Unable to load recording. Please try again later.");
    }
  };

  const handleCloseModal = () => {
    setShowWatchModal(false);
    setActiveRecording(null);
    setPlaybackUrl(null);
    setPlayError(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 bg-[#f8fafc] min-h-screen">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0A2540] flex items-center gap-2.5 tracking-tight">
          <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100 shadow-2xs">
            <Video className="h-6 w-6" />
          </span>
          Class Recordings
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Watch recorded sessions for your enrolled course batches. Recordings are retained for 30 days.
        </p>
      </div>

      <div className="p-3.5 px-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="font-medium">
          Recordings are view-only under Aadya Institute Academic Policy. Direct downloading is strictly prohibited.
        </span>
      </div>

      {isLoading ? (
        <Card className="bg-white rounded-3xl border-slate-200/80 p-12 text-center shadow-2xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#1769AA] mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading recordings...</p>
        </Card>
      ) : isError ? (
        <Card className="bg-white rounded-3xl border-slate-200/80 p-12 text-center shadow-2xs">
          <p className="text-slate-800 font-bold text-base">Unable to load recordings</p>
          <p className="text-xs text-slate-500 mt-1">Please refresh the page and try again.</p>
        </Card>
      ) : enrichedRecordings.length === 0 ? (
        <Card className="bg-white rounded-3xl border-slate-200/80 p-12 text-center shadow-2xs">
          <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-base">No recordings available</p>
          <p className="text-xs text-slate-500 mt-1">Recordings from your batch classes will appear here</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {enrichedRecordings.map((rec) => (
            <Card
              key={rec.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div
                  onClick={() => handleWatchRecording(rec)}
                  className="relative h-44 bg-slate-900 p-4 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 text-[10.5px] font-extrabold px-2.5 py-0.5">
                      Batch: {rec.batchLabel}
                    </Badge>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-mono text-[10px] font-black shadow-xs">
                      {rec.status === "READY" ? "Ready" : rec.status}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <div className="w-13 h-13 rounded-full bg-white/90 group-hover:bg-white text-[#1769AA] flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-6 h-6 fill-current ml-1 text-[#1769AA]" />
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
                    Status: {rec.status === "READY" ? "Available" : rec.status}
                  </Badge>

                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug tracking-tight group-hover:text-[#1769AA] transition-colors line-clamp-2">
                    {rec.courseLabel} — {rec.moduleLabel}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold pt-1">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-[#1769AA]" /> {rec.dateLabel}
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
                  className="w-full bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9.5 gap-1.5 shadow-sm cursor-pointer"
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

      <Dialog open={showWatchModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-3xl sm:max-w-4xl bg-slate-950 text-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col z-50">
          {activeRecording && (
            <>
              <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
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

              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                {accessMutation.isPending ? (
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
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
    </div>
  );
};
