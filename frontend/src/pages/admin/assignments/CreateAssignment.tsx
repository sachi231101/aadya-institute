import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
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
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { facultyApi } from "@/services/faculty.api";
import { MasterSelect } from "@/components/common/MasterSelect";
import {
  AssignmentTargetLinesEditor,
  createEmptyTargetLine,
  type AssignmentTargetLine,
} from "@/components/assignments/AssignmentTargetLinesEditor";
import { getPortalBasePath } from "@/utils/portal-path";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { PageContainer, PageHeader } from "@/components/layout";
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

const schema = z
  .object({
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
  })
  .superRefine((values, ctx) => {
    if (values.validTillEnabled && !values.validTill?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid-till date is required when enabled",
        path: ["validTill"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const ALLOWED_ATTACHMENT_EXTS = [".zip", ".png", ".jpeg", ".jpg", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".txt", ".mp4"];
const ALLOWED_ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTS.join(",");
const ALLOWED_ATTACHMENT_LABEL = "zip, png, jpeg, jpg, pdf, doc, docx, xls, xlsx, ppt, txt, mp4";

export const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { canEditItem, isAdmin, roleScope } = usePermissions();
  const basePath = getPortalBasePath(location.pathname);
  const assignmentsBase = `${basePath}/assignments`;
  const isFacultyPortal = basePath === "/faculty";
  const canCreate =
    isAdmin ||
    isFacultyPortal ||
    !roleScope ||
    canEditItem("assignments.all") ||
    canEditItem("assignments.create");
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

  // Admin / CM / Counsellor: reuse shared branch scope (not faculty teaching-desk).
  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

  /** Concrete branch for course/batch targeting. Faculty portal stays unscoped. */
  const targetBranchId = useMemo(() => {
    if (isFacultyPortal) return undefined;
    if (branchIdForQuery) return branchIdForQuery;
    // Single allowed/available branch: use it even if store still says ALL.
    if (branches.length === 1) return branches[0].id;
    return undefined;
  }, [isFacultyPortal, branchIdForQuery, branches]);

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

  const prevBranchRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isFacultyPortal) return;
    if (prevBranchRef.current === undefined) {
      prevBranchRef.current = targetBranchId;
      return;
    }
    if (prevBranchRef.current !== targetBranchId) {
      prevBranchRef.current = targetBranchId;
      setTargets([createEmptyTargetLine()]);
      setSelectedStudentIds([]);
      setValue("facultyId", "");
    }
  }, [targetBranchId, isFacultyPortal, setValue]);

  // Create form: prefer a concrete branch over "All" so targets stay scoped.
  useEffect(() => {
    if (isFacultyPortal || !allowAllBranches) return;
    if (selectedBranchId !== "ALL") return;
    if (branches.length === 1) {
      setSelectedBranchId(branches[0].id);
    }
  }, [
    isFacultyPortal,
    allowAllBranches,
    selectedBranchId,
    branches,
    setSelectedBranchId,
  ]);

  useEffect(() => {
    if (!canCreate) {
      navigate(assignmentsBase, { replace: true, state: { accessDenied: true, readOnly: true } });
    }
  }, [canCreate, navigate, assignmentsBase]);

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
  const selectedFacultyId = watch("facultyId");

  // Admin/CM/Counsellor: faculty list scoped to selected branch (same API as faculty list pages).
  const { data: facultyRes } = useQuery({
    queryKey: ["faculty-list", "assignment-create", targetBranchId || "none"],
    queryFn: () =>
      facultyApi.getAll({
        limit: 100,
        ...(targetBranchId ? { branchId: targetBranchId } : {}),
      }),
    enabled: !isFacultyPortal && Boolean(targetBranchId),
  });
  const facultyList = facultyRes?.data || [];
  const lockedFacultyLabel = user?.name || "You";

  // Drop stale faculty when branch filter returns a different set.
  useEffect(() => {
    if (isFacultyPortal || !targetBranchId || !selectedFacultyId) return;
    if (facultyList.length === 0) return;
    if (!facultyList.some((f) => f.id === selectedFacultyId)) {
      setValue("facultyId", "");
    }
  }, [
    isFacultyPortal,
    targetBranchId,
    selectedFacultyId,
    facultyList,
    setValue,
  ]);
  const batchIds = useMemo(
    () => [...new Set(targets.map((t) => t.batchId).filter(Boolean))],
    [targets]
  );
  const { data: enrolledRes } = useEnrolledStudentsForBatches(batchIds);
  const enrolledStudents = enrolledRes?.data || [];

  const onSubmit = async (values: FormValues) => {
    setError(null);
    if (!isFacultyPortal && !targetBranchId) {
      setError("Select a branch before assigning courses and batches");
      return;
    }
    const validTargets = targets.filter((t) => t.courseId && t.batchId);
    if (validTargets.length === 0) {
      setError("Add at least one target with course and batch");
      return;
    }
    if (limitStudents && selectedStudentIds.length === 0) {
      setError("Select at least one student, or turn off “Limit to specific students”");
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
        recipientStudentIds: limitStudents ? selectedStudentIds : undefined,
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

  if (!canCreate) {
    return null;
  }

  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Create Assignment"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(assignmentsBase)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-assignment-form"
              disabled={createMutation.isPending || uploadAttachment.isPending}
            >
              {(createMutation.isPending || uploadAttachment.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </div>
        }
      />

      <form id="create-assignment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}

        <Card className="border-border/60 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isFacultyPortal && (showBranchSelector || (allowAllBranches && branches.length > 0)) && (
              <div className="sm:col-span-2 space-y-1.5 max-w-xs">
                <Label>Branch *</Label>
                <select
                  value={
                    selectedBranchId !== "ALL"
                      ? selectedBranchId
                      : targetBranchId || ""
                  }
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next) setSelectedBranchId(next);
                  }}
                  className="w-full h-10 px-3 border rounded-md text-sm bg-background"
                >
                  {allowAllBranches && !targetBranchId && (
                    <option value="">Select branch</option>
                  )}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input {...register("title")} placeholder="e.g. React Hooks Lab" />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Assigned date</Label>
              <Input type="datetime-local" {...register("assignedAt")} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date *</Label>
              <Input type="datetime-local" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate.message}</p>}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("validTillEnabled")} />
                Set valid-till date
              </label>
              {validTillEnabled && (
                <div className="space-y-1.5">
                  <Input type="datetime-local" {...register("validTill")} />
                  {errors.validTill && (
                    <p className="text-xs text-red-600">{errors.validTill.message}</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Academic year *</Label>
              <MasterSelect
                entityType="academicyear"
                value={academicYearMasterId}
                onChange={(id) => setValue("academicYearMasterId", id, { shouldValidate: true })}
                placeholder="Select academic year"
                includeEmpty={false}
              />
              {errors.academicYearMasterId && (
                <p className="text-xs text-red-600">{errors.academicYearMasterId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Assignment type</Label>
              <MasterSelect
                entityType="assignmenttype"
                value={assignmentTypeMasterId || ""}
                onChange={(id) => setValue("assignmentTypeMasterId", id)}
                placeholder="Select type"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Faculty *</Label>
              {isFacultyPortal ? (
                <>
                  <input type="hidden" {...register("facultyId")} />
                  <Input value={lockedFacultyLabel} disabled className="bg-muted/40" />
                </>
              ) : (
                <select
                  {...register("facultyId")}
                  disabled={!targetBranchId}
                  className="w-full h-10 px-3 border rounded-md text-sm bg-background disabled:opacity-50"
                >
                  <option value="">
                    {targetBranchId ? "Select faculty" : "Select branch first"}
                  </option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.employeeCode}
                    </option>
                  ))}
                </select>
              )}
              {errors.facultyId && (
                <p className="text-xs text-red-600">{errors.facultyId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Max marks</Label>
              <Input type="number" min={1} max={1000} {...register("maxMarks")} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-1">
              <input type="checkbox" {...register("allowLate")} />
              Allow late submissions
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-1">
              <input type="checkbox" {...register("restrictStudentUpload")} />
              Restrict student file upload
            </label>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Instructions / remarks</Label>
              <textarea
                {...register("description")}
                className="w-full min-h-[88px] p-3 border rounded-md text-sm"
                placeholder="What should students do?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube video ID</Label>
              <Input {...register("youtubeVideoId")} placeholder="e.g. dQw4w9WgXcQ" />
            </div>
            <div className="space-y-1.5">
              <Label>Instructor attachment</Label>
              {attachment ? (
                <div className="flex items-center justify-between gap-2 h-10 px-3 border rounded-md text-sm">
                  <span className="truncate">{attachment.name}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setAttachment(null); setFileError(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-3 h-10 px-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/30 text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">
                    Upload file · {ALLOWED_ATTACHMENT_LABEL} · max 10MB
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
              {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AssignmentTargetLinesEditor
              lines={targets}
              onChange={setTargets}
              facultyId={isFacultyPortal ? effectiveFacultyId : undefined}
              branchId={isFacultyPortal ? undefined : targetBranchId}
              requireBranch={!isFacultyPortal}
            />
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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
    </PageContainer>
  );
};
