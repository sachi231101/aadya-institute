import React from "react";
import type { ApplicationDisplayStatus } from "@/utils/map-application";

export function renderApplicationStatusBadge(
  status: ApplicationDisplayStatus,
  feeStatus?: "PAID" | "NOT_PAID"
) {
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
        Rejected
      </span>
    );
  }
  if (status === "APPROVED" || status === "ADMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
        {status === "ADMITTED" ? "Admitted" : "Approved"}
      </span>
    );
  }
  if (status === "READY_FOR_ADMISSION" || feeStatus === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Ready for admission
      </span>
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
        Under review
      </span>
    );
  }
  if (status === "NEW_APPLICATION") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
        New application
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Application fee pending
    </span>
  );
}
