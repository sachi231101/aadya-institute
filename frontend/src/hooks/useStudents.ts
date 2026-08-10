import { useState, useEffect } from "react";
import type { Student } from "../types/student.types";
import { studentsApi } from "../services/students.api";

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsApi
      .getAll()
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  return { students, loading };
};
