import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type FeeToastMessage = {
  text: string;
  type?: "success" | "error" | "info";
};

export function useFeeToast(durationMs = 3500) {
  const [toast, setToast] = useState<FeeToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(t);
  }, [toast, durationMs]);

  return {
    toast,
    showToast: (text: string, type: FeeToastMessage["type"] = "success") =>
      setToast({ text, type }),
    clearToast: () => setToast(null),
  };
}

export function FeeToastBanner({
  toast,
  onClose,
}: {
  toast: FeeToastMessage | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  const tone =
    toast.type === "error"
      ? "bg-red-600"
      : toast.type === "info"
        ? "bg-slate-800"
        : "bg-emerald-600";

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl px-4 py-3 text-white shadow-lg flex items-start gap-3 ${tone}`}
      role="status"
    >
      {toast.type === "error" ? (
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
      )}
      <p className="text-sm font-medium flex-1">{toast.text}</p>
      <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
