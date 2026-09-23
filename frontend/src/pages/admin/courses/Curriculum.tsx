import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Layers,
  Plus,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { useModules } from "../../../hooks/useModules";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PageContainer, PageHeader } from "@/components/layout";

export const Curriculum: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId") || "";
  const { courses, loading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdFromUrl);

  useEffect(() => {
    if (courseIdFromUrl && courseIdFromUrl !== selectedCourseId) {
      setSelectedCourseId(courseIdFromUrl);
      return;
    }
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId, courseIdFromUrl]);

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSearchParams(courseId ? { courseId } : {});
  };

  const {
    modules,
    loading: modulesLoading,
    createModule,
    addTopic,
    deleteTopic,
    deleteModule,
  } = useModules(selectedCourseId);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleSubmitting, setModuleSubmitting] = useState(false);

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicHours, setTopicHours] = useState<number>(4);
  const [topicDescription, setTopicDescription] = useState("");
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const toggleModuleAccordion = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle || !selectedCourseId) return;

    try {
      setModuleSubmitting(true);
      await createModule({
        courseId: selectedCourseId,
        name: moduleTitle,
        code: moduleCode || `MOD-${Date.now().toString().slice(-3)}`,
      });
      setModuleTitle("");
      setModuleCode("");
      setShowModuleModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create module");
    } finally {
      setModuleSubmitting(false);
    }
  };

  const handleAddTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle || !activeModuleId) return;

    try {
      setTopicSubmitting(true);
      await addTopic(activeModuleId, {
        title: topicTitle,
        durationHours: topicHours,
        description: topicDescription,
      });
      setTopicTitle("");
      setTopicHours(4);
      setTopicDescription("");
      setShowTopicModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to add topic");
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleDeleteTopic = async (moduleId: string, topicId: string) => {
    if (confirm("Are you sure you want to remove this topic?")) {
      try {
        await deleteTopic(moduleId, topicId);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || "Failed to delete topic");
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("Are you sure you want to delete this module?")) {
      await deleteModule(moduleId);
    }
  };

  const totalTopics = modules.reduce((acc, m) => acc + ((m.topics as any[])?.length || 0), 0);

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Course Curriculum"
        description="Modules and topics for each course."
        actions={
          <PermissionGate itemKey="courses.curriculum" mode="write">
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => setShowModuleModal(true)}
              disabled={!selectedCourseId}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Module
            </Button>
          </PermissionGate>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {coursesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading courses…
          </div>
        ) : (
          <select
            value={selectedCourseId}
            onChange={(e) => handleSelectCourse(e.target.value)}
            className="h-9 w-full sm:w-auto sm:min-w-[260px] px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        )}
        {selectedCourse?.category && (
          <Badge variant="outline" className="text-xs font-medium w-fit">
            {selectedCourse.category}
          </Badge>
        )}
        {!modulesLoading && selectedCourseId ? (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {selectedCourse?.duration || selectedCourse?.durationMonths || 6} mos
            {" · "}
            {selectedCourse?.totalHours || 100} hrs
            {" · "}
            {modules.length} modules · {totalTopics} topics
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {modulesLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading modules…</span>
          </div>
        ) : modules.length > 0 ? (
          modules.map((module, index) => {
            const isExpanded = expandedModules[module.id] !== false;
            const moduleTopics: any[] = (module.topics as any[]) || [];

            return (
              <Card
                key={module.id}
                className="border border-border bg-card shadow-none rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => toggleModuleAccordion(module.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                    {module.code || `MOD-${index + 1}`}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{module.name}</p>
                    <p className="text-xs text-muted-foreground">{moduleTopics.length} topics</p>
                  </div>
                  <PermissionGate itemKey="courses.curriculum" mode="write">
                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg"
                        onClick={() => {
                          setActiveModuleId(module.id);
                          setShowTopicModal(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Topic
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </PermissionGate>
                </div>

                {isExpanded && (
                  <CardContent className="px-4 pb-3 pt-0">
                    {moduleTopics.length > 0 ? (
                      <ul className="border border-border rounded-lg divide-y divide-border">
                        {moduleTopics.map((topic) => (
                          <li
                            key={topic.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-foreground">{topic.title}</p>
                              {topic.description ? (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {topic.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" />
                              {topic.durationHours || 4}h
                            </span>
                            <PermissionGate itemKey="courses.curriculum" mode="write">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                                onClick={() => handleDeleteTopic(module.id, topic.id)}
                                title="Remove topic"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-6 text-center border border-dashed border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">No topics yet</p>
                        <PermissionGate itemKey="courses.curriculum" mode="write">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary mt-1"
                            onClick={() => {
                              setActiveModuleId(module.id);
                              setShowTopicModal(true);
                            }}
                          >
                            + Add first topic
                          </Button>
                        </PermissionGate>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <div className="py-16 text-center border border-dashed border-border rounded-lg">
            <Layers className="mx-auto h-9 w-9 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No modules yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Add a module to start this course curriculum.
            </p>
            <PermissionGate itemKey="courses.curriculum" mode="write">
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => setShowModuleModal(true)}
                disabled={!selectedCourseId}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Module
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Add Module
            </h3>
            <form onSubmit={handleAddModuleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Module Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Cloud Infrastructure & Docker"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  required
                  className="rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Module Code (optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. MOD-104"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setShowModuleModal(false)}
                  disabled={moduleSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="rounded-lg" disabled={moduleSubmitting}>
                  {moduleSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Module"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Add Topic
            </h3>
            <form onSubmit={handleAddTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Topic Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Containerizing Node.js Apps"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  required
                  className="rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Estimated Hours</label>
                <Input
                  type="number"
                  min={1}
                  value={topicHours}
                  onChange={(e) => setTopicHours(Number(e.target.value))}
                  className="rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Description (optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. Multi-stage builds, port binding"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  className="rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setShowTopicModal(false)}
                  disabled={topicSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="rounded-lg" disabled={topicSubmitting}>
                  {topicSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Add Topic"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
