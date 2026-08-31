import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi, type AssignmentQueryParams } from "../services/assignments.api";

export const useAssignments = (params?: AssignmentQueryParams) => {
  return useQuery({
    queryKey: ["assignments", params],
    queryFn: () => assignmentsApi.getAssignments(params),
  });
};

export const useAssignmentById = (id: string) => {
  return useQuery({
    queryKey: ["assignments", id],
    queryFn: () => assignmentsApi.getAssignmentById(id),
    enabled: !!id,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof assignmentsApi.updateAssignment>[1] }) =>
      assignmentsApi.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

export const useGradeSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      submissionId,
      data,
    }: {
      submissionId: string;
      data: { marks: number; feedback?: string };
    }) => assignmentsApi.gradeSubmission(submissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: { fileKey: string; notes?: string };
    }) => assignmentsApi.submitAssignment(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};
