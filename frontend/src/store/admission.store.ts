import { create } from "zustand";
import { admissionsApi } from "../services/admissions.api";
import type {
  Application,
  Admission,
  CreateApplicationPayload,
  CreateAdmissionPayload,
} from "../types/admission.types";

interface AdmissionState {
  applications: Application[];
  admissions: Admission[];
  isLoading: boolean;
  error: string | null;

  fetchApplications: (params?: {
    search?: string;
    feeStatus?: string;
    status?: string;
    courseId?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchAdmissions: (params?: {
    search?: string;
    courseId?: string;
    status?: string;
    batchId?: string;
  }) => Promise<void>;

  addApplication: (payload: CreateApplicationPayload) => Promise<Application | null>;
  updateApplication: (id: string, payload: Partial<CreateApplicationPayload>) => Promise<boolean>;
  deleteApplication: (id: string) => Promise<boolean>;

  addAdmission: (payload: CreateAdmissionPayload) => Promise<Admission | null>;
  updateAdmission: (id: string, payload: Partial<CreateAdmissionPayload>) => Promise<boolean>;
  deleteAdmission: (id: string) => Promise<boolean>;
}

export const useAdmissionStore = create<AdmissionState>((set, get) => ({
  applications: [],
  admissions: [],
  isLoading: false,
  error: null,

  fetchApplications: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await admissionsApi.getApplications(params);
      const applications = (response.data || []).map((a) => ({
        ...a,
        courseName: a.course?.name || a.courseName || "General Course",
        email: a.email || "",
        submittedDate: a.submittedDate
          ? new Date(a.submittedDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      }));
      set({ applications, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || "Failed to fetch applications",
        isLoading: false,
      });
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
        admissionDate: adm.admissionDate
          ? new Date(adm.admissionDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      }));
      set({ admissions, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || "Failed to fetch admissions",
        isLoading: false,
      });
    }
  },

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
