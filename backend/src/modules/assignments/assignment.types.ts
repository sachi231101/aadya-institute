export interface CreateAssignmentDTO {
  classSessionId: string;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateAssignmentDTO {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface AssignmentQueryDTO {
  batchId?: string;
  classSessionId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
