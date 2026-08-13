import { z } from "zod";

export const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LEAVE"]);

export const rosterQuerySchema = z.object({
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
  branchId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const markAttendanceSchema = z.object({
  classSessionId: z.string().min(1, "classSessionId is required"),
  studentId: z.string().min(1, "studentId is required"),
  status: attendanceStatusEnum,
  remarks: z.string().optional(),
});

export const bulkMarkAttendanceSchema = z.object({
  classSessionId: z.string().optional(),
  entries: z.array(
    z.object({
      classSessionId: z.string().optional(),
      studentId: z.string().min(1, "studentId is required"),
      status: attendanceStatusEnum,
      remarks: z.string().optional(),
    })
  ).min(1, "At least one attendance entry is required"),
});

export const postSessionAttendanceSchema = z.object({
  attendance: z.array(
    z.object({
      studentId: z.string().min(1, "studentId is required"),
      status: attendanceStatusEnum,
      remarks: z.string().optional(),
    })
  ).min(1, "Attendance list cannot be empty"),
});

export const patchAttendanceSchema = z.object({
  status: attendanceStatusEnum.optional(),
  remarks: z.string().optional(),
});

export const studentAttendanceQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type RosterQuery = z.infer<typeof rosterQuerySchema>;
export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceDto = z.infer<typeof bulkMarkAttendanceSchema>;
export type PostSessionAttendanceDto = z.infer<typeof postSessionAttendanceSchema>;
export type PatchAttendanceDto = z.infer<typeof patchAttendanceSchema>;
export type StudentAttendanceQuery = z.infer<typeof studentAttendanceQuerySchema>;
