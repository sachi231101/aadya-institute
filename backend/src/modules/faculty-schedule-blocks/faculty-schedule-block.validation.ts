import { z } from "zod";

export const upsertFacultyScheduleBlockSchema = z.object({
  facultyId: z.string().min(1, "Faculty is required"),
  branchId: z.string().optional().or(z.literal("")),
  scheduledDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  blockType: z.enum(["BREAK", "LUNCH"]),
});

export const queryFacultyScheduleBlockSchema = z.object({
  facultyId: z.string().optional(),
  branchId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const deleteFacultyScheduleBlockByKeySchema = z.object({
  facultyId: z.string().min(1, "Faculty is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
});
