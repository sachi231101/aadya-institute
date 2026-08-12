export type FacultyStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export interface Faculty {
  id: string;
  facultyCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  specialization: string;
  joiningDate: string;
  status: FacultyStatus;
  instituteId: string;
  branchId: string;
  createdAt: string;
}

export interface FacultyCourseAssignment {
  id: string;
  facultyId: string;
  facultyName: string;
  courseId: string;
  courseName: string;
  batchCode: string;
  schedule: string;
  studentCount: number;
  weeklyHours: number;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "HALF_DAY";

export interface FacultyAttendanceRecord {
  id: string;
  facultyId: string;
  facultyName: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}
