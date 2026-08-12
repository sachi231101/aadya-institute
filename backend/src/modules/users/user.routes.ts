import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} from "./user.controller";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userListQuerySchema,
} from "./user.validation";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/v1/users — List users (admin, center manager)
router.get(
  "/",
  requirePermission("user.read"),
  validate(userListQuerySchema, "query"),
  listUsers
);

// GET /api/v1/users/:id — Get single user
router.get(
  "/:id",
  requirePermission("user.read"),
  getUser
);

// POST /api/v1/users — Create a new user with role
router.post(
  "/",
  requirePermission("user.create"),
  validate(createUserSchema),
  createUser
);

// PATCH /api/v1/users/:id — Update user details
router.patch(
  "/:id",
  requirePermission("user.update"),
  validate(updateUserSchema),
  updateUser
);

// PATCH /api/v1/users/:id/status — Activate / deactivate user
router.patch(
  "/:id/status",
  requirePermission("user.update"),
  validate(updateUserStatusSchema),
  updateUserStatus
);

// DELETE /api/v1/users/:id — Soft-delete a user
router.delete(
  "/:id",
  requirePermission("user.delete"),
  deleteUser
);

export default router;
