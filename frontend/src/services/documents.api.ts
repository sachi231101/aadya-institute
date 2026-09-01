import { api } from "./api";

export type DocumentEntityType = "STUDENT" | "ADMISSION" | "LEAD";
export type DocumentStatus = "PENDING" | "UPLOADED" | "VERIFIED" | "REJECTED";

export interface DocumentRecord {
  id: string;
  instituteId: string;
  branchId?: string;
  entityType: DocumentEntityType;
  entityId: string;
  name: string;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  status: DocumentStatus;
  notes?: string;
  rejectedReason?: string;
  verifiedAt?: string;
  verifiedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentQueryParams {
  page?: number;
  limit?: number;
  branchId?: string;
  entityType?: DocumentEntityType;
  entityId?: string;
  status?: DocumentStatus;
  search?: string;
}

export const documentsApi = {
  list: async (params?: DocumentQueryParams) => {
    const response = await api.get("/documents", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  create: async (data: {
    entityType: DocumentEntityType;
    entityId: string;
    branchId?: string;
    name: string;
    fileName: string;
    fileUrl?: string;
    mimeType?: string;
    fileSize?: number;
    notes?: string;
  }) => {
    const response = await api.post("/documents", data);
    return response.data;
  },

  update: async (id: string, data: Partial<DocumentRecord>) => {
    const response = await api.patch(`/documents/${id}`, data);
    return response.data;
  },

  verify: async (id: string, notes?: string) => {
    const response = await api.patch(`/documents/${id}/verify`, { notes });
    return response.data;
  },

  reject: async (id: string, rejectedReason: string) => {
    const response = await api.patch(`/documents/${id}/reject`, { rejectedReason });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};
