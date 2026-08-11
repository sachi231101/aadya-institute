import { create } from "zustand";
import type { Student } from "../types/student.types";

interface StudentState {
  students: Student[];
  addStudent: (student: Omit<Student, "id" | "createdAt">) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
}

const mockStudents: Student[] = [
  {
    id: "STD001",
    studentCode: "AAD-2023-001",
    name: "Rahul Sharma",
    email: "rahul.s@example.com",
    phone: "+91 9876543210",
    qualification: "B.Tech Computer Science",
    status: "ACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: new Date("2023-08-15").toISOString(),
  },
  {
    id: "STD002",
    studentCode: "AAD-2023-002",
    name: "Priya Patel",
    email: "priya.p@example.com",
    phone: "+91 9876543211",
    qualification: "BCA",
    status: "ACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: new Date("2023-08-16").toISOString(),
  },
  {
    id: "STD003",
    studentCode: "AAD-2023-003",
    name: "Amit Kumar",
    email: "amit.k@example.com",
    phone: "+91 9876543212",
    qualification: "B.Sc IT",
    status: "ON_LEAVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-2",
    createdAt: new Date("2023-09-01").toISOString(),
  },
  {
    id: "STD004",
    studentCode: "AAD-2023-004",
    name: "Neha Gupta",
    email: "neha.g@example.com",
    phone: "+91 9876543213",
    qualification: "MCA",
    status: "COMPLETED",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: new Date("2023-01-10").toISOString(),
  },
  {
    id: "STD005",
    studentCode: "AAD-2023-005",
    name: "Vikram Singh",
    email: "vikram.s@example.com",
    phone: "+91 9876543214",
    qualification: "Diploma in CS",
    status: "DISCONTINUED",
    instituteId: "aadya-inst-1",
    branchId: "branch-2",
    createdAt: new Date("2023-10-05").toISOString(),
  }
];

export const useStudentStore = create<StudentState>((set) => ({
  students: mockStudents,
  addStudent: (studentData) => set((state) => {
    const newStudent: Student = {
      ...studentData,
      id: `STD00${state.students.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    return { students: [...state.students, newStudent] };
  }),
  updateStudent: (id, data) => set((state) => ({
    students: state.students.map((student) => 
      student.id === id ? { ...student, ...data } : student
    )
  })),
  deleteStudent: (id) => set((state) => ({
    students: state.students.filter((student) => student.id !== id)
  }))
}));
