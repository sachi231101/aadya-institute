import { api } from "./api";
import { Student } from "../types/student.types";

export const studentsApi = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get("/students");
    return response.data;
  },
  getById: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },
};
