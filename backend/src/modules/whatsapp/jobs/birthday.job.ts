/**
 * Birthday greeting job — daily for students whose DOB is today.
 */
import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import {
  NotificationEvent,
  NotificationChannel,
  buildIdempotencyKey,
} from "../whatsapp.constants";

export const birthdayGreetingJob = async (): Promise<void> => {
  const rules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.BIRTHDAY_GREETING,
      channel: NotificationChannel.WHATSAPP,
      enabled: true,
    },
  });
  if (rules.length === 0) return;

  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const dateKey = now.toISOString().slice(0, 10);
  const instituteIds = rules.map((r) => r.instituteId);

  const students = await prisma.student.findMany({
    where: {
      instituteId: { in: instituteIds },
      status: "ACTIVE",
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      instituteId: true,
      dateOfBirth: true,
      user: { select: { name: true } },
    },
  });

  const todays = students.filter((s) => {
    if (!s.dateOfBirth) return false;
    const dob = new Date(s.dateOfBirth);
    return dob.getMonth() === month && dob.getDate() === day;
  });

  logger.info(`[birthday] ${todays.length} birthday(s) today`);

  for (const student of todays) {
    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.BIRTHDAY_GREETING,
      idempotencyKey: buildIdempotencyKey.BIRTHDAY_GREETING(student.id, dateKey),
      templateParams: {
        student_name: student.user?.name || "Student",
        organization_name: "Aadya Institute",
      },
      metadata: { date: dateKey },
    });
  }
};
