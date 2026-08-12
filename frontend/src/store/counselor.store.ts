import { create } from "zustand";
import type { Counselor, CreateCounselorPayload, UpdateCounselorPayload } from "../types/counselor.types";

interface CounselorState {
  counselors: Counselor[];
  addCounselor: (payload: CreateCounselorPayload) => Counselor;
  updateCounselor: (id: string, payload: UpdateCounselorPayload) => void;
  deleteCounselor: (id: string) => void;
}

const initialCounselors: Counselor[] = [
  {
    id: "cns-1",
    name: "Kavita Nair",
    employeeCode: "CNS-101",
    email: "kavita.nair@aadya.in",
    phone: "+91 98765 11223",
    branchId: "branch-1",
    branchName: "Bengaluru Main Campus",
    assignedLeadsCount: 42,
    activeStudentsCount: 28,
    status: "ACTIVE",
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "cns-2",
    name: "Rohan Mehta",
    employeeCode: "CNS-102",
    email: "rohan.mehta@aadya.in",
    phone: "+91 98765 22334",
    branchId: "branch-1",
    branchName: "Bengaluru Main Campus",
    assignedLeadsCount: 35,
    activeStudentsCount: 22,
    status: "ACTIVE",
    createdAt: "2026-02-01T10:30:00Z",
  },
  {
    id: "cns-3",
    name: "Pooja Hegde",
    employeeCode: "CNS-103",
    email: "pooja.hegde@aadya.in",
    phone: "+91 98765 33445",
    branchId: "branch-2",
    branchName: "North Branch - Indiranagar",
    assignedLeadsCount: 19,
    activeStudentsCount: 14,
    status: "ON_LEAVE",
    createdAt: "2026-02-20T11:15:00Z",
  },
];

export const useCounselorStore = create<CounselorState>((set) => ({
  counselors: initialCounselors,

  addCounselor: (payload) => {
    const newCounselor: Counselor = {
      id: `cns-${Date.now()}`,
      name: payload.name,
      employeeCode: payload.employeeCode || `CNS-${Math.floor(100 + Math.random() * 900)}`,
      email: payload.email,
      phone: payload.phone,
      branchId: payload.branchId || "branch-1",
      branchName: payload.branchName || "Bengaluru Main Campus",
      assignedLeadsCount: 0,
      activeStudentsCount: 0,
      status: payload.status || "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      counselors: [newCounselor, ...state.counselors],
    }));

    return newCounselor;
  },

  updateCounselor: (id, payload) => {
    set((state) => ({
      counselors: state.counselors.map((c) =>
        c.id === id
          ? {
              ...c,
              ...payload,
            }
          : c
      ),
    }));
  },

  deleteCounselor: (id) => {
    set((state) => ({
      counselors: state.counselors.filter((c) => c.id !== id),
    }));
  },
}));
