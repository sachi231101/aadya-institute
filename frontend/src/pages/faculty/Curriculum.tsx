import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/layout";
import { useFacultyDashboard, useFacultyCourses } from "@/hooks/useFaculty";
import {
  useBatchCurriculum,
  useMarkBatchModule,
  useMarkBatchTopic,
} from "@/hooks/useBatchCurriculum";
import { usePermissions } from "@/hooks/usePermissions";

interface FacultyBatchOption {
  id: string;
  name: string;
  code: string;
  label: string;
}

export const FacultyCurriculum: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const batchIdFromUrl = searchParams.get("batchId") || "";
  const { hasPermission } = usePermissions();
  const canMark = hasPermission("batch_curriculum.mark");

  const { data: dashboardRes, isLoading: dashboardLoading } = useFacultyDashboard();
  const { data: coursesRes, isLoading: coursesLoading } = useFacultyCourses({ limit: 100 });

  const batches: FacultyBatchOption[] = useMemo(() => {
    const fromDashboard = dashboardRes?.data?.myBatches ?? [];
    if (fromDashboard.length > 0) {
      return fromDashboard.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        label: `${b.name} (${b.code})${b.courseName ? ` · ${b.courseName}` : ""}`,
      }));
    }

    const seen = new Map<string, FacultyBatchOption>();
    for (const a of coursesRes?.data ?? []) {
      const batchId = a.batchId || a.id;
      if (!batchId || seen.has(batchId)) continue;
      seen.set(batchId, {
        id: batchId,
        name: a.name,
        code: a.code,
        label: `${a.name} (${a.code}) · ${a.course?.name || "Course"}`,
      });
    }
    return Array.from(seen.values());
  }, [dashboardRes, coursesRes]);

  const batchesLoading =
    dashboardLoading ||
    ((!dashboardRes?.data?.myBatches || dashboardRes.data.myBatches.length === 0) &&
      coursesLoading);

  const selectedBatchId = useMemo(() => {
    if (batchIdFromUrl && batches.some((b) => b.id === batchIdFromUrl)) {
      return batchIdFromUrl;
    }
    return batches[0]?.id || "";
  }, [batchIdFromUrl, batches]);

  const handleSelectBatch = (batchId: string) => {
    setSearchParams(batchId ? { batchId } : {});
  };

  const { data: curriculum, isLoading: curriculumLoading, isError, error } =
    useBatchCurriculum(selectedBatchId || undefined);
  const markModule = useMarkBatchModule(selectedBatchId || undefined);
  const markTopic = useMarkBatchTopic(selectedBatchId || undefined);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const modules = curriculum?.modules ?? [];

  const totalTopics = modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const completedTopics = modules.reduce(
    (acc, m) => acc + (m.topics?.filter((t) => t.isCompleted).length || 0),
    0
  );
  const progressPercent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const toggleModuleAccordion = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleModule = async (moduleId: string, next: boolean) => {
    if (!canMark || !selectedBatchId) return;
    const key = `module:${moduleId}`;
    try {
      setPendingKey(key);
      await markModule.mutateAsync({ batchModuleId: moduleId, isCompleted: next });
    } catch (err) {
      console.error(err);
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  };

  const handleToggleTopic = async (moduleId: string, topicId: string, next: boolean) => {
    if (!canMark || !selectedBatchId) return;
    const key = `topic:${moduleId}:${topicId}`;
    try {
      setPendingKey(key);
      await markTopic.mutateAsync({
        batchModuleId: moduleId,
        topicId,
        isCompleted: next,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  };

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const curriculumError =
    (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
      ?.message ||
    (error as { message?: string })?.message ||
    "Failed to load curriculum";

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader title="Curriculum" />

      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              {batchesLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading batches…
                </div>
              ) : batches.length === 0 ? (
                <p className="text-sm text-muted-foreground h-9 flex items-center">
                  No assigned batches
                </p>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => handleSelectBatch(e.target.value)}
                  className="w-full sm:max-w-md h-9 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {selectedBatch ? (
                <span className="tabular-nums font-mono">{selectedBatch.code}</span>
              ) : null}
              <span className="tabular-nums">{modules.length} modules</span>
              <span className="tabular-nums">
                {completedTopics}/{totalTopics} topics
              </span>
              {!canMark ? (
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                  View only
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {!selectedBatchId ? (
          <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
            <div className="py-14 text-center">
              <p className="text-sm text-muted-foreground">
                Select a batch to view curriculum progress
              </p>
            </div>
          </Card>
        ) : curriculumLoading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading…
          </div>
        ) : isError ? (
          <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
            <div className="py-14 text-center">
              <p className="text-sm text-destructive">{curriculumError}</p>
            </div>
          </Card>
        ) : modules.length > 0 ? (
          modules.map((module, index) => {
            const isExpanded = expandedModules[module.id] !== false;
            const moduleTopics = module.topics || [];
            const moduleCompletedCount = moduleTopics.filter((t) => t.isCompleted).length;
            const modulePending = pendingKey === `module:${module.id}`;

            return (
              <Card
                key={module.id}
                className="border border-border/80 bg-card shadow-2xs rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/20 hover:bg-muted/30 border-b border-border/70 cursor-pointer transition-colors"
                  onClick={() => toggleModuleAccordion(module.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                    {canMark ? (
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                        disabled={modulePending}
                        title={module.isCompleted ? "Mark module incomplete" : "Mark module complete"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleModule(module.id, !module.isCompleted);
                        }}
                      >
                        {modulePending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : module.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </button>
                    ) : (
                      <span className="shrink-0">
                        {module.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {module.code || `MOD-${index + 1}`}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {module.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                        {module.course?.name || "Course"} · {moduleCompletedCount}/
                        {moduleTopics.length} topics
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="p-0">
                    {moduleTopics.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {moduleTopics.map((topic) => {
                          const topicKey = `topic:${module.id}:${topic.topicId}`;
                          const topicPending = pendingKey === topicKey;

                          return (
                            <div
                              key={topic.topicId}
                              className="px-3.5 sm:px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                {canMark ? (
                                  <button
                                    type="button"
                                    className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                    disabled={topicPending}
                                    onClick={() =>
                                      void handleToggleTopic(
                                        module.id,
                                        topic.topicId,
                                        !topic.isCompleted
                                      )
                                    }
                                  >
                                    {topicPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : topic.isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="mt-0.5 shrink-0">
                                    {topic.isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                                    )}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm ${
                                      topic.isCompleted
                                        ? "line-through text-muted-foreground"
                                        : "text-foreground font-medium"
                                    }`}
                                  >
                                    {topic.title}
                                  </p>
                                  {topic.description ? (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {topic.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground tabular-nums">
                                <span>{topic.durationHours || 4}h</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No topics
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
            <div className="py-14 text-center">
              <p className="text-sm text-muted-foreground">
                No teachable modules for this batch
              </p>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};
