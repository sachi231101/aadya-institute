import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCollectPendingFee, useCreatePayment } from "@/hooks/useFees";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MasterSelect } from "@/components/common/MasterSelect";
import type { PendingFee } from "@/types/fee.types";

type InstallmentProps = {
  mode?: "installment";
  item: PendingFee;
  student?: never;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

type StudentProps = {
  mode: "student";
  item?: never;
  student: {
    id: string;
    name: string;
    admissionNo?: string | null;
    outstanding: number;
  };
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export type CollectFeeModalProps = InstallmentProps | StudentProps;

export function CollectFeeModal(props: CollectFeeModalProps) {
  const formatMoney = useFormatCurrency();
  const collectFee = useCollectPendingFee();
  const createPayment = useCreatePayment();

  const isStudentMode = props.mode === "student";
  const outstanding = isStudentMode
    ? props.student.outstanding
    : props.item.dueAmount;
  const titleName = isStudentMode ? props.student.name : props.item.studentName;
  const admissionNo = isStudentMode
    ? props.student.admissionNo
    : props.item.admissionNo;

  const [amount, setAmount] = useState(outstanding);
  const [paymentModeMasterId, setPaymentModeMasterId] = useState("");
  const [feeHeadMasterId, setFeeHeadMasterId] = useState(
    !isStudentMode ? props.item.feeHeadMasterId || "" : ""
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState(
    isStudentMode
      ? "Collection applied FIFO across open dues"
      : `Collection for Installment #${props.item.installmentNo}`
  );
  const [applyFifo, setApplyFifo] = useState(isStudentMode);
  const [error, setError] = useState<string | null>(null);

  const pending = collectFee.isPending || createPayment.isPending;
  // More than this line's due spills into the student's next open dues
  // (the backend caps the amount at the student's total outstanding).
  const spillsOver = amount > outstanding + 0.009;
  const useFifo = isStudentMode || applyFifo || spillsOver;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !paymentModeMasterId) return;
    setError(null);

    try {
      if (!useFifo) {
        await collectFee.mutateAsync({
          id: props.item.id,
          payload: {
            amountPaidNow: amount,
            paymentModeMasterId,
            feeHeadMasterId: feeHeadMasterId || undefined,
            transactionRef: transactionRef || undefined,
            notes,
          },
        });
        props.onSuccess?.(
          `Collected ${formatMoney(amount)} for installment #${props.item.installmentNo}`
        );
      } else {
        const studentId = isStudentMode ? props.student.id : props.item.studentId;
        if (!studentId) {
          setError("Student is not linked to this charge line");
          return;
        }
        await createPayment.mutateAsync({
          studentId,
          amount,
          paymentModeMasterId,
          feeHeadMasterId: feeHeadMasterId || undefined,
          transactionRef: transactionRef || undefined,
          notes,
        });
        props.onSuccess?.(`Collected ${formatMoney(amount)} (applied to earliest open dues)`);
      }
      props.onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to record fee collection";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-xl sm:rounded-xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 my-0 sm:my-auto">
        <div className="flex justify-between items-start gap-3 border-b border-slate-100 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {isStudentMode ? "Collect outstanding dues" : "Collect fee"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {titleName}
              {admissionNo ? ` (${admissionNo})` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={props.onClose}
            type="button"
            className="shrink-0 h-8 w-8"
          >
            ✕
          </Button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="space-y-3 sm:space-y-4 px-4 py-3 sm:px-5 sm:py-4 overflow-y-auto overscroll-contain flex-1">
            <div className="p-3 sm:p-4 bg-slate-50 rounded-lg space-y-1.5 sm:space-y-2 text-sm">
              {!isStudentMode && (
                <>
                  <div className="flex justify-between gap-3 text-slate-600">
                    <span className="shrink-0">Fee head</span>
                    <span className="font-semibold text-slate-900 text-right truncate">
                      {props.item.feeHead || "Fee"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Installment</span>
                    <span className="font-semibold text-slate-900">
                      #{props.item.installmentNo || 1}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-3 text-slate-600">
                <span className="shrink-0">
                  {isStudentMode ? "Student outstanding" : "This charge due"}
                </span>
                <span className="font-bold text-red-600">
                  {formatMoney(outstanding)}
                </span>
              </div>
            </div>

            {!isStudentMode && (
              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={applyFifo}
                  onChange={(e) => setApplyFifo(e.target.checked)}
                />
                <span>
                  Apply across all open dues (FIFO)
                  <span className="block text-xs text-slate-500">
                    Unchecked = pay this installment only. Checked = fill earliest dues
                    first.
                  </span>
                </span>
              </label>
            )}

            {isStudentMode && (
              <p className="text-xs text-slate-500 leading-snug">
                Amount is applied oldest installment first within each fee head.
              </p>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Amount collecting now *
              </label>
              <Input
                type="number"
                required
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-9"
              />
              {spillsOver && (
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {formatMoney(amount - outstanding)} more than{" "}
                  {isStudentMode ? "this amount due" : "this charge"} will be applied to
                  the next open installments.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Prefer fee head (optional)
              </label>
              <MasterSelect
                entityType="feeheads"
                value={feeHeadMasterId}
                onChange={setFeeHeadMasterId}
                placeholder="Any open fee head"
                className="mt-0 rounded-md"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment method *
              </label>
              <MasterSelect
                entityType="paymentmodes"
                value={paymentModeMasterId}
                onChange={setPaymentModeMasterId}
                placeholder="Select payment mode"
                className="mt-0 rounded-md"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Transaction ref / note
              </label>
              <Input
                placeholder="e.g. UPI ref or cash receipt"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 px-4 py-3 sm:px-5 sm:py-4 border-t border-slate-100 shrink-0 bg-white">
            <Button type="button" variant="outline" onClick={props.onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !paymentModeMasterId || amount <= 0}
              className="w-full sm:w-auto"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm & issue receipt"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
