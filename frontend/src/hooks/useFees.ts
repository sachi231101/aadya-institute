import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feesApi } from "../services/fees.api";
import type {
  CreatePaymentPayload,
  CollectPendingFeePayload,
  CreateChargePayload,
  CreateChargesPayload,
  CreateOtherInvoicePayload,
} from "../types/fee.types";

export const FEES_KEYS = {
  stats: ["fees", "stats"] as const,
  reports: ["fees", "reports"] as const,
  students: (params?: Record<string, unknown>) => ["fees", "students", params] as const,
  payments: (params?: Record<string, unknown>) => ["fees", "payments", params] as const,
  pendingFees: (params?: Record<string, unknown>) => ["fees", "pending", params] as const,
  receipts: (params?: Record<string, unknown>) => ["fees", "receipts", params] as const,
  receipt: (id?: string) => ["fees", "receipt", id] as const,
  invoices: (params?: Record<string, unknown>) => ["fees", "invoices", params] as const,
  invoice: (id?: string) => ["fees", "invoice", id] as const,
  otherInvoices: (params?: Record<string, unknown>) =>
    ["fees", "other-invoices", params] as const,
  otherInvoice: (id?: string) => ["fees", "other-invoice", id] as const,
  studentStatement: (studentId?: string) => ["fees", "student-statement", studentId] as const,
};

export const useFeeStats = () =>
  useQuery({
    queryKey: FEES_KEYS.stats,
    queryFn: () => feesApi.getStats(),
  });

export const useFeeReports = () =>
  useQuery({
    queryKey: FEES_KEYS.reports,
    queryFn: () => feesApi.getReports(),
  });

export const useFeeStudents = (params?: {
  search?: string;
  courseId?: string;
  batchId?: string;
  status?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: FEES_KEYS.students(params),
    queryFn: () => feesApi.listFeeStudents(params),
  });

export const usePayments = (params?: {
  search?: string;
  method?: string;
  paymentModeMasterId?: string;
  feeHeadMasterId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: FEES_KEYS.payments(params),
    queryFn: () => feesApi.getPayments(params),
  });

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => feesApi.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useVoidPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.voidPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const usePendingFees = (params?: {
  search?: string;
  status?: string;
  studentId?: string;
  feeHeadMasterId?: string;
  dueWithinDays?: number;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: FEES_KEYS.pendingFees(params),
    queryFn: () => feesApi.getPendingFees(params),
  });

export const useCollectPendingFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CollectPendingFeePayload }) =>
      feesApi.collectPendingFee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useCreateFeeCharge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChargePayload | CreateChargesPayload) =>
      "charges" in payload ? feesApi.createCharges(payload) : feesApi.createCharge(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useSendFeeReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.sendReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useStudentFeeStatement = (studentId: string | undefined) =>
  useQuery({
    queryKey: FEES_KEYS.studentStatement(studentId),
    queryFn: () => feesApi.getStudentStatement(studentId!),
    enabled: !!studentId,
  });

export const useFeeInvoices = (params?: {
  search?: string;
  status?: string;
  studentId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: FEES_KEYS.invoices(params),
    queryFn: () => feesApi.listInvoices(params),
  });

export const useFeeInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: FEES_KEYS.invoice(id),
    queryFn: () => feesApi.getInvoice(id!),
    enabled: !!id,
  });

export const useCancelFeeInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      feesApi.cancelInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useOtherInvoices = (params?: {
  search?: string;
  status?: string;
  studentId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: FEES_KEYS.otherInvoices(params),
    queryFn: () => feesApi.listOtherInvoices(params),
  });

export const useOtherInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: FEES_KEYS.otherInvoice(id),
    queryFn: () => feesApi.getOtherInvoice(id!),
    enabled: !!id,
  });

export const useCreateOtherInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOtherInvoicePayload) => feesApi.createOtherInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useFeeReceipts = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  feeHeadMasterId?: string;
}) =>
  useQuery({
    queryKey: FEES_KEYS.receipts(params),
    queryFn: () => feesApi.getReceipts(params),
  });

export const useFeeReceipt = (id: string | undefined) =>
  useQuery({
    queryKey: FEES_KEYS.receipt(id),
    queryFn: () => feesApi.getReceipt(id!),
    enabled: !!id,
  });

export const useDownloadReceiptPdf = () =>
  useMutation({
    mutationFn: (id: string) => feesApi.downloadReceiptPdf(id),
  });

export const useEnsureReceiptPdf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      feesApi.ensureReceiptPdf(id, force),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: FEES_KEYS.receipt(vars.id) });
      queryClient.invalidateQueries({ queryKey: ["fees", "receipts"] });
    },
  });
};
