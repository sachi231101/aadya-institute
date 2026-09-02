import { api } from "./api";

export interface BatchCourseItem {
  id?: string;
  courseId: string;
  facultyId?: string | null;
  sequence?: number;
  startDate?: string | null;
  expectedEndDate?: string | null;
  schedulePattern?: string | null;
  timeSlot?: string | null;
  timeslotMasterId?: string | null;
  classroomMasterId?: string | null;
  course?: { id: string; name: string; code: string };
  faculty?: {
    id: string;
    employeeCode: string;
    user?: { id: string; name: string; email?: string; phone?: string };
  } | null;
  timeslotMaster?: { id: string; name: string; code?: string | null } | null;
  classroomMaster?: { id: string; name: string; code?: string | null } | null;
  schedules?: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    batchCourseId?: string | null;
  }>;
}

export interface BatchData {
  id: string;
  name: string;
  code: string;
  courseId: string;
  branchId?: string;
  facultyId?: string | null;
  startDate: string;
  expectedEndDate?: string | null;
  capacity?: number;
  remark?: string | null;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM" | string;
  timeSlot?: string;
  timeslotMasterId?: string | null;
  classroomMasterId?: string | null;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt?: string;
  course?: { id: string; name: string; code: string };
  batchCourses?: BatchCourseItem[];
  faculty?: {
    id: string;
    employeeCode: string;
    user?: { id: string; name: string; email?: string; phone?: string };
  } | null;
  branch?: { id: string; name: string; code: string };
  schedules?: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    batchCourseId?: string | null;
    facultyId?: string | null;
    timeslotMasterId?: string | null;
    classroomMasterId?: string | null;
    status?: string;
    attendanceEnabled?: boolean;
    faculty?: {
      id: string;
      employeeCode?: string;
      user?: { id?: string; name?: string };
    } | null;
    timeslotMaster?: { id: string; name: string } | null;
    classroomMaster?: { id: string; name: string } | null;
    batchCourse?: {
      id: string;
      courseId: string;
      course?: { id: string; name: string; code: string };
    } | null;
  }>;
  _count?: { enrollments: number; classSessions: number };
  enrollments?: Array<{
    id: string;
    studentId: string;
    student?: {
      id: string;
      studentCode: string;
      qualification?: string;
      user?: { id: string; name: string; email?: string; phone?: string };
    };
  }>;
}

export interface ScheduleLinePayload {
  courseId: string;
  dayOfWeek: number;
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  facultyId?: string;
  status?: "ACTIVE" | "INACTIVE";
  attendanceEnabled?: boolean;
}

export interface BatchCoursePayload {
  courseId: string;
  facultyId?: string;
  sequence?: number;
  startDate?: string;
  expectedEndDate?: string;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
}

export interface CreateBatchPayload {
  name: string;
  code: string;
  courseId?: string;
  facultyId?: string;
  courses?: BatchCoursePayload[];
  scheduleLines?: ScheduleLinePayload[];
  branchId?: string;
  startDate?: string;
  expectedEndDate?: string;
  capacity?: number;
  remark?: string;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
}

export const batchesApi = {
  getAll: async (params?: { search?: string; courseId?: string; facultyId?: string; status?: string; branchId?: string }) => {
    const response = await api.get<{ success: boolean; data: BatchData[] }>("/batches", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: BatchData }>(`/batches/${id}`);
    return response.data;
  },

  getStudents: async (batchId: string) => {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        id: string;
        studentId: string;
        student: {
          id: string;
          studentCode: string;
          qualification?: string;
          user?: { id: string; name: string; email?: string; phone?: string };
        };
      }>;
    }>(`/batches/${batchId}/students`);
    return response.data;
  },

  create: async (data: CreateBatchPayload) => {
    const response = await api.post<{ success: boolean; data: BatchData }>("/batches", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateBatchPayload> & { status?: BatchData["status"] }) => {
    const response = await api.patch<{ success: boolean }>(`/batches/${id}`, data);
    return response.data;
  },

  assignFaculty: async (batchId: string, facultyId: string) => {
    const response = await api.patch<{ success: boolean }>(`/batches/${batchId}/faculty`, { facultyId });
    return response.data;
  },

  enrollStudent: async (batchId: string, studentId: string, admissionId?: string) => {
    const response = await api.post<{ success: boolean }>(`/batches/${batchId}/students`, {
      studentId,
      admissionId,
    });
    return response.data;
  },

  removeStudent: async (batchId: string, studentId: string) => {
    const response = await api.delete<{ success: boolean }>(`/batches/${batchId}/students/${studentId}`);
    return response.data;
  },

  transferStudent: async (
    studentId: string,
    fromBatchId: string,
    toBatchId: string,
    admissionId?: string
  ) => {
    const response = await api.post<{ success: boolean }>("/batches/transfer-student", {
      studentId,
      fromBatchId,
      toBatchId,
      admissionId,
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean; data: BatchData }>(`/batches/${id}`);
    return response.data;
  },

  getSchedules: async (batchId: string) => {
    const response = await api.get<{ success: boolean; data: BatchData["schedules"] }>(`/batches/${batchId}/schedules`);
    return response.data;
  },

  createSchedule: async (batchId: string, data: { dayOfWeek: number; startTime: string; endTime: string; effectiveFrom?: string; effectiveTo?: string }) => {
    const response = await api.post(`/batches/${batchId}/schedules`, data);
    return response.data;
  },

  updateSchedule: async (batchId: string, scheduleId: string, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string; effectiveFrom?: string; effectiveTo?: string }>) => {
    const response = await api.patch(`/batches/${batchId}/schedules/${scheduleId}`, data);
    return response.data;
  },

  deleteSchedule: async (batchId: string, scheduleId: string) => {
    const response = await api.delete(`/batches/${batchId}/schedules/${scheduleId}`);
    return response.data;
  },

  generateSessions: async (batchId: string, data?: { startDate?: string; endDate?: string }) => {
    const response = await api.post(`/batches/${batchId}/generate-sessions`, data ?? {});
    return response.data;
  },

  getAvailableFaculty: async (params: {
    dayOfWeek: number;
    startTime?: string;
    endTime?: string;
    timeslotMasterId?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    excludeBatchId?: string;
  }) => {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        id: string;
        employeeCode?: string;
        user?: { id?: string; name?: string; email?: string; phone?: string };
      }>;
    }>("/batches/faculty/available", { params });
    return response.data;
  },
};
