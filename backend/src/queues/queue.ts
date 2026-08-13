import { Queue, Worker } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";

// node:test sets NODE_TEST_CONTEXT in the process environment. It is more
// reliable than NODE_ENV here because dotenvx injects NODE_ENV from .env
// (e.g. "development") which would otherwise defeat test-mode detection.
const isTestMode = () => process.env.NODE_TEST_CONTEXT !== undefined;

// -----------------------------------------------------------------------------
// Test-mode stubs
//
// Importing queue/worker modules must not require a live Redis during tests, and
// a dead Redis must not keep the test process alive (BullMQ schedules reconnect
// timers even when retryStrategy returns null). These no-op stubs keep the unit
// test suite hermetic. They are never used by the running application.
// -----------------------------------------------------------------------------
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

const getRedisConnectionOptions = () => {
  const buildOptions = (host: string, port: number) => ({
    host,
    port,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      // Slow backoff reconnect attempts when Redis is offline
      return Math.min(times * 5000, 60_000);
    },
  });

  try {
    const url = new URL(env.REDIS_URL || "redis://127.0.0.1:6379");
    const host = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
    const port = Number(url.port) || 6379;
    return buildOptions(host, port);
  } catch {
    return buildOptions("127.0.0.1", 6379);
  }
};

const connection = getRedisConnectionOptions();

// Log ONLY ONCE per process run to keep terminal 100% clean
const loggedKeys = new Set<string>();

const logOfflineOnce = (key: string, name: string) => {
  if (!loggedKeys.has(key)) {
    loggedKeys.add(key);
    logger.info(`ℹ Redis is offline for '${name}'. Background queue jobs will pause until Redis starts.`);
  }
};

export const createQueue = (name: string) => {
  if (isTestMode()) return queueStub(name);

  const queue = new Queue(name, { connection });
  queue.on("error", () => {
    logOfflineOnce(`queue:${name}`, name);
  });
  return queue;
};

export const createWorker = <T>(
  name: string,
  processor: (job: { data: T }) => Promise<void>,
  options: { concurrency?: number } = {}
) => {
  if (isTestMode()) return workerStub(name);

  const worker = new Worker(name, processor as any, { connection, concurrency: options.concurrency ?? 1 });
  worker.on("error", () => {
    logOfflineOnce(`worker:${name}`, name);
  });
  return worker;
};
