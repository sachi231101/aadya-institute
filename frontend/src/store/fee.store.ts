import { create } from "zustand";
import type { Payment, PendingFee } from "../types/fee.types";

interface FeeState {
  payments: Payment[];
  pendingFees: PendingFee[];

  // Actions
  addPayment: (payment: Omit<Payment, "id" | "receiptNo">) => void;
  deletePayment: (id: string) => void;
  recordPendingFeePayment: (pendingFeeId: string, amountPaidNow: number, method: Payment["method"], refNo?: string) => void;
}

export const useFeeStore = create<FeeState>((set) => ({
  payments: [],
  pendingFees: [],

  addPayment: (data) =>
    set((state) => {
      const newReceiptNo = `RCP-2026-${Math.floor(800 + Math.random() * 200)}`;
      const newPay: Payment = {
        ...data,
        id: `pay-${Date.now()}`,
        receiptNo: newReceiptNo,
      };
      return { payments: [newPay, ...state.payments] };
    }),

  deletePayment: (id) =>
    set((state) => ({
      payments: state.payments.filter((p) => p.id !== id),
    })),

  recordPendingFeePayment: (pendingFeeId, amountPaidNow, method, refNo) =>
    set((state) => {
      const pendingItem = state.pendingFees.find((pf) => pf.id === pendingFeeId);
      if (!pendingItem) return state;

      const newReceiptNo = `RCP-2026-${Math.floor(800 + Math.random() * 200)}`;
      const newPay: Payment = {
        id: `pay-${Date.now()}`,
        receiptNo: newReceiptNo,
        studentName: pendingItem.studentName,
        admissionNo: pendingItem.admissionNo,
        courseName: pendingItem.courseName,
        amount: amountPaidNow,
        date: new Date().toISOString().split("T")[0],
        method,
        transactionRef: refNo,
        status: "SUCCESS",
        notes: `Collected for Pending Fee Due Installment #${pendingItem.installmentNo}`,
      };

      const newAmountPaid = pendingItem.amountPaid + amountPaidNow;
      const newDueAmount = Math.max(0, pendingItem.totalFee - newAmountPaid);

      const updatedPendingFees = state.pendingFees
        .map((pf) => {
          if (pf.id === pendingFeeId) {
            return {
              ...pf,
              amountPaid: newAmountPaid,
              dueAmount: newDueAmount,
              status: newDueAmount === 0 ? ("PARTIAL" as const) : pf.status,
            };
          }
          return pf;
        })
        .filter((pf) => pf.dueAmount > 0); // Remove cleared dues

      return {
        payments: [newPay, ...state.payments],
        pendingFees: updatedPendingFees,
      };
    }),
}));
