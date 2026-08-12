import { create } from "zustand";
import type { ClassSession } from "../types/schedule.types";

interface ScheduleState {
  classes: ClassSession[];

  // Actions
  addClassSession: (session: Omit<ClassSession, "id" | "attendanceMarked">) => void;
  updateClassSession: (id: string, data: Partial<ClassSession>) => void;
  deleteClassSession: (id: string) => void;
  cancelClassSession: (id: string) => void;
  toggleAttendanceMarked: (id: string) => void;
}

const today = new Date().toISOString().split("T")[0];

// Dynamic dates helper
const getDateOffset = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const initialClasses: ClassSession[] = [
  {
    id: "cls-101",
    title: "Advanced React Patterns & Custom Hooks",
    batchId: "b-1",
    batchCode: "FS-2026-A1",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    facultyId: "f-1",
    facultyName: "Dr. Rajesh Verma",
    date: today,
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    roomNo: "Lab 201 (Main Building)",
    mode: "OFFLINE",
    status: "ONGOING",
    attendanceMarked: true,
    meetingUrl: "https://meet.google.com/xyz-aadya-mern",
    notes: "Bring laptops with Node.js v20+ preinstalled.",
  },
  {
    id: "cls-102",
    title: "PostgreSQL Schema Modeling & Transactions",
    batchId: "b-3",
    batchCode: "BE-2026-B2",
    courseId: "c-2",
    courseName: "Backend Engineering & Systems",
    facultyId: "f-1",
    facultyName: "Dr. Rajesh Verma",
    date: today,
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    roomNo: "Room 104",
    mode: "HYBRID",
    status: "UPCOMING",
    attendanceMarked: false,
    meetingUrl: "https://meet.google.com/backend-aadya",
    notes: "Hands-on session with Prisma ORM.",
  },
  {
    id: "cls-103",
    title: "Introduction to PyTorch & Neural Nets",
    batchId: "b-4",
    batchCode: "DS-2026-W1",
    courseId: "c-3",
    courseName: "Data Science & Applied Machine Learning",
    facultyId: "f-3",
    facultyName: "Dr. Suresh Kumar",
    date: getDateOffset(1),
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    roomNo: "AI Lab 302",
    mode: "ONLINE",
    status: "UPCOMING",
    attendanceMarked: false,
    meetingUrl: "https://zoom.us/j/9876543210",
    notes: "Jupyter notebooks shared in Google Drive.",
  },
  {
    id: "cls-104",
    title: "Node.js Event Loop & Microservices Architecture",
    batchId: "b-2",
    batchCode: "FS-2026-B1",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    facultyId: "f-2",
    facultyName: "Prof. Ananya Roy",
    date: getDateOffset(2),
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    roomNo: "Lab 202",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "cls-105",
    title: "Figma Component Systems & Auto Layout",
    batchId: "b-5",
    batchCode: "UX-2026-X1",
    courseId: "c-4",
    courseName: "Product UI/UX Design Masterclass",
    facultyId: "f-4",
    facultyName: "Priya Sharma",
    date: getDateOffset(3),
    startTime: "11:00 AM",
    endTime: "01:00 PM",
    roomNo: "Design Studio 1",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
  },
  {
    id: "cls-100",
    title: "TypeScript Generics & Utility Types",
    batchId: "b-1",
    batchCode: "FS-2026-A1",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    facultyId: "f-1",
    facultyName: "Dr. Rajesh Verma",
    date: getDateOffset(-1),
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    roomNo: "Lab 201",
    mode: "OFFLINE",
    status: "COMPLETED",
    attendanceMarked: true,
  },
];

export const useScheduleStore = create<ScheduleState>((set) => ({
  classes: initialClasses,

  addClassSession: (data) =>
    set((state) => {
      const newSession: ClassSession = {
        ...data,
        id: `cls-${Date.now()}`,
        attendanceMarked: false,
      };
      return { classes: [newSession, ...state.classes] };
    }),

  updateClassSession: (id, data) =>
    set((state) => ({
      classes: state.classes.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  deleteClassSession: (id) =>
    set((state) => ({
      classes: state.classes.filter((c) => c.id !== id),
    })),

  cancelClassSession: (id) =>
    set((state) => ({
      classes: state.classes.map((c) => (c.id === id ? { ...c, status: "CANCELLED" as const } : c)),
    })),

  toggleAttendanceMarked: (id) =>
    set((state) => ({
      classes: state.classes.map((c) =>
        c.id === id ? { ...c, attendanceMarked: !c.attendanceMarked } : c
      ),
    })),
}));
