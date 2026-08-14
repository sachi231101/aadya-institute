import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { hashPassword } from "../../../utils/password";
import { LeadActivityService } from "./lead-activity.service";
import { triggerNotification } from "../../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../../whatsapp/whatsapp.constants";
import { logger } from "../../../config/logger";
import type { AuthUser } from "../../auth/auth.types";
import type { ConvertLeadDTO } from "../lead.types";

export const LeadConversionService = {
  async convertLead(
    leadId: string,
    currentUser: AuthUser,
    dto: ConvertLeadDTO
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        branch: true,
        course: true,
      },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    if (lead.status === "CONVERTED" || lead.convertedStudentId) {
      throw new AppError("Lead has already been converted to a student", 400);
    }

    // Branch check for CENTER_MANAGER
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    // Resolve course
    let courseId = dto.courseId || lead.courseId;
    if (!courseId) {
      // Attempt to find course by interestedIn name
      const matchedCourse = await prisma.course.findFirst({
        where: {
          instituteId: lead.instituteId,
          name: { contains: lead.interestedIn, mode: "insensitive" },
        },
      });
      if (matchedCourse) {
        courseId = matchedCourse.id;
      } else {
        // Fallback to any active course in institute
        const anyCourse = await prisma.course.findFirst({
          where: { instituteId: lead.instituteId, status: "ACTIVE" },
        });
        if (!anyCourse) {
          throw new AppError("No course found to associate with this conversion", 400);
        }
        courseId = anyCourse.id;
      }
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new AppError("Selected course does not exist", 400);
    }

    // Generate codes
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString().slice(-4);
    const studentCode = `STU-2026-${randomDigits}${timestamp.slice(-2)}`;
    const admissionNo = `ADM-2026-${randomDigits}${timestamp.slice(-2)}`;

    // Execute atomic conversion transaction
    const conversionResult = await prisma.$transaction(async (tx) => {
      // 1. Create or Find User & Student
      let studentUserId: string | null = null;
      let student: any = null;

      if (dto.createStudentUser !== false) {
        const studentRole = await tx.role.findFirst({
          where: { name: "STUDENT" },
        });

        // Check if user with email or phone already exists
        let existingUser = null;
        if (lead.email) {
          existingUser = await tx.user.findFirst({
            where: { email: lead.email, instituteId: lead.instituteId },
            include: { student: true },
          });
        }
        if (!existingUser && lead.phoneNumber) {
          existingUser = await tx.user.findFirst({
            where: { phone: lead.phoneNumber, instituteId: lead.instituteId },
            include: { student: true },
          });
        }

        if (existingUser) {
          studentUserId = existingUser.id;
          if (existingUser.student) {
            student = existingUser.student;
          }
        } else {
          const defaultPasswordHash = await hashPassword("Student@123");
          const newUser = await tx.user.create({
            data: {
              name: lead.name,
              email: lead.email ?? null,
              phone: lead.phoneNumber,
              passwordHash: defaultPasswordHash,
              instituteId: lead.instituteId,
              branchId: lead.branchId,
              status: "ACTIVE",
            },
          });
          studentUserId = newUser.id;

          if (studentRole) {
            await tx.userRole.create({
              data: {
                userId: newUser.id,
                roleId: studentRole.id,
              },
            });
          }
        }
      }

      // 2. Create Student record if not already linked
      if (!student) {
        student = await tx.student.create({
          data: {
            studentCode,
            userId: studentUserId,
            instituteId: lead.instituteId,
            branchId: lead.branchId,
            status: "ACTIVE",
          },
        });
      }

      // 3. Create Admission record
      const admission = await tx.admission.create({
        data: {
          admissionNo,
          studentId: student.id,
          instituteId: lead.instituteId,
          branchId: lead.branchId,
          courseId,
          batchId: dto.batchId ?? null,
          studentName: lead.name,
          email: lead.email ?? null,
          phone: lead.phoneNumber,
          feePlan: dto.feePlan ?? "INSTALLMENT",
          status: "CONFIRMED",
          notes: dto.notes ?? `Converted from lead ${lead.id}`,
        },
        include: {
          course: true,
          branch: true,
        },
      });

      // 4. Batch Enrollment if batchId provided
      if (dto.batchId) {
        await tx.batchEnrollment.create({
          data: {
            batchId: dto.batchId,
            studentId: student.id,
            admissionId: admission.id,
            status: "ACTIVE",
          },
        });
      }

      // 5. Update Lead to CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: "CONVERTED",
          status: "CONVERTED",
          convertedAt: new Date(),
          convertedStudentId: student.id,
          convertedAdmissionId: admission.id,
          courseId,
        },
      });

      // 6. Log Lead Activity
      await LeadActivityService.logActivity(
        leadId,
        "CONVERTED",
        `Lead converted to Student (${studentCode}) and Admission (${admissionNo})`,
        {
          userId: currentUser.userId,
          description: `Converted for course ${course.name}. Admission No: ${admissionNo}`,
          metadata: {
            studentId: student.id,
            studentCode,
            admissionId: admission.id,
            admissionNo,
            courseId,
          },
          tx,
        }
      );

      return {
        lead: updatedLead,
        student,
        admission,
      };
    });

    // Asynchronously dispatch WhatsApp notification if available
    try {
      const idempotencyKey = buildIdempotencyKey.ADMISSION_CREATED(
        conversionResult.student.id,
        conversionResult.admission.id
      );

      await triggerNotification({
        instituteId: lead.instituteId,
        studentId: conversionResult.student.id,
        event: NotificationEvent.ADMISSION_CREATED,
        idempotencyKey,
        templateParams: {
          student_name: lead.name,
          course_name: course.name,
          admission_no: conversionResult.admission.admissionNo ?? admissionNo,
        },
        metadata: {
          admissionId: conversionResult.admission.id,
          phone: lead.phoneNumber,
          leadId: lead.id,
        },
      });
    } catch (err) {
      logger.error({ err, leadId }, "[LeadConversionService] Failed to trigger admission notification");
    }

    return conversionResult;
  },
};
