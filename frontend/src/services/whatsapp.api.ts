import { api } from "./api";

export const whatsappApi = {
  sendMessage: async (phone: string, message: string) => {
    const response = await api.post("/whatsapp/send", { phone, message });
    return response.data;
  },
};
