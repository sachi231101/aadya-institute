export interface CreateStudentDto {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  studentCode: string;
  dateOfBirth?: string;
  qualification?: string;
  branchId: string;
}

export interface UpdateStudentDto {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  qualification?: string;
  status?: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";
}

export interface ListStudentQuery {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";
}
