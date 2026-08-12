export interface CreateCourseDto {
  name: string;
  code: string;
  description?: string;
  duration?: number;
  category?: string;
  mode?: string;
  level?: string;
  totalHours?: number;
}

export interface UpdateCourseDto {
  name?: string;
  code?: string;
  description?: string;
  duration?: number;
  category?: string;
  mode?: string;
  level?: string;
  totalHours?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
}

export interface CourseQueryFilters {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

