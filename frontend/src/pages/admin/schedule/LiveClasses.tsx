import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Video, Search, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { classSessionsApi } from "@/services/class-sessions.api";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import { toDateKey } from "@/constants/timetable-slots";
import { getSessionHostPhase } from "@/utils/session-window";

type LiveSessionRow = {
  id: string;
  title?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  sessionStatus?: string;
  meetingUrl?: string | null;
  mode?: string;
  batchId: string;
  batch?: { id?: string; name?: string; code?: string };
  faculty?: { user?: { name?: string } };
};

export const LiveClasses: React.FC = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const classesPath = location.pathname.startsWith("/center")
    ? "/center/schedule/classes"
    : ROUTES.ADMIN.SCHEDULE.CLASSES;

  // Re-evaluate IST session windows so past-end rows drop without a full refresh.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["class-sessions", "active-live"],
    queryFn: () => classSessionsApi.getActiveLive(),
    refetchInterval: 15_000,
  });

  const sessions = useMemo(() => {
    const list = (data?.data || []) as LiveSessionRow[];
    if (!Array.isArray(list)) return [];
    const now = new Date(nowMs);

    const inWindow = list.filter((s) => {
      if (!s.scheduledDate || !s.startTime || !s.endTime) return false;
      return (
        getSessionHostPhase({
          dateKey: toDateKey(s.scheduledDate),
          startTime: s.startTime,
          endTime: s.endTime,
          now,
        }) === "during"
      );
    });

    if (!searchTerm.trim()) return inWindow;
    const q = searchTerm.toLowerCase();
    return inWindow.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.batch?.name || "").toLowerCase().includes(q) ||
        (s.batch?.code || "").toLowerCase().includes(q) ||
        (s.faculty?.user?.name || "").toLowerCase().includes(q)
    );
  }, [data, searchTerm, nowMs]);

  return (
    <PageContainer>
      <PageHeader
        title="Live Classes"
        description="Currently active class sessions across batches."
        actions={
          <PermissionGate itemKey="schedule.classes" mode="read">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to={classesPath}>View all classes</Link>
            </Button>
          </PermissionGate>
        }
      />

      <FilterToolbar>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search live sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
      </FilterToolbar>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading live sessions...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load.
                      <Button variant="link" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No live classes right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => {
                    const phase = getSessionHostPhase({
                      dateKey: toDateKey(s.scheduledDate),
                      startTime: s.startTime,
                      endTime: s.endTime,
                      now: new Date(nowMs),
                    });
                    const showJoin = Boolean(s.meetingUrl) && phase === "during";

                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.title || "Class Session"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{s.batch?.name || "—"}</span>
                            {s.batch?.code && (
                              <span className="text-[10px] text-muted-foreground">{s.batch.code}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{s.faculty?.user?.name || "—"}</TableCell>
                        <TableCell>
                          {s.startTime} – {s.endTime}
                        </TableCell>
                        <TableCell>
                          {showJoin ? (
                            <PermissionGate
                              itemKey="schedule.live"
                              mode="write"
                              fallback={<span className="text-xs text-muted-foreground">View only</span>}
                            >
                              <a
                                href={s.meetingUrl!}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                              >
                                Join <ExternalLink className="h-3 w-3" />
                              </a>
                            </PermissionGate>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {s.mode === "ONLINE" ? "No link" : "Offline"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-500 text-white">{s.sessionStatus || "LIVE"}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
