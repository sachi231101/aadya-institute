export interface CreateFacultyDto {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  employeeCode?: string;
  specialization?: string;
  designation?: string;
  designationMasterId?: string;
  qualificationMasterId?: string;
  branchId: string;
}

export interface UpdateFacultyDto {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  designation?: string;
  designationMasterId?: string | null;
  qualificationMasterId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

export interface ListFacultyQuery {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}
