import { api } from "./api";

export const aiCallingApi = {
  triggerCall: async (phone: string, prompt: string) => {
    const response = await api.post("/ai-calling/trigger", { phone, prompt });
    return response.data;
  },
};
