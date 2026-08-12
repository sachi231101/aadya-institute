import React, { useState } from "react";
import { 
  Layers, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Bookmark
} from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Curriculum: React.FC = () => {
  const { courses, modules, addModule, addTopic, toggleTopicCompletion } = useCourseStore();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Module Modal State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");

  // Topic Modal State
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicHours, setTopicHours] = useState<number>(4);
  const [topicDescription, setTopicDescription] = useState("");

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseModules = modules.filter((m) => m.courseId === selectedCourseId);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle || !selectedCourseId) return;

    addModule(selectedCourseId, moduleTitle, moduleCode || `MOD-${Date.now().toString().slice(-3)}`);
    setModuleTitle("");
    setModuleCode("");
    setShowModuleModal(false);
  };

  const handleAddTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle || !activeModuleId) return;

    addTopic(activeModuleId, topicTitle, topicHours, topicDescription);
    setTopicTitle("");
    setTopicHours(4);
    setTopicDescription("");
    setShowTopicModal(false);
  };

  const totalTopics = courseModules.reduce((acc, m) => acc + m.topics.length, 0);
  const completedTopics = courseModules.reduce(
    (acc, m) => acc + m.topics.filter((t) => t.isCompleted).length,
    0
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Curriculum Builder</h2>
          <p className="text-sm text-text-secondary">
            Structure course syllabi, module sequences, topic hours, and learning progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white shadow-sm transition-colors"
            onClick={() => setShowModuleModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Module
          </Button>
        </div>
      </div>

      {/* Course Selection & Overview Banner */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 flex-1">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Course Curriculum</span>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="h-10 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA] min-w-[280px]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <Badge variant="outline" className="bg-blue-50 text-[#1769AA] border-blue-200">
                  {selectedCourse?.category}
                </Badge>
              </div>
            </div>

            {/* Course Summary Metrics */}
            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-xs text-text-secondary">
              <div>
                <span className="block text-slate-400">Total Duration</span>
                <span className="font-bold text-slate-800 text-sm">{selectedCourse?.durationMonths} Months ({selectedCourse?.totalHours} hrs)</span>
              </div>
              <div>
                <span className="block text-slate-400">Modules Count</span>
                <span className="font-bold text-slate-800 text-sm">{courseModules.length} Modules</span>
              </div>
              <div>
                <span className="block text-slate-400">Topics Completion</span>
                <span className="font-bold text-slate-800 text-sm">{completedTopics} / {totalTopics} ({progressPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#1769AA] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <div className="space-y-4">
        {courseModules.length > 0 ? (
          courseModules.map((module, index) => {
            const isExpanded = expandedModules[module.id] !== false; // Default expanded
            const moduleCompletedCount = module.topics.filter((t) => t.isCompleted).length;

            return (
              <Card key={module.id} className="border-border/50 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors" onClick={() => toggleModule(module.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <Badge variant="outline" className="font-mono text-xs bg-white text-slate-700">
                        {module.code || `MOD-${index + 1}`}
                      </Badge>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          {module.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>{module.topics.length} Topics</span>
                          <span>•</span>
                          <span>{moduleCompletedCount} of {module.topics.length} completed</span>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setActiveModuleId(module.id);
                          setShowTopicModal(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5 text-[#1769AA]" />
                        Add Topic
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 space-y-3 bg-white">
                    {module.topics.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                        {module.topics.map((topic) => (
                          <div 
                            key={topic.id}
                            className="p-3 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <button 
                                type="button"
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                onClick={() => toggleTopicCompletion(module.id, topic.id)}
                              >
                                {topic.isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-slate-300" />
                                )}
                              </button>
                              <div>
                                <h5 className={`text-sm font-semibold ${topic.isCompleted ? "line-through text-slate-400" : "text-slate-900"}`}>
                                  {topic.title}
                                </h5>
                                {topic.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">{topic.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{topic.durationHours} hrs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        <Bookmark className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                        <p>No topics added to this module yet.</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-[#1769AA] mt-1"
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
          <Card className="border-border/50 bg-white py-12 text-center shadow-sm">
            <CardContent>
              <Layers className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No Modules Created</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                This course currently has no curriculum modules defined. Start by adding your first module.
              </p>
              <Button 
                className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                onClick={() => setShowModuleModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Dialog for Adding Module */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#1769AA]" />
              Add Course Module
            </h3>

            <form onSubmit={handleAddModuleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Module Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Module 4: Cloud Infrastructure & Docker"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Module Code (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. MOD-104"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModuleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                >
                  Create Module
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog for Adding Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1769AA]" />
              Add Syllabus Topic
            </h3>

            <form onSubmit={handleAddTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Title *</label>
                <Input
                  type="text"
                  placeholder="e.g. Containerizing Node.js Apps with Dockerfile"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Hours</label>
                <Input
                  type="number"
                  min={1}
                  value={topicHours}
                  onChange={(e) => setTopicHours(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Key Objectives</label>
                <Input
                  type="text"
                  placeholder="e.g. Multi-stage builds, port binding, and volume mounts"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTopicModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                >
                  Add Topic
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
