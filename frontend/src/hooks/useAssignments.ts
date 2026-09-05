import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignmentsApi,
  type AssignmentQueryParams,
  type SubmissionQueryParams,
} from "../services/assignments.api";

const invalidateAssignmentRelated = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["assignments"] });
  queryClient.invalidateQueries({ queryKey: ["assignment-submissions"] });
  queryClient.invalidateQueries({ queryKey: ["assignment-stats"] });
  queryClient.invalidateQueries({ queryKey: ["faculty-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
};

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

export const useAssignmentStats = (enabled = true) => {
  return useQuery({
    queryKey: ["assignment-stats"],
    queryFn: () => assignmentsApi.getStats(),
    enabled,
  });
};

export const useAssignmentSubmissions = (params?: SubmissionQueryParams) => {
  return useQuery({
    queryKey: ["assignment-submissions", params],
    queryFn: () => assignmentsApi.listSubmissions(params),
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: () => invalidateAssignmentRelated(queryClient),
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof assignmentsApi.updateAssignment>[1];
    }) => assignmentsApi.updateAssignment(id, data),
    onSuccess: () => invalidateAssignmentRelated(queryClient),
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.deleteAssignment,
    onSuccess: () => invalidateAssignmentRelated(queryClient),
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
    onSuccess: () => invalidateAssignmentRelated(queryClient),
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
      data: { fileKey: string; fileName?: string; notes?: string };
    }) => assignmentsApi.submitAssignment(assignmentId, data),
    onSuccess: () => invalidateAssignmentRelated(queryClient),
  });
};

export const useUploadSubmissionFile = () => {
  return useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: string; file: File }) =>
      assignmentsApi.uploadSubmissionFile(assignmentId, file),
  });
};

export const useUploadAssignmentAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: string; file: File }) =>
      assignmentsApi.uploadAttachment(assignmentId, file),
    onSuccess: () => invalidateAssignmentRelated(queryClient),
  });
};

export const useEnrolledStudentsForBatches = (batchIds: string[]) => {
  return useQuery({
    queryKey: ["assignment-enrolled-students", batchIds],
    queryFn: () => assignmentsApi.getEnrolledStudents(batchIds),
    enabled: batchIds.length > 0,
  });
};
