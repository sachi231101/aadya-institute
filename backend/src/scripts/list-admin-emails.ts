import "dotenv/config";
import { prisma } from "../config/database";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "admin", mode: "insensitive" } },
        { email: { contains: "super", mode: "insensitive" } },
      ],
    },
    select: { email: true, name: true },
    take: 15,
  });
  console.log(JSON.stringify({ users }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
