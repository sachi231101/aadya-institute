import { test, describe } from "node:test";
import assert from "node:assert";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { loginSchema, refreshTokenSchema } from "../modules/auth/auth.validation";
import { requireRole } from "../middlewares/role.middleware";

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
  const samplePayload = {
    userId: "user-123",
    instituteId: "institute-456",
    branchId: "branch-789",
    roles: ["ADMIN"],
  };

  test("should sign and verify access token correctly", () => {
    const token = signAccessToken(samplePayload);
    assert.strictEqual(typeof token, "string");

    const decoded = verifyAccessToken(token);
    assert.strictEqual(decoded.userId, samplePayload.userId);
    assert.strictEqual(decoded.instituteId, samplePayload.instituteId);
    assert.strictEqual(decoded.branchId, samplePayload.branchId);
    assert.deepStrictEqual(decoded.roles, samplePayload.roles);
  });

  test("should sign and verify refresh token correctly", () => {
    const refreshToken = signRefreshToken(samplePayload);
    assert.strictEqual(typeof refreshToken, "string");

    const decoded = verifyRefreshToken(refreshToken);
    assert.strictEqual(decoded.userId, samplePayload.userId);
    assert.strictEqual(decoded.instituteId, samplePayload.instituteId);
  });

  test("should throw error on invalid token verification", () => {
    assert.throws(() => {
      verifyAccessToken("invalid.jwt.token");
    });
  });
});

describe("Zod Validation Schemas", () => {
  test("loginSchema accepts valid input", () => {
    const validData = {
      emailOrPhone: "admin@aadya.in",
      password: "ChangeMe@123",
    };
    const result = loginSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
  });

  test("loginSchema rejects missing emailOrPhone", () => {
    const invalidData = {
      emailOrPhone: "",
      password: "ChangeMe@123",
    };
    const result = loginSchema.safeParse(invalidData);
    assert.strictEqual(result.success, false);
  });

  test("loginSchema rejects short password", () => {
    const invalidData = {
      emailOrPhone: "admin@aadya.in",
      password: "123",
    };
    const result = loginSchema.safeParse(invalidData);
    assert.strictEqual(result.success, false);
  });

  test("refreshTokenSchema validates refreshToken string", () => {
    const valid = refreshTokenSchema.safeParse({ refreshToken: "valid_token_str" });
    assert.strictEqual(valid.success, true);

    const invalid = refreshTokenSchema.safeParse({ refreshToken: "" });
    assert.strictEqual(invalid.success, false);
  });
});

describe("Role Middleware Unit Tests", () => {
  test("requireRole allows user with matching role", () => {
    const middleware = requireRole("ADMIN", "CENTER_MANAGER");
    let nextCalled = false;
    const req: any = {
      user: {
        userId: "user-123",
        instituteId: "inst-1",
        roles: ["ADMIN"],
      },
    };
    const res: any = {};
    const next = () => {
      nextCalled = true;
    };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, true);
  });

  test("requireRole blocks user without matching role", () => {
    const middleware = requireRole("ADMIN");
    let nextCalled = false;
    let sendErrorCalled = false;
    let statusCode = 0;

    const req: any = {
      user: {
        userId: "user-123",
        instituteId: "inst-1",
        roles: ["STUDENT"],
      },
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        sendErrorCalled = true;
        return this;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(sendErrorCalled, true);
  });
});
