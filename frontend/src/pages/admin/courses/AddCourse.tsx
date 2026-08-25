import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useCourses } from "../../../hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const AddCourse: React.FC = () => {
  const navigate = useNavigate();
  const { createCourse } = useCourses();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE" | "HYBRID">("HYBRID");
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [totalHours, setTotalHours] = useState<number>(200);
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      setSubmitting(true);
      setError(null);
      await createCourse({
        name,
        code,
        category,
        mode,
        level,
        duration: durationMonths,
        totalHours,
        description,
      });

      setIsSaved(true);
      setTimeout(() => {
        navigate("/admin/courses/all");
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/admin/courses/all")}
          className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Button>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Add New Course</h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Fill in details to register a new course in the academy portal.</p>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 animate-in fade-in shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-bold">Course Created Successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to course directory...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 animate-in fade-in shadow-2xs">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <p className="text-sm font-bold">Failed to Create Course</p>
            <p className="text-xs text-rose-600/90 dark:text-rose-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border p-6 bg-muted/20">
            <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Course Specification
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Provide general metadata, schedule mode, and course structure.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Course Title *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Advanced Cloud Architecture & DevOps"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Course Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. CLOUD-2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Category / Department</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Backend & Cloud">Backend & Cloud</option>
                    <option value="AI & Data">AI & Data</option>
                    <option value="Design">Design</option>
                    <option value="Cyber Security">Cyber Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Delivery Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="HYBRID">Hybrid (Offline + Online)</option>
                    <option value="OFFLINE">Offline (Campus)</option>
                    <option value="ONLINE">Online (Live Virtual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Target Skill Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Duration & Structure */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Duration & Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Duration (Months)</label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Total Teaching Hours</label>
                  <Input
                    type="number"
                    min={10}
                    step={10}
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value))}
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Description */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Description & Syllabus Overview</h4>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Course Overview / Prerequisites</label>
                <textarea
                  rows={4}
                  placeholder="Outline key learning outcomes, prerequisites, tools taught, and project assignments..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-medium"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/admin/courses/all")}
                className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Course
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
