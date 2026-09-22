import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { studentsApi } from "@/services/students.api";
import { ALLOCATION_QUERY_KEYS } from "@/hooks/useStudentAllocation";

const DISCONTINUATION_RISK_KEY = "discontinuation-risk";
const STUDENTS_KEY = "students";

export const useDiscontinuationRisk = (branchId?: string) => {
  return useQuery({
    queryKey: [DISCONTINUATION_RISK_KEY, branchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      const response = await api.get("/attendance/discontinuation-risk", { params });
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useNotifyDiscontinuationRisk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentsApi.notifyDiscontinuationRisk(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DISCONTINUATION_RISK_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

export const useTriggerStudentAiCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentsApi.triggerStudentAiCall(studentId),
    onSuccess: (_data, studentId) => {
      queryClient.invalidateQueries({ queryKey: [DISCONTINUATION_RISK_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY, studentId] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

export const useDiscontinueStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      studentsApi.discontinueStudent(id, { reason }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [DISCONTINUATION_RISK_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

export const useContinueStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.continueStudent(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [DISCONTINUATION_RISK_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.allocation });
    },
  });
};
