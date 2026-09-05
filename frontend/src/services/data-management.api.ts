import { api } from "./api";

export type ImportEntityType = "students" | "leads" | "users";
export type ExportEntityType = "students" | "leads" | "users" | "branches";

export const dataManagementApi = {
  getTemplate: async (entityType: ImportEntityType) => {
    const response = await api.get("/data-management/templates", { params: { entityType } });
    return response.data;
  },

  previewImport: async (data: { entityType: ImportEntityType; csv: string; fileName?: string }) => {
    const response = await api.post("/data-management/import/preview", data);
    return response.data;
  },

  confirmImport: async (id: string) => {
    const response = await api.post(`/data-management/import/${id}/confirm`);
    return response.data;
  },

  listImports: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get("/data-management/imports", { params });
    return response.data;
  },

  exportData: async (data: { entityType: ExportEntityType; filters?: Record<string, unknown> }) => {
    const response = await api.post("/data-management/export", data);
    return response.data;
  },

  downloadExportUrl: (token: string) => `/api/v1/data-management/export/${token}/download`,

  listDeleted: async () => {
    const response = await api.get("/data-management/deleted");
    return response.data;
  },

  restoreBranch: async (id: string) => {
    const response = await api.post(`/data-management/deleted/branches/${id}/restore`);
    return response.data;
  },

  getBackupStatus: async () => {
    const response = await api.get("/data-management/backup-status");
    return response.data;
  },
};
