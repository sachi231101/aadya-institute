import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  AlertCircle,
  Upload,
  X,
  Users,
} from "lucide-react";
import {
  useCreateAssignment,
  useUploadAssignmentAttachment,
  useEnrolledStudentsForBatches,
} from "@/hooks/useAssignments";
import { facultyApi } from "@/services/faculty.api";
import { MasterSelect } from "@/components/common/MasterSelect";
import {
  AssignmentTargetLinesEditor,
  createEmptyTargetLine,
  type AssignmentTargetLine,
} from "@/components/assignments/AssignmentTargetLinesEditor";
import { getPortalBasePath } from "@/utils/portal-path";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  facultyId: z.string().min(1, "Faculty is required"),
  description: z.string().optional(),
  assignedAt: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  validTillEnabled: z.boolean().default(false),
  validTill: z.string().optional(),
  academicYearMasterId: z.string().min(1, "Academic year is required"),
  assignmentTypeMasterId: z.string().optional(),
  maxMarks: z.coerce.number().int().positive().max(1000).default(100),
  allowLate: z.boolean().default(false),
  restrictStudentUpload: z.boolean().default(false),
  youtubeVideoId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ALLOWED_ATTACHMENT_EXTS = [".zip", ".png", ".jpeg", ".jpg", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".txt", ".mp4"];
const ALLOWED_ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTS.join(",");
const ALLOWED_ATTACHMENT_LABEL = "zip, png, jpeg, jpg, pdf, doc, docx, xls, xlsx, ppt, txt, mp4";

