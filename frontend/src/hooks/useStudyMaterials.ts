import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  studyMaterialsApi,
  type CreateStudyMaterialPayload,
  type StudyMaterialListParams,
} from "@/services/study-materials.api";

const KEY = "study-materials";

export const useStudyMaterials = (params?: StudyMaterialListParams) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: () => studyMaterialsApi.getAll(params),
  });

export const useCreateStudyMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudyMaterialPayload) => studyMaterialsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

export const useDeleteStudyMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studyMaterialsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
};
