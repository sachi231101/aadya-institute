import { useState, useEffect, useCallback } from "react";
import { coursesApi, type CourseData, type CreateCoursePayload } from "../services/courses.api";

export const useCourses = (filters?: { search?: string; status?: string; category?: string }) => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await coursesApi.getAll(filters);
      setCourses(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.status, filters?.category]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = async (payload: CreateCoursePayload) => {
    const response = await coursesApi.create(payload);
    await fetchCourses();
    return response.data;
  };

  const deleteCourse = async (id: string) => {
    await coursesApi.delete(id);
    await fetchCourses();
  };

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,
    createCourse,
    deleteCourse,
  };
};
