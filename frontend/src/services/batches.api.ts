import { api } from "./api";

export const batchesApi = {
  getAll: async () => {
    const response = await api.get("/batches");
    return response.data;
  },
};
