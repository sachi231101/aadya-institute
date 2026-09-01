import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, type DocumentQueryParams } from "../services/documents.api";

export const DOCUMENTS_KEYS = {
  list: (params?: DocumentQueryParams) => ["documents", params] as const,
  detail: (id: string) => ["documents", id] as const,
};

export const useDocuments = (params?: DocumentQueryParams) => {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.list(params),
    queryFn: () => documentsApi.list(params),
  });
};

export const useDocumentById = (id: string) => {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.detail(id),
    queryFn: () => documentsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof documentsApi.update>[1] }) =>
      documentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useVerifyDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => documentsApi.verify(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useRejectDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectedReason }: { id: string; rejectedReason: string }) =>
      documentsApi.reject(id, rejectedReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};
