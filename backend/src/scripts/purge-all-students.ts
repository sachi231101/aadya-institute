/**
 * One-off: remove ALL student data from the database.
 * Keeps staff users, courses, batches, faculties, leads (unlinked), etc.
 *
 * Run: npx tsx src/scripts/purge-all-students.ts
 */
import { prisma } from "../config/database";

async function main() {
  const before = await prisma.student.count();
  console.log(`Students before purge: ${before}`);

  if (before === 0) {
    console.log("No students to delete.");
    return;
  }

  const students = await prisma.student.findMany({
    select: { id: true, userId: true, studentCode: true },
  });
  const studentIds = students.map((s) => s.id);
  const studentUserIds = students
    .map((s) => s.userId)
    .filter((id): id is string => !!id);

  console.log(`Purging ${studentIds.length} students...`);

  await prisma.$transaction(
    async (tx) => {
      const paymentIds = (
        await tx.payment.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true },
        })
      ).map((p) => p.id);

      const pendingFeeIds = (
        await tx.pendingFee.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true },
        })
      ).map((f) => f.id);

      const invoiceIds = (
        await tx.studentInvoice.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true },
        })
      ).map((i) => i.id);

      if (paymentIds.length || pendingFeeIds.length || invoiceIds.length) {
        await tx.paymentAllocation.deleteMany({
          where: {
            OR: [
              ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
              ...(pendingFeeIds.length
                ? [{ pendingFeeId: { in: pendingFeeIds } }]
                : []),
              ...(invoiceIds.length
                ? [{ studentInvoiceId: { in: invoiceIds } }]
                : []),
            ],
          },
        });
      }

      if (invoiceIds.length) {
        await tx.studentInvoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { pendingFeeId: null },
        });
      }

      await tx.payment.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentInvoice.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.otherInvoice.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.pendingFee.deleteMany({
        where: { studentId: { in: studentIds } },
      });

      await tx.studentAttendance.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.leaveRequest.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.assignmentSubmission.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.assignmentRecipient.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.feedback.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.examAttempt.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.examStudent.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.placementApplication.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.placementRecord.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.batchEnrollment.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.notification.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      await tx.callLog.deleteMany({ where: { studentId: { in: studentIds } } });

      await tx.lead.updateMany({
        where: { convertedStudentId: { in: studentIds } },
        data: {
          convertedStudentId: null,
          convertedAdmissionId: null,
          convertedAt: null,
        },
      });

      await tx.admission.deleteMany({
        where: { studentId: { in: studentIds } },
      });

      await tx.student.deleteMany({ where: { id: { in: studentIds } } });

      if (studentUserIds.length > 0) {
        await tx.refreshToken.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        await tx.userPermission.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        await tx.userRole.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        await tx.user.deleteMany({ where: { id: { in: studentUserIds } } });
      }
    },
    { timeout: 180_000 }
  );

  const after = await prisma.student.count();
  const leftoverUsers = studentUserIds.length
    ? await prisma.user.count({ where: { id: { in: studentUserIds } } })
    : 0;

  console.log(`Students after purge: ${after}`);
  console.log(`Student portal users remaining: ${leftoverUsers}`);
  console.log("✅ Student data purge complete.");
}

main()
  .catch((err) => {
    console.error("❌ Purge failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
