-- Ensure batch curriculum mark permission exists and is grantable.
INSERT INTO "Permission" ("id", "name", "description", "createdAt")
SELECT 'perm_batch_curriculum_mark', 'batch_curriculum.mark', 'Mark batch curriculum module/topic progress', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "name" = 'batch_curriculum.mark');

-- ADMIN role always gets the permission
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'rp_admin_batch_curriculum_mark',
  r."id",
  p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'ADMIN'
  AND p."name" = 'batch_curriculum.mark'
  AND NOT EXISTS (
    SELECT 1
    FROM "RolePermission" rp
    WHERE rp."roleId" = r."id"
      AND rp."permissionId" = p."id"
  );

-- FACULTY role can mark progress on assigned batches
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'rp_faculty_batch_curriculum_mark',
  r."id",
  p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'FACULTY'
  AND p."name" = 'batch_curriculum.mark'
  AND NOT EXISTS (
    SELECT 1
    FROM "RolePermission" rp
    WHERE rp."roleId" = r."id"
      AND rp."permissionId" = p."id"
  );

-- Backfill CM/Counsellor (and any staff) who already have batch write access
INSERT INTO "UserPermission" ("id", "userId", "permissionId", "grantedAt")
SELECT
  'up_bcm_' || up."userId",
  up."userId",
  mark_perm."id",
  CURRENT_TIMESTAMP
FROM "UserPermission" up
JOIN "Permission" existing
  ON existing."id" = up."permissionId"
 AND existing."name" IN ('batch.create', 'batch.update')
CROSS JOIN "Permission" mark_perm
WHERE mark_perm."name" = 'batch_curriculum.mark'
  AND NOT EXISTS (
    SELECT 1
    FROM "UserPermission" existing_up
    WHERE existing_up."userId" = up."userId"
      AND existing_up."permissionId" = mark_perm."id"
  )
GROUP BY up."userId", mark_perm."id";
