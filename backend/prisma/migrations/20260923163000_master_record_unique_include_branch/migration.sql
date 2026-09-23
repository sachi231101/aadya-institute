-- Widen MasterRecord uniqueness to include branchId so the same
-- timeslot name can exist per branch (and separately for All branches / null).
ALTER TABLE "MasterRecord" DROP CONSTRAINT IF EXISTS "MasterRecord_instituteId_entityType_name_key";
DROP INDEX IF EXISTS "MasterRecord_instituteId_entityType_name_key";

ALTER TABLE "MasterRecord" ADD CONSTRAINT "MasterRecord_instituteId_entityType_name_branchId_key" UNIQUE ("instituteId", "entityType", "name", "branchId");
