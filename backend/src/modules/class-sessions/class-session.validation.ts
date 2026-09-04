import { z } from "zod";

export const createClassSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  batchId: z.string().min(1, "Batch is required"),
  batchModuleId: z.string().optional().or(z.literal("")),
  batchCourseId: z.string().optional().or(z.literal("")),
  facultyId: z.string().min(1, "Faculty is required"),
  branchId: z.string().optional().or(z.literal("")),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomNo: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
  meetingUrl: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  sessionType: z.enum(["THEORY", "PRACTICAL"]).optional(),
});

export const updateClassSessionSchema = z.object({
  title: z.string().min(1).optional(),
  batchId: z.string().optional(),
  batchModuleId: z.string().optional().or(z.literal("")),
  batchCourseId: z.string().optional().nullable().or(z.literal("")),
  facultyId: z.string().optional(),
  scheduledDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  roomNo: z.string().optional().or(z.literal("")),
  classroomMasterId: z.string().optional().or(z.literal("")),
  timeslotMasterId: z.string().optional().or(z.literal("")),
  mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
  meetingUrl: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  sessionType: z.enum(["THEORY", "PRACTICAL"]).optional(),
  status: z.enum(["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export const queryClassSessionSchema = z.object({
  batchId: z.string().optional(),
  facultyId: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
  sessionType: z.enum(["THEORY", "PRACTICAL"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
