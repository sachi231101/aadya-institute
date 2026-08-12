export interface CreateCourseDto {
  name: string;
  code: string;
  description?: string;
  duration?: number;
}

export interface UpdateCourseDto {
  name?: string;
  code?: string;
  description?: string;
  duration?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
}

export interface CourseQueryFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}
