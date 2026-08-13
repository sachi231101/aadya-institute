/**
 * WhatsApp queue definition.
 *
 * Worker implementation lives in src/modules/whatsapp/whatsapp.worker.ts.
 *
 * @module modules/whatsapp/whatsapp.queue
 */
import { createQueue } from "../../queues/queue";
import type { WhatsappJobData } from "./whatsapp.worker";

export const whatsappQueue = createQueue("whatsapp");
export type { WhatsappJobData };
