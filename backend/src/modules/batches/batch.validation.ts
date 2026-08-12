import { z } from "zod";

export const createBatchSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  code: z.string().min(1, "Batch code is required"),
  courseId: z.string().min(1, "Course is required"),
  facultyId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  expectedEndDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional(),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
  timeSlot: z.string().optional().or(z.literal("")),
});

export const updateBatchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  courseId: z.string().optional(),
  facultyId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional().or(z.literal("")),
  timeSlot: z.string().optional().or(z.literal("")),
});

export const assignFacultySchema = z.object({
  facultyId: z.string().min(1, "Faculty ID is required"),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  admissionId: z.string().optional(),
});
