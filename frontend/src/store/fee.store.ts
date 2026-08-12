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

const initialPayments: Payment[] = [
  {
    id: "pay-101",
    receiptNo: "RCP-2026-881",
    studentName: "Aarav Gupta",
    admissionNo: "ADM-2026-001",
    courseName: "Full Stack MERN Architecture",
    amount: 45000,
    date: "2026-01-20",
    method: "UPI",
    transactionRef: "UPI/602188491029",
    status: "SUCCESS",
    notes: "Full payment received for 6-month MERN course.",
  },
  {
    id: "pay-102",
    receiptNo: "RCP-2026-885",
    studentName: "Diya Deshmukh",
    admissionNo: "ADM-2026-005",
    courseName: "Backend Engineering & Systems",
    amount: 25000,
    date: "2026-01-25",
    method: "NET_BANKING",
    transactionRef: "HDFC/N291048102",
    status: "SUCCESS",
    notes: "First installment (50%) paid.",
  },
  {
    id: "pay-103",
    receiptNo: "RCP-2026-890",
    studentName: "Sneha Reddy",
    admissionNo: "ADM-2026-012",
    courseName: "Full Stack MERN Architecture",
    amount: 15000,
    date: "2026-02-02",
    method: "CARD",
    transactionRef: "CARD/4920",
    status: "SUCCESS",
    notes: "Registration & Token Fee.",
  },
  {
    id: "pay-104",
    receiptNo: "RCP-2026-894",
    studentName: "Rahul Mehta",
    admissionNo: "ADM-2026-009",
    courseName: "Data Science & Applied Machine Learning",
    amount: 20000,
    date: "2026-02-07",
    method: "CASH",
    status: "SUCCESS",
    notes: "Direct Cash collection at front desk.",
  },
];

const initialPendingFees: PendingFee[] = [
  {
    id: "pf-201",
    studentName: "Diya Deshmukh",
    admissionNo: "ADM-2026-005",
    phone: "+91 99001 88776",
    courseName: "Backend Engineering & Systems",
    totalFee: 50000,
    amountPaid: 25000,
    dueAmount: 25000,
    dueDate: "2026-02-15",
    installmentNo: 2,
    overdueDays: 0,
    status: "DUE_SOON",
  },
  {
    id: "pf-202",
    studentName: "Rahul Mehta",
    admissionNo: "ADM-2026-009",
    phone: "+91 97334 22110",
    courseName: "Data Science & Applied Machine Learning",
    totalFee: 45000,
    amountPaid: 20000,
    dueAmount: 25000,
    dueDate: "2026-02-01",
    installmentNo: 2,
    overdueDays: 11,
    status: "OVERDUE",
  },
  {
    id: "pf-203",
    studentName: "Vikram Malhotra",
    admissionNo: "ADM-2026-015",
    phone: "+91 97654 32109",
    courseName: "Product UI/UX Design Masterclass",
    totalFee: 35000,
    amountPaid: 10000,
    dueAmount: 25000,
    dueDate: "2026-01-25",
    installmentNo: 2,
    overdueDays: 18,
    status: "OVERDUE",
  },
];

export const useFeeStore = create<FeeState>((set) => ({
  payments: initialPayments,
  pendingFees: initialPendingFees,

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
