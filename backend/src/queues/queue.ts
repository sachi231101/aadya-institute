import { Queue, Worker } from "bullmq";
import { env } from "../config/env";

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
};

export const createQueue = (name: string) =>
  new Queue(name, { connection });

export const createWorker = <T>(
  name: string,
  processor: (job: { data: T }) => Promise<void>
) =>
  new Worker(name, processor as any, { connection });
