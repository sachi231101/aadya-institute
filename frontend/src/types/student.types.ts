export interface Student {
  id: string;
  studentCode: string;
  name: string;
  email?: string;
  phone?: string;
  qualification?: string;
  status: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED";
  instituteId: string;
  branchId: string;
  createdAt: string;
}
