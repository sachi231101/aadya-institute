import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { sendError } from "../utils/response";

type Target = "body" | "query" | "params";

/**
 * Factory: validates request data against a Zod schema.
 */
export const validate = (schema: ZodSchema, target: Target = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      sendError(res, "Validation failed", 422, errors);
      return;
    }

    // Replace the target with the parsed (type-safe) value
    (req as any)[target] = result.data;
    next();
  };
};
