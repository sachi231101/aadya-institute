import { z } from "zod";

export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, "Email or phone is required")
    .trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
