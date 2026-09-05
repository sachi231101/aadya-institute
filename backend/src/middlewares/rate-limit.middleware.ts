import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import type { RequestHandler } from "express";
import { getRedis } from "../config/redis";
import { logger } from "../config/logger";

/**
 * Use Redis only when the connection is already ready.
 * Creating RedisStore against a lazy/offline ioredis client throws
 * "Stream isn't writeable and enableOfflineQueue options is false" on every request.
 * In-memory store is fine for single-process / local dev; Nginx also rate-limits at the edge.
 */
const buildStore = (prefix: string): Options["store"] | undefined => {
  try {
    const redis = getRedis();
    if (!redis || redis.status !== "ready") {
      return undefined;
    }

    return new RedisStore({
      prefix: `aadya:rl:${prefix}:`,
      sendCommand: async (...args: string[]) => {
        if (redis.status !== "ready") {
          throw new Error("redis not ready");
        }
        return redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>;
      },
    });
  } catch (err) {
    logger.warn({ err }, "[rate-limit] Redis store unavailable — using memory store");
    return undefined;
  }
};

const jsonHandler: Options["handler"] = (_req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again shortly.",
  });
};

const safeRateLimit = (options: Partial<Options> & Pick<Options, "windowMs" | "max">): RequestHandler => {
  const limiter = rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler,
    ...options,
  });

  // Fail open if the store throws (e.g. Redis drops mid-request)
  return (req, res, next) => {
    try {
      limiter(req, res, (err?: unknown) => {
        if (err) {
          logger.warn({ err }, "[rate-limit] store error — allowing request");
          return next();
        }
        next();
      });
    } catch (err) {
      logger.warn({ err }, "[rate-limit] unexpected error — allowing request");
      next();
    }
  };
};

/** Global API limiter — moderate. */
export const globalApiRateLimiter: RequestHandler = safeRateLimit({
  windowMs: 60_000,
  max: 300,
  store: buildStore("api"),
  skip: (req) => {
    const p = req.path || "";
    return p === "/health" || p === "/health/ready" || p.endsWith("/health") || p.endsWith("/health/ready");
  },
});

/** Auth endpoints — strict (brute-force protection). */
export const authRateLimiter: RequestHandler = safeRateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  store: buildStore("auth"),
});

/** Exam answer autosave — higher ceiling, still capped. */
export const examAnswersRateLimiter: RequestHandler = safeRateLimit({
  windowMs: 60_000,
  max: 120,
  store: buildStore("exam-answers"),
});

/** Exam start / submit — prevent retry storms. */
export const examActionRateLimiter: RequestHandler = safeRateLimit({
  windowMs: 60_000,
  max: 10,
  store: buildStore("exam-action"),
});

/** Invitation accept endpoints — limit token brute-force. */
export const invitationRateLimiter: RequestHandler = safeRateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  store: buildStore("invitation"),
});
