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
  updateWhatsappPreference,
  updateUserPermissions,
  updateUserBranchAccess,
  deleteUser,
  getPermissionCatalog,
} from "./user.controller";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateWhatsappPreferenceSchema,
  updateUserPermissionsSchema,
  updateUserBranchAccessSchema,
  permissionCatalogQuerySchema,
  userListQuerySchema,
} from "./user.validation";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// PATCH /api/v1/users/me/whatsapp-preference — Self-service WhatsApp opt-out/in
// Must be registered before "/:id" routes so "me" is not treated as an id.
router.patch(
  "/me/whatsapp-preference",
  validate(updateWhatsappPreferenceSchema),
  updateWhatsappPreference
);

// GET /api/v1/users — List users (admin, center manager)
router.get(
  "/",
  requirePermission("user.read"),
  validate(userListQuerySchema, "query"),
  listUsers
);

// GET /api/v1/users/permission-catalog — Module/submodule permission tree
router.get(
  "/permission-catalog",
  requirePermission("user.read"),
  validate(permissionCatalogQuerySchema, "query"),
  getPermissionCatalog
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

// PATCH /api/v1/users/:id/permissions — Update module permissions for a user
router.patch(
  "/:id/permissions",
  requirePermission("user.update"),
  validate(updateUserPermissionsSchema),
  updateUserPermissions
);

// PATCH /api/v1/users/:id/branch-access — Replace multi-branch access
router.patch(
  "/:id/branch-access",
  requirePermission("user.update"),
  validate(updateUserBranchAccessSchema),
  updateUserBranchAccess
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
