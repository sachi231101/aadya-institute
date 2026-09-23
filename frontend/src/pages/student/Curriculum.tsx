import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader, PageSection } from "@/components/layout";
import { useStudentCurriculum } from "@/hooks/useStudentCurriculum";
import type { StudentCurriculumBatch } from "@/services/students.api";

const formatCompletedAt = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const StudentCurriculum: React.FC = () => {
  const { data, isLoading, isError, error } = useStudentCurriculum();
  const batches: StudentCurriculumBatch[] = data?.data ?? [];

  const batchesWithContent = useMemo(
    () => batches.filter((batch) => batch.modules.length > 0),
    [batches]
  );

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [id]: prev[id] === false,
    }));
  };

  const totalCompletedTopics = useMemo(
    () =>
      batchesWithContent.reduce(
        (sum, batch) =>
          sum + batch.modules.reduce((mSum, mod) => mSum + mod.topics.length, 0),
        0
      ),
    [batchesWithContent]
  );

  return (
    <PageContainer maxWidth="narrow" className="animate-in fade-in duration-500">
      <PageHeader
        title="Curriculum"
        description="Topics your faculty has released as completed for your batch."
      />

      {isLoading ? (
        <div className="py-16 flex justify-center items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading curriculum…
        </div>
      ) : isError ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Unable to load curriculum</p>
            <p className="text-xs text-text-secondary mt-1">
              {(error as Error)?.message || "Please try again later."}
            </p>
          </CardContent>
        </Card>
      ) : batchesWithContent.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No topics released yet</p>
            <p className="text-xs text-text-secondary mt-1">
              Completed topics will appear here once your faculty marks them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <p className="text-xs text-muted-foreground tabular-nums">
            {totalCompletedTopics} completed topic
            {totalCompletedTopics === 1 ? "" : "s"} across {batchesWithContent.length} batch
            {batchesWithContent.length === 1 ? "" : "es"}
          </p>

          {batchesWithContent.map((batch) => (
            <PageSection
              key={batch.batchId}
              title={batch.batchName}
              description={`${batch.batchCode} · ${batch.modules.length} module${
                batch.modules.length === 1 ? "" : "s"
              }`}
            >
              <div className="space-y-3">
                {batch.modules.map((module, index) => {
                  const isExpanded = expandedModules[module.id] !== false;
                  const courseLabel = module.course?.name;

                  return (
                    <Card
                      key={module.id}
                      className="border border-border/80 bg-card shadow-2xs rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/20 hover:bg-muted/30 border-b border-border/70 cursor-pointer transition-colors text-left"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-muted-foreground shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            {module.code || `MOD-${index + 1}`}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {module.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {courseLabel ? `${courseLabel} · ` : ""}
                              {module.topics.length} topic
                              {module.topics.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {module.isCompleted ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50"
                            >
                              Module complete
                            </Badge>
                          ) : null}
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      </button>

                      {isExpanded ? (
                        <CardContent className="p-0">
                          {module.topics.length > 0 ? (
                            <div className="divide-y divide-border/60">
                              {module.topics.map((topic) => {
                                const completedLabel = formatCompletedAt(topic.completedAt);
                                return (
                                  <div
                                    key={topic.topicId}
                                    className="px-3.5 sm:px-4 py-3 flex items-start gap-2.5"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-foreground">
                                        {topic.title}
                                      </p>
                                      {topic.description ? (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {topic.description}
                                        </p>
                                      ) : null}
                                      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                                        {typeof topic.durationHours === "number"
                                          ? `${topic.durationHours}h`
                                          : null}
                                        {typeof topic.durationHours === "number" &&
                                        completedLabel
                                          ? " · "
                                          : null}
                                        {completedLabel ? `Completed ${completedLabel}` : null}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                              No topics in this module yet
                            </div>
                          )}
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </PageSection>
          ))}
        </div>
      )}
    </PageContainer>
  );
};
