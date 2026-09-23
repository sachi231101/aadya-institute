-- Remove leftover unique index from pre-branch-scoped MasterRecord uniqueness.
-- (DROP CONSTRAINT alone may leave a UNIQUE INDEX of the same name.)
DROP INDEX IF EXISTS "MasterRecord_instituteId_entityType_name_key";
