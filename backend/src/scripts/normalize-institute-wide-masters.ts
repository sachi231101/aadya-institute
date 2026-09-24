/**
 * Make ACCOUNTING_FEES masters institute-wide (branchId = null).
 * Run: npx tsx src/scripts/normalize-institute-wide-masters.ts
 */
import { prisma } from "../config/database";
import { MASTER_ENTITY_TYPES } from "../modules/masters/master.entity-types";

async function main() {
  const types = MASTER_ENTITY_TYPES.filter((t) => t.category === "ACCOUNTING_FEES").map(
    (t) => t.id
  );
  const result = await prisma.masterRecord.updateMany({
    where: {
      entityType: { in: types },
      branchId: { not: null },
    },
    data: { branchId: null },
  });
  console.log(`Cleared branchId on ${result.count} accounting master record(s)`);
  console.log("Types:", types.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
