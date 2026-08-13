import { create } from "zustand";
import type { Branch } from "../types/branch.types";

interface BranchState {
  branches: Branch[];
  activeBranchId: string;

  // Actions
  addBranch: (branch: Omit<Branch, "id" | "studentCount" | "batchCount" | "revenueCollected">) => void;
  assignManagerToBranch: (identifier: string, managerName: string, managerEmail: string) => void;
  setActiveBranch: (branchId: string) => void;
  deleteBranch: (identifier: string) => void;
}

const initialBranches: Branch[] = [
  {
    id: "br-rmn-01",
    code: "BR-RMN-01",
    name: "Ramamurthy Nagara Branch",
    city: "Bengaluru",
    address: "TC Palya Main Road, Ramamurthy Nagar, Bengaluru, KA 560016",
    phone: "+91 98801 12233",
    assignedManagerName: "Rajesh Kumar (Center Manager)",
    assignedManagerEmail: "rajesh.rmn@aadya.in",
    studentCount: 145,
    batchCount: 6,
    revenueCollected: 680000,
    status: "ACTIVE",
  },
  {
    id: "br-mlw-02",
    code: "BR-MLW-02",
    name: "Malleshwaram Branch",
    city: "Bengaluru",
    address: "Sampige Road, 18th Cross, Malleshwaram, Bengaluru, KA 560003",
    phone: "+91 97702 44556",
    assignedManagerName: "Priya Deshmukh (Center Manager)",
    assignedManagerEmail: "priya.mlw@aadya.in",
    studentCount: 119,
    batchCount: 5,
    revenueCollected: 570000,
    status: "ACTIVE",
  },
];

export const useBranchStore = create<BranchState>((set) => ({
  branches: initialBranches,
  activeBranchId: "br-rmn-01",

  addBranch: (data) =>
    set((state) => {
      const newBranch: Branch = {
        ...data,
        id: `br-${Date.now()}`,
        studentCount: 0,
        batchCount: 0,
        revenueCollected: 0,
      };
      return { branches: [...state.branches, newBranch] };
    }),

  assignManagerToBranch: (identifier, managerName, managerEmail) =>
    set((state) => ({
      branches: state.branches.map((b) =>
        b.id === identifier || b.code === identifier
          ? { ...b, assignedManagerName: managerName, assignedManagerEmail: managerEmail }
          : b
      ),
    })),

  setActiveBranch: (branchId) => set({ activeBranchId: branchId }),

  deleteBranch: (identifier) =>
    set((state) => ({
      branches: state.branches.filter((b) => b.id !== identifier && b.code !== identifier),
    })),
}));
