import { create } from "zustand";
import type { Course, CourseModule, Topic } from "../types/course.types";
import type { Batch } from "../types/batch.types";
import { coursesApi } from "../services/courses.api";
import { batchesApi } from "../services/batches.api";

interface CourseState {
  courses: Course[];
  batches: Batch[];
  modules: CourseModule[];

  // Fetch Actions
  fetchCourses: () => Promise<void>;
  fetchBatches: (branchId?: string) => Promise<void>;

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

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  batches: [],
  modules: [],

  fetchCourses: async () => {
    try {
      const res = await coursesApi.getAll();
      if (res.success && res.data) {
        const mappedCourses: Course[] = res.data.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          description: c.description || "",
          durationMonths: c.durationMonths || c.duration || 6,
          totalHours: c.totalHours || 100,
          category: c.category || "Development",
          mode: (c.mode as any) || "HYBRID",
          level: (c.level as any) || "BEGINNER",
          status: c.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          fee: c.fee ?? 0,
          modulesCount: c.modules?.length || c._count?.batches || 0,
          enrolledStudents: c._count?.admissions || 0,
        }));
        set({ courses: mappedCourses });
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  },

  fetchBatches: async (branchId?: string) => {
    try {
      const res = await batchesApi.getAll(branchId ? { branchId } : undefined);
      if (res.success && res.data) {
        const mappedBatches: Batch[] = res.data.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          courseId: b.courseId,
          courseName: b.course?.name || "General Course",
          facultyId: b.facultyId || undefined,
          facultyName: b.faculty?.user?.name || "Unassigned",
          startDate: b.startDate ? new Date(b.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          schedulePattern: (b.schedulePattern as any) || "MWF",
          timeSlot: b.timeSlot || "10:00 AM - 12:00 PM",
          capacity: b.capacity || 35,
          enrolledCount: b._count?.enrollments || 0,
          status: b.status === "ACTIVE" ? "ACTIVE" : b.status === "UPCOMING" ? "UPCOMING" : "COMPLETED",
        }));
        set({ batches: mappedBatches });
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  },

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

  enrolledStudentsMap: {},

  assignStudentToBatch: (batchId, studentId) =>
    set((state) => {
      const currentList = state.enrolledStudentsMap[batchId] || [];
      if (currentList.includes(studentId)) return state;
      const updatedList = [...currentList, studentId];
      const updatedMap = { ...state.enrolledStudentsMap, [batchId]: updatedList };

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
