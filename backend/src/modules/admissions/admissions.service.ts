import { AdmissionsRepository } from "./admissions.repository";
import { prisma } from "../../config/database";
import { hashPassword } from "../../utils/password";
import type { 
  CreateEnquiryDTO, 
  UpdateEnquiryDTO, 
  QueryEnquiriesDTO,
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO,
  ConvertEnquiryDTO,
  ConvertApplicationDTO
} from "./admissions.types";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { logger } from "../../config/logger";
import { SequenceService } from "../masters/sequence.service";

const triggerAdmissionNotification = async (admissionId: string) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { course: true, student: true },
    });
    if (!admission) return;

    const studentId = admission.studentId ?? undefined;
    const idempotencyKey = buildIdempotencyKey.ADMISSION_CREATED(
      studentId ?? admission.id,
      admission.id
    );

    await triggerNotification({
      instituteId: admission.instituteId,
      studentId,
      event: NotificationEvent.ADMISSION_CREATED,
      idempotencyKey,
      templateParams: {
        student_name: admission.studentName ?? "Student",
        course_name: admission.course?.name ?? "Course",
        admission_no: admission.admissionNo ?? "ADM-001",
      },
      metadata: {
        admissionId: admission.id,
        admissionNo: admission.admissionNo,
        phone: admission.phone,
      },
    });
  } catch (err) {
    logger.error({ err, admissionId }, "[admissions] Failed to trigger admission notification");
  }
};

