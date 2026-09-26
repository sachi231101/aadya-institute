-- Add work location coordinates to Faculty for geo-fenced attendance check-in/check-out
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "workLatitude" DOUBLE PRECISION;
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "workLongitude" DOUBLE PRECISION;
