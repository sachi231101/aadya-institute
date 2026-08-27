import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { encrypt, decrypt } from "../../utils/encryption";
import type { GoogleOAuthTokens, GoogleUserProfile } from "./google.types";

/**
 * Returns a configured Google OAuth2 Client instance
 */
export const getOAuth2Client = (): OAuth2Client => {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Returns default required scopes for Google Meet spaces and Google Drive recording metadata
 */
export const getRequiredScopes = (): string[] => {
  const meetScopes = env.GOOGLE_MEET_SCOPES.split(" ").filter(Boolean);
  const driveScopes = env.GOOGLE_DRIVE_SCOPES.split(" ").filter(Boolean);
  const profileScopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
  ];

  return Array.from(new Set([...profileScopes, ...meetScopes, ...driveScopes]));
};

/**
 * Generates the Google OAuth authorization URL
 */
export const generateAuthorizationUrl = (state: string): string => {
  const oauth2Client = getOAuth2Client();
  const scopes = getRequiredScopes();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
    include_granted_scopes: true,
  });
};

/**
 * Exchanges authorization code for tokens and user profile
 */
export const exchangeAuthorizationCode = async (
  code: string
): Promise<{ tokens: GoogleOAuthTokens; userProfile: GoogleUserProfile }> => {
  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token from Google");
    }

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userProfile } = await oauth2.userinfo.get();

    if (!userProfile.email || !userProfile.id) {
      throw new Error("Unable to retrieve Google user profile information");
    }

    const grantedScopes = typeof tokens.scope === "string" ? tokens.scope.split(" ") : (tokens.scope || []);

    return {
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenType: tokens.token_type || "Bearer",
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : null,
        expiryDate: tokens.expiry_date || null,
        scopes: grantedScopes,
        idToken: tokens.id_token || null,
      },
      userProfile: {
        id: userProfile.id,
        email: userProfile.email,
        verifiedEmail: userProfile.verified_email ?? false,
        name: userProfile.name || undefined,
        picture: userProfile.picture || undefined,
      },
    };
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Failed to exchange Google authorization code");
    throw new Error("Google authorization failed. Please try connecting again.");
  }
};

/**
 * Encrypts a Google refresh token with AES-256-GCM
 */
export const encryptRefreshToken = (refreshToken: string): string => {
  return encrypt(refreshToken, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
};

/**
 * Decrypts a stored refresh token
 */
export const decryptRefreshToken = (encryptedRefreshToken: string): string => {
  try {
    return decrypt(encryptedRefreshToken, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  } catch (err) {
    logger.error("Failed to decrypt Google refresh token — key mismatch or corruption");
    throw new Error("Invalid or corrupted Google authorization credentials");
  }
};

/**
 * Creates an authenticated OAuth2Client using a decrypted refresh token.
 * Automatically refreshes access tokens upon request.
 */
export const getAuthenticatedOAuth2Client = (encryptedRefreshToken: string): OAuth2Client => {
  const refreshToken = decryptRefreshToken(encryptedRefreshToken);
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

/**
 * Revokes Google OAuth access/refresh token
 */
export const revokeGoogleToken = async (encryptedRefreshToken: string): Promise<boolean> => {
  try {
    const refreshToken = decryptRefreshToken(encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();
    await oauth2Client.revokeToken(refreshToken);
    return true;
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, "Google token revocation request failed or token already revoked");
    return false;
  }
};
