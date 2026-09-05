import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";

export interface FindAllStudentsParams {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: string;
  /** When set, only students enrolled in batches assigned to this faculty */
  facultyId?: string;
  skip: number;
  take: number;
}

// Shared include for consistent Student + User data
const studentInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  admissions: {
    include: {
      course: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true, code: true, timeSlot: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  batchEnrollments: {
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          timeSlot: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
          faculty: { select: { id: true, user: { select: { name: true } } } },
          batchCourses: {
            include: {
              course: { select: { id: true, name: true, code: true } },
              faculty: { select: { id: true, user: { select: { name: true } } } },
            },
          },
        },
      },
    },
    where: { status: "ACTIVE" as any },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      receiptNo: true,
      date: true,
      method: true,
      transactionRef: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  pendingFees: {
    select: {
      id: true,
      totalFee: true,
      amountPaid: true,
      dueAmount: true,
      dueDate: true,
      installmentNo: true,
      status: true,
    },
    orderBy: { installmentNo: "asc" as const },
  },
  studentAttendances: {
    select: {
      id: true,
      status: true,
      markedAt: true,
    },
    orderBy: { markedAt: "desc" as const },
    take: 20,
  },
};

/**
 * Build a reusable where-clause for list + count queries.
 */
const buildWhereClause = (params: Omit<FindAllStudentsParams, "skip" | "take">) => {
  const where: Record<string, unknown> = {
    instituteId: params.instituteId,
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.facultyId) {
    where.batchEnrollments = {
      some: {
        status: "ACTIVE",
        batch: { facultyId: params.facultyId },
      },
    };
  }

  if (params.search) {
    where.OR = [
      { studentCode: { contains: params.search, mode: "insensitive" } },
      { qualification: { contains: params.search, mode: "insensitive" } },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
      { user: { email: { contains: params.search, mode: "insensitive" } } },
      { user: { phone: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  return where;
};

export const findAllStudents = (params: FindAllStudentsParams) => {
  const where = buildWhereClause(params);
  return prisma.student.findMany({
    where,
    include: studentInclude,
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.take,
  });
};

export const countStudents = (params: Omit<FindAllStudentsParams, "skip" | "take">) => {
  const where = buildWhereClause(params);
  return prisma.student.count({ where });
};

export const findStudentById = (id: string) =>
  prisma.student.findUnique({
    where: { id },
    include: {
      ...studentInclude,
      admissions: {
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true, timeSlot: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      batchEnrollments: {
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              timeSlot: true,
              schedulePattern: true,
              courseId: true,
              course: { select: { id: true, name: true, code: true } },
              faculty: { select: { id: true, user: { select: { name: true } } } },
              batchCourses: {
                include: {
                  course: { select: { id: true, name: true, code: true } },
                  faculty: { select: { id: true, user: { select: { name: true } } } },
                },
              },
            },
          },
        },
        where: { status: "ACTIVE" },
      },
    },
  });

export const findStudentByCode = (instituteId: string, studentCode: string) =>
  prisma.student.findUnique({
    where: {
      instituteId_studentCode: { instituteId, studentCode },
    },
  });

/**
 * Creates User + Student + assigns STUDENT role, and optionally creates Admission, BatchEnrollment, and Fee records in a single transaction.
 */
export const createStudentWithUser = async (data: {
  instituteId: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  studentCode: string;
  dateOfBirth?: string;
  qualification?: string;
  qualificationMasterId?: string;
  areaMasterId?: string;
  courseId?: string;
  batchId?: string;
  totalFee?: number;
  feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
  downPayment?: number;
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the User record
    const user = await tx.user.create({
      data: {
        instituteId: data.instituteId,
        branchId: data.branchId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        passwordHash: data.passwordHash,
      },
    });

    // 2. Create the Student record linked to the User
    const student = await tx.student.create({
      data: {
        userId: user.id,
        instituteId: data.instituteId,
        branchId: data.branchId,
        studentCode: data.studentCode,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        qualification: data.qualification || null,
        qualificationMasterId: data.qualificationMasterId || null,
        areaMasterId: data.areaMasterId || null,
      },
    });

    // 3. Find the STUDENT role and assign it
    const studentRole = await tx.role.findUnique({
      where: { name: "STUDENT" },
    });

    if (studentRole) {
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
        },
      });
    }

    // 4. Optional Admission & Course Mapping
    let admissionId: string | null = null;
    let courseName = "General Course";
    const admissionNo = await SequenceService.getNextNumber(data.instituteId, "ADMISSION");

    if (data.courseId) {
      const course = await tx.course.findUnique({ where: { id: data.courseId } });
      if (course) courseName = course.name;

      const admission = await tx.admission.create({
        data: {
          instituteId: data.instituteId,
          branchId: data.branchId,
          studentId: student.id,
          courseId: data.courseId,
          batchId: data.batchId || null,
          studentName: data.name,
          email: data.email || null,
          phone: data.phone || null,
          feePlan: data.feePlan || "INSTALLMENT",
          status: "CONFIRMED",
          admissionNo,
        },
      });
      admissionId = admission.id;
    }

    // 5. Optional Batch Enrollment
    if (data.batchId) {
      await tx.batchEnrollment.create({
        data: {
          batchId: data.batchId,
          studentId: student.id,
          admissionId: admissionId,
          status: "ACTIVE",
        },
      });
    }

    // 6. Optional Fee & Payment Setup
    if (data.totalFee && data.totalFee > 0) {
      const totalFee = Number(data.totalFee);
      const downPay = Number(data.downPayment || 0);

      // Record initial payment receipt if down payment was made
      if (downPay > 0) {
        const receiptNo = await SequenceService.getNextNumber(data.instituteId, "RECEIPT");
        await tx.payment.create({
          data: {
            receiptNo,
            instituteId: data.instituteId,
            branchId: data.branchId,
            studentId: student.id,
            admissionId: admissionId,
            studentName: data.name,
            admissionNo,
            courseName,
            amount: downPay,
            method: "UPI",
            status: "SUCCESS",
            notes: "Initial registration payment",
          },
        });
      }

      const balance = Math.max(0, totalFee - downPay);
      if (balance > 0) {
        if (data.feePlan === "FULL_PAYMENT") {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          await tx.pendingFee.create({
            data: {
              instituteId: data.instituteId,
              branchId: data.branchId,
              studentId: student.id,
              admissionId: admissionId,
              studentName: data.name,
              admissionNo,
              phone: data.phone || "9876543210",
              courseName,
              totalFee,
              amountPaid: downPay,
              dueAmount: balance,
              dueDate,
              installmentNo: 1,
              status: "DUE_SOON",
            },
          });
        } else {
          // 2 installments
          const part1 = Math.floor(balance / 2);
          const part2 = balance - part1;
          const d1 = new Date();
          d1.setDate(d1.getDate() + 30);
          const d2 = new Date();
          d2.setDate(d2.getDate() + 60);

          await tx.pendingFee.createMany({
            data: [
              {
                instituteId: data.instituteId,
                branchId: data.branchId,
                studentId: student.id,
                admissionId: admissionId,
                studentName: data.name,
                admissionNo,
                phone: data.phone || "9876543210",
                courseName,
                totalFee,
                amountPaid: downPay,
                dueAmount: part1,
                dueDate: d1,
                installmentNo: 1,
                status: "DUE_SOON",
              },
              {
                instituteId: data.instituteId,
                branchId: data.branchId,
                studentId: student.id,
                admissionId: admissionId,
                studentName: data.name,
                admissionNo,
                phone: data.phone || "9876543210",
                courseName,
                totalFee,
                amountPaid: 0,
                dueAmount: part2,
                dueDate: d2,
                installmentNo: 2,
                status: "DUE_SOON",
              },
            ],
          });
        }
      }
    }

    // Return the full student record
    return tx.student.findUniqueOrThrow({
      where: { id: student.id },
      include: studentInclude,
    });
  });
};

