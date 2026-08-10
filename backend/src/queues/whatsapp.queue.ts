import { createQueue, createWorker } from "./queue";
import { sendTextMessage } from "../integrations/whatsapp/meta.client";

export interface WhatsappJob {
  to: string;
  message: string;
}

export const whatsappQueue = createQueue("whatsapp");

export const whatsappWorker = createWorker<WhatsappJob>(
  "whatsapp",
  async (job) => {
    await sendTextMessage(job.data.to, job.data.message);
  }
);
