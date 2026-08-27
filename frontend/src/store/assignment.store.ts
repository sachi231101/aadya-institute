import { create } from "zustand";

export interface AssignmentItem {
  id: string;
  title: string;
  courseName: string;
  batchName: string;
  batchCode: string;
  batchId?: string;
  instructions: string;
  dueDate: string; // ISO string e.g. "2026-08-30T18:00:00"
  hasDocument: boolean;
  documentName?: string;
  documentUrl?: string;
  createdAt: string;
  status: "ACTIVE" | "COMPLETED" | "DRAFT";
}

export interface StudentSubmission {
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string; // ISO string
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  notes?: string;
  status: "SUBMITTED" | "EVALUATED";
  marks?: number;
  maxMarks?: number;
  feedback?: string;
}

const STORAGE_KEY_ASSIGNMENTS = "aadya_faculty_assignments_v2";
const STORAGE_KEY_SUBMISSIONS = "aadya_student_submissions_v2";

const INITIAL_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: "asg-01",
    title: "React Component & Custom Hooks Exercise",
    courseName: "Full Stack Web Development",
    batchName: "Morning Batch M01",
    batchCode: "FSD-01",
    batchId: "batch-fs-m01",
    instructions:
      "Create a responsive React component according to the instructions provided by the faculty. Implement customizable dialog modals and custom debounce hooks with proper TypeScript interfaces.",
    dueDate: "2026-08-30T18:00:00",
    hasDocument: true,
    documentName: "React_Assignment_01.pdf",
    createdAt: "2026-08-25T10:00:00",
    status: "ACTIVE",
  },
  {
    id: "asg-02",
    title: "Node.js RESTful API & Prisma Database Schema",
    courseName: "Full Stack Web Development",
    batchName: "Morning Batch M01",
    batchCode: "FSD-01",
    batchId: "batch-fs-m01",
    instructions:
      "Design database schema models in Prisma and create CRUD API endpoints with comprehensive Zod input validation and JWT authentication middleware.",
    dueDate: "2026-09-05T20:00:00",
    hasDocument: true,
    documentName: "Backend_API_Spec.pdf",
    createdAt: "2026-08-26T14:30:00",
    status: "ACTIVE",
  },
  {
    id: "asg-03",
    title: "Database Indexing & Complex SQL Queries",
    courseName: "Full Stack Web Development",
    batchName: "Morning Batch M01",
    batchCode: "FSD-01",
    batchId: "batch-fs-m01",
    instructions:
      "Analyze query execution plans on PostgreSQL tables, add composite indexes, and optimize N+1 query patterns.",
    dueDate: "2026-08-20T23:59:00",
    hasDocument: false,
    createdAt: "2026-08-15T09:00:00",
    status: "COMPLETED",
  },
];

const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    assignmentId: "asg-03",
    studentId: "std-001",
    studentName: "Aditya Sharma",
    submittedAt: "2026-08-19T17:45:00",
    fileName: "Postgres_Indexing_Optimization.pdf",
    fileSize: "1.4 MB",
    status: "EVALUATED",
    marks: 95,
    maxMarks: 100,
    feedback: "Excellent query analysis and indexing explanations!",
  },
];

interface AssignmentStore {
  assignments: AssignmentItem[];
  submissions: StudentSubmission[];
  addAssignment: (assignment: Omit<AssignmentItem, "id" | "createdAt">) => AssignmentItem;
  submitAssignment: (submission: StudentSubmission) => void;
  getSubmission: (assignmentId: string, studentId: string) => StudentSubmission | undefined;
  getAssignmentsForStudentBatch: (batchCodeOrName?: string) => AssignmentItem[];
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => {
  const loadStoredAssignments = (): AssignmentItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error loading assignments from localStorage", e);
    }
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(INITIAL_ASSIGNMENTS));
    return INITIAL_ASSIGNMENTS;
  };

  const loadStoredSubmissions = (): StudentSubmission[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error loading submissions from localStorage", e);
    }
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  };

  return {
    assignments: loadStoredAssignments(),
    submissions: loadStoredSubmissions(),

    addAssignment: (newAsgData) => {
      const newAsg: AssignmentItem = {
        ...newAsgData,
        id: `asg-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      set((state) => {
        const updated = [newAsg, ...state.assignments];
        try {
          localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return { assignments: updated };
      });
      return newAsg;
    },

    submitAssignment: (newSub) => {
      set((state) => {
        const filtered = state.submissions.filter(
          (s) => !(s.assignmentId === newSub.assignmentId && s.studentId === newSub.studentId)
        );
        const updated = [newSub, ...filtered];
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return { submissions: updated };
      });
    },

    getSubmission: (assignmentId, studentId) => {
      return get().submissions.find(
        (s) => s.assignmentId === assignmentId && s.studentId === studentId
      );
    },

    getAssignmentsForStudentBatch: (_batchCodeOrName) => {
      // By default returns all assignments created for the student's cohort / all active
      return get().assignments;
    },
  };
});
