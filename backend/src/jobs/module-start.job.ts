import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { triggerNotification } from "../modules/notifications/notification.service";
import { NotificationEvent, buildIdempotencyKey } from "../modules/notifications/notification.constants";

/**
 * Sends a "New Module" WhatsApp notification when a batch module starts.
 *
 * Finds ACTIVE BatchModule records whose startDate is within the next 24 hours
 * and notifies all enrolled students. Uses idempotency keys so each student
 * receives exactly one module-start message per module.
 */
export const moduleStartJob = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const batchModules = await prisma.batchModule.findMany({
    where: {
      startDate: { gte: now, lte: windowEnd },
      status: "ACTIVE",
    },
    include: {
      courseModule: true,
      batch: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: { include: { user: true } } },
          },
        },
      },
    },
  });

  logger.info(`[module-start] ${batchModules.length} modules starting in the next 24h`);

  for (const batchModule of batchModules) {
    const moduleName = batchModule.courseModule?.name ?? "New module";
    const startDate = batchModule.startDate?.toISOString().split("T")[0] ?? "";

    for (const enrollment of batchModule.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      const idempotencyKey = buildIdempotencyKey.MODULE_START(student.id, batchModule.id);

      await triggerNotification({
        instituteId: batchModule.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.MODULE_START,
        idempotencyKey,
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: batchModule.batch.name ?? "Batch",
          module_name: moduleName,
          start_date: startDate,
        },
        metadata: {
          batchModuleId: batchModule.id,
          batchId: batchModule.batchId,
        },
      });
    }
  }
};
