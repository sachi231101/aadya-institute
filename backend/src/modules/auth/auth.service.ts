import { comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { findUserByEmailOrPhone, findUserById } from "./auth.repository";
import { AppError } from "../../middlewares/error.middleware";
import type { LoginInput, TokenPair, AuthUser } from "./auth.types";

const buildAuthUser = (user: any): AuthUser => {
  const roles = (user.userRoles ?? []).map((ur: any) => ur.role.name);
  const permissionsSet = new Set<string>();
  (user.userRoles ?? []).forEach((ur: any) => {
    (ur.role?.rolePermissions ?? []).forEach((rp: any) => {
      if (rp.permission?.name) {
        permissionsSet.add(rp.permission.name);
      }
    });
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles,
    permissions: Array.from(permissionsSet),
  };
};

export const loginService = async (input: LoginInput): Promise<{ user: AuthUser; tokens: TokenPair }> => {
  const user = await findUserByEmailOrPhone(input.emailOrPhone);
  if (!user) throw new AppError("Invalid credentials", 401);

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) throw new AppError("Invalid credentials", 401);

  const authUser = buildAuthUser(user);

  const payload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles: authUser.roles,
  };

  const tokens: TokenPair = {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };

  return { user: authUser, tokens };
};

export const refreshTokenService = async (refreshToken: string): Promise<TokenPair> => {
  let payload: any;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await findUserById(payload.userId);
  if (!user) throw new AppError("User not found", 401);

  const authUser = buildAuthUser(user);
  const newPayload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles: authUser.roles,
  };

  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
};

export const logoutService = async (_userId: string): Promise<void> => {
  return;
};

export const getMeService = async (userId: string): Promise<AuthUser> => {
  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  return buildAuthUser(user);
};
