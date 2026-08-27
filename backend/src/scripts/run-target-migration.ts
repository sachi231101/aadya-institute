import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../config/database";

async function main() {
  console.log("🚀 Applying Target & Incentive Management SQL migration...");
  const sqlPath = path.join(__dirname, "../../prisma/migrations/20260827170000_add_target_incentive_management/migration.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Split into individual SQL statements separated by semicolons
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (err: any) {
      // Ignore if table/enum/index/column/relation already exists
      if (
        err.message?.includes("already exists") ||
        err.message?.includes("duplicate key") ||
        err.code === "42P07" ||
        err.code === "42710"
      ) {
        console.log(`ℹ️  Notice: Object already exists, skipping.`);
      } else {
        console.error(`⚠️ Error executing statement:`, statement, err.message);
        throw err;
      }
    }
  }

  console.log("✅ Target & Incentive Management SQL migration applied successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
