import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Layers, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Bookmark,
  Loader2,
  Trash2
} from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { useModules } from "../../../hooks/useModules";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    toggleTopic,
    deleteTopic,
    deleteModule,
  } = useModules(selectedCourseId);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Module Modal State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleSubmitting, setModuleSubmitting] = useState(false);

  // Topic Modal State
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

  const handleToggleTopic = async (moduleId: string, topicId: string) => {
    try {
      await toggleTopic(moduleId, topicId);
    } catch (err: any) {
      console.error(err);
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

  // Calculate totals
  const totalTopics = modules.reduce((acc, m) => acc + ((m.topics as any[])?.length || 0), 0);
  const completedTopics = modules.reduce(
    (acc, m) => acc + ((m.topics as any[])?.filter((t) => t.isCompleted)?.length || 0),
    0
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-foreground">Curriculum Builder</h2>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">
          Structure course syllabi, module sequences, topic hours, and learning progress.
        </p>
      </div>

      {/* Course Selection & Overview Banner */}
      <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 flex-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Course Curriculum</span>
              <div className="flex items-center gap-3">
                {coursesLoading ? (
                  <div className="flex items-center text-xs font-bold text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading courses...
                  </div>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleSelectCourse(e.target.value)}
                    className="h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[280px] cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                )}
                {selectedCourse?.category && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                    {selectedCourse.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Course Summary Metrics */}
            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 text-xs">
              <div>
                <span className="block text-[11px] font-bold text-muted-foreground uppercase">Total Duration</span>
                <span className="font-black text-foreground text-sm">
                  {selectedCourse?.duration || selectedCourse?.durationMonths || 6} Mos ({selectedCourse?.totalHours || 100} hrs)
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-muted-foreground uppercase">Modules Count</span>
                <span className="font-black text-foreground text-sm">{modules.length} Modules</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-muted-foreground uppercase">Topics Completion</span>
                <span className="font-black text-foreground text-sm">{completedTopics} / {totalTopics} ({progressPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <div className="space-y-4">
        {modulesLoading ? (
          <div className="py-12 text-center text-muted-foreground flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span className="text-xs font-bold">Loading curriculum modules...</span>
          </div>
        ) : modules.length > 0 ? (
          modules.map((module, index) => {
            const isExpanded = expandedModules[module.id] !== false; // Default expanded
            const moduleTopics: any[] = (module.topics as any[]) || [];
            const moduleCompletedCount = moduleTopics.filter((t) => t.isCompleted).length;

            return (
              <Card key={module.id} className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-muted/30 hover:bg-muted/50 border-b border-border cursor-pointer transition-colors" onClick={() => toggleModuleAccordion(module.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <Badge variant="outline" className="font-mono text-xs bg-muted/50 text-foreground border-border">
                        {module.code || `MOD-${index + 1}`}
                      </Badge>
                      <div>
                        <CardTitle className="text-base font-black text-foreground">
                          {module.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-medium">
                          <span>{moduleTopics.length} Topics</span>
                          <span>•</span>
                          <span>{moduleCompletedCount} of {moduleTopics.length} completed</span>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer"
                        onClick={() => {
                          setActiveModuleId(module.id);
                          setShowTopicModal(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5 text-primary" />
                        Add Topic
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 space-y-3 bg-card">
                    {moduleTopics.length > 0 ? (
                      <div className="divide-y divide-border/70 border border-border rounded-xl overflow-hidden">
                        {moduleTopics.map((topic) => (
                          <div 
                            key={topic.id}
                            className="p-3.5 flex items-start justify-between gap-4 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <button 
                                type="button"
                                className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
                                onClick={() => handleToggleTopic(module.id, topic.id)}
                              >
                                {topic.isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                                )}
                              </button>
                              <div>
                                <h5 className={`text-xs font-bold ${topic.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {topic.title}
                                </h5>
                                {topic.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{topic.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{topic.durationHours || 4} hrs</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md cursor-pointer"
                                onClick={() => handleDeleteTopic(module.id, topic.id)}
                                title="Remove topic"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/40 mb-1" />
                        <p className="font-semibold">No topics added to this module yet.</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs font-bold text-primary hover:text-primary/80 mt-1 cursor-pointer"
                          onClick={() => {
                            setActiveModuleId(module.id);
                            setShowTopicModal(true);
                          }}
                        >
                          + Add First Topic
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="border border-border bg-card py-12 text-center shadow-xs rounded-2xl">
            <CardContent>
              <Layers className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-black text-foreground">No Modules Created</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4 font-medium">
                This course currently has no curriculum modules defined. Start by adding your first module.
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                onClick={() => setShowModuleModal(true)}
                disabled={!selectedCourseId}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Module
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Dialog for Adding Module */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Add Course Module
            </h3>

            <form onSubmit={handleAddModuleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Module Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Module 4: Cloud Infrastructure & Docker"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  required
                  className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Module Code (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. MOD-104"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModuleModal(false)}
                  disabled={moduleSubmitting}
                  className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                  disabled={moduleSubmitting}
                >
                  {moduleSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
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

      {/* Modal Dialog for Adding Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Add Syllabus Topic
            </h3>

            <form onSubmit={handleAddTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Topic Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Containerizing Node.js Apps with Dockerfile"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  required
                  className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Estimated Hours</label>
                <Input
                  type="number"
                  min={1}
                  value={topicHours}
                  onChange={(e) => setTopicHours(Number(e.target.value))}
                  className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Description / Key Objectives</label>
                <Input
                  type="text"
                  placeholder="e.g. Multi-stage builds, port binding, and volume mounts"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTopicModal(false)}
                  disabled={topicSubmitting}
                  className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                  disabled={topicSubmitting}
                >
                  {topicSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
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
    </div>
  );
};
