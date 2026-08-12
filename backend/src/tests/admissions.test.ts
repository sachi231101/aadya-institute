import { test, describe } from "node:test";
import assert from "node:assert";
import {
  createEnquirySchema,
  updateEnquirySchema,
  createApplicationSchema,
  updateApplicationSchema,
  createAdmissionSchema,
  updateAdmissionSchema,
  convertEnquirySchema,
  convertApplicationSchema,
} from "../modules/admissions/admissions.validation";
import { AdmissionsService } from "../modules/admissions/admissions.service";

describe("Admissions Validation Unit Tests", () => {
  test("createEnquirySchema should validate valid input", () => {
    const input = {
      name: "Rohan Sharma",
      email: "rohan@gmail.com",
      phone: "+919876543210",
      courseId: "course-123",
      source: "WEBSITE",
      status: "NEW",
      counselorNotes: "Interested in upcoming batch",
    };
    const parsed = createEnquirySchema.parse(input);
    assert.strictEqual(parsed.name, "Rohan Sharma");
    assert.strictEqual(parsed.source, "WEBSITE");
  });

  test("createEnquirySchema should reject invalid email or short phone", () => {
    assert.throws(() => {
      createEnquirySchema.parse({
        name: "A",
        phone: "123",
        courseId: "c1",
      });
    });
  });

  test("createApplicationSchema should validate valid input", () => {
    const input = {
      applicantName: "Amitabh Joshi",
      email: "amitabh@gmail.com",
      phone: "+919845011223",
      courseId: "course-[#1]",
      feeStatus: "PAID",
      status: "SUBMITTED",
    };
    const parsed = createApplicationSchema.parse(input);
    assert.strictEqual(parsed.applicantName, "Amitabh Joshi");
    assert.strictEqual(parsed.feeStatus, "PAID");
  });

  test("createAdmissionSchema should validate direct admission payload", () => {
    const input = {
      studentName: "Aarav Gupta",
      email: "aarav@gmail.com",
      phone: "+919822055443",
      courseId: "course-999",
      feePlan: "FULL_PAYMENT",
      status: "CONFIRMED",
    };
    const parsed = createAdmissionSchema.parse(input);
    assert.strictEqual(parsed.studentName, "Aarav Gupta");
    assert.strictEqual(parsed.feePlan, "FULL_PAYMENT");
  });

  test("AdmissionsService generateNo helper should return prefixed sequential identifier", async () => {
    const enqNo = await AdmissionsService.generateNo("ENQ");
    const appNo = await AdmissionsService.generateNo("APP");
    const admNo = await AdmissionsService.generateNo("ADM");

    assert.match(enqNo, /^ENQ-2026-\d{7}$/);
    assert.match(appNo, /^APP-2026-\d{7}$/);
    assert.match(admNo, /^ADM-2026-\d{7}$/);
  });
});
