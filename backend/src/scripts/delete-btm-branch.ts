/**
 * Soft-delete the BTM branch (same behavior as Admin branch.delete).
 * Run: npx tsx src/scripts/delete-btm-branch.ts
 */
import { prisma } from "../config/database";
import { releaseBranchCode } from "../modules/branches/branch.repository";
import { deleteBranchTeamConversations } from "../modules/chat/chat.repository";

const BTM_ID = "cmudzpaoo0000zclxrpcexmh2";

async function main() {
  const branch = await prisma.branch.findUnique({
    where: { id: BTM_ID },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      instituteId: true,
      managerUserId: true,
    },
  });

  if (!branch) {
    console.log("BTM branch not found.");
    return;
  }

  if (branch.status === "DELETED") {
    console.log(`BTM is already deleted (code=${branch.code}).`);
    return;
  }

  const usersOnBranch = await prisma.user.findMany({
    where: { branchId: BTM_ID },
    select: { id: true, name: true, email: true },
  });
  console.log(
    `Deleting branch "${branch.name}" (${branch.id}). Users on branch: ${usersOnBranch.length}`
  );
  for (const u of usersOnBranch) {
    console.log(`  - ${u.name} <${u.email}>`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { branchId: BTM_ID },
      data: { branchId: null },
    });

    await tx.branch.update({
      where: { id: BTM_ID },
      data: { managerUserId: null },
    });

    await tx.userBranchAccess.deleteMany({ where: { branchId: BTM_ID } });

    await tx.branch.update({
      where: { id: BTM_ID },
      data: {
        status: "DELETED",
        code: releaseBranchCode(branch.code, branch.id),
      },
    });
  });

  const removedChats = await deleteBranchTeamConversations(
    branch.instituteId,
    BTM_ID
  );

  const after = await prisma.branch.findUnique({
    where: { id: BTM_ID },
    select: { name: true, code: true, status: true },
  });

  console.log("Team chats removed:", removedChats.count);
  console.log("BTM after delete:", after);
  console.log("✅ BTM branch soft-deleted.");
}

main()
  .catch(async (err) => {
    console.error("❌ Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
