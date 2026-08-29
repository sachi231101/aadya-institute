import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { getBullmqConnection } from "../config/redis";

const isTestMode = () => process.env.NODE_TEST_CONTEXT !== undefined;

const queueStub = (name: string) =>
  ({
    name,
    add: () => Promise.resolve({ id: "test-stub" }),
    on: () => {},
    close: () => Promise.resolve(),
  }) as unknown as Queue;

const workerStub = (name: string) =>
  ({
    name,
    on: () => {},
    close: () => Promise.resolve(),
  }) as unknown as Worker;

const connection = getBullmqConnection();

const loggedKeys = new Set<string>();

const logOfflineOnce = (key: string, name: string) => {
  if (!loggedKeys.has(key)) {
    loggedKeys.add(key);
    logger.info(`ℹ Redis is offline for '${name}'. Background queue jobs will pause until Redis starts.`);
  }
};

/** Job priorities: lower number = higher priority in BullMQ. */
export const QUEUE_PRIORITY = {
  CRITICAL: 1,
  USER_FACING: 5,
  BULK: 10,
  MAINTENANCE: 20,
} as const;

export const createQueue = (name: string) => {
  if (isTestMode()) return queueStub(name);

  const queue = new Queue(name, { connection });
  queue.on("error", () => {
    logOfflineOnce(`queue:${name}`, name);
  });
  return queue;
};

export type WorkerCreateOptions = {
  concurrency?: number;
  /** When PEAK_MODE is on, use this concurrency instead (often lower). */
  peakConcurrency?: number;
  /** If true, worker is not started when PEAK_MODE=true. */
  pauseInPeakMode?: boolean;
};

export const createWorker = <T>(
  name: string,
  processor: (job: { data: T }) => Promise<void>,
  options: WorkerCreateOptions = {}
) => {
  if (isTestMode()) return workerStub(name);

  // API processes set RUN_WORKERS=false so jobs are not double-consumed.
  if (!env.RUN_WORKERS) {
    return workerStub(name);
  }

  if (env.PEAK_MODE && options.pauseInPeakMode) {
    logger.info(`[peak-mode] Worker '${name}' not started (paused during peak)`);
    return workerStub(name);
  }

  const concurrency =
    env.PEAK_MODE && options.peakConcurrency !== undefined
      ? options.peakConcurrency
      : options.concurrency ?? 1;

  const worker = new Worker(name, processor as any, { connection, concurrency });
  worker.on("error", () => {
    logOfflineOnce(`worker:${name}`, name);
  });
  return worker;
};

export const defaultJobOptions = (priority: number): JobsOptions => ({
  priority,
  removeOnComplete: 1000,
  removeOnFail: 5000,
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
});
