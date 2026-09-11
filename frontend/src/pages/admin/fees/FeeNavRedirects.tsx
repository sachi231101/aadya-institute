import React from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getPortalBasePath } from "@/utils/portal-path";
import { Payments } from "./Payments";

export function PendingFeesRedirect() {
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  return <Navigate to={`${basePath}/fees/students?tab=pending`} replace />;
}

export function OtherInvoicesListRedirect() {
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  return <Navigate to={`${basePath}/fees/invoices?tab=other`} replace />;
}

export function PaymentsEntry() {
  const [params] = useSearchParams();
  const location = useLocation();
  if (params.get("studentId")) return <Payments />;
  const basePath = getPortalBasePath(location.pathname);
  return <Navigate to={`${basePath}/fees/receipts`} replace />;
}
