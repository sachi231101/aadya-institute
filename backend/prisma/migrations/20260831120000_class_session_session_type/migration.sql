-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('THEORY', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable: add sessionType with default
ALTER TABLE "ClassSession" ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'THEORY';

-- Migrate sessionStatus values before type change
UPDATE "ClassSession" SET "sessionStatus" = 'LIVE' WHERE "sessionStatus" IN ('LIVE', 'ONGOING');

-- AlterTable: convert sessionStatus to enum
ALTER TABLE "ClassSession" ALTER COLUMN "sessionStatus" DROP DEFAULT;
ALTER TABLE "ClassSession" ALTER COLUMN "sessionStatus" TYPE "ClassSessionStatus" USING (
  CASE
    WHEN "sessionStatus" = 'UPCOMING' THEN 'UPCOMING'::"ClassSessionStatus"
    WHEN "sessionStatus" = 'LIVE' THEN 'LIVE'::"ClassSessionStatus"
    WHEN "sessionStatus" = 'COMPLETED' THEN 'COMPLETED'::"ClassSessionStatus"
    WHEN "sessionStatus" = 'CANCELLED' THEN 'CANCELLED'::"ClassSessionStatus"
    ELSE 'UPCOMING'::"ClassSessionStatus"
  END
);
ALTER TABLE "ClassSession" ALTER COLUMN "sessionStatus" SET DEFAULT 'UPCOMING';
