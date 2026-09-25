/**
 * Ensure institute AI integrations are not pinned to a retired Gemini model.
 */
import { prisma } from "../config/database";

async function main() {
  const rows = await prisma.integration.findMany({
    where: { type: "AI" },
    select: { id: true, provider: true, configuration: true },
  });

  for (const row of rows) {
    const config = (row.configuration || {}) as Record<string, unknown>;
    const model = String(config.model || "");
    const retired = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-001",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ];
    if (!retired.includes(model)) {
      console.log(row.id, "ok", model || "(env default)");
      continue;
    }
    const next = { ...config, model: "gemini-3.8-flash" };
    await prisma.integration.update({
      where: { id: row.id },
      data: {
        provider: row.provider === "OPENAI" ? "GEMINI" : row.provider,
        configuration: next,
      },
    });
    console.log(row.id, "updated", model, "->", "gemini-3.8-flash");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
