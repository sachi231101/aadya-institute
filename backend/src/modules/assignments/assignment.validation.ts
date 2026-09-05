import { z } from "zod";

const targetSchema = z.object({
  courseId: z.string().min(1, "Course is required"),
  courseModuleId: z.string().min(1).optional().nullable(),
  topic: z.string().optional().nullable(),
  batchId: z.string().min(1, "Batch is required"),
});

export const createAssignmentSchema = z
  .object({
    classSessionId: z.string().min(1).optional(),
    batchId: z.string().min(1).optional(),
    facultyId: z.string().min(1).optional(),
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().optional().or(z.literal("")),
    dueDate: z.string().min(1, "Due date is required"),
    assignedAt: z.string().optional().or(z.literal("")),
    validTill: z.string().optional().nullable().or(z.literal("")),
    maxMarks: z.coerce.number().int().positive().max(1000).optional(),
    allowLate: z.boolean().optional(),
    restrictStudentUpload: z.boolean().optional(),
    youtubeVideoId: z.string().optional().nullable().or(z.literal("")),
    assignmentTypeMasterId: z.string().min(1).optional().nullable(),
    academicYearMasterId: z.string().min(1, "Academic year is required"),
    targets: z.array(targetSchema).optional(),
    recipientStudentIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (d) =>
      (d.targets && d.targets.length > 0) || !!d.classSessionId || !!d.batchId,
    {
      message: "At least one target, batch, or class session is required",
      path: ["targets"],
    }
  );

export const updateAssignmentSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  assignedAt: z.string().optional().or(z.literal("")),
  validTill: z.string().optional().nullable().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  maxMarks: z.coerce.number().int().positive().max(1000).optional(),
  allowLate: z.boolean().optional(),
  restrictStudentUpload: z.boolean().optional(),
  youtubeVideoId: z.string().optional().nullable().or(z.literal("")),
  facultyId: z.string().min(1).optional(),
  assignmentTypeMasterId: z.string().min(1).optional().nullable(),
  academicYearMasterId: z.string().min(1).optional().nullable(),
  classSessionId: z.string().min(1).optional().nullable(),
  targets: z.array(targetSchema).min(1).optional(),
  recipientStudentIds: z.array(z.string().min(1)).optional().nullable(),
  attachmentFileKey: z.string().optional().nullable(),
  attachmentFileName: z.string().optional().nullable(),
});

export const queryAssignmentSchema = z.object({
  batchId: z.string().optional(),
  classSessionId: z.string().optional(),
  facultyId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  assignedFrom: z.string().optional(),
  assignedTo: z.string().optional(),
  academicYearMasterId: z.string().optional(),
  assignmentTypeMasterId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const querySubmissionsSchema = z.object({
  status: z.enum(["PENDING", "SUBMITTED", "LATE", "GRADED"]).optional(),
  /** Comma-separated statuses, e.g. SUBMITTED,LATE,GRADED */
  statuses: z.string().optional(),
  batchId: z.string().optional(),
  facultyId: z.string().optional(),
  search: z.string().optional(),
  /** Only rows with submittedAt set (excludes PENDING stubs) */
  submittedOnly: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
  /** Submitted/late and not yet graded */
  ungradedOnly: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const gradeSubmissionSchema = z.object({
  marks: z.coerce.number().min(0, "Marks must be >= 0"),
  feedback: z.string().optional().or(z.literal("")),
});

export const submitAssignmentSchema = z.object({
  fileKey: z.string().min(1, "File reference is required"),
  fileName: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
