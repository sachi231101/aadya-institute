import { api } from "./api";

export const facultyApi = {
  getAll: async () => {
    const response = await api.get("/faculty");
    return response.data;
  },
};
