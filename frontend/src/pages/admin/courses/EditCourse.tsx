import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { coursesApi, type CourseData } from "../../../services/courses.api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Keep the typed digits. Empty stays empty, and a leading 0 is not forced back in. */
const toNumericInput = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
const toFormNumber = (value: number | null | undefined) =>
  value == null ? "" : String(value);

const populateFormFromCourse = (
  course: CourseData,
  setters: {
    setName: (v: string) => void;
    setCode: (v: string) => void;
    setMode: (v: "OFFLINE" | "ONLINE" | "HYBRID") => void;
    setLevel: (v: "BEGINNER" | "INTERMEDIATE" | "ADVANCED") => void;
    setDurationMonths: (v: string) => void;
    setTotalHours: (v: string) => void;
    setFee: (v: string) => void;
    setStatus: (v: "ACTIVE" | "INACTIVE") => void;
    setDescription: (v: string) => void;
  }
) => {
  setters.setName(course.name);
  setters.setCode(course.code);
  setters.setMode((course.mode as "OFFLINE" | "ONLINE" | "HYBRID") || "HYBRID");
  setters.setLevel((course.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") || "BEGINNER");
  setters.setDurationMonths(toFormNumber(course.duration ?? course.durationMonths));
  setters.setTotalHours(toFormNumber(course.totalHours));
  setters.setFee(toFormNumber(course.fee));
  setters.setStatus(course.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
  setters.setDescription(course.description || "");
};

export const EditCourse: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { canEditItem, isAdmin, roleScope } = usePermissions();
  const courseFromState = (location.state as { course?: CourseData } | null)?.course;

  const coursesListPath = location.pathname.startsWith("/center")
    ? "/center/courses/all"
    : "/admin/courses/all";
  const canWrite = isAdmin || !roleScope || canEditItem("courses.all");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE" | "HYBRID">("HYBRID");
  const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [durationMonths, setDurationMonths] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!canWrite) {
      navigate(coursesListPath, { replace: true, state: { accessDenied: true, readOnly: true } });
    }
  }, [canWrite, navigate, coursesListPath]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Course ID is missing");
      return;
    }

    const setters = {
      setName,
      setCode,
      setMode,
      setLevel,
      setDurationMonths,
      setTotalHours,
      setFee,
      setStatus,
      setDescription,
    };

    if (courseFromState && courseFromState.id === id) {
      populateFormFromCourse(courseFromState, setters);
      setLoading(false);
      return;
    }

    const loadCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await coursesApi.getById(id);
        const course = response.data;
        if (!course) {
          setError("Course not found");
          return;
        }
        populateFormFromCourse(course, setters);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id, courseFromState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationValue = durationMonths === "" ? undefined : Number(durationMonths);
    const hoursValue = totalHours === "" ? undefined : Number(totalHours);
    const feeValue = fee === "" ? undefined : Number(fee);

    if (!id || !name || !code) return;
    if (feeValue === undefined || Number.isNaN(feeValue) || feeValue < 0) {
      setError("Enter a valid course fee");
      return;
    }
    if (durationValue !== undefined && (Number.isNaN(durationValue) || durationValue < 1)) {
      setError("Enter a valid duration in months");
      return;
    }
    if (hoursValue !== undefined && (Number.isNaN(hoursValue) || hoursValue < 1)) {
      setError("Enter a valid number of teaching hours");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await coursesApi.update(id, {
        name,
        code,
        mode,
        level,
        duration: durationValue,
        totalHours: hoursValue,
        fee: feeValue,
        description,
        status,
      });

      setIsSaved(true);
      setTimeout(() => {
        navigate(coursesListPath);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-xs font-bold">Loading course...</span>
      </div>
    );
  }

  if (!canWrite) {
    return null;
  }

  return (
    <PageContainer maxWidth="narrow" className="animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(coursesListPath)}
          className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Button>
        <PageHeader
          className="flex-1 min-w-0"
          title="Edit Course"
          description="Update course details, fee, and status."
        />
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 animate-in fade-in shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-bold">Course Updated Successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to course directory...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 animate-in fade-in shadow-2xs">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <p className="text-sm font-bold">Failed to Update Course</p>
            <p className="text-xs text-rose-600/90 dark:text-rose-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border p-6 bg-muted/20">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Course Specification
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Update general metadata, schedule mode, fee, and course structure.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Course Title *</label>
                  <Input
                    type="text"
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
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Delivery Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "OFFLINE" | "ONLINE" | "HYBRID")}
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
                    onChange={(e) => setLevel(e.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Duration, Hours & Fee</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Duration (Months)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(toNumericInput(e.target.value))}
                    placeholder="e.g. 6"
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Total Teaching Hours</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={totalHours}
                    onChange={(e) => setTotalHours(toNumericInput(e.target.value))}
                    placeholder="e.g. 200"
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Course Fee (₹) *</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={fee}
                    onChange={(e) => setFee(toNumericInput(e.target.value))}
                    required
                    placeholder="e.g. 35000"
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Description & Syllabus Overview</h4>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Course Overview / Prerequisites</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(coursesListPath)}
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
                    Update Course
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </PageContainer>
  );
};