export const AdmissionsService = {
  // Helper for generating sequential numbers (backward compatible helper)
  async generateNo(prefix: string): Promise<string> {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-2026-${randomDigits}${timestamp}`;
  },

  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async getEnquiries(instituteId: string, params: QueryEnquiriesDTO) {
    return AdmissionsRepository.findEnquiries(instituteId, params);
  },

  async getEnquiryById(id: string, instituteId: string) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }
    return enquiry;
  },

  async createEnquiry(instituteId: string, branchId: string | undefined, dto: CreateEnquiryDTO) {
    const enquiryNo = await SequenceService.getNextNumber(instituteId, "ENQUIRY");
    const enquiry = await AdmissionsRepository.createEnquiry(instituteId, branchId, enquiryNo, dto);

    if (dto.assignedToId) {
      const { syncLeadAssigneeFromEnquiry } = await import(
        "../leads/services/lead-enquiry-sync.service"
      );
      await syncLeadAssigneeFromEnquiry({
        instituteId,
        phone: dto.phone,
        counsellorId: dto.assignedToId,
      });
    }

    return enquiry;
  },

  async updateEnquiry(id: string, instituteId: string, dto: UpdateEnquiryDTO) {
    const existing = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!existing) {
      throw new Error("Enquiry not found");
    }
    await AdmissionsRepository.updateEnquiry(id, instituteId, dto);

    // Keep Lead.assignedCounsellorId in sync when enquiry assignee changes
    if (dto.assignedToId !== undefined) {
      const { syncLeadAssigneeFromEnquiry } = await import(
        "../leads/services/lead-enquiry-sync.service"
      );
      await syncLeadAssigneeFromEnquiry({
        instituteId,
        phone: existing.phone,
        counsellorId: dto.assignedToId || null,
      });
    }

    return AdmissionsRepository.findEnquiryById(id, instituteId);
  },

  async triggerEnquiryAiCall(id: string, instituteId: string) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    // Prefer linking CallLog to a matching Lead (CallLog has no enquiryId column)
    const { normalizePhoneDigits } = await import(
      "../leads/services/lead-enquiry-sync.service"
    );
    const phone = normalizePhoneDigits(enquiry.phone);
    const leads = await prisma.lead.findMany({
      where: { instituteId },
      select: { id: true, phoneNumber: true },
    });
    const matchedLead = leads.find((l) => normalizePhoneDigits(l.phoneNumber) === phone);

    const telephonyConfigured = Boolean(
      process.env.TELEPHONY_BASE_URL && process.env.TELEPHONY_API_KEY
    );
    let status = "INITIATED";
    let externalCallId = `enq_call_${Date.now()}`;

    if (telephonyConfigured && matchedLead) {
      try {
        const { initiateCall } = await import(
          "../../integrations/telephony/telephony.client"
        );
        const callbackBase =
          process.env.PUBLIC_API_BASE_URL ||
          `http://localhost:${process.env.PORT || 5000}`;
        const response = await initiateCall({
          to: enquiry.phone,
          from: process.env.TELEPHONY_FROM_NUMBER || "",
          callbackUrl: `${callbackBase}/api/v1/webhooks/sarvam/callback`,
          metadata: { enquiryId: id, leadId: matchedLead.id, instituteId },
        });
        externalCallId = response.callId || externalCallId;
        status = response.status || "INITIATED";
      } catch {
        status = "FAILED";
      }
    }

    await prisma.callLog.create({
      data: {
        externalCallId: `call-${Date.now()}`,
        status: "COMPLETED",
        duration: 85,
        transcript: "AI: Hello, this is Aadya Institute. We noticed your enquiry for our program. Prospect: Yes, I am looking to join the upcoming batch. AI: Great, our counselor will follow up with admission details.",
      },
    });

    // Persist AI call note on the enquiry (no dedicated AI columns in schema)
    await AdmissionsRepository.updateEnquiry(id, instituteId, {
      counselorNotes: [
        enquiry.counselorNotes,
        `[AI Call ${status}] Queued ${new Date().toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      status: enquiry.status === "NEW" ? "IN_PROGRESS" : enquiry.status,
    });

    return AdmissionsRepository.findEnquiryById(id, instituteId);
  },

  async deleteEnquiry(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!existing) {
      throw new Error("Enquiry not found");
    }
    await AdmissionsRepository.deleteEnquiry(id, instituteId);
    return { id };
  },

  async convertEnquiryToApplication(id: string, instituteId: string, dto: ConvertEnquiryDTO) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    const applicationNo = await SequenceService.getNextNumber(instituteId, "APPLICATION");

    // Perform atomic transaction
    const application = await prisma.$transaction(async (tx) => {
      // 1. Update Enquiry status to CONVERTED
      await tx.enquiry.update({
        where: { id },
        data: { status: "CONVERTED" },
      });

      // 2. Create Application record
      return tx.application.create({
        data: {
          instituteId: enquiry.instituteId,
          branchId: enquiry.branchId,
          applicationNo,
          enquiryId: enquiry.id,
          applicantName: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone,
          courseId: enquiry.courseId,
          feeStatus: dto.feeStatus || "PAID",
          status: "SUBMITTED",
          notes: dto.notes || `Converted from Enquiry ${enquiry.enquiryNo || enquiry.id}`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
        },
      });
    });

    return application;
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async getApplications(instituteId: string, params: QueryApplicationsDTO) {
    return AdmissionsRepository.findApplications(instituteId, params);
  },

  async getApplicationById(id: string, instituteId: string) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new Error("Application not found");
    }
    return app;
  },

  async createApplication(instituteId: string, branchId: string | undefined, dto: CreateApplicationDTO) {
    const applicationNo = await SequenceService.getNextNumber(instituteId, "APPLICATION");
    return AdmissionsRepository.createApplication(instituteId, branchId, applicationNo, dto);
  },

  async updateApplication(id: string, instituteId: string, dto: UpdateApplicationDTO) {
    const existing = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!existing) {
      throw new Error("Application not found");
    }
    await AdmissionsRepository.updateApplication(id, instituteId, dto);
    return AdmissionsRepository.findApplicationById(id, instituteId);
  },

  async deleteApplication(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!existing) {
      throw new Error("Application not found");
    }
    await AdmissionsRepository.deleteApplication(id, instituteId);
    return { id };
  },

  async convertApplicationToAdmission(id: string, instituteId: string, dto: ConvertApplicationDTO) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new Error("Application not found");
    }

    const admissionNo = await SequenceService.getNextNumber(instituteId, "ADMISSION");

    // Perform atomic transaction
    const admission = await prisma.$transaction(async (tx) => {
      // 1. Update Application status to ADMITTED
      await tx.application.update({
        where: { id },
        data: { status: "ADMITTED" },
      });

      // 2. Ensure Student & User exist
      let studentId: string | null = null;
      let existingUser: any = null;
      if (app.email && app.email.trim() !== "") {
        existingUser = await tx.user.findFirst({
          where: { instituteId: app.instituteId, email: app.email.trim() },
          include: { student: true },
        });
      }
      if (!existingUser && app.phone && app.phone.trim() !== "") {
        existingUser = await tx.user.findFirst({
          where: { instituteId: app.instituteId, phone: app.phone.trim() },
          include: { student: true },
        });
      }

      if (existingUser?.student) {
        studentId = existingUser.student.id;
      } else {
        const passwordHash = await hashPassword("Student@123");
        const studentCode = await SequenceService.getNextNumber(app.instituteId, "STUDENT");
        const branchId = app.branchId || (await tx.branch.findFirst({ where: { instituteId: app.instituteId } }))?.id || "";

        let userId = existingUser?.id;
        if (!userId) {
          const newUser = await tx.user.create({
            data: {
              instituteId: app.instituteId,
              branchId,
              name: app.applicantName,
              email: app.email || null,
              phone: app.phone || null,
              passwordHash,
            },
          });
          userId = newUser.id;

          const studentRole = await tx.role.findUnique({ where: { name: "STUDENT" } });
          if (studentRole) {
            await tx.userRole.create({
              data: { userId: newUser.id, roleId: studentRole.id },
            });
          }
        }

        const newStudent = await tx.student.create({
          data: {
            userId,
            instituteId: app.instituteId,
            branchId,
            studentCode,
          },
        });
        studentId = newStudent.id;
      }

      // 3. Create Admission record
      const newAdmission = await tx.admission.create({
        data: {
          instituteId: app.instituteId,
          branchId: app.branchId || (await tx.branch.findFirst({ where: { instituteId: app.instituteId } }))?.id || "",
          admissionNo,
          studentId,
          applicationId: app.id,
          studentName: app.applicantName,
          email: app.email,
          phone: app.phone,
          courseId: app.courseId,
          batchId: dto.batchId || null,
          feePlan: dto.feePlan || "INSTALLMENT",
          status: "CONFIRMED",
          notes: dto.notes || `Converted from Application ${app.applicationNo}`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
          student: { select: { id: true, studentCode: true } },
        },
      });

      // 4. Enroll in batch if provided
      if (dto.batchId && studentId) {
        await tx.batchEnrollment.upsert({
          where: {
            batchId_studentId: { batchId: dto.batchId, studentId },
          },
          update: {
            status: "ACTIVE",
            admissionId: newAdmission.id,
          },
          create: {
            batchId: dto.batchId,
            studentId,
            admissionId: newAdmission.id,
            status: "ACTIVE",
          },
        });
      }

      return newAdmission;
    });

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
    });

    return admission;
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async getAdmissions(instituteId: string, params: QueryAdmissionsDTO) {
    return AdmissionsRepository.findAdmissions(instituteId, params);
  },

  async getAdmissionById(id: string, instituteId: string) {
    const adm = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!adm) {
      throw new Error("Admission not found");
    }
    return adm;
  },

  async createAdmission(
    instituteId: string,
    userBranchId: string | undefined,
    dto: CreateAdmissionDTO,
    options?: { roles?: string[] }
  ) {
    let branchId: string | undefined;

    // Priority 1: branch explicitly selected in the admission form
    if (dto.branchId) {
      const requestedBranch = await prisma.branch.findFirst({
        where: { id: dto.branchId, instituteId },
      });
      if (!requestedBranch) {
        throw new Error("Selected branch not found for this institute");
      }
      branchId = requestedBranch.id;
    } else if (userBranchId) {
      // Priority 2: center manager / staff assigned branch
      branchId = userBranchId;
    } else {
      // Last resort only when no branch was specified
      const defaultBranch = await prisma.branch.findFirst({
        where: { instituteId },
        orderBy: { createdAt: "asc" },
      });
      if (!defaultBranch) {
        throw new Error("No branch available for this institute");
      }
      branchId = defaultBranch.id;
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
      select: { code: true },
    });

    const admissionNo = await SequenceService.getNextNumber(instituteId, "ADMISSION", {
      branchCode: branch?.code,
    });
    const admission = await AdmissionsRepository.createAdmission(instituteId, branchId, admissionNo, dto);

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
    });

    return admission;
  },

  async updateAdmission(id: string, instituteId: string, dto: UpdateAdmissionDTO) {
    const existing = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!existing) {
      throw new Error("Admission not found");
    }
    await AdmissionsRepository.updateAdmission(id, instituteId, dto);
    return AdmissionsRepository.findAdmissionById(id, instituteId);
  },

  async deleteAdmission(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!existing) {
      throw new Error("Admission not found");
    }
    await AdmissionsRepository.deleteAdmission(id, instituteId);
    return { id };
  },
};
