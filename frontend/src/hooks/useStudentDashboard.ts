import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "../services/students.api";

export const useStudentDashboard = () => {
  return useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => studentsApi.getMyDashboard(),
    refetchInterval: 30000,
  });
};
