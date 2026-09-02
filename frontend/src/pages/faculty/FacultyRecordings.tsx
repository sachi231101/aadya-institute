import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Video, Calendar, Clock,
  BookOpen, Eye, Loader2, AlertCircle, FileVideo,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useRecordings, useRecordingAccess } from "@/hooks/useRecordings";
import { getSessionSubjectLabel } from "@/utils/batch.utils";

export const FacultyRecordings: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const { data: recordingsRes, isLoading, isError, refetch } = useRecordings({ limit: 50 });
  const accessMutation = useRecordingAccess();
  const recordings = recordingsRes?.data ?? [];

  const filteredRecordings = useMemo(() => {
    if (!searchTerm.trim()) return recordings;
    const q = searchTerm.toLowerCase();
    return recordings.filter((rec: any) => {
      const title = rec.title || rec.classSession?.title || "";
      const course =
        getSessionSubjectLabel({
          title: rec.classSession?.title,
          batch: rec.classSession?.batch,
        }) || "";
      const batch = rec.classSession?.batch?.name || rec.classSession?.batch?.code || "";
      return (
        title.toLowerCase().includes(q) ||
        course.toLowerCase().includes(q) ||
        batch.toLowerCase().includes(q)
      );
    });
  }, [recordings, searchTerm]);

  const handleViewRecording = async (rec: any) => {
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
      setPlayError("Unable to load recording playback.");
    }
  };

  const handleCloseModal = () => {
    setShowWatchModal(false);
    setActiveRecording(null);
    setPlaybackUrl(null);
    setPlayError(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1769AA] mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FileVideo className="w-6 h-6 text-[#1769AA]" />
            Class Recordings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recordings from your class sessions.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search recordings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 opacity-70" />
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : filteredRecordings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No recordings available for your sessions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecordings.map((rec: any) => {
            const title = rec.title || rec.classSession?.title || "Class Recording";
            const course =
              getSessionSubjectLabel({
                title: rec.classSession?.title,
                batch: rec.classSession?.batch,
              }) || "Course";
            const batch = rec.classSession?.batch?.name || rec.classSession?.batch?.code || "";
            const date = rec.classSession?.scheduledDate || rec.createdAt;
            return (
              <Card key={rec.id} className="rounded-2xl overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{rec.status || "ACTIVE"}</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 line-clamp-2">{title}</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {course}
                    </div>
                    {batch && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">{batch}</Badge>
                      </div>
                    )}
                    {date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                    {rec.expiresAt && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        Expires{" "}
                        {new Date(rec.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-[#1769AA] hover:bg-[#125890] text-white"
                    onClick={() => handleViewRecording(rec)}
                    disabled={accessMutation.isPending && activeRecording?.id === rec.id}
                  >
                    {accessMutation.isPending && activeRecording?.id === rec.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showWatchModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {activeRecording?.title || activeRecording?.classSession?.title || "Recording"}
            </DialogTitle>
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
