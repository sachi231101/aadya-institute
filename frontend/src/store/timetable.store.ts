import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TimetableSlotItem {
  id: string;
  facultyId: string;
  facultyName: string;
  branchId: string;
  branchName: string;
  courseId: string;
  courseName: string;
  category: "Digital Marketing" | "Design" | "Data Analytics" | "Programming" | "Others";
  batchId: string;
  batchCode: string;
  batchName: string;
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
  period: number; // 1 to 7
  startTime: string;
  endTime: string;
  roomNo: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  studentCount?: number;
  assignedStudentIds?: string[];
  attendanceStatus?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  attendanceSummary?: { present: number; absent: number; excused: number };
}

export interface CustomBatchItem {
  id: string;
  code: string;
  name: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  branchId: string;
  branchName: string;
  capacity: number;
  studentIds: string[];
  days: string[];
  period: number;
  startTime: string;
  endTime: string;
  roomNo: string;
  createdAt: string;
}

const DEFAULT_SCHEDULES: TimetableSlotItem[] = [];

interface TimetableStore {
  classes: TimetableSlotItem[];
  batches: CustomBatchItem[];
  addClass: (cls: TimetableSlotItem) => void;
  updateClass: (id: string, updates: Partial<TimetableSlotItem>) => void;
  deleteClass: (id: string) => void;
  createBatchWithSchedule: (batchData: {
    code: string;
    name: string;
    courseId: string;
    courseName: string;
    category: "Digital Marketing" | "Design" | "Data Analytics" | "Programming" | "Others";
    facultyId: string;
    facultyName: string;
    branchId: string;
    branchName: string;
    capacity: number;
    studentIds: string[];
    days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">;
    period: number;
    startTime: string;
    endTime: string;
    roomNo: string;
  }) => void;
  resetToDefault: () => void;
}

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set) => ({
      classes: DEFAULT_SCHEDULES,
      batches: [],
      addClass: (cls) =>
        set((state) => ({
          classes: [cls, ...state.classes],
        })),
      updateClass: (id, updates) =>
        set((state) => ({
          classes: state.classes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteClass: (id) =>
        set((state) => ({
          classes: state.classes.filter((c) => c.id !== id),
        })),
      createBatchWithSchedule: (batchData) => {
        const batchId = `batch-${Date.now()}`;
        const newBatch: CustomBatchItem = {
          id: batchId,
          code: batchData.code,
          name: batchData.name,
          courseId: batchData.courseId,
          courseName: batchData.courseName,
          facultyId: batchData.facultyId,
          facultyName: batchData.facultyName,
          branchId: batchData.branchId,
          branchName: batchData.branchName,
          capacity: batchData.capacity,
          studentIds: batchData.studentIds,
          days: batchData.days,
          period: batchData.period,
          startTime: batchData.startTime,
          endTime: batchData.endTime,
          roomNo: batchData.roomNo,
          createdAt: new Date().toISOString(),
        };

        // Create timetable slot entries for each chosen day
        const newSlots: TimetableSlotItem[] = batchData.days.map((day, idx) => ({
          id: `slot-${batchId}-${day}-${idx}`,
          facultyId: batchData.facultyId,
          facultyName: batchData.facultyName,
          branchId: batchData.branchId,
          branchName: batchData.branchName,
          courseId: batchData.courseId,
          courseName: batchData.courseName,
          category: batchData.category,
          batchId: batchId,
          batchCode: batchData.code,
          batchName: batchData.name,
          dayOfWeek: day,
          period: batchData.period,
          startTime: batchData.startTime,
          endTime: batchData.endTime,
          roomNo: batchData.roomNo,
          mode: "OFFLINE",
          status: "UPCOMING",
          studentCount: batchData.studentIds.length > 0 ? batchData.studentIds.length : batchData.capacity,
          assignedStudentIds: batchData.studentIds,
          attendanceStatus: "PENDING",
        }));

        set((state) => ({
          batches: [newBatch, ...state.batches],
          classes: [...newSlots, ...state.classes],
        }));
      },
      resetToDefault: () => set({ classes: DEFAULT_SCHEDULES, batches: [] }),
    }),
    {
      name: "aadya_timetable_store",
    }
  )
);
