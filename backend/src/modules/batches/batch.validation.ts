import { z } from "zod";

export const createBatchSchema = z.object({
  name: z.string().min(2, "Batch name must be at least 2 characters"),
  code: z.string().min(2, "Batch code must be at least 2 characters"),
  courseId: z.string().min(1, "Course is required"),
  facultyId: z.string().optional(),
  branchId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  expectedEndDate: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional(),
  timeSlot: z.string().optional(),
});

export const updateBatchSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  courseId: z.string().optional(),
  facultyId: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  schedulePattern: z.enum(["MWF", "TTS", "WEEKEND", "CUSTOM"]).optional(),
  timeSlot: z.string().optional(),
});

export const assignFacultySchema = z.object({
  facultyId: z.string().min(1, "Faculty ID is required"),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  admissionId: z.string().optional(),
});
