import axios from "axios";

const GRAPH_URL = "https://graph.facebook.com/v20.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID || "";
const TOKEN = process.env.WHATSAPP_TOKEN || "";

const client = axios.create({
  baseURL: `${GRAPH_URL}/${PHONE_NUMBER_ID}`,
  headers: { Authorization: `Bearer ${TOKEN}` },
});

export const sendTextMessage = async (to: string, body: string): Promise<string> => {
  const response = await client.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
  return response.data.messages?.[0]?.id;
};

export const sendTemplateMessage = async (
  to: string,
  templateName: string,
  languageCode = "en",
  components: any[] = []
): Promise<string> => {
  const response = await client.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
  return response.data.messages?.[0]?.id;
};
