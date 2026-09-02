import { useQuery, useQueryClient } from "@tanstack/react-query";
import { batchesApi } from "@/services/batches.api";
import { facultyApi } from "@/services/faculty.api";

export const FACULTY_ALLOCATION_QUERY_KEYS = {
  batches: ["batches"] as const,
  faculty: ["faculty"] as const,
  facultyCourses: ["faculty", "courses"] as const,
};

export function useFacultyAllocation() {
  const queryClient = useQueryClient();

  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: FACULTY_ALLOCATION_QUERY_KEYS.batches,
    queryFn: () => batchesApi.getAll(),
  });

  const { data: facultyRes, isLoading: loadingFaculty } = useQuery({
    queryKey: FACULTY_ALLOCATION_QUERY_KEYS.faculty,
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });

  const batches = batchesRes?.data ?? [];
  const facultyList = facultyRes?.data ?? [];

  const invalidateAllocation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: FACULTY_ALLOCATION_QUERY_KEYS.batches }),
      queryClient.invalidateQueries({ queryKey: FACULTY_ALLOCATION_QUERY_KEYS.faculty }),
      queryClient.invalidateQueries({ queryKey: FACULTY_ALLOCATION_QUERY_KEYS.facultyCourses }),
    ]);
  };

  const assignFacultyToBatch = async (batchId: string, facultyId: string) => {
    await facultyApi.assignCourse({ batchId, facultyId });
  };

  return {
    batches,
    facultyList,
    loadingBatches,
    loadingFaculty,
    invalidateAllocation,
    assignFacultyToBatch,
  };
}
