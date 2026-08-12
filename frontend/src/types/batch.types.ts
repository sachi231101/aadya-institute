export interface Batch {
  id: string;
  name: string;
  code: string;
  courseId: string;
  courseName: string;
  facultyId?: string;
  facultyName?: string;
  startDate: string;
  endDate?: string;
  schedulePattern: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot: string;
  capacity: number;
  enrolledCount: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}
