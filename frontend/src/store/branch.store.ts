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

export const useBranchStore = create<BranchState>((set) => ({
  branches: [],
  activeBranchId: "",

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
