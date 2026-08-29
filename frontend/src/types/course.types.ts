export interface Topic {
  id: string;
  title: string;
  description?: string;
  durationHours: number;
  isCompleted?: boolean;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  /** Duration in months — maps to backend `duration` */
  durationMonths: number;
  totalHours: number;
  fee: number;
  modulesCount: number;
  enrolledStudents: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  /** Display title — maps to backend `name` */
  title: string;
  code: string;
  /** Display order — maps to backend `sequence` */
  order: number;
  topics: Topic[];
}
