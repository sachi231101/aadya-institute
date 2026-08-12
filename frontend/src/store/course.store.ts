import { create } from "zustand";
import type { Course, CourseModule, Topic } from "../types/course.types";
import type { Batch } from "../types/batch.types";

interface CourseState {
  courses: Course[];
  batches: Batch[];
  modules: CourseModule[];

  // Course Actions
  addCourse: (courseData: Omit<Course, "id" | "createdAt" | "modulesCount" | "enrolledStudents">) => void;
  updateCourse: (id: string, courseData: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  // Batch Actions
  addBatch: (batchData: Omit<Batch, "id" | "enrolledCount">) => void;
  updateBatch: (id: string, batchData: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;

  // Student & Faculty Batch Assignments
  enrolledStudentsMap: Record<string, string[]>;
  assignStudentToBatch: (batchId: string, studentId: string) => void;
  removeStudentFromBatch: (batchId: string, studentId: string) => void;
  assignFacultyToBatch: (batchId: string, facultyId: string, facultyName: string) => void;

  // Curriculum Actions
  addModule: (courseId: string, title: string, code: string) => void;
  addTopic: (moduleId: string, title: string, durationHours: number, description?: string) => void;
  toggleTopicCompletion: (moduleId: string, topicId: string) => void;
}

const initialCourses: Course[] = [
  {
    id: "c-1",
    name: "Full Stack MERN Architecture",
    code: "FS-2026",
    category: "Web Development",
    mode: "HYBRID",
    level: "INTERMEDIATE",
    durationMonths: 6,
    totalHours: 240,
    modulesCount: 6,
    enrolledStudents: 64,
    status: "ACTIVE",
    description: "Master React, Node.js, Express, MongoDB, TypeScript, and microservices architecture.",
    createdAt: "2026-01-10",
  },
  {
    id: "c-2",
    name: "Backend Engineering & Systems",
    code: "BE-2026",
    category: "Backend & Cloud",
    mode: "OFFLINE",
    level: "ADVANCED",
    durationMonths: 4,
    totalHours: 180,
    modulesCount: 5,
    enrolledStudents: 42,
    status: "ACTIVE",
    description: "In-depth distributed systems, PostgreSQL, Redis, message queues (BullMQ), and API gateway setup.",
    createdAt: "2026-01-15",
  },
  {
    id: "c-3",
    name: "Data Science & Applied Machine Learning",
    code: "DS-2026",
    category: "AI & Data",
    mode: "ONLINE",
    level: "BEGINNER",
    durationMonths: 6,
    totalHours: 220,
    modulesCount: 7,
    enrolledStudents: 38,
    status: "ACTIVE",
    description: "Python, Pandas, Scikit-Learn, PyTorch basics, and predictive model deployment.",
    createdAt: "2026-02-01",
  },
  {
    id: "c-4",
    name: "Product UI/UX Design Masterclass",
    code: "UX-2026",
    category: "Design",
    mode: "HYBRID",
    level: "BEGINNER",
    durationMonths: 3,
    totalHours: 120,
    modulesCount: 4,
    enrolledStudents: 28,
    status: "INACTIVE",
    description: "User research, wireframing, Figma design systems, prototyping, and usability testing.",
    createdAt: "2026-02-10",
  },
];

const initialBatches: Batch[] = [
  {
    id: "b-1",
    name: "MERN Batch Alpha",
    code: "FS-2026-A1",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    facultyId: "f-1",
    facultyName: "Dr. Rajesh Verma",
    startDate: "2026-03-01",
    schedulePattern: "MWF",
    timeSlot: "10:00 AM - 12:00 PM",
    capacity: 35,
    enrolledCount: 32,
    status: "ACTIVE",
  },
  {
    id: "b-2",
    name: "MERN Batch Beta",
    code: "FS-2026-B1",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    facultyId: "f-2",
    facultyName: "Prof. Ananya Roy",
    startDate: "2026-04-15",
    schedulePattern: "TTS",
    timeSlot: "02:00 PM - 04:00 PM",
    capacity: 35,
    enrolledCount: 32,
    status: "ACTIVE",
  },
  {
    id: "b-3",
    name: "Backend Specialist Batch 1",
    code: "BE-2026-B2",
    courseId: "c-2",
    courseName: "Backend Engineering & Systems",
    facultyId: "f-1",
    facultyName: "Dr. Rajesh Verma",
    startDate: "2026-03-15",
    schedulePattern: "TTS",
    timeSlot: "02:00 PM - 05:00 PM",
    capacity: 30,
    enrolledCount: 28,
    status: "ACTIVE",
  },
  {
    id: "b-4",
    name: "Data Science Weekend Batch",
    code: "DS-2026-W1",
    courseId: "c-3",
    courseName: "Data Science & Applied Machine Learning",
    facultyId: "f-3",
    facultyName: "Dr. Suresh Kumar",
    startDate: "2026-05-01",
    schedulePattern: "WEEKEND",
    timeSlot: "10:00 AM - 04:00 PM",
    capacity: 40,
    enrolledCount: 38,
    status: "UPCOMING",
  },
];

const initialModules: CourseModule[] = [
  {
    id: "m-1",
    courseId: "c-1",
    title: "Module 1: Advanced TypeScript & Modern React",
    code: "MOD-101",
    order: 1,
    topics: [
      { id: "t-1", title: "TypeScript Generics & Utility Types", durationHours: 4, isCompleted: true },
      { id: "t-2", title: "Custom Hooks & Context API Architecture", durationHours: 6, isCompleted: true },
      { id: "t-3", title: "State Management with Zustand & TanStack Query", durationHours: 6, isCompleted: false },
    ],
  },
  {
    id: "m-2",
    courseId: "c-1",
    title: "Module 2: Node.js, Express & REST API Architecture",
    code: "MOD-102",
    order: 2,
    topics: [
      { id: "t-4", title: "Express Router & Middleware Pipeline Design", durationHours: 6, isCompleted: false },
      { id: "t-5", title: "JWT Authentication & Refresh Token Rotation", durationHours: 8, isCompleted: false },
      { id: "t-6", title: "Input Validation with Zod & Error Middlewares", durationHours: 4, isCompleted: false },
    ],
  },
  {
    id: "m-3",
    courseId: "c-1",
    title: "Module 3: PostgreSQL & Prisma ORM",
    code: "MOD-103",
    order: 3,
    topics: [
      { id: "t-7", title: "Database Modeling, Foreign Keys & Constraints", durationHours: 6, isCompleted: false },
      { id: "t-8", title: "Prisma Migrations, Seeds & Transactions", durationHours: 8, isCompleted: false },
    ],
  },
  {
    id: "m-4",
    courseId: "c-2",
    title: "Module 1: Distributed Caching & Queues",
    code: "BE-MOD-1",
    order: 1,
    topics: [
      { id: "t-9", title: "Redis Data Structures & Caching Patterns", durationHours: 6, isCompleted: true },
      { id: "t-10", title: "Asynchronous Background Jobs with BullMQ", durationHours: 8, isCompleted: false },
    ],
  },
];

export const useCourseStore = create<CourseState>((set) => ({
  courses: initialCourses,
  batches: initialBatches,
  modules: initialModules,

  addCourse: (courseData) =>
    set((state) => {
      const newCourse: Course = {
        ...courseData,
        id: `c-${Date.now()}`,
        modulesCount: 0,
        enrolledStudents: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      return { courses: [newCourse, ...state.courses] };
    }),

  updateCourse: (id, courseData) =>
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, ...courseData } : c)),
    })),

  deleteCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      batches: state.batches.filter((b) => b.courseId !== id),
      modules: state.modules.filter((m) => m.courseId !== id),
    })),

  addBatch: (batchData) =>
    set((state) => {
      const newBatch: Batch = {
        ...batchData,
        id: `b-${Date.now()}`,
        enrolledCount: 0,
      };

      // Recalculate active batches for course
      return { batches: [newBatch, ...state.batches] };
    }),

  updateBatch: (id, batchData) =>
    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? { ...b, ...batchData } : b)),
    })),

  deleteBatch: (id) =>
    set((state) => ({
      batches: state.batches.filter((b) => b.id !== id),
    })),

  enrolledStudentsMap: {
    "b-1": ["STD001", "STD002"],
    "b-2": ["STD003"],
  },

  assignStudentToBatch: (batchId, studentId) =>
    set((state) => {
      const currentList = state.enrolledStudentsMap[batchId] || [];
      if (currentList.includes(studentId)) return state;
      const updatedList = [...currentList, studentId];
      const updatedMap = { ...state.enrolledStudentsMap, [batchId]: updatedList };

      // Update enrolledCount in batch
      const updatedBatches = state.batches.map((b) =>
        b.id === batchId ? { ...b, enrolledCount: updatedList.length } : b
      );

      return {
        enrolledStudentsMap: updatedMap,
        batches: updatedBatches,
      };
    }),

  removeStudentFromBatch: (batchId, studentId) =>
    set((state) => {
      const currentList = state.enrolledStudentsMap[batchId] || [];
      const updatedList = currentList.filter((sId) => sId !== studentId);
      const updatedMap = { ...state.enrolledStudentsMap, [batchId]: updatedList };

      const updatedBatches = state.batches.map((b) =>
        b.id === batchId ? { ...b, enrolledCount: updatedList.length } : b
      );

      return {
        enrolledStudentsMap: updatedMap,
        batches: updatedBatches,
      };
    }),

  assignFacultyToBatch: (batchId, facultyId, facultyName) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId ? { ...b, facultyId, facultyName } : b
      ),
    })),

  addModule: (courseId, title, code) =>
    set((state) => {
      const courseModules = state.modules.filter((m) => m.courseId === courseId);
      const newModule: CourseModule = {
        id: `m-${Date.now()}`,
        courseId,
        title,
        code,
        order: courseModules.length + 1,
        topics: [],
      };
      
      // Update modulesCount on course
      const updatedCourses = state.courses.map((c) =>
        c.id === courseId ? { ...c, modulesCount: c.modulesCount + 1 } : c
      );

      return {
        modules: [...state.modules, newModule],
        courses: updatedCourses,
      };
    }),

  addTopic: (moduleId, title, durationHours, description) =>
    set((state) => ({
      modules: state.modules.map((m) => {
        if (m.id === moduleId) {
          const newTopic: Topic = {
            id: `t-${Date.now()}`,
            title,
            durationHours,
            description,
            isCompleted: false,
          };
          return { ...m, topics: [...m.topics, newTopic] };
        }
        return m;
      }),
    })),

  toggleTopicCompletion: (moduleId, topicId) =>
    set((state) => ({
      modules: state.modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            topics: m.topics.map((t) =>
              t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
            ),
          };
        }
        return m;
      }),
    })),
}));