export const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const basePath = getPortalBasePath(location.pathname);
  const assignmentsBase = `${basePath}/assignments`;
  const isFacultyPortal = basePath === "/faculty";
  const ownFacultyId = user?.facultyId || undefined;
  const createMutation = useCreateAssignment();
  const uploadAttachment = useUploadAssignmentAttachment();
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<AssignmentTargetLine[]>([createEmptyTargetLine()]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [limitStudents, setLimitStudents] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      title: "",
      facultyId: isFacultyPortal && ownFacultyId ? ownFacultyId : "",
      description: "",
      assignedAt: new Date().toISOString().slice(0, 16),
      dueDate: "",
      validTillEnabled: false,
      validTill: "",
      academicYearMasterId: "",
      assignmentTypeMasterId: "",
      maxMarks: 100,
      allowLate: false,
      restrictStudentUpload: false,
      youtubeVideoId: "",
    },
  });

  useEffect(() => {
    if (isFacultyPortal && ownFacultyId) {
      setValue("facultyId", ownFacultyId, { shouldValidate: true });
    }
  }, [isFacultyPortal, ownFacultyId, setValue]);

  // Fallback: resolve faculty id from dashboard profile if auth payload lacks it
  const { data: dashRes } = useQuery({
    queryKey: ["faculty-dashboard"],
    queryFn: () => facultyApi.getMyDashboard(),
    enabled: isFacultyPortal && !ownFacultyId,
  });
  useEffect(() => {
    const profileId = dashRes?.data?.profile?.id;
    if (isFacultyPortal && !ownFacultyId && profileId) {
      setValue("facultyId", profileId, { shouldValidate: true });
    }
  }, [dashRes, isFacultyPortal, ownFacultyId, setValue]);

  const effectiveFacultyId = ownFacultyId || dashRes?.data?.profile?.id || undefined;

  const validTillEnabled = watch("validTillEnabled");
  const academicYearMasterId = watch("academicYearMasterId");
  const assignmentTypeMasterId = watch("assignmentTypeMasterId");

  const { data: facultyRes } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
    enabled: !isFacultyPortal,
  });
  const facultyList = facultyRes?.data || [];
  const lockedFacultyLabel = user?.name || "You";

  const batchIds = useMemo(
    () => [...new Set(targets.map((t) => t.batchId).filter(Boolean))],
    [targets]
  );
  const { data: enrolledRes } = useEnrolledStudentsForBatches(batchIds);
  const enrolledStudents = enrolledRes?.data || [];

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const validTargets = targets.filter((t) => t.courseId && t.batchId);
    if (validTargets.length === 0) {
      setError("Add at least one target with course and batch");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        title: values.title,
        facultyId: values.facultyId,
        description: values.description || undefined,
        assignedAt: values.assignedAt
          ? new Date(values.assignedAt).toISOString()
          : undefined,
        dueDate: new Date(values.dueDate).toISOString(),
        validTill:
          values.validTillEnabled && values.validTill
            ? new Date(values.validTill).toISOString()
            : null,
        academicYearMasterId: values.academicYearMasterId,
        assignmentTypeMasterId: values.assignmentTypeMasterId || null,
        maxMarks: values.maxMarks,
        allowLate: values.allowLate,
        restrictStudentUpload: values.restrictStudentUpload,
        youtubeVideoId: values.youtubeVideoId || null,
        targets: validTargets.map((t) => ({
          courseId: t.courseId,
          courseModuleId: t.courseModuleId || null,
          topic: t.topic || null,
          batchId: t.batchId,
        })),
        recipientStudentIds:
          limitStudents && selectedStudentIds.length > 0
            ? selectedStudentIds
            : undefined,
      });

      const id = result?.data?.id as string | undefined;
      if (id && attachment) {
        await uploadAttachment.mutateAsync({ assignmentId: id, file: attachment });
      }
      navigate(id ? `${assignmentsBase}/${id}` : assignmentsBase);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to create assignment"
      );
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Create Assignment</h2>
          <p className="text-sm text-text-secondary">
            Set details, attach materials, and target courses and batches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(assignmentsBase)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-assignment-form"
            className="bg-[#1769AA] hover:bg-[#125387] text-white shadow-sm"
            disabled={createMutation.isPending || uploadAttachment.isPending}
          >
            {(createMutation.isPending || uploadAttachment.isPending) && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <form id="create-assignment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input {...register("title")} placeholder="e.g. React Hooks Lab" />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Assigned date</Label>
              <Input type="datetime-local" {...register("assignedAt")} />
            </div>
            <div>
              <Label>Due date *</Label>
              <Input type="datetime-local" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-red-600 mt-1">{errors.dueDate.message}</p>}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("validTillEnabled")} />
                Set valid-till date
              </label>
              {validTillEnabled && (
                <Input type="datetime-local" {...register("validTill")} />
              )}
            </div>
            <div>
              <Label>Academic year *</Label>
              <MasterSelect
                entityType="academicyear"
                value={academicYearMasterId}
                onChange={(id) => setValue("academicYearMasterId", id, { shouldValidate: true })}
                placeholder="Select academic year"
                includeEmpty={false}
              />
              {errors.academicYearMasterId && (
                <p className="text-xs text-red-600 mt-1">{errors.academicYearMasterId.message}</p>
              )}
            </div>
            <div>
              <Label>Assignment type</Label>
              <MasterSelect
                entityType="assignmenttype"
                value={assignmentTypeMasterId || ""}
                onChange={(id) => setValue("assignmentTypeMasterId", id)}
                placeholder="Select type"
              />
            </div>
            <div>
              <Label>Faculty *</Label>
              {isFacultyPortal ? (
                <>
                  <input type="hidden" {...register("facultyId")} />
                  <Input value={lockedFacultyLabel} disabled className="bg-muted/40" />
                  <p className="text-xs text-text-muted mt-1">Assignments are created under your faculty profile.</p>
                </>
              ) : (
                <select {...register("facultyId")} className="w-full h-10 px-3 border rounded-md text-sm bg-background">
                  <option value="">Select faculty</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.employeeCode}
                    </option>
                  ))}
                </select>
              )}
              {errors.facultyId && (
                <p className="text-xs text-red-600 mt-1">{errors.facultyId.message}</p>
              )}
            </div>
            <div>
              <Label>Max marks</Label>
              <Input type="number" min={1} max={1000} {...register("maxMarks")} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("allowLate")} />
              Allow late submissions
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("restrictStudentUpload")} />
              Restrict student file upload
            </label>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Instructions & media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Instructions / remarks</Label>
              <textarea
                {...register("description")}
                className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                placeholder="What should students do?"
              />
            </div>
            <div>
              <Label>YouTube video ID</Label>
              <Input {...register("youtubeVideoId")} placeholder="e.g. dQw4w9WgXcQ" />
            </div>
            <div>
              <Label>Instructor attachment</Label>
              {attachment ? (
                <div className="flex items-center justify-between p-3 border rounded-md text-sm">
                  <span className="truncate">{attachment.name}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => { setAttachment(null); setFileError(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30">
                  <Upload className="h-6 w-6 text-[#1769AA]" />
                  <span className="text-sm font-medium">Select file to upload</span>
                  <span className="text-xs text-text-muted">
                    Allowed: {ALLOWED_ATTACHMENT_LABEL} (max 10MB)
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept={ALLOWED_ATTACHMENT_ACCEPT}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
                        if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) {
                          setFileError(`File type "${ext}" is not allowed. Allowed: ${ALLOWED_ATTACHMENT_LABEL}`);
                          setAttachment(null);
                          e.target.value = "";
                          return;
                        }
                        setFileError(null);
                        setAttachment(f);
                      }
                    }}
                  />
                </label>
              )}
              {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Audience targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AssignmentTargetLinesEditor
              lines={targets}
              onChange={setTargets}
              facultyId={isFacultyPortal ? effectiveFacultyId : undefined}
            />

            <div className="pt-2 border-t space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={limitStudents}
                  onChange={(e) => {
                    setLimitStudents(e.target.checked);
                    if (!e.target.checked) setSelectedStudentIds([]);
                  }}
                />
                Limit to specific students
              </label>
              {limitStudents && (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={batchIds.length === 0}
                    onClick={() => setStudentPickerOpen(true)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Select students ({selectedStudentIds.length})
                  </Button>
                  {batchIds.length === 0 && (
                    <span className="text-xs text-text-muted">Choose batch targets first</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      <Dialog open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select students</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">
                No enrolled students found for the selected batches.
              </p>
            ) : (
              enrolledStudents.map((s) => {
                const checked = selectedStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-start gap-3 p-2 rounded-md border hover:bg-muted/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedStudentIds((prev) =>
                          checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        );
                      }}
                    />
                    <div className="text-sm">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-text-muted">
                        {s.studentCode}
                        {s.batches?.length
                          ? ` · ${s.batches.map((b) => b.code || b.name).join(", ")}`
                          : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setStudentPickerOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
