import { create } from "zustand";
import type { Enquiry, Application, Admission } from "../types/admission.types";

interface AdmissionState {
  enquiries: Enquiry[];
  applications: Application[];
  admissions: Admission[];

  // Enquiry Actions
  addEnquiry: (enquiry: Omit<Enquiry, "id" | "createdAt">) => void;
  updateEnquiry: (id: string, data: Partial<Enquiry>) => void;
  deleteEnquiry: (id: string) => void;
  convertEnquiryToApplication: (enquiryId: string) => void;

  // Application Actions
  addApplication: (application: Omit<Application, "id" | "applicationNo" | "submittedDate">) => void;
  updateApplication: (id: string, data: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  convertApplicationToAdmission: (applicationId: string, batchId?: string, batchName?: string) => void;

  // Admission Actions
  addAdmission: (admission: Omit<Admission, "id" | "admissionNo" | "admissionDate">) => void;
  updateAdmission: (id: string, data: Partial<Admission>) => void;
  deleteAdmission: (id: string) => void;
}

const initialEnquiries: Enquiry[] = [
  {
    id: "enq-101",
    name: "Rohan Sharma",
    email: "rohan.s@gmail.com",
    phone: "+91 98765 43210",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    source: "WEBSITE",
    status: "NEW",
    counselorNotes: "Interested in upcoming March batch. Requested fee structure details.",
    createdAt: "2026-02-10",
  },
  {
    id: "enq-102",
    name: "Priya Patel",
    email: "priya.p@yahoo.com",
    phone: "+91 98123 45678",
    courseId: "c-2",
    courseName: "Backend Engineering & Systems",
    source: "WALK_IN",
    status: "IN_PROGRESS",
    counselorNotes: "Visited campus today. Attended demo class with Dr. Rajesh Verma.",
    createdAt: "2026-02-08",
  },
  {
    id: "enq-103",
    name: "Vikram Malhotra",
    email: "v.malhotra@gmail.com",
    phone: "+91 97654 32109",
    courseId: "c-3",
    courseName: "Data Science & Applied Machine Learning",
    source: "WHATSAPP",
    status: "FOLLOW_UP",
    counselorNotes: "Wants weekend batch option. Call scheduled for tomorrow 4 PM.",
    createdAt: "2026-02-05",
  },
  {
    id: "enq-104",
    name: "Sneha Reddy",
    email: "sneha.reddy@outlook.com",
    phone: "+91 99887 76655",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    source: "REFERRAL",
    status: "CONVERTED",
    counselorNotes: "Converted to application APP-2026-012.",
    createdAt: "2026-02-01",
  },
];

const initialApplications: Application[] = [
  {
    id: "app-201",
    applicationNo: "APP-2026-012",
    applicantName: "Sneha Reddy",
    email: "sneha.reddy@outlook.com",
    phone: "+91 99887 76655",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    feeStatus: "PAID",
    status: "APPROVED",
    submittedDate: "2026-02-02",
    notes: "Application fee paid. Documents verified by Counsellor.",
  },
  {
    id: "app-202",
    applicationNo: "APP-2026-015",
    applicantName: "Amitabh Joshi",
    email: "amitabh.j@gmail.com",
    phone: "+91 98450 11223",
    courseId: "c-2",
    courseName: "Backend Engineering & Systems",
    feeStatus: "PAID",
    status: "UNDER_REVIEW",
    submittedDate: "2026-02-06",
    notes: "Submitted graduation certificate and ID proof.",
  },
  {
    id: "app-203",
    applicationNo: "APP-2026-018",
    applicantName: "Kavya Nair",
    email: "kavya.nair@gmail.com",
    phone: "+91 97112 33445",
    courseId: "c-3",
    courseName: "Data Science & Applied Machine Learning",
    feeStatus: "PENDING",
    status: "SUBMITTED",
    submittedDate: "2026-02-09",
    notes: "Awaiting registration fee payment.",
  },
];

const initialAdmissions: Admission[] = [
  {
    id: "adm-301",
    admissionNo: "ADM-2026-001",
    studentName: "Aarav Gupta",
    email: "aarav.gupta@gmail.com",
    phone: "+91 98220 55443",
    courseId: "c-1",
    courseName: "Full Stack MERN Architecture",
    batchId: "b-1",
    batchName: "FS-2026-A1",
    feePlan: "FULL_PAYMENT",
    status: "CONFIRMED",
    admissionDate: "2026-01-20",
    notes: "Confirmed admission. Full fee paid upfront.",
  },
  {
    id: "adm-302",
    admissionNo: "ADM-2026-005",
    studentName: "Diya Deshmukh",
    email: "diya.d@gmail.com",
    phone: "+91 99001 88776",
    courseId: "c-2",
    courseName: "Backend Engineering & Systems",
    batchId: "b-3",
    batchName: "BE-2026-B2",
    feePlan: "INSTALLMENT",
    status: "CONFIRMED",
    admissionDate: "2026-01-25",
    notes: "First installment paid.",
  },
  {
    id: "adm-303",
    admissionNo: "ADM-2026-009",
    studentName: "Rahul Mehta",
    email: "rahul.m@gmail.com",
    phone: "+91 97334 22110",
    courseId: "c-3",
    courseName: "Data Science & Applied Machine Learning",
    batchId: "b-4",
    batchName: "DS-2026-W1",
    feePlan: "INSTALLMENT",
    status: "PROVISIONAL",
    admissionDate: "2026-02-07",
    notes: "Provisional seat reserved for May weekend batch.",
  },
];

export const useAdmissionStore = create<AdmissionState>((set) => ({
  enquiries: initialEnquiries,
  applications: initialApplications,
  admissions: initialAdmissions,

  // Enquiry Actions
  addEnquiry: (data) =>
    set((state) => {
      const newEnquiry: Enquiry = {
        ...data,
        id: `enq-${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      return { enquiries: [newEnquiry, ...state.enquiries] };
    }),

  updateEnquiry: (id, data) =>
    set((state) => ({
      enquiries: state.enquiries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),

  deleteEnquiry: (id) =>
    set((state) => ({
      enquiries: state.enquiries.filter((e) => e.id !== id),
    })),

  convertEnquiryToApplication: (enquiryId) =>
    set((state) => {
      const enquiry = state.enquiries.find((e) => e.id === enquiryId);
      if (!enquiry) return state;

      const newAppNo = `APP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newApplication: Application = {
        id: `app-${Date.now()}`,
        applicationNo: newAppNo,
        applicantName: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        courseId: enquiry.courseId,
        courseName: enquiry.courseName,
        feeStatus: "PAID",
        status: "SUBMITTED",
        submittedDate: new Date().toISOString().split("T")[0],
        notes: `Converted from enquiry ${enquiry.id}.`,
      };

      const updatedEnquiries = state.enquiries.map((e) =>
        e.id === enquiryId ? { ...e, status: "CONVERTED" as const } : e
      );

      return {
        enquiries: updatedEnquiries,
        applications: [newApplication, ...state.applications],
      };
    }),

  // Application Actions
  addApplication: (data) =>
    set((state) => {
      const newAppNo = `APP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newApp: Application = {
        ...data,
        id: `app-${Date.now()}`,
        applicationNo: newAppNo,
        submittedDate: new Date().toISOString().split("T")[0],
      };
      return { applications: [newApp, ...state.applications] };
    }),

  updateApplication: (id, data) =>
    set((state) => ({
      applications: state.applications.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),

  deleteApplication: (id) =>
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id),
    })),

  convertApplicationToAdmission: (applicationId, batchId, batchName) =>
    set((state) => {
      const app = state.applications.find((a) => a.id === applicationId);
      if (!app) return state;

      const newAdmNo = `ADM-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newAdmission: Admission = {
        id: `adm-${Date.now()}`,
        admissionNo: newAdmNo,
        studentName: app.applicantName,
        email: app.email,
        phone: app.phone,
        courseId: app.courseId,
        courseName: app.courseName,
        batchId: batchId || "b-1",
        batchName: batchName || "FS-2026-A1",
        feePlan: "INSTALLMENT",
        status: "CONFIRMED",
        admissionDate: new Date().toISOString().split("T")[0],
        notes: `Converted from application ${app.applicationNo}.`,
      };

      const updatedApps = state.applications.map((a) =>
        a.id === applicationId ? { ...a, status: "ADMITTED" as const } : a
      );

      return {
        applications: updatedApps,
        admissions: [newAdmission, ...state.admissions],
      };
    }),

  // Admission Actions
  addAdmission: (data) =>
    set((state) => {
      const newAdmNo = `ADM-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newAdmission: Admission = {
        ...data,
        id: `adm-${Date.now()}`,
        admissionNo: newAdmNo,
        admissionDate: new Date().toISOString().split("T")[0],
      };
      return { admissions: [newAdmission, ...state.admissions] };
    }),

  updateAdmission: (id, data) =>
    set((state) => ({
      admissions: state.admissions.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),

  deleteAdmission: (id) =>
    set((state) => ({
      admissions: state.admissions.filter((a) => a.id !== id),
    })),
}));
