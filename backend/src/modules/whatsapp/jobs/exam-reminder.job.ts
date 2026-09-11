import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp.constants";

/**
 * Remind students ~1 day before a scheduled exam start.
 */
export const examReminderJob = async (): Promise<void> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const dateKey = now.toISOString().slice(0, 10);

  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ["PUBLISHED", "SCHEDULED"] },
      startAt: { gte: windowStart, lte: windowEnd },
    },
    include: {
      studentAssignments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    take: 100,
  });

  logger.info(`[exam-reminder] Found ${exams.length} exams starting in ~24h`);

  for (const exam of exams) {
    for (const assignment of exam.studentAssignments) {
      const student = assignment.student;
      if (!student?.user?.phone) continue;

      await triggerNotification({
        instituteId: exam.instituteId,
        studentId: student.id,
        event: NotificationEvent.EXAM_REMINDER,
        idempotencyKey: buildIdempotencyKey.EXAM_REMINDER(student.id, exam.id, dateKey),
        templateParams: {
          student_name: student.user.name ?? "Student",
          exam_name: exam.name,
          exam_date: exam.startAt
            ? new Date(exam.startAt).toLocaleDateString("en-IN")
            : "scheduled date",
          start_time: exam.startAt
            ? new Date(exam.startAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
        },
        metadata: { examId: exam.id },
      });
    }
  }
};