/**
 * Updates Student fields and optionally the related User fields (name, email, phone).
 */
export const updateStudent = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    qualification?: string;
    qualificationMasterId?: string;
    areaMasterId?: string;
    status?: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED" | "DRAFT";
    branchId?: string;
    gender?: string;
    bloodGroup?: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
    city?: string;
    pincode?: string;
    courseId?: string;
    batchId?: string;
    admissionStatus?: "CONFIRMED" | "PROVISIONAL" | "CANCELLED" | "PENDING" | "ACTIVE" | "COMPLETED";
    feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
    totalFee?: number;
    downPayment?: number;
    notes?: string;
  }
) => {
  const {
    name,
    email,
    phone,
    dateOfBirth,
    qualification,
    qualificationMasterId,
    areaMasterId,
    status,
    branchId,
    courseId,
    batchId,
    admissionStatus,
    feePlan,
    totalFee,
    downPayment,
    notes,
  } = data;

  const existing = await prisma.student.findUnique({
    where: { id },
    include: { user: true, admissions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    // 1. Update User
    const userUpdate: Record<string, unknown> = {};
    if (name !== undefined && name.trim() !== "") userUpdate.name = name.trim();
    if (email !== undefined) userUpdate.email = email.trim() !== "" ? email.trim() : null;
    if (phone !== undefined) userUpdate.phone = phone.trim() !== "" ? phone.trim() : null;
    if (branchId !== undefined && branchId.trim() !== "") userUpdate.branchId = branchId;

    if (existing.userId && Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: existing.userId },
        data: userUpdate,
      });
    }

    // 2. Update Student
    const studentUpdate: Record<string, unknown> = {};
    if (qualification !== undefined) studentUpdate.qualification = qualification;
    if (qualificationMasterId !== undefined) studentUpdate.qualificationMasterId = qualificationMasterId || null;
    if (areaMasterId !== undefined) studentUpdate.areaMasterId = areaMasterId || null;
    if (status !== undefined) {
      if (status === "DRAFT") {
        studentUpdate.status = "ACTIVE";
      } else {
        studentUpdate.status = status;
      }
    }
    if (dateOfBirth !== undefined) {
      studentUpdate.dateOfBirth = dateOfBirth && dateOfBirth.trim() !== "" ? new Date(dateOfBirth) : null;
    }
    if (branchId !== undefined && branchId.trim() !== "") studentUpdate.branchId = branchId;

    await tx.student.update({
      where: { id },
      data: studentUpdate,
    });

    // 3. Handle Admission & Course Mapping
    let admissionId: string | null = existing.admissions?.[0]?.id || null;
    const finalBranchId = branchId || existing.branchId;

    const targetAdmissionStatus =
      admissionStatus || (status === "ACTIVE" ? "CONFIRMED" : status === "DRAFT" ? "PENDING" : undefined);

    if (existing.admissions && existing.admissions.length > 0) {
      const currentAdm = existing.admissions[0];
      const admUpdate: Record<string, unknown> = {};
      if (courseId !== undefined && courseId.trim() !== "") admUpdate.courseId = courseId;
      if (batchId !== undefined) admUpdate.batchId = batchId.trim() !== "" ? batchId : null;
      if (feePlan !== undefined) admUpdate.feePlan = feePlan;
      if (targetAdmissionStatus !== undefined) admUpdate.status = targetAdmissionStatus;
      if (notes !== undefined) admUpdate.notes = notes;
      if (branchId !== undefined && branchId.trim() !== "") admUpdate.branchId = branchId;
      if (name !== undefined && name.trim() !== "") admUpdate.studentName = name.trim();
      if (email !== undefined) admUpdate.email = email.trim() !== "" ? email.trim() : null;
      if (phone !== undefined) admUpdate.phone = phone.trim() !== "" ? phone.trim() : null;

      if (Object.keys(admUpdate).length > 0) {
        const updatedAdm = await tx.admission.update({
          where: { id: currentAdm.id },
          data: admUpdate,
        });
        admissionId = updatedAdm.id;
      }
    } else if (courseId && courseId.trim() !== "") {
      const admissionNo = await SequenceService.getNextNumber(existing.instituteId, "ADMISSION");
      const newAdm = await tx.admission.create({
        data: {
          instituteId: existing.instituteId,
          branchId: finalBranchId,
          studentId: id,
          courseId,
          batchId: batchId && batchId.trim() !== "" ? batchId : null,
          studentName: name || existing.user?.name || "Student",
          email: email || existing.user?.email || null,
          phone: phone || existing.user?.phone || null,
          feePlan: feePlan || "INSTALLMENT",
          status: targetAdmissionStatus || "CONFIRMED",
          notes: notes || null,
          admissionNo,
        },
      });
      admissionId = newAdm.id;
    }

    // 4. Handle Batch Enrollment
    if (batchId && batchId.trim() !== "") {
      await tx.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId: batchId.trim(), studentId: id },
        },
        update: {
          status: "ACTIVE",
          admissionId,
        },
        create: {
          batchId: batchId.trim(),
          studentId: id,
          admissionId,
          status: "ACTIVE",
        },
      });
    }

    // 5. Handle Fee updates if totalFee provided
    if (totalFee !== undefined && Number(totalFee) > 0) {
      const numTotal = Number(totalFee);
      const numDown = Number(downPayment || 0);
      const studentName = name || existing.user?.name || "Student";
      const studentPhone = phone || existing.user?.phone || "9876543210";
      const courseRecord = courseId ? await tx.course.findUnique({ where: { id: courseId } }) : null;
      const courseName = courseRecord?.name || "Enrolled Course";
      const admissionNo = existing.admissions?.[0]?.admissionNo || "ADM-" + id.slice(-6);

      if (numDown > 0) {
        const receiptNo = await SequenceService.getNextNumber(existing.instituteId, "RECEIPT");
        await tx.payment.create({
          data: {
            receiptNo,
            instituteId: existing.instituteId,
            branchId: finalBranchId,
            studentId: id,
            admissionId,
            studentName,
            admissionNo,
            courseName,
            amount: numDown,
            method: "UPI",
            status: "SUCCESS",
            notes: "Down payment on admission update",
          },
        });
      }

      const balance = Math.max(0, numTotal - numDown);
      if (balance > 0) {
        const existingPending = await tx.pendingFee.findFirst({
          where: { studentId: id },
        });
        if (existingPending) {
          await tx.pendingFee.update({
            where: { id: existingPending.id },
            data: {
              dueAmount: balance,
              totalFee: numTotal,
              amountPaid: numDown,
              status: "DUE_SOON",
            },
          });
        } else {
          await tx.pendingFee.create({
            data: {
              instituteId: existing.instituteId,
              branchId: finalBranchId,
              studentId: id,
              admissionId,
              studentName,
              admissionNo,
              phone: studentPhone,
              courseName,
              dueAmount: balance,
              totalFee: numTotal,
              amountPaid: numDown,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "DUE_SOON",
            },
          });
        }
      }
    }

    return tx.student.findUnique({
      where: { id },
      include: studentInclude,
    });
  });
};

