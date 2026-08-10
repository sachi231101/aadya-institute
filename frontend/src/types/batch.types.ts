export interface Batch {
  id: string;
  name: string;
  code: string;
  courseId: string;
  facultyId?: string;
  startDate: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}
