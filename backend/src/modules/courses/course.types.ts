export interface CreateCourseDto {
  name: string;
  code: string;
  description?: string;
  duration?: number;
  category?: string;
  mode?: string;
  level?: string;
  totalHours?: number;
  fee?: number;
  /** Branches this course is available to (min 1; auto-assigned when institute has one). */
  branchIds?: string[];
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
  fee?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  /** When provided, replaces the full CourseBranch set (min 1). */
  branchIds?: string[];
}

export interface CourseQueryFilters {
  search?: string;
  status?: string;
  category?: string;
  /** Optional admin branch filter; also used by non-admin scope. */
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CourseBranchSummary {
  id: string;
  branchId: string;
  branch?: { id: string; name: string; code: string };
}
