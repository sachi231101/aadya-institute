import { z } from "zod";

const phoneSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "string") {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 ? digits.slice(-10) : val;
    }
    return val;
  },
  z
    .string()
    .regex(/^\d{10}$/, "Phone must be a 10-digit number")
    .optional()
);

export const createInvitationSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email").trim().toLowerCase(),
    phone: phoneSchema,
    roleName: z.string().min(1, "Role is required").trim(),
    branchId: z.string().min(1).optional(),
    branchIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (data) => {
      const needsBranch = ["CENTER_MANAGER", "COUNSELLOR"].includes(
        data.roleName.toUpperCase()
      );
      if (!needsBranch) return true;
      return Boolean(data.branchId?.trim()) || Boolean(data.branchIds?.length);
    },
    {
      message: "Branch assignment is required for Center Manager and Counsellor",
      path: ["branchId"],
    }
  );

export const invitationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

export const acceptInviteTokenParamSchema = z.object({
  token: z.string().min(32, "Invalid invitation token"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32, "Invalid invitation token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
export type InvitationListQueryDto = z.infer<typeof invitationListQuerySchema>;
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
