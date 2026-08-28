import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      userRoles: { include: { role: true } },
    },
  });
  console.log("USERS IN DB:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, name: u.name, roles: u.userRoles.map(r => r.role.name) })), null, 2));

  const counts: Record<string, number> = {};
  for (const key of Object.keys(prisma)) {
    if (!key.startsWith("$") && !key.startsWith("_") && typeof (prisma as any)[key]?.count === "function") {
      try {
        counts[key] = await (prisma as any)[key].count();
      } catch (err: any) {
        counts[key] = -1;
      }
    }
  }
  console.log("ALL TABLE COUNTS:", JSON.stringify(counts, null, 2));
}

main().finally(() => prisma.$disconnect());
