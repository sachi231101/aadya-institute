import { z } from "zod";

const scheduleSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

const scheduleLineSchema = z.object({
  courseId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  timeSlot: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
  facultyId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  attendanceEnabled: z.coerce.boolean().optional(),
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
});

const batchCourseItemSchema = z.object({
  courseId: z.string().min(1),
  facultyId: z.string().optional().or(z.literal("")),
  sequence: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional().or(z.literal("")),
  expectedEndDate: z.string().optional().or(z.literal("")),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
  timeSlot: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
  schedules: z.array(scheduleSlotSchema).optional(),
});

const hasCourseScheduleInfo = (item: {
  startDate?: string;
  schedulePattern?: string;
  schedules?: unknown[];
}) => {
  const hasStart = Boolean(item.startDate && item.startDate.trim() !== "");
  const hasPattern =
    Boolean(item.schedulePattern && item.schedulePattern.trim() !== "" && item.schedulePattern !== "CUSTOM") ||
    Boolean(item.schedules && item.schedules.length > 0);
  return hasStart && hasPattern;
};

export const createBatchSchema = z
  .object({
    name: z.string().min(1, "Batch name is required"),
    code: z.string().min(1, "Batch code is required"),
    courseId: z.string().optional().or(z.literal("")),
    facultyId: z.string().optional().or(z.literal("")),
    courses: z.array(batchCourseItemSchema).optional(),
    scheduleLines: z.array(scheduleLineSchema).optional(),
    branchId: z.string().optional().or(z.literal("")),
    startDate: z.string().optional().or(z.literal("")),
    expectedEndDate: z.string().optional().or(z.literal("")),
    capacity: z.coerce.number().int().positive().optional(),
    remark: z.string().optional().or(z.literal("")),
    status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
    timeSlot: z.string().optional().or(z.literal("")),
    timeslotMasterId: z.string().optional().or(z.literal("")),
    classroomMasterId: z.string().optional().or(z.literal("")),
    schedules: z.array(scheduleSlotSchema).optional(),
  })
  .refine(
    (data) =>
      (data.scheduleLines && data.scheduleLines.length > 0) ||
      (data.courses && data.courses.length > 0) ||
      (data.courseId && data.courseId.trim() !== ""),
    { message: "Add at least one schedule line or course", path: ["scheduleLines"] }
  )
  .refine(
    (data) => {
      if (data.scheduleLines && data.scheduleLines.length > 0) {
        return Boolean(data.startDate && data.startDate.trim() !== "");
      }
      if (data.courses && data.courses.length > 0) {
        const batchFallbackStart = data.startDate && data.startDate.trim() !== "";
        const batchFallbackPattern =
          (data.schedulePattern && data.schedulePattern !== "CUSTOM") ||
          (data.schedules && data.schedules.length > 0);
        return data.courses.every(
          (c) =>
            hasCourseScheduleInfo(c) ||
            (batchFallbackStart && Boolean(batchFallbackPattern || c.schedulePattern || c.schedules?.length))
        );
      }
      return Boolean(data.startDate && data.startDate.trim() !== "");
    },
    {
      message: "Start date is required (batch header or per-course)",
      path: ["startDate"],
    }
  );

export const updateBatchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  courseId: z.string().optional(),
  facultyId: z.string().optional().or(z.literal("")),
  courses: z.array(batchCourseItemSchema).optional(),
  scheduleLines: z.array(scheduleLineSchema).optional(),
  branchId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional(),
  remark: z.string().optional().or(z.literal("")),
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
  batchCourseId: z.string().optional().or(z.literal("")),
  facultyId: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  attendanceEnabled: z.coerce.boolean().optional(),
});

export const updateBatchScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
  batchCourseId: z.string().optional().nullable(),
  facultyId: z.string().optional().nullable(),
  timeslotMasterId: z.string().optional().nullable(),
  classroomMasterId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  attendanceEnabled: z.coerce.boolean().optional(),
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

export const availableFacultyQuerySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timeslotMasterId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  branchId: z.string().optional(),
  excludeBatchId: z.string().optional(),
});
