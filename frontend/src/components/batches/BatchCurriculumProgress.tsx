import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useBatchCurriculum,
  useMarkBatchModule,
  useMarkBatchTopic,
} from "@/hooks/useBatchCurriculum";
import type {
  BatchCurriculumModule,
  BatchCurriculumTopic,
} from "@/services/batch-curriculum.api";

type Props = {
  batchId: string;
  /** When false, progress is read-only even if the user has mark permission. */
  allowOverride?: boolean;
};

export const BatchCurriculumProgress: React.FC<Props> = ({
  batchId,
  allowOverride = true,
}) => {
  const { hasPermission } = usePermissions();
  const canMark = allowOverride && hasPermission("batch_curriculum.mark");
  const { data: curriculum, isLoading, isError, refetch } = useBatchCurriculum(batchId);
  const markModule = useMarkBatchModule(batchId);
  const markTopic = useMarkBatchTopic(batchId);

  const modules: BatchCurriculumModule[] = curriculum?.modules ?? [];

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const totalTopics = modules.reduce(
    (acc: number, m: BatchCurriculumModule) => acc + m.topics.length,
    0
  );
  const completedTopics = modules.reduce(
    (acc: number, m: BatchCurriculumModule) =>
      acc + m.topics.filter((t: BatchCurriculumTopic) => t.isCompleted).length,
    0
  );
  const progressPercent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const toggleAccordion = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !(prev[id] !== false) }));
  };

  const handleToggleModule = async (moduleId: string, currentlyComplete: boolean) => {
    if (!canMark) return;
    const key = `module:${moduleId}`;
    try {
      setPendingKey(key);
      await markModule.mutateAsync({
        batchModuleId: moduleId,
        isCompleted: !currentlyComplete,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to update module progress";
      window.alert(message);
    } finally {
      setPendingKey(null);
    }
  };

  const handleToggleTopic = async (
    moduleId: string,
    topicId: string,
    currentlyComplete: boolean
  ) => {
    if (!canMark) return;
    const key = `topic:${moduleId}:${topicId}`;
    try {
      setPendingKey(key);
      await markTopic.mutateAsync({
        batchModuleId: moduleId,
        topicId,
        isCompleted: !currentlyComplete,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to update topic progress";
      window.alert(message);
    } finally {
      setPendingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading curriculum progress…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center space-y-2">
        <AlertCircle className="h-6 w-6 mx-auto text-rose-600" />
        <p className="text-sm text-rose-600">Failed to load curriculum progress.</p>
        <Button variant="link" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
        <div className="py-14 text-center">
          <p className="text-sm text-muted-foreground">
            No curriculum modules linked to this batch yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">
              Batch curriculum progress
            </span>
            <span className="tabular-nums">{modules.length} modules</span>
            <span className="tabular-nums">
              {completedTopics}/{totalTopics} topics
            </span>
            {canMark ? (
              <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                Override enabled
              </Badge>
            ) : null}
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
        {modules.map((module: BatchCurriculumModule, index: number) => {
          const isExpanded = expandedModules[module.id] !== false;
          const moduleCompletedCount = module.topics.filter(
            (t: BatchCurriculumTopic) => t.isCompleted
          ).length;
          const modulePending = pendingKey === `module:${module.id}`;

          return (
            <Card
              key={module.id}
              className="border border-border/80 bg-card shadow-2xs rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/20 hover:bg-muted/30 border-b border-border/70 cursor-pointer transition-colors"
                onClick={() => toggleAccordion(module.id)}
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
                      disabled={modulePending || Boolean(pendingKey)}
                      title={
                        module.isCompleted
                          ? "Mark module incomplete"
                          : "Mark module complete"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleModule(module.id, module.isCompleted);
                      }}
                    >
                      {modulePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                      {module.course?.name ? `${module.course.name} · ` : ""}
                      {moduleCompletedCount}/{module.topics.length} topics
                      {module.completedBy?.name
                        ? ` · by ${module.completedBy.name}`
                        : ""}
                    </p>
                  </div>
                </div>
                {module.isCompleted ? (
                  <Badge
                    variant="success"
                    className="text-[10px] font-bold px-2 py-0.5 shrink-0"
                  >
                    Complete
                  </Badge>
                ) : null}
              </div>

              {isExpanded && (
                <CardContent className="p-0">
                  {module.topics.length > 0 ? (
                    <div className="divide-y divide-border/60">
                      {module.topics.map((topic: BatchCurriculumTopic) => {
                        const topicPending =
                          pendingKey === `topic:${module.id}:${topic.topicId}`;
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
                                  disabled={topicPending || Boolean(pendingKey)}
                                  title={
                                    topic.isCompleted
                                      ? "Mark topic incomplete"
                                      : "Mark topic complete"
                                  }
                                  onClick={() =>
                                    void handleToggleTopic(
                                      module.id,
                                      topic.topicId,
                                      topic.isCompleted
                                    )
                                  }
                                >
                                  {topicPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {topic.durationHours ?? 4}h
                            </span>
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
        })}
      </div>
    </div>
  );
};
