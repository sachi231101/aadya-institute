import { api } from "./api";
import {
  SLUG_TO_API_TYPE,
  type CanvasSlug,
  type DocumentLayout,
  type DocumentTemplateRecord,
} from "@/pages/admin/administration/canvas/document-canvas.catalog";

export const documentTemplateQueryKey = (slug: CanvasSlug) =>
  ["administration", "document-template", SLUG_TO_API_TYPE[slug]] as const;

export const documentTemplateApi = {
  get: async (slug: CanvasSlug): Promise<DocumentTemplateRecord> => {
    const res = await api.get(`/administration/document-templates/${SLUG_TO_API_TYPE[slug]}`);
    return res.data.data;
  },

  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/administration/document-templates/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data.url as string;
  },

  save: async (
    slug: CanvasSlug,
    layout: DocumentLayout,
    name: string
  ): Promise<DocumentTemplateRecord> => {
    const res = await api.put(`/administration/document-templates/${SLUG_TO_API_TYPE[slug]}`, {
      name,
      paperSize: "A4",
      layout,
    });
    return res.data.data;
  },
};
