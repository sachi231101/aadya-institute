import type { AuthUser } from "../../auth/auth.types";
import { AppError } from "../../../middlewares/error.middleware";

export interface AIToolAuthContext {
  userId: string;
  instituteId: string;
  branchId?: string;
  roles: string[];
  permissions: string[];
  isAdmin: boolean;
  isCenterManager: boolean;
}

export class AISecurityScopeService {
  /**
   * Builds an immutable, server-side verified Auth Context for tool execution.
   * Strips any untrusted parameters from the client or LLM.
   */
  static buildAuthContext(currentUser: AuthUser): AIToolAuthContext {
    if (!currentUser || !currentUser.userId || !currentUser.instituteId) {
      throw new AppError("Unauthorized - valid user authentication is required", 401);
    }

    const isAdmin = currentUser.roles.includes("ADMIN");
    const isCenterManager = currentUser.roles.includes("CENTER_MANAGER");

    if (!isAdmin && !isCenterManager) {
      throw new AppError("Forbidden - only ADMIN and CENTER_MANAGER can access the AI Data Agent", 403);
    }

    // Strict branch locking for Center Manager: ALWAYS use their assigned branchId
    let verifiedBranchId: string | undefined = undefined;
    if (isCenterManager) {
      if (!currentUser.branchId) {
        throw new AppError("Center Manager has no assigned branch", 403);
      }
      verifiedBranchId = currentUser.branchId;
    } else if (isAdmin && currentUser.branchId) {
      verifiedBranchId = currentUser.branchId;
    }

    return {
      userId: currentUser.userId,
      instituteId: currentUser.instituteId,
      branchId: verifiedBranchId,
      roles: currentUser.roles,
      permissions: (currentUser as any).permissions || [],
      isAdmin,
      isCenterManager,
    };
  }

  /**
   * Sanitizes tool arguments by removing any attempted security overrides (e.g. branchId, instituteId, userId).
   */
  static sanitizeToolArgs<T extends Record<string, any>>(rawArgs: any, context: AIToolAuthContext): T {
    const cleanArgs: Record<string, any> = typeof rawArgs === "object" && rawArgs !== null ? { ...rawArgs } : {};

    // Remove any unauthorized overrides from LLM / client
    delete cleanArgs.branchId;
    delete cleanArgs.instituteId;
    delete cleanArgs.userId;
    delete cleanArgs.tenantId;

    return cleanArgs as T;
  }
}