/**
 * Soft-delete: sets Student status to CANCELLED and User status to INACTIVE.
 */
export const softDeleteStudent = async (id: string) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    if (existing.userId) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { status: "INACTIVE" },
      });
    }

    return tx.student.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: studentInclude,
    });
  });
};

// ─── Student Performance ─────────────────────────────────────────────────

/**
 * Get attendance records for a student, ordered by session date.
 */
export const findStudentAttendanceRecords = (studentId: string) =>
  prisma.studentAttendance.findMany({
    where: { studentId },
    include: {
      classSession: {
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          startTime: true,
          endTime: true,
          batchId: true,
          batchModuleId: true,
          batchModule: {
            select: {
              courseModule: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { classSession: { scheduledDate: "desc" } },
  });

/**
 * Get assignment submissions for a student.
 */
export const findStudentAssignmentSubmissions = (studentId: string) =>
  prisma.assignmentSubmission.findMany({
    where: { studentId },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          batchId: true,
        },
      },
    },
    orderBy: { assignment: { createdAt: "desc" } },
  });

/**
 * Get batch enrollments with course info for a student.
 */
export const findStudentEnrollments = (studentId: string) =>
  prisma.batchEnrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
          batchCourses: {
            orderBy: { sequence: "asc" },
            include: { course: { select: { id: true, name: true, code: true } } },
          },
          batchModules: {
            select: {
              id: true,
              status: true,
              courseModule: {
                select: { id: true, name: true, sequence: true, courseId: true },
              },
            },
            orderBy: { sequence: "asc" },
          },
          _count: { select: { classSessions: true } },
        },
      },
    },
  });
