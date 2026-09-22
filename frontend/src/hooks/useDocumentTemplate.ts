import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  documentTemplateApi,
  documentTemplateQueryKey,
} from "@/services/document-template.api";
import type { CanvasSlug, DocumentLayout } from "@/pages/admin/administration/canvas/document-canvas.catalog";

export const useDocumentTemplate = (slug: CanvasSlug) =>
  useQuery({
    queryKey: documentTemplateQueryKey(slug),
    queryFn: () => documentTemplateApi.get(slug),
  });

export const useSaveDocumentTemplate = (slug: CanvasSlug) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { layout: DocumentLayout; name: string }) =>
      documentTemplateApi.save(slug, input.layout, input.name),
    onSuccess: (saved) => {
      queryClient.setQueryData(documentTemplateQueryKey(slug), saved);
    },
  });
};
