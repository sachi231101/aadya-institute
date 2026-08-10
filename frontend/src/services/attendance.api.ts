import { api } from "./api";

export const attendanceApi = {
  mark: async (data: any) => {
    const response = await api.post("/attendance", data);
    return response.data;
  },
};
