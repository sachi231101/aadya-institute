import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;
let redisAvailable = false;

const parseRedisUrl = () => {
  try {
    const url = new URL(env.REDIS_URL || "redis://127.0.0.1:6379");
    return {
      host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379, password: undefined };
  }
};

/**
 * Shared ioredis client for rate limiting and short-TTL caches.
 * Safe when Redis is down: callers must tolerate null / errors.
 */
export const getRedis = (): Redis | null => {
  if (redisClient) return redisClient;

  const { host, port, password } = parseRedisUrl();
  redisClient = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 2000, 30_000);
    },
  });

  redisClient.on("connect", () => {
    redisAvailable = true;
  });
  redisClient.on("ready", () => {
    redisAvailable = true;
  });
  redisClient.on("close", () => {
    redisAvailable = false;
  });
  redisClient.on("error", () => {
    redisAvailable = false;
  });

  redisClient.connect().catch(() => {
    logger.info("ℹ Redis cache/rate-limit client offline — falling back to in-memory limits where needed");
  });

  return redisClient;
};

export const isRedisAvailable = () => redisAvailable;

export const getBullmqConnection = () => {
  const { host, port, password } = parseRedisUrl();
  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null as null,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      return Math.min(times * 5000, 60_000);
    },
  };
};
