-- Remove unused authenticator 2FA tables
DROP TABLE IF EXISTS "UserRecoveryCode";
DROP TABLE IF EXISTS "UserTotpSecret";
