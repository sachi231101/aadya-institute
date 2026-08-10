import { api } from "./api";

export const coursesApi = {
  getAll: async () => {
    const response = await api.get("/courses");
    return response.data;
  },
};
