import { z } from "zod";

const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export const rosterQuerySchema = z.object({
  date: z.string().min(1, "Date is required"),
  branchId: z.string().optional(),
  batchId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
}).partial({ page: true, limit: true });

export const markAttendanceSchema = z.object({
  classSessionId: z.string().min(1, "Class session ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  status: attendanceStatusEnum,
  remarks: z.string().optional(),
});

export const bulkMarkAttendanceSchema = z.object({
  classSessionId: z.string().optional(),
  entries: z.array(
    z.object({
      classSessionId: z.string().optional(),
      studentId: z.string().min(1, "Student ID is required"),
      status: attendanceStatusEnum,
      remarks: z.string().optional(),
    })
  ).min(1, "At least one entry is required"),
});

export type RosterQuery = z.infer<typeof rosterQuerySchema>;
export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceDto = z.infer<typeof bulkMarkAttendanceSchema>;
