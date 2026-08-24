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

const DEFAULT_SCHEDULES: TimetableSlotItem[] = [
  // Ramesh Kumar (FA-RAMESH / FA001) - Monday
  { id: "rk-1", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-dm", courseName: "Digital Marketing", category: "Digital Marketing", batchId: "b-dm01", batchCode: "Batch DM-01", batchName: "DM Executive", dayOfWeek: "MON", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },
  { id: "rk-2", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-seo", courseName: "SEO Masterclass", category: "Digital Marketing", batchId: "b-seo01", batchCode: "Batch SEO-01", batchName: "SEO Morning", dayOfWeek: "MON", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "COMPLETED", attendanceSummary: { present: 36, absent: 4, excused: 2 } },
  { id: "rk-3", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-ga", courseName: "Google Ads (PPC)", category: "Digital Marketing", batchId: "b-ga01", batchCode: "Batch GA-01", batchName: "Google Ads Pro", dayOfWeek: "MON", period: 3, startTime: "11:15 AM", endTime: "12:15 PM", roomNo: "Lab 2", mode: "OFFLINE", status: "UPCOMING", studentCount: 38, attendanceStatus: "PENDING" },
  { id: "rk-4", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-smm", courseName: "Social Media Ads", category: "Digital Marketing", batchId: "b-smm01", batchCode: "Batch SMM-01", batchName: "Social Media 1", dayOfWeek: "MON", period: 4, startTime: "12:15 PM", endTime: "01:15 PM", roomNo: "Lab 2", mode: "OFFLINE", status: "UPCOMING", studentCount: 40, attendanceStatus: "PENDING" },
  { id: "rk-5", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-content", courseName: "Content Strategy", category: "Digital Marketing", batchId: "b-cm01", batchCode: "Batch CM-01", batchName: "Content Marketing", dayOfWeek: "MON", period: 5, startTime: "02:00 PM", endTime: "03:00 PM", roomNo: "Room 203", mode: "OFFLINE", status: "UPCOMING", studentCount: 35, attendanceStatus: "PENDING" },
  { id: "rk-6", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-email", courseName: "Email Automation", category: "Digital Marketing", batchId: "b-em01", batchCode: "Batch EM-01", batchName: "Email Marketing", dayOfWeek: "MON", period: 6, startTime: "03:00 PM", endTime: "04:00 PM", roomNo: "Room 203", mode: "OFFLINE", status: "UPCOMING", studentCount: 30, attendanceStatus: "PENDING" },
  { id: "rk-7", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-analytics", courseName: "Web Analytics 4", category: "Digital Marketing", batchId: "b-an01", batchCode: "Batch AN-01", batchName: "Web Analytics", dayOfWeek: "MON", period: 7, startTime: "04:15 PM", endTime: "05:15 PM", roomNo: "Lab 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },

  // Ramesh Kumar - Tuesday
  { id: "rk-8", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-seo", courseName: "SEO Advanced", category: "Digital Marketing", batchId: "b-seo02", batchCode: "Batch SEO-02", batchName: "SEO Advanced", dayOfWeek: "TUE", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 36, attendanceStatus: "PENDING" },
  { id: "rk-9", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-dm", courseName: "Digital Marketing 2", category: "Digital Marketing", batchId: "b-dm02", batchCode: "Batch DM-02", batchName: "Digital Marketing 2", dayOfWeek: "TUE", period: 3, startTime: "11:15 AM", endTime: "12:15 PM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 38, attendanceStatus: "PENDING" },
  { id: "rk-10", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-ga", courseName: "Google Ads 2", category: "Digital Marketing", batchId: "b-ga02", batchCode: "Batch GA-02", batchName: "Google Ads 2", dayOfWeek: "TUE", period: 4, startTime: "12:15 PM", endTime: "01:15 PM", roomNo: "Lab 2", mode: "OFFLINE", status: "UPCOMING", studentCount: 40, attendanceStatus: "PENDING" },
  { id: "rk-11", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-smm", courseName: "Social Media 2", category: "Digital Marketing", batchId: "b-smm02", batchCode: "Batch SMM-02", batchName: "Social Media 2", dayOfWeek: "TUE", period: 5, startTime: "02:00 PM", endTime: "03:00 PM", roomNo: "Lab 2", mode: "OFFLINE", status: "UPCOMING", studentCount: 35, attendanceStatus: "PENDING" },

  // Ramesh Kumar - Wednesday
  { id: "rk-12", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-dm", courseName: "Digital Marketing", category: "Digital Marketing", batchId: "b-dm01", batchCode: "Batch DM-01", batchName: "DM Executive", dayOfWeek: "WED", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },
  { id: "rk-13", facultyId: "FA-RAMESH", facultyName: "Ramesh Kumar", branchId: "b-central", branchName: "Aadya Central Branch", courseId: "c-seo", courseName: "SEO Masterclass", category: "Digital Marketing", batchId: "b-seo01", batchCode: "Batch SEO-01", batchName: "SEO Morning", dayOfWeek: "WED", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },

  // Priya Sharma (FA002)
  { id: "c1", facultyId: "FA002", facultyName: "Priya Sharma", branchId: "b-ramamurthy", branchName: "Ramanagar Branch", courseId: "c-seo", courseName: "SEO Masterclass", category: "Digital Marketing", batchId: "b1", batchCode: "Batch SEO-01", batchName: "SEO Morning", dayOfWeek: "MON", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },
  { id: "c2", facultyId: "FA002", facultyName: "Priya Sharma", branchId: "b-ramamurthy", branchName: "Ramanagar Branch", courseId: "c-dm", courseName: "Digital Marketing", category: "Digital Marketing", batchId: "b2", batchCode: "Batch DM-01", batchName: "Digital Marketing", dayOfWeek: "MON", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Room 201", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "COMPLETED", attendanceSummary: { present: 36, absent: 4, excused: 2 } },
  { id: "c3", facultyId: "FA002", facultyName: "Priya Sharma", branchId: "b-ramamurthy", branchName: "Ramanagar Branch", courseId: "c-ga", courseName: "Google Ads (PPC)", category: "Digital Marketing", batchId: "b3", batchCode: "Batch GA-01", batchName: "Google Ads", dayOfWeek: "MON", period: 3, startTime: "11:15 AM", endTime: "12:15 PM", roomNo: "Lab 2", mode: "OFFLINE", status: "UPCOMING", studentCount: 38, attendanceStatus: "PENDING" },

  // Arjun Das (FA005) - Graphic Design
  { id: "c20", facultyId: "FA005", facultyName: "Arjun Das", branchId: "b-malleswaram", branchName: "Malleshwaram Branch", courseId: "c-ai", courseName: "Illustrator Design", category: "Design", batchId: "ba1", batchCode: "Batch AI-01", batchName: "Illustrator AI-01", dayOfWeek: "MON", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Design Lab 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 28, attendanceStatus: "PENDING" },
  { id: "c21", facultyId: "FA005", facultyName: "Arjun Das", branchId: "b-malleswaram", branchName: "Malleshwaram Branch", courseId: "c-ps", courseName: "Photoshop Editing", category: "Design", batchId: "ba2", batchCode: "Batch PS-01", batchName: "Photoshop PS-01", dayOfWeek: "MON", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Design Lab 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 32, attendanceStatus: "PENDING" },

  // Neha Reddy (FA008) - Data Analytics
  { id: "c30", facultyId: "FA008", facultyName: "Neha Reddy", branchId: "b-central", branchName: "Jayanagar Branch", courseId: "c-excel", courseName: "Advanced Excel", category: "Data Analytics", batchId: "bn1", batchCode: "Batch EX-01", batchName: "Advanced Excel", dayOfWeek: "MON", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Analytics Lab 3", mode: "OFFLINE", status: "UPCOMING", studentCount: 42, attendanceStatus: "PENDING" },
  { id: "c31", facultyId: "FA008", facultyName: "Neha Reddy", branchId: "b-central", branchName: "Jayanagar Branch", courseId: "c-sql", courseName: "SQL Database", category: "Data Analytics", batchId: "bn2", batchCode: "Batch SQL-01", batchName: "Database Queries", dayOfWeek: "MON", period: 2, startTime: "10:00 AM", endTime: "11:00 AM", roomNo: "Analytics Lab 3", mode: "OFFLINE", status: "UPCOMING", studentCount: 40, attendanceStatus: "PENDING" },

  // HM Adithya (FA001) - Full Stack
  { id: "c40", facultyId: "FA001", facultyName: "HM Adithya", branchId: "b-central", branchName: "Bengaluru Central", courseId: "c-mern", courseName: "Full Stack MERN", category: "Programming", batchId: "bm1", batchCode: "Batch MERN-01", batchName: "MERN Fast-Track", dayOfWeek: "MON", period: 1, startTime: "09:00 AM", endTime: "10:00 AM", roomNo: "Tech Studio 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 30, attendanceStatus: "PENDING" },
];

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
    (set, get) => ({
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
