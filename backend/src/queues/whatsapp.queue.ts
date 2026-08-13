/**
 * WhatsApp queue definition.
 *
 * Worker implementation lives in src/workers/whatsapp.worker.ts.
 *
 * @module queues/whatsapp.queue
 */
import { createQueue } from "./queue";
import type { WhatsappJobData } from "../workers/whatsapp.worker";

export const whatsappQueue = createQueue("whatsapp");
export type { WhatsappJobData };
