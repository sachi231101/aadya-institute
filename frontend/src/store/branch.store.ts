import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BranchState {
  selectedBranchId: string; // "ALL" or specific branch ID
  setSelectedBranchId: (branchId: string) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: "ALL",
      setSelectedBranchId: (branchId: string) => set({ selectedBranchId: branchId }),
    }),
    {
      name: "aadya-admin-branch-selection",
    }
  )
);
