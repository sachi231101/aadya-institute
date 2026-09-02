export interface BatchCourseSubject {
  courseId: string;
  facultyId?: string | null;
  course?: { id: string; name: string; code?: string };
  faculty?: { id: string; user?: { name?: string } };
}

export interface Batch {
  id: string;
  name: string;
  code: string;
  courseId: string;
  courseName: string;
  facultyId?: string;
  facultyName?: string;
  batchCourses?: BatchCourseSubject[];
  startDate: string;
  endDate?: string;
  schedulePattern: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot: string;
  capacity: number;
  enrolledCount: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}
