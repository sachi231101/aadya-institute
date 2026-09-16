/**
 * Call testAiCallingConnection for the primary institute using current .env.
 */
import "dotenv/config";
import { prisma } from "../config/database";
import { testAiCallingConnection } from "../modules/integrations/providers/integration-test.provider";

async function main() {
  const institute = await prisma.institute.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!institute) {
    console.log(JSON.stringify({ success: false, message: "No institute" }));
    process.exit(1);
  }
  const result = await testAiCallingConnection(institute.id);
  console.log(
    JSON.stringify(
      {
        institute: institute.name,
        instituteId: institute.id,
        keyPrefix: (process.env.SARVAM_API_KEY || "").slice(0, 12),
        keyLen: (process.env.SARVAM_API_KEY || "").length,
        result,
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
  process.exit(result.success ? 0 : 2);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
