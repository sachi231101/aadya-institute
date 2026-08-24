import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true, code: true } });
  console.log("ALL BRANCHES IN DB:", JSON.stringify(branches, null, 2));

  const studentCount = await prisma.student.count();
  console.log("TOTAL STUDENTS IN DB:", studentCount);

  const studentsByBranch = await prisma.student.groupBy({
    by: ['branchId'],
    _count: { id: true }
  });
  console.log("STUDENTS BY BRANCH:", JSON.stringify(studentsByBranch, null, 2));

  const facultyCount = await prisma.faculty.count();
  console.log("TOTAL FACULTY IN DB:", facultyCount);

  const batches = await prisma.batch.findMany({ select: { id: true, name: true, code: true, branchId: true } });
  console.log("ALL BATCHES IN DB:", JSON.stringify(batches, null, 2));
}

main().finally(() => prisma.$disconnect());
