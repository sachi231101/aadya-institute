import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "../services/feedback.api";

export const useFeedbackBySession = (classSessionId: string) => {
  return useQuery({
    queryKey: ["feedback", "session", classSessionId],
    queryFn: () => feedbackApi.getFeedbackBySession(classSessionId),
    enabled: !!classSessionId,
  });
};

export const useFeedbackByStudent = (studentId: string) => {
  return useQuery({
    queryKey: ["feedback", "student", studentId],
    queryFn: () => feedbackApi.getFeedbackByStudent(studentId),
    enabled: !!studentId,
  });
};

export const useFacultyRatings = (params?: { facultyId?: string; batchId?: string }) => {
  return useQuery({
    queryKey: ["feedback", "ratings", params],
    queryFn: () => feedbackApi.getFacultyRatings(params),
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackApi.submitFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
};
