export interface CreateFacultyDto {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  employeeCode: string;
  specialization?: string;
  branchId: string;
}

export interface UpdateFacultyDto {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

export interface ListFacultyQuery {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}
