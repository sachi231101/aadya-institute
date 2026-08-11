import { test, describe } from "node:test";
import assert from "node:assert";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { loginSchema, refreshTokenSchema, logoutSchema } from "../modules/auth/auth.validation";
import { requireRole } from "../middlewares/role.middleware";
import { hashRefreshToken } from "../modules/auth/auth.refresh-token.repository";
import { createUserSchema, updateUserStatusSchema } from "../modules/users/user.validation";

describe("Password Utility Unit Tests", () => {
  test("should hash a password and verify successfully", async () => {
    const rawPassword = "SecurePassword123!";
    const hashed = await hashPassword(rawPassword);
    assert.notStrictEqual(hashed, rawPassword);
    assert.strictEqual(typeof hashed, "string");
    const match = await comparePassword(rawPassword, hashed);
    assert.strictEqual(match, true);
    const wrongMatch = await comparePassword("WrongPassword", hashed);
    assert.strictEqual(wrongMatch, false);
  });
});

describe("JWT Utility Unit Tests", () => {
  const samplePayload = { userId: "user-123", instituteId: "institute-456", branchId: "branch-789", roles: ["ADMIN"] };

  test("should sign and verify access token correctly", () => {
    const token = signAccessToken(samplePayload);
    assert.strictEqual(typeof token, "string");
    const decoded = verifyAccessToken(token);
    assert.strictEqual(decoded.userId, samplePayload.userId);
    assert.deepStrictEqual(decoded.roles, samplePayload.roles);
  });

  test("should sign and verify refresh token correctly", () => {
    const refreshToken = signRefreshToken(samplePayload);
    assert.strictEqual(typeof refreshToken, "string");
    const decoded = verifyRefreshToken(refreshToken);
    assert.strictEqual(decoded.userId, samplePayload.userId);
  });

  test("should throw error on invalid token verification", () => {
    assert.throws(() => { verifyAccessToken("invalid.jwt.token"); });
  });
});

describe("Refresh Token Hashing", () => {
  test("hashRefreshToken produces consistent SHA-256 hex hash", () => {
    const raw = "test-refresh-token-abc123";
    const hash1 = hashRefreshToken(raw);
    const hash2 = hashRefreshToken(raw);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  test("different tokens produce different hashes", () => {
    const hash1 = hashRefreshToken("token-one");
    const hash2 = hashRefreshToken("token-two");
    assert.notStrictEqual(hash1, hash2);
  });

  test("hash never equals the raw token", () => {
    const raw = "some-raw-refresh-token";
    assert.notStrictEqual(hashRefreshToken(raw), raw);
  });
});

describe("Zod Validation Schemas", () => {
  test("loginSchema accepts valid input", () => {
    assert.strictEqual(loginSchema.safeParse({ emailOrPhone: "admin@aadya.in", password: "ChangeMe@123" }).success, true);
  });

  test("loginSchema rejects empty emailOrPhone", () => {
    assert.strictEqual(loginSchema.safeParse({ emailOrPhone: "", password: "ChangeMe@123" }).success, false);
  });

  test("loginSchema rejects short password", () => {
    assert.strictEqual(loginSchema.safeParse({ emailOrPhone: "admin@aadya.in", password: "123" }).success, false);
  });

  test("refreshTokenSchema validates refreshToken string", () => {
    assert.strictEqual(refreshTokenSchema.safeParse({ refreshToken: "valid_token_str" }).success, true);
    assert.strictEqual(refreshTokenSchema.safeParse({ refreshToken: "" }).success, false);
  });

  test("logoutSchema validates refreshToken string", () => {
    assert.strictEqual(logoutSchema.safeParse({ refreshToken: "some-token" }).success, true);
    assert.strictEqual(logoutSchema.safeParse({ refreshToken: "" }).success, false);
    assert.strictEqual(logoutSchema.safeParse({}).success, false);
  });
});

describe("User Validation Schemas", () => {
  test("createUserSchema accepts valid user with email", () => {
    assert.strictEqual(createUserSchema.safeParse({ name: "John Faculty", email: "john@aadya.in", password: "Secure@123", roles: ["FACULTY"] }).success, true);
  });

  test("createUserSchema accepts valid user with phone only", () => {
    assert.strictEqual(createUserSchema.safeParse({ name: "Jane Faculty", phone: "9876543210", password: "Secure@123", roles: ["FACULTY"] }).success, true);
  });

  test("createUserSchema rejects when neither email nor phone", () => {
    assert.strictEqual(createUserSchema.safeParse({ name: "No Contact", password: "Secure@123", roles: ["FACULTY"] }).success, false);
  });

  test("createUserSchema rejects weak password (no uppercase)", () => {
    assert.strictEqual(createUserSchema.safeParse({ name: "Weak Pass", email: "weak@aadya.in", password: "password1", roles: ["STUDENT"] }).success, false);
  });

  test("createUserSchema rejects empty roles array", () => {
    assert.strictEqual(createUserSchema.safeParse({ name: "No Role", email: "norole@aadya.in", password: "Secure@123", roles: [] }).success, false);
  });

  test("updateUserStatusSchema accepts ACTIVE INACTIVE BLOCKED", () => {
    for (const status of ["ACTIVE", "INACTIVE", "BLOCKED"]) {
      assert.strictEqual(updateUserStatusSchema.safeParse({ status }).success, true);
    }
  });

  test("updateUserStatusSchema rejects invalid status", () => {
    assert.strictEqual(updateUserStatusSchema.safeParse({ status: "SUSPENDED" }).success, false);
  });
});

describe("Role Middleware Unit Tests", () => {
  test("requireRole allows user with matching role", () => {
    const middleware = requireRole("ADMIN", "CENTER_MANAGER");
    let nextCalled = false;
    const req: any = { user: { userId: "user-123", instituteId: "inst-1", roles: ["ADMIN"] } };
    const res: any = {};
    const next = () => { nextCalled = true; };
    middleware(req, res, next);
    assert.strictEqual(nextCalled, true);
  });

  test("requireRole blocks user without matching role", () => {
    const middleware = requireRole("ADMIN");
    let nextCalled = false;
    let statusCode = 0;
    const req: any = { user: { userId: "user-123", instituteId: "inst-1", roles: ["STUDENT"] } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; },
    };
    const next = () => { nextCalled = true; };
    middleware(req, res, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
  });
});

