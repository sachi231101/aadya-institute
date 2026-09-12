import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  ExternalLink,
  Clock,
  Info,
} from "lucide-react";
import { recordingsApi } from "@/services/recordings.api";
import { useSessionStore } from "@/store/session.store";
import { isDirectVideoUrl, isGoogleDriveViewerUrl } from "@/utils/recording-playback";

export interface UploadRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    id: string;
    title: string;
    courseName: string;
    batchName?: string;
    batchCode?: string;
    facultyName?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    existingRecordingUrl?: string;
  };
  onSuccess?: () => void;
}

const isGoogleMeetRoomUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.hostname.toLowerCase().includes("meet.google.com");
  } catch {
    return /meet\.google\.com/i.test(url);
  }
};

export const UploadRecordingModal: React.FC<UploadRecordingModalProps> = ({
  isOpen,
  onClose,
  sessionData,
  onSuccess,
}) => {
  const { addRecording } = useSessionStore();
  const [videoUrl, setVideoUrl] = useState(sessionData.existingRecordingUrl || "");
  const [videoTitle, setVideoTitle] = useState(
    `${sessionData.courseName} - ${sessionData.title || "Lecture Recording"}`
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setVideoUrl(sessionData.existingRecordingUrl || "");
    setVideoTitle(`${sessionData.courseName} - ${sessionData.title || "Lecture Recording"}`);
    setDurationMinutes("");
    setErrorMessage(null);
    setInfoMessage(null);
    setIsPlayingPreview(false);
    setUploadSuccess(false);
  }, [isOpen, sessionData]);

  useEffect(() => {
    const url = videoUrl.trim();
    setErrorMessage(null);
    setInfoMessage(null);
    if (!url) return;

    if (isGoogleMeetRoomUrl(url)) {
      setInfoMessage(
        "This is a Google Meet room link, not a recording file. After class, wait for ERP Drive sync — or paste the Google Drive recording link (drive.google.com/file/…)."
      );
      setIsPlayingPreview(false);
      return;
    }
    if (isGoogleDriveViewerUrl(url)) {
      setInfoMessage(
        "Google Drive links open in Drive (view-only). Preview opens in a new tab — in-page video preview is not available."
      );
      return;
    }
    if (!isDirectVideoUrl(url) && /^https?:\/\//i.test(url)) {
      setInfoMessage(
        "Use a Google Drive recording link or a direct .mp4 / cloud storage URL. Meet room links cannot be saved as recordings."
      );
    }
  }, [videoUrl]);

  const handleTogglePreview = () => {
    const url = videoUrl.trim();
    if (!url) return;

    if (isGoogleMeetRoomUrl(url)) {
      setErrorMessage(
        "Cannot preview a Meet room link. Paste a Drive recording link or wait for automatic Drive sync."
      );
      return;
    }

    if (isGoogleDriveViewerUrl(url) || !isDirectVideoUrl(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview((prev) => !prev);
  };

  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = videoUrl.trim();
    if (!url) {
      setErrorMessage("Please enter a Google Drive recording link or direct video URL.");
      return;
    }

    if (isGoogleMeetRoomUrl(url)) {
      setErrorMessage(
        "A Google Meet room link is not a recording. End class so ERP can sync from Drive, or paste the Drive file link (drive.google.com/file/…)."
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const parsedDuration = parseInt(durationMinutes, 10);
      const durationMins =
        Number.isFinite(parsedDuration) && parsedDuration > 0
          ? parsedDuration
          : undefined;

      const newRec = {
        id: `rec-${sessionData.id}-${Date.now()}`,
        course: sessionData.courseName,
        batch: sessionData.batchCode || sessionData.batchName || "BATCH",
        batchName: sessionData.batchName || sessionData.batchCode || "BATCH",
        module: sessionData.title || "Module Lecture",
        facultyName: sessionData.facultyName || "Faculty",
        date: sessionData.date || new Date().toISOString().split("T")[0],
        rawDate: sessionData.date || new Date().toISOString().split("T")[0],
        time: `${sessionData.startTime || "10:00 AM"} – ${sessionData.endTime || "12:00 PM"}`,
        duration: durationMins != null ? `${durationMins} mins` : "—",
        studentsCount: 30,
        thumbnailBg: "from-blue-600 to-indigo-700",
        topics: [sessionData.title || "Class Topics"],
        videoUrl: url,
        viewsCount: 0,
        status: "Available" as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        title: videoTitle,
      };

      addRecording(newRec);

      if (
        sessionData.id &&
        !sessionData.id.startsWith("sess-") &&
        !sessionData.id.startsWith("temp-") &&
        !sessionData.id.startsWith("mock-") &&
        !sessionData.id.startsWith("demo-")
      ) {
        try {
          await recordingsApi.createRecording({
            classSessionId: sessionData.id,
            storageKey: url,
            ...(durationMins != null ? { duration: durationMins } : {}),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } catch {
          // Soft ignore if recording already exists from Drive sync
        }
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save recording details.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-1">
            <Film className="w-6 h-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Class Recording Management
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Prefer automatic Drive sync after End Class. Manual link is only for a Google Drive
            recording file or direct video URL — not a Meet room link.
          </DialogDescription>
        </DialogHeader>

        {uploadSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-base">Recording Saved Successfully!</p>
            <p className="text-xs text-slate-500">Students in this batch can now watch the lecture recording.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveRecording} className="space-y-4 my-2">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && !errorMessage && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recording Title
              </Label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. React Hooks Deep Dive"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Google Drive recording link or direct video URL
              </Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/…/view"
                required
                className="rounded-xl font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Do not paste meet.google.com room links. Use Drive file links after Google finishes processing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Approx Duration (Mins)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Leave blank if unknown"
                  className="rounded-xl"
                />
                <p className="text-[10px] text-slate-400">
                  Optional. Do not use the timetable slot length — enter the actual recording length only.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Expiry Retention
                </Label>
                <div className="h-10 px-3 flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  7 Days (Standard)
                </div>
              </div>
            </div>

            {videoUrl.trim() && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {videoUrl}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePreview}
                  className="text-xs text-[#2563EB] h-7 px-2 shrink-0"
                >
                  {isDirectVideoUrl(videoUrl.trim()) ? (
                    <>
                      <Play className="w-3 h-3 mr-1" /> {isPlayingPreview ? "Hide" : "Preview"}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3 h-3 mr-1" /> Open link
                    </>
                  )}
                </Button>
              </div>
            )}

            {isPlayingPreview && videoUrl && isDirectVideoUrl(videoUrl.trim()) && (
              <div className="rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
                <video
                  src={videoUrl.trim()}
                  controls
                  className="w-full h-full object-contain"
                  onError={() =>
                    setErrorMessage(
                      "Could not preview this file in-browser. Open it in a new tab, or use a Google Drive recording link."
                    )
                  }
                />
              </div>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || isGoogleMeetRoomUrl(videoUrl)}
                className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" /> Save Recording
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
