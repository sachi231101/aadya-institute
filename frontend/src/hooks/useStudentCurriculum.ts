import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "../services/students.api";

export const useStudentCurriculum = () => {
  return useQuery({
    queryKey: ["student-curriculum"],
    queryFn: () => studentsApi.getMyCurriculum(),
  });
};
