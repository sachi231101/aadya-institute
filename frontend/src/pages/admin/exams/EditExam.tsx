import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FileText,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { useExam, useUpdateExam } from "@/hooks/useExams";
import { useCourses } from "@/hooks/useCourses";
import { useBranches } from "@/hooks/useBranches";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

const editExamSchema = z.object({
  name: z.string().min(2, "Exam name must be at least 2 characters").max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  branchId: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive("Duration must be greater than 0"),
  passingMarks: z.coerce.number().min(0, "Passing marks cannot be negative"),
  attemptsAllowed: z.coerce.number().int().positive("Attempts must be at least 1"),
  examType: z.enum(["ONLINE", "OFFLINE"]),
  negativeMarkingEnabled: z.boolean(),
  showResults: z.boolean(),
  randomizeQuestions: z.boolean(),
  randomizeOptions: z.boolean(),
  proctoringEnabled: z.boolean(),
  fullscreenRequired: z.boolean(),
  maxWarnings: z.coerce.number().int().min(0),
});

type EditExamFormValues = z.infer<typeof editExamSchema>;

export const EditExam: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";

  const { data: examResponse, isLoading: examLoading } = useExam(id || "");
  const exam = examResponse?.data;

  const updateExamMutation = useUpdateExam(id || "");
  const { courses } = useCourses();
  const { data: branchesResponse } = useBranches();
  const branches = branchesResponse?.data ?? [];

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const form = useForm<EditExamFormValues>({
    resolver: zodResolver(editExamSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      courseId: "",
      moduleId: "",
      branchId: "",
      durationMinutes: 60,
      passingMarks: 40,
      attemptsAllowed: 1,
      examType: "ONLINE",
      negativeMarkingEnabled: false,
      showResults: true,
      randomizeQuestions: false,
      randomizeOptions: false,
      proctoringEnabled: false,
      fullscreenRequired: false,
      maxWarnings: 3,
    },
  });

  useEffect(() => {
    if (exam) {
      setSelectedCourseId(exam.courseId || "");
      form.reset({
        name: exam.name || "",
        description: exam.description || "",
        instructions: exam.instructions || "",
        courseId: exam.courseId || "",
        moduleId: exam.moduleId || "",
        branchId: exam.branchId || "",
        durationMinutes: exam.durationMinutes || 60,
        passingMarks: exam.passingMarks || 0,
        attemptsAllowed: exam.attemptsAllowed || 1,
        examType: (exam.examType as any) || "ONLINE",
        negativeMarkingEnabled: exam.negativeMarkingEnabled ?? false,
        showResults: exam.showResults ?? true,
        randomizeQuestions: exam.randomizeQuestions ?? false,
        randomizeOptions: exam.randomizeOptions ?? false,
        proctoringEnabled: exam.proctoringEnabled ?? false,
        fullscreenRequired: exam.fullscreenRequired ?? false,
        maxWarnings: exam.maxWarnings ?? 3,
      });
    }
  }, [exam, form]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const availableModules = selectedCourse?.modules || [];

  const onSubmit = async (values: EditExamFormValues) => {
    try {
      const payload = {
        ...values,
        courseId: values.courseId || undefined,
        moduleId: values.moduleId || undefined,
        branchId: values.branchId || undefined,
      };
      await updateExamMutation.mutateAsync(payload);
      navigate(`${basePath}/${id}`);
    } catch {
      // Handled by hook
    }
  };

  if (examLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading exam details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`${basePath}/${id}`)}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Edit Examination
          </h1>
          <p className="text-sm text-muted-foreground">
            Update rules, scoring, and configuration for <strong>{exam?.name}</strong>.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Basic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Exam Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Course</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          aria-label="Course"
                          onChange={(e) => {
                            field.onChange(e);
                            setSelectedCourseId(e.target.value);
                            form.setValue("moduleId", "");
                          }}
                          className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">General / All Courses</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Specific Module</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={!selectedCourseId || availableModules.length === 0}
                          aria-label="Specific Module"
                          className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        >
                          <option value="">Full Course / All Modules</option>
                          {availableModules.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Branch</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          aria-label="Branch"
                          className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">All Branches (Institute Wide)</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Student Instructions</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Timing & Scoring Rules */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                Assessment Timing & Scoring Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Duration (Minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={600} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passingMarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Passing Marks</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attemptsAllowed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Attempts Allowed</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Delivery Mode</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          aria-label="Delivery Mode"
                          className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="ONLINE">Online (Portal Assessment)</option>
                          <option value="OFFLINE">Offline (Classroom / Paper)</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="negativeMarkingEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Enable Negative Marking</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showResults"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Show Instant Results</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="randomizeQuestions"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Shuffle Questions</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="randomizeOptions"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Shuffle Options</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Proctoring Settings */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Proctoring & Integrity Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="proctoringEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Enable Proctoring Controls</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullscreenRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold">Require Fullscreen Mode</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="sm:w-1/2">
                <FormField
                  control={form.control}
                  name="maxWarnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        Max Allowed Violations / Warnings
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={20} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/${id}`)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={updateExamMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              {updateExamMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditExam;
