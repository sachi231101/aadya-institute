import { getRedis, isRedisAvailable } from "./redis";
import { logger } from "./logger";

const keyPrefix = "aadya:cache:";

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const redis = getRedis();
  if (!redis || !isRedisAvailable()) return null;
  try {
    const raw = await redis.get(keyPrefix + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.debug({ err, key }, "[cache] get failed");
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  const redis = getRedis();
  if (!redis || !isRedisAvailable()) return;
  try {
    await redis.set(keyPrefix + key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.debug({ err, key }, "[cache] set failed");
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  const redis = getRedis();
  if (!redis || !isRedisAvailable()) return;
  try {
    await redis.del(keyPrefix + key);
  } catch (err) {
    logger.debug({ err, key }, "[cache] del failed");
  }
};

export const cacheDelByPrefix = async (prefix: string): Promise<void> => {
  const redis = getRedis();
  if (!redis || !isRedisAvailable()) return;
  try {
    const pattern = keyPrefix + prefix + "*";
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    logger.debug({ err, prefix }, "[cache] delByPrefix failed");
  }
};
