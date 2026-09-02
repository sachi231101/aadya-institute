import { z } from "zod";

const batchCourseItemSchema = z.object({
  courseId: z.string().min(1),
  facultyId: z.string().optional().or(z.literal("")),
  sequence: z.coerce.number().int().positive().optional(),
});

export const createBatchSchema = z
  .object({
    name: z.string().min(1, "Batch name is required"),
    code: z.string().min(1, "Batch code is required"),
    courseId: z.string().optional().or(z.literal("")),
    facultyId: z.string().optional().or(z.literal("")),
    courses: z.array(batchCourseItemSchema).optional(),
    branchId: z.string().optional().or(z.literal("")),
    startDate: z.string().min(1, "Start date is required"),
    expectedEndDate: z.string().optional().or(z.literal("")),
    capacity: z.coerce.number().int().positive().optional(),
    schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
    timeSlot: z.string().optional().or(z.literal("")),
    timeslotMasterId: z.string().optional().or(z.literal("")),
    classroomMasterId: z.string().optional().or(z.literal("")),
    schedules: z
      .array(
        z.object({
          dayOfWeek: z.coerce.number().int().min(0).max(6),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          effectiveFrom: z.string().optional(),
          effectiveTo: z.string().optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      (data.courses && data.courses.length > 0) ||
      (data.courseId && data.courseId.trim() !== ""),
    { message: "Select at least one course", path: ["courses"] }
  );

export const updateBatchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  courseId: z.string().optional(),
  facultyId: z.string().optional().or(z.literal("")),
  courses: z.array(batchCourseItemSchema).optional(),
  branchId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
  timeSlot: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
});

export const assignFacultySchema = z.object({
  facultyId: z.string().min(1, "Faculty ID is required"),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  admissionId: z.string().optional(),
});

export const createBatchScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

export const updateBatchScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
});

export const generateSessionsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const transferStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  fromBatchId: z.string().min(1, "Source batch ID is required"),
  toBatchId: z.string().min(1, "Target batch ID is required"),
  admissionId: z.string().optional(),
});
