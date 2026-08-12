import { create } from "zustand";
import { admissionsApi } from "../services/admissions.api";
import type { 
  Enquiry, 
  Application, 
  Admission,
  CreateEnquiryPayload,
  CreateApplicationPayload,
  CreateAdmissionPayload,
  ConvertEnquiryPayload,
  ConvertApplicationPayload
} from "../types/admission.types";

interface AdmissionState {
  enquiries: Enquiry[];
  applications: Application[];
  admissions: Admission[];
  isLoading: boolean;
  error: string | null;

  // Fetch Actions
  fetchEnquiries: (params?: { search?: string; source?: string; status?: string; courseId?: string }) => Promise<void>;
  fetchApplications: (params?: { search?: string; feeStatus?: string; status?: string; courseId?: string }) => Promise<void>;
  fetchAdmissions: (params?: { search?: string; courseId?: string; status?: string; batchId?: string }) => Promise<void>;

  // Enquiry Actions
  addEnquiry: (payload: CreateEnquiryPayload) => Promise<Enquiry | null>;
  updateEnquiry: (id: string, payload: Partial<CreateEnquiryPayload>) => Promise<boolean>;
  deleteEnquiry: (id: string) => Promise<boolean>;
  convertEnquiryToApplication: (enquiryId: string, payload?: ConvertEnquiryPayload) => Promise<boolean>;

  // Application Actions
  addApplication: (payload: CreateApplicationPayload) => Promise<Application | null>;
  updateApplication: (id: string, payload: Partial<CreateApplicationPayload>) => Promise<boolean>;
  deleteApplication: (id: string) => Promise<boolean>;
  convertApplicationToAdmission: (applicationId: string, payload?: ConvertApplicationPayload) => Promise<boolean>;

  // Admission Actions
  addAdmission: (payload: CreateAdmissionPayload) => Promise<Admission | null>;
  updateAdmission: (id: string, payload: Partial<CreateAdmissionPayload>) => Promise<boolean>;
  deleteAdmission: (id: string) => Promise<boolean>;
}

export const useAdmissionStore = create<AdmissionState>((set, get) => ({
  enquiries: [],
  applications: [],
  admissions: [],
  isLoading: false,
  error: null,

  // ─── FETCH ACTIONS ─────────────────────────────────────────────────────────
  fetchEnquiries: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await admissionsApi.getEnquiries(params);
      const enquiries = (response.data || []).map((e) => ({
        ...e,
        courseName: e.course?.name || e.courseName || "General Course",
        email: e.email || "",
      }));
      set({ enquiries, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to fetch enquiries", isLoading: false });
    }
  },

  fetchApplications: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await admissionsApi.getApplications(params);
      const applications = (response.data || []).map((a) => ({
        ...a,
        courseName: a.course?.name || a.courseName || "General Course",
        email: a.email || "",
        submittedDate: a.submittedDate ? new Date(a.submittedDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }));
      set({ applications, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to fetch applications", isLoading: false });
    }
  },

  fetchAdmissions: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await admissionsApi.getAdmissions(params);
      const admissions = (response.data || []).map((adm) => ({
        ...adm,
        studentName: adm.studentName || "N/A",
        email: adm.email || "",
        phone: adm.phone || "",
        courseName: adm.course?.name || adm.courseName || "General Course",
        batchName: adm.batch?.code || adm.batch?.name || adm.batchName || "N/A",
        admissionDate: adm.admissionDate ? new Date(adm.admissionDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }));
      set({ admissions, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to fetch admissions", isLoading: false });
    }
  },

  // ─── ENQUIRY MUTATIONS ─────────────────────────────────────────────────────
  addEnquiry: async (payload) => {
    try {
      const response = await admissionsApi.createEnquiry(payload);
      if (response.success && response.data) {
        await get().fetchEnquiries();
        return response.data;
      }
      return null;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to create enquiry" });
      return null;
    }
  },

  updateEnquiry: async (id, payload) => {
    try {
      const response = await admissionsApi.updateEnquiry(id, payload);
      if (response.success) {
        await get().fetchEnquiries();
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to update enquiry" });
      return false;
    }
  },

  deleteEnquiry: async (id) => {
    try {
      const response = await admissionsApi.deleteEnquiry(id);
      if (response.success) {
        set((state) => ({ enquiries: state.enquiries.filter((e) => e.id !== id) }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to delete enquiry" });
      return false;
    }
  },

  convertEnquiryToApplication: async (enquiryId, payload) => {
    try {
      const response = await admissionsApi.convertEnquiryToApplication(enquiryId, payload);
      if (response.success) {
        await Promise.all([get().fetchEnquiries(), get().fetchApplications()]);
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to convert enquiry to application" });
      return false;
    }
  },

  // ─── APPLICATION MUTATIONS ─────────────────────────────────────────────────
  addApplication: async (payload) => {
    try {
      const response = await admissionsApi.createApplication(payload);
      if (response.success && response.data) {
        await get().fetchApplications();
        return response.data;
      }
      return null;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to create application" });
      return null;
    }
  },

  updateApplication: async (id, payload) => {
    try {
      const response = await admissionsApi.updateApplication(id, payload);
      if (response.success) {
        await get().fetchApplications();
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to update application" });
      return false;
    }
  },

  deleteApplication: async (id) => {
    try {
      const response = await admissionsApi.deleteApplication(id);
      if (response.success) {
        set((state) => ({ applications: state.applications.filter((a) => a.id !== id) }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to delete application" });
      return false;
    }
  },

  convertApplicationToAdmission: async (applicationId, payload) => {
    try {
      const response = await admissionsApi.convertApplicationToAdmission(applicationId, payload);
      if (response.success) {
        await Promise.all([get().fetchApplications(), get().fetchAdmissions()]);
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to convert application to admission" });
      return false;
    }
  },

  // ─── ADMISSION MUTATIONS ───────────────────────────────────────────────────
  addAdmission: async (payload) => {
    try {
      const response = await admissionsApi.createAdmission(payload);
      if (response.success && response.data) {
        await get().fetchAdmissions();
        return response.data;
      }
      return null;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to create admission" });
      return null;
    }
  },

  updateAdmission: async (id, payload) => {
    try {
      const response = await admissionsApi.updateAdmission(id, payload);
      if (response.success) {
        await get().fetchAdmissions();
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to update admission" });
      return false;
    }
  },

  deleteAdmission: async (id) => {
    try {
      const response = await admissionsApi.deleteAdmission(id);
      if (response.success) {
        set((state) => ({ admissions: state.admissions.filter((a) => a.id !== id) }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || "Failed to delete admission" });
      return false;
    }
  },
}));
