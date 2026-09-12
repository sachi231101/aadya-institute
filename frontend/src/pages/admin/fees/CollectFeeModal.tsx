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
  const maxAmount = outstanding;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !paymentModeMasterId) return;
    if (amount > maxAmount + 0.009) {
      setError(`Amount cannot exceed outstanding ${formatMoney(maxAmount)}`);
      return;
    }
    setError(null);

    try {
      if (!isStudentMode && !applyFifo) {
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
          // When collecting from an installment row without FIFO, pin to that line
          pendingFeeId:
            !isStudentMode && !applyFifo ? props.item.id : undefined,
          transactionRef: transactionRef || undefined,
          notes,
        });
        props.onSuccess?.(
          applyFifo || isStudentMode
            ? `Collected ${formatMoney(amount)} (applied FIFO to open dues)`
            : `Collected ${formatMoney(amount)}`
        );
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isStudentMode ? "Collect outstanding dues" : "Collect fee"}
            </h3>
            <p className="text-xs text-slate-500">
              {titleName}
              {admissionNo ? ` (${admissionNo})` : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={props.onClose} type="button">
            ✕
          </Button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
            {!isStudentMode && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Fee head</span>
                  <span className="font-semibold text-slate-900">
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
            <div className="flex justify-between text-slate-600">
              <span>{isStudentMode ? "Student outstanding" : "This charge due"}</span>
              <span className="font-bold text-red-600">{formatMoney(outstanding)}</span>
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
                  Unchecked = pay this installment only. Checked = fill earliest dues first.
                </span>
              </span>
            </label>
          )}

          {isStudentMode && (
            <p className="text-xs text-slate-500">
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
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
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
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !paymentModeMasterId || amount <= 0}>
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
