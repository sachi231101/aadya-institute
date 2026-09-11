import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCollectPendingFee } from "@/hooks/useFees";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MasterSelect } from "@/components/common/MasterSelect";
import type { PendingFee } from "@/types/fee.types";

interface CollectFeeModalProps {
  item: PendingFee;
  onClose: () => void;
}

export function CollectFeeModal({ item, onClose }: CollectFeeModalProps) {
  const formatMoney = useFormatCurrency();
  const collectFee = useCollectPendingFee();
  const [amount, setAmount] = useState(item.dueAmount);
  const [paymentModeMasterId, setPaymentModeMasterId] = useState("");
  const [feeHeadMasterId, setFeeHeadMasterId] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState(`Collection for Installment #${item.installmentNo}`);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !paymentModeMasterId) return;
    setError(null);
    try {
      await collectFee.mutateAsync({
        id: item.id,
        payload: {
          amountPaidNow: amount,
          paymentModeMasterId,
          feeHeadMasterId: feeHeadMasterId || undefined,
          transactionRef,
          notes,
        },
      });
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to record fee collection";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Collect fee</h3>
            <p className="text-xs text-slate-500">
              {item.studentName} ({item.admissionNo})
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} type="button">
            ✕
          </Button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Fee head</span>
              <span className="font-semibold text-slate-900">{item.feeHead || "Fee"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding</span>
              <span className="font-bold text-red-600">{formatMoney(item.dueAmount)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Amount collecting now *
            </label>
            <Input
              type="number"
              required
              min={1}
              max={item.dueAmount}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Fee head</label>
            <MasterSelect
              entityType="feeheads"
              value={feeHeadMasterId}
              onChange={setFeeHeadMasterId}
              placeholder="Select fee head (optional)"
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={collectFee.isPending || !paymentModeMasterId}>
              {collectFee.isPending ? (
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
