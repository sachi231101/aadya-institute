export interface Topic {
  id: string;
  title: string;
  description?: string;
  durationHours: number;
  isCompleted?: boolean;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  code: string;
  order: number;
  topics: Topic[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  durationMonths: number;
  totalHours: number;
  fee: number;
  modulesCount: number;
  enrolledStudents: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}
