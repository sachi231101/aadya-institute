/**
 * Seed / refresh the class-session stress fixture.
 *
 * Usage:
 *   npx tsx src/scripts/seed-class-session-stress.ts
 *   npx tsx src/scripts/seed-class-session-stress.ts --destroy
 *
 * Creates isolated institute TEST-CLASS-SESSION-STRESS (does not alter
 * timetable layout or batch auto-schedule generation).
 */
import "dotenv/config";
import {
  createClassSessionStressFixture,
  destroyClassSessionStressFixture,
  STRESS_FIXTURE_CODE,
} from "../tests/fixtures/class-session-stress.fixture";
import { prisma } from "../config/database";

async function main() {
  const destroyOnly = process.argv.includes("--destroy");

  if (destroyOnly) {
    await destroyClassSessionStressFixture();
    console.log(`Destroyed fixture institute ${STRESS_FIXTURE_CODE}`);
    return;
  }

  const fx = await createClassSessionStressFixture();
  console.log("✅ Class-session stress fixture ready");
  console.log(
    JSON.stringify(
      {
        instituteCode: STRESS_FIXTURE_CODE,
        instituteId: fx.instituteId,
        todayKey: fx.todayKey,
        counts: fx.counts,
        sessions: fx.sessions,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
