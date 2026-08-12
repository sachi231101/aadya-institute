import { create } from "zustand";
import type { 
  Faculty, 
  FacultyCourseAssignment, 
  FacultyAttendanceRecord 
} from "../types/faculty.types";

interface FacultyState {
  facultyList: Faculty[];
  assignments: FacultyCourseAssignment[];
  attendanceRecords: FacultyAttendanceRecord[];
  
  addFaculty: (faculty: Omit<Faculty, "id" | "createdAt">) => void;
  updateFaculty: (id: string, data: Partial<Faculty>) => void;
  deleteFaculty: (id: string) => void;
  assignCourse: (assignment: Omit<FacultyCourseAssignment, "id">) => void;
  markAttendance: (record: Omit<FacultyAttendanceRecord, "id">) => void;
}

const mockFaculty: Faculty[] = [
  {
    id: "FAC001",
    facultyCode: "FAC-2023-01",
    name: "Dr. Rajesh Verma",
    email: "rajesh.v@aadyainstitute.com",
    phone: "+91 9876543201",
    designation: "Senior Professor",
    specialization: "Full Stack Web Development & Node.js",
    joiningDate: "2021-06-15",
    status: "ACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: "2021-06-15T00:00:00.000Z",
  },
  {
    id: "FAC002",
    facultyCode: "FAC-2023-02",
    name: "Ananya Deshmukh",
    email: "ananya.d@aadyainstitute.com",
    phone: "+91 9876543202",
    designation: "Lead Technical Trainer",
    specialization: "Python Data Science & AI/ML",
    joiningDate: "2022-01-10",
    status: "ACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: "2022-01-10T00:00:00.000Z",
  },
  {
    id: "FAC003",
    facultyCode: "FAC-2023-03",
    name: "Suresh Menon",
    email: "suresh.m@aadyainstitute.com",
    phone: "+91 9876543203",
    designation: "Assistant Professor",
    specialization: "Cybersecurity & Ethical Hacking",
    joiningDate: "2022-08-20",
    status: "ON_LEAVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-2",
    createdAt: "2022-08-20T00:00:00.000Z",
  },
  {
    id: "FAC004",
    facultyCode: "FAC-2023-04",
    name: "Meera Kulkarni",
    email: "meera.k@aadyainstitute.com",
    phone: "+91 9876543204",
    designation: "UI/UX Mentor",
    specialization: "UI/UX Design & Figma Workshop",
    joiningDate: "2023-03-01",
    status: "ACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-1",
    createdAt: "2023-03-01T00:00:00.000Z",
  },
  {
    id: "FAC005",
    facultyCode: "FAC-2023-05",
    name: "Rohan Kapoor",
    email: "rohan.k@aadyainstitute.com",
    phone: "+91 9876543205",
    designation: "Cloud Consultant",
    specialization: "DevOps & AWS Architecture",
    joiningDate: "2023-09-12",
    status: "INACTIVE",
    instituteId: "aadya-inst-1",
    branchId: "branch-2",
    createdAt: "2023-09-12T00:00:00.000Z",
  },
];

const mockAssignments: FacultyCourseAssignment[] = [
  {
    id: "ASN001",
    facultyId: "FAC001",
    facultyName: "Dr. Rajesh Verma",
    courseId: "CRS001",
    courseName: "Full Stack MERN Architecture",
    batchCode: "FS-2026-A1",
    schedule: "Mon, Wed, Fri (10:00 AM - 12:30 PM)",
    studentCount: 32,
    weeklyHours: 7.5,
  },
  {
    id: "ASN002",
    facultyId: "FAC001",
    facultyName: "Dr. Rajesh Verma",
    courseId: "CRS002",
    courseName: "Backend Engineering & Systems",
    batchCode: "BE-2026-B2",
    schedule: "Tue, Thu (02:00 PM - 05:00 PM)",
    studentCount: 28,
    weeklyHours: 6.0,
  },
  {
    id: "ASN003",
    facultyId: "FAC002",
    facultyName: "Ananya Deshmukh",
    courseId: "CRS003",
    courseName: "Data Science & Applied Machine Learning",
    batchCode: "DS-2026-C1",
    schedule: "Mon, Wed, Fri (02:00 PM - 04:30 PM)",
    studentCount: 40,
    weeklyHours: 7.5,
  },
  {
    id: "ASN004",
    facultyId: "FAC004",
    facultyName: "Meera Kulkarni",
    courseId: "CRS004",
    courseName: "Product UI/UX Systems",
    batchCode: "UX-2026-D1",
    schedule: "Sat, Sun (10:00 AM - 01:00 PM)",
    studentCount: 25,
    weeklyHours: 6.0,
  },
];

const mockAttendance: FacultyAttendanceRecord[] = [
  {
    id: "ATT001",
    facultyId: "FAC001",
    facultyName: "Dr. Rajesh Verma",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "09:45 AM",
    checkOut: "05:15 PM",
    notes: "On time, completed MERN lecture",
  },
  {
    id: "ATT002",
    facultyId: "FAC002",
    facultyName: "Ananya Deshmukh",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "09:50 AM",
    checkOut: "05:00 PM",
    notes: "Conducted Python ML lab session",
  },
  {
    id: "ATT003",
    facultyId: "FAC003",
    facultyName: "Suresh Menon",
    date: new Date().toISOString().split("T")[0],
    status: "LEAVE",
    notes: "Approved annual leave",
  },
  {
    id: "ATT004",
    facultyId: "FAC004",
    facultyName: "Meera Kulkarni",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "10:05 AM",
    checkOut: "05:30 PM",
    notes: "Held UX Figma evaluation",
  },
  {
    id: "ATT005",
    facultyId: "FAC005",
    facultyName: "Rohan Kapoor",
    date: new Date().toISOString().split("T")[0],
    status: "ABSENT",
    notes: "Uninformed absence",
  },
];

export const useFacultyStore = create<FacultyState>((set) => ({
  facultyList: mockFaculty,
  assignments: mockAssignments,
  attendanceRecords: mockAttendance,

  addFaculty: (facultyData) =>
    set((state) => {
      const newId = `FAC00${state.facultyList.length + 1}`;
      const newFaculty: Faculty = {
        ...facultyData,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      return { facultyList: [newFaculty, ...state.facultyList] };
    }),

  updateFaculty: (id, data) =>
    set((state) => ({
      facultyList: state.facultyList.map((f) =>
        f.id === id ? { ...f, ...data } : f
      ),
    })),

  deleteFaculty: (id) =>
    set((state) => ({
      facultyList: state.facultyList.filter((f) => f.id !== id),
      assignments: state.assignments.filter((a) => a.facultyId !== id),
      attendanceRecords: state.attendanceRecords.filter((att) => att.facultyId !== id),
    })),

  assignCourse: (assignmentData) =>
    set((state) => {
      const newAssignment: FacultyCourseAssignment = {
        ...assignmentData,
        id: `ASN00${state.assignments.length + 1}`,
      };
      return { assignments: [newAssignment, ...state.assignments] };
    }),

  markAttendance: (recordData) =>
    set((state) => {
      const existingIndex = state.attendanceRecords.findIndex(
        (r) => r.facultyId === recordData.facultyId && r.date === recordData.date
      );

      if (existingIndex >= 0) {
        const updated = [...state.attendanceRecords];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...recordData,
        };
        return { attendanceRecords: updated };
      }

      const newRecord: FacultyAttendanceRecord = {
        ...recordData,
        id: `ATT00${state.attendanceRecords.length + 1}`,
      };
      return { attendanceRecords: [newRecord, ...state.attendanceRecords] };
    }),
}));
