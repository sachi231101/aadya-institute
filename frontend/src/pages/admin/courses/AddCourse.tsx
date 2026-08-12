import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Save, CheckCircle2 } from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const AddCourse: React.FC = () => {
  const navigate = useNavigate();
  const { addCourse } = useCourseStore();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE" | "HYBRID">("HYBRID");
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [totalHours, setTotalHours] = useState<number>(200);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    addCourse({
      name,
      code,
      category,
      mode,
      level,
      durationMonths,
      totalHours,
      description,
      status,
    });

    setIsSaved(true);
    setTimeout(() => {
      navigate("/admin/courses/all");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/admin/courses/all")}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Add New Course</h2>
          <p className="text-xs text-text-secondary">Fill in details to register a new course in the academy portal.</p>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Course Created Successfully!</p>
            <p className="text-xs text-emerald-700">Redirecting to course directory...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border-border/50 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#1769AA]" />
              Course Specification
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Provide general metadata, schedule mode, and course structure.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Advanced Cloud Architecture & DevOps"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. CLOUD-2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Department</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Backend & Cloud">Backend & Cloud</option>
                    <option value="AI & Data">AI & Data</option>
                    <option value="Design">Design</option>
                    <option value="Cyber Security">Cyber Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="HYBRID">Hybrid (Offline + Online)</option>
                    <option value="OFFLINE">Offline (Campus)</option>
                    <option value="ONLINE">Online (Live Virtual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Skill Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Duration & Structure */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Duration & Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Months)</label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Teaching Hours</label>
                  <Input
                    type="number"
                    min={10}
                    step={10}
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Description */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Description & Syllabus Overview</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Overview / Prerequisites</label>
                <textarea
                  rows={4}
                  placeholder="Outline key learning outcomes, prerequisites, tools taught, and project assignments..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/admin/courses/all")}
                className="bg-white border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white shadow-sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Course
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
