import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import type { Prisma } from "@prisma/client";
import type { 
  CreateEnquiryDTO, 
  UpdateEnquiryDTO, 
  QueryEnquiriesDTO,
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO
} from "./admissions.types";
import { SequenceService } from "../masters/sequence.service";

export const AdmissionsRepository = {
  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async findEnquiries(instituteId: string, params: QueryEnquiriesDTO) {
    const { search, source, status, courseId, page = 1, limit = 50 } = params;

    const where: Prisma.EnquiryWhereInput = {
      instituteId,
      ...(source && source !== "ALL" ? { source: source as any } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { enquiryNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findEnquiryById(id: string, instituteId: string) {
    return prisma.enquiry.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        applications: true,
      },
    });
  },

  async createEnquiry(instituteId: string, branchId: string | undefined, enquiryNo: string, dto: CreateEnquiryDTO) {
    return prisma.enquiry.create({
      data: {
        instituteId,
        branchId,
        enquiryNo,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone,
        courseId: dto.courseId,
        source: dto.source || "WEBSITE",
        status: dto.status || "NEW",
        counselorNotes: dto.counselorNotes || null,
        assignedToId: dto.assignedToId || null,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async updateEnquiry(id: string, instituteId: string, dto: UpdateEnquiryDTO) {
    return prisma.enquiry.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.counselorNotes !== undefined ? { counselorNotes: dto.counselorNotes } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
      },
    });
  },

  async deleteEnquiry(id: string, instituteId: string) {
    return prisma.enquiry.deleteMany({
      where: { id, instituteId },
    });
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async findApplications(instituteId: string, params: QueryApplicationsDTO) {
    const { search, feeStatus, status, courseId, page = 1, limit = 50 } = params;

    const where: Prisma.ApplicationWhereInput = {
      instituteId,
      ...(feeStatus && feeStatus !== "ALL" ? { feeStatus: feeStatus as any } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(search
        ? {
            OR: [
              { applicantName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { applicationNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          enquiry: { select: { id: true, enquiryNo: true, source: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findApplicationById(id: string, instituteId: string) {
    return prisma.application.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        enquiry: true,
        admissions: true,
      },
    });
  },

  async createApplication(instituteId: string, branchId: string | undefined, applicationNo: string, dto: CreateApplicationDTO) {
    return prisma.application.create({
      data: {
        instituteId,
        branchId,
        applicationNo,
        enquiryId: dto.enquiryId || null,
        applicantName: dto.applicantName,
        email: dto.email || null,
        phone: dto.phone,
        courseId: dto.courseId,
        feeStatus: dto.feeStatus || "PENDING",
        status: dto.status || "SUBMITTED",
        notes: dto.notes || null,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async updateApplication(id: string, instituteId: string, dto: UpdateApplicationDTO) {
    return prisma.application.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.applicantName !== undefined ? { applicantName: dto.applicantName } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.feeStatus !== undefined ? { feeStatus: dto.feeStatus } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  },

  async deleteApplication(id: string, instituteId: string) {
    return prisma.application.deleteMany({
      where: { id, instituteId },
    });
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async findAdmissions(instituteId: string, params: QueryAdmissionsDTO) {
    const { search, courseId, status, batchId, page = 1, limit = 50 } = params;

    const where: Prisma.AdmissionWhereInput = {
      instituteId,
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(batchId && batchId !== "ALL" ? { batchId } : {}),
      ...(search
        ? {
            OR: [
              { studentName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { admissionNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
              { batch: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
          student: { select: { id: true, studentCode: true } },
          application: { select: { id: true, applicationNo: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findAdmissionById(id: string, instituteId: string) {
    return prisma.admission.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        student: true,
        application: true,
      },
    });
  },

  async createAdmission(instituteId: string, branchId: string, admissionNo: string, dto: CreateAdmissionDTO) {
    return prisma.$transaction(async (tx) => {
      let finalStudentId = dto.studentId || null;
      const defaultStudentPasswordHash = await hashPassword("Aadya@123");

      if (dto.studentId) {
        finalStudentId = dto.studentId;
        const existingStudent = await tx.student.findUnique({
          where: { id: dto.studentId },
          include: { user: true },
        });
        if (existingStudent) {
          await tx.student.update({
            where: { id: dto.studentId },
            data: {
              studentCode: admissionNo,
              status: "ACTIVE",
              branchId,
            },
          });
          if (existingStudent.userId) {
            await tx.user.update({
              where: { id: existingStudent.userId },
              data: {
                name: dto.studentName,
                status: "ACTIVE",
                passwordHash: defaultStudentPasswordHash,
                branchId,
              },
            });
            const studentRole = await tx.role.findUnique({ where: { name: "STUDENT" } });
            if (studentRole) {
              await tx.userRole.upsert({
                where: { userId_roleId: { userId: existingStudent.userId, roleId: studentRole.id } },
                update: {},
                create: { userId: existingStudent.userId, roleId: studentRole.id },
              });
            }
          }
        }
      } else {
        // New admission: duplicate check by phone only (not email). Never silently reuse profiles.
        const normalizedPhone = (dto.phone || "").replace(/\D/g, "").slice(-10);

        if (normalizedPhone.length >= 10) {
          const usersWithPhone = await tx.user.findMany({
            where: { instituteId, phone: { not: null } },
            select: { phone: true },
          });
          const phoneTaken = usersWithPhone.some(
            (u) => (u.phone || "").replace(/\D/g, "").slice(-10) === normalizedPhone
          );
          if (phoneTaken) {
            throw new AppError(
              "This phone number is already registered. Please enter a different phone number.",
              409
            );
          }
        }

        const extractNote = (pattern: RegExp) => {
          if (!dto.notes) return null;
          const match = dto.notes.match(pattern);
          return match ? match[1].trim() : null;
        };
        const extractedQual = extractNote(/(?:Highest Qualification|Qualification):\s*([^|\n]+)/i);
        const extractedDob = extractNote(/DOB:\s*([^|\n]+)/i);

        const studentCode = admissionNo;

        const newUser = await tx.user.create({
          data: {
            instituteId,
            branchId,
            name: dto.studentName,
            email: dto.email && dto.email.trim() !== "" ? dto.email.trim() : null,
            phone: normalizedPhone.length >= 10 ? normalizedPhone : dto.phone?.trim() || null,
            passwordHash: defaultStudentPasswordHash,
            status: "ACTIVE",
          },
        });

        const studentRole = await tx.role.findUnique({ where: { name: "STUDENT" } });
        if (studentRole) {
          await tx.userRole.create({
            data: { userId: newUser.id, roleId: studentRole.id },
          });
        }

        let parsedDob: Date | undefined;
        if (extractedDob) {
          try {
            parsedDob = new Date(extractedDob);
          } catch {}
        }

        const newStudent = await tx.student.create({
          data: {
            userId: newUser.id,
            instituteId,
            branchId,
            studentCode,
            qualification: extractedQual || null,
            dateOfBirth: parsedDob,
            status: "ACTIVE",
          },
        });
        finalStudentId = newStudent.id;
      }

      // Ensure valid courseId
      let validCourseId = dto.courseId;
      const courseExists = await tx.course.findUnique({ where: { id: validCourseId } });
      if (!courseExists) {
        const fallbackCourse = await tx.course.findFirst({ where: { instituteId } });
        if (fallbackCourse) {
          validCourseId = fallbackCourse.id;
        } else {
          const newCourse = await tx.course.create({
            data: {
              instituteId,
              name: "Full Stack Web Development",
              code: `FSWD-${Math.floor(100 + Math.random() * 900)}`,
              category: "Web Development",
            },
          });
          validCourseId = newCourse.id;
        }
      }

      // Ensure valid batchId
      let validBatchId = dto.batchId && dto.batchId.trim() !== "" ? dto.batchId : null;
      if (validBatchId) {
        const batchExists = await tx.batch.findUnique({ where: { id: validBatchId } });
        if (!batchExists) {
          validBatchId = null;
        }
      }

      const parsedAdmissionDate = dto.admissionDate ? new Date(dto.admissionDate) : undefined;
      const paymentMethod = dto.paymentMethod || "UPI";

      // 2. Create or Update Admission record
      let admission;
      const existingPending = (dto.applicationId || finalStudentId)
        ? await tx.admission.findFirst({
            where: {
              instituteId,
              status: "PENDING",
              OR: [
                ...(dto.applicationId ? [{ applicationId: dto.applicationId }] : []),
                ...(finalStudentId ? [{ studentId: finalStudentId }] : []),
              ],
            },
          })
        : null;

      if (existingPending) {
        admission = await tx.admission.update({
          where: { id: existingPending.id },
          data: {
            branchId,
            admissionNo,
            studentId: finalStudentId,
            studentName: dto.studentName,
            email: dto.email || null,
            phone: dto.phone,
            courseId: validCourseId,
            batchId: validBatchId,
            applicationId: dto.applicationId || null,
            feePlan: dto.feePlan || "INSTALLMENT",
            status: dto.status || "CONFIRMED",
            notes: dto.notes || null,
            ...(parsedAdmissionDate && !Number.isNaN(parsedAdmissionDate.getTime())
              ? { admissionDate: parsedAdmissionDate }
              : { admissionDate: new Date() }),
          },
          include: {
            course: { select: { id: true, name: true, code: true } },
            batch: { select: { id: true, name: true, code: true } },
            student: { select: { id: true, studentCode: true } },
          },
        });
      } else {
        admission = await tx.admission.create({
          data: {
            instituteId,
            branchId,
            admissionNo,
            studentId: finalStudentId,
            studentName: dto.studentName,
            email: dto.email || null,
            phone: dto.phone,
            courseId: validCourseId,
            batchId: validBatchId,
            applicationId: dto.applicationId || null,
            feePlan: dto.feePlan || "INSTALLMENT",
            status: dto.status || "CONFIRMED",
            notes: dto.notes || null,
            ...(parsedAdmissionDate && !Number.isNaN(parsedAdmissionDate.getTime())
              ? { admissionDate: parsedAdmissionDate }
              : {}),
          },
          include: {
            course: { select: { id: true, name: true, code: true } },
            batch: { select: { id: true, name: true, code: true } },
            student: { select: { id: true, studentCode: true } },
          },
        });
      }

      // Update linked application status to ADMITTED
      if (dto.applicationId) {
        await tx.application.updateMany({
          where: { id: dto.applicationId, instituteId },
          data: { status: "ADMITTED" },
        });
      }

      // 3. If batchId is provided and valid, enroll student into batch
      if (validBatchId && finalStudentId) {
        await tx.batchEnrollment.upsert({
          where: {
            batchId_studentId: { batchId: validBatchId, studentId: finalStudentId },
          },
          update: {
            status: "ACTIVE",
            admissionId: admission.id,
          },
          create: {
            batchId: validBatchId,
            studentId: finalStudentId,
            admissionId: admission.id,
            status: "ACTIVE",
          },
        });
      }

      // 4. If fee info is provided
      if (dto.totalFee && dto.totalFee > 0 && finalStudentId) {
        const totalFee = Number(dto.totalFee);
        const amountPaid = Number(dto.amountPaid || 0);
        const courseName = admission.course?.name || "Program";

        if (amountPaid > 0) {
          const receiptNo = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          await tx.payment.create({
            data: {
              receiptNo,
              instituteId,
              branchId,
              studentId: finalStudentId,
              admissionId: admission.id,
              studentName: dto.studentName,
              admissionNo,
              courseName,
              amount: amountPaid,
              method: paymentMethod,
              status: "SUCCESS",
              transactionRef: dto.transactionRef || null,
              notes: "Initial admission payment",
            },
          });
        }

        const plannedInstallments = (dto.installments || []).filter((item) => Number(item.amount) > 0);
        if (plannedInstallments.length > 0) {
          await tx.pendingFee.createMany({
            data: plannedInstallments.map((item) => {
              const dueDate = new Date(item.dueDate);
              return {
                instituteId,
                branchId,
                studentId: finalStudentId,
                admissionId: admission.id,
                studentName: dto.studentName,
                admissionNo,
                phone: dto.phone,
                courseName,
                totalFee,
                amountPaid: 0,
                dueAmount: Number(item.amount),
                dueDate: Number.isNaN(dueDate.getTime()) ? new Date() : dueDate,
                installmentNo: item.installmentNo,
                status: "DUE_SOON" as const,
              };
            }),
          });
        } else {
          const balance = Math.max(0, totalFee - amountPaid);
          if (balance > 0) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            await tx.pendingFee.create({
              data: {
                instituteId,
                branchId,
                studentId: finalStudentId,
                admissionId: admission.id,
                studentName: dto.studentName,
                admissionNo,
                phone: dto.phone,
                courseName,
                totalFee,
                amountPaid,
                dueAmount: balance,
                dueDate,
                installmentNo: 1,
                status: "DUE_SOON",
              },
            });
          }
        }
      }

      return admission;
    });
  },

  async updateAdmission(id: string, instituteId: string, dto: UpdateAdmissionDTO) {
    return prisma.admission.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.studentName !== undefined ? { studentName: dto.studentName } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.batchId !== undefined ? { batchId: dto.batchId || null } : {}),
        ...(dto.feePlan !== undefined ? { feePlan: dto.feePlan } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  },

  async deleteAdmission(id: string, instituteId: string) {
    return prisma.admission.deleteMany({
      where: { id, instituteId },
    });
  },
};
