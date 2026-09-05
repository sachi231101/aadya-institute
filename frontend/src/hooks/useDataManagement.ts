import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataManagementApi, type ImportEntityType, type ExportEntityType } from "../services/data-management.api";

export const useImportJobs = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ["data-management", "imports", params],
    queryFn: () => dataManagementApi.listImports(params),
  });

export const useDeletedRecords = () =>
  useQuery({
    queryKey: ["data-management", "deleted"],
    queryFn: () => dataManagementApi.listDeleted(),
  });

export const useBackupStatus = () =>
  useQuery({
    queryKey: ["data-management", "backup-status"],
    queryFn: () => dataManagementApi.getBackupStatus(),
  });

export const usePreviewImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: ImportEntityType; csv: string; fileName?: string }) =>
      dataManagementApi.previewImport(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-management", "imports"] }),
  });
};

export const useConfirmImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataManagementApi.confirmImport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-management"] }),
  });
};

export const useExportData = () =>
  useMutation({
    mutationFn: (data: { entityType: ExportEntityType; filters?: Record<string, unknown> }) =>
      dataManagementApi.exportData(data),
  });

export const useRestoreBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataManagementApi.restoreBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-management", "deleted"] }),
  });
};

export const useImportTemplate = (entityType: ImportEntityType) =>
  useQuery({
    queryKey: ["data-management", "template", entityType],
    queryFn: () => dataManagementApi.getTemplate(entityType),
  });
