import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, LogIn, LogOut, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFacultyDashboard, useFacultyCheckIn, useFacultyCheckOut } from "@/hooks/useFaculty";
import { useFacultyGeofenceWatch } from "@/hooks/useFacultyGeofenceWatch";
import { getCurrentPosition } from "@/utils/geolocation";
import { formatTime12h } from "@/utils/format";

const AUTO_OUT_BANNER_MS = 10_000;

type GeoCoords = { latitude: number; longitude: number };

type PendingGeoAction =
  | { action: "check-in"; coords: GeoCoords }
  | { action: "check-out" };

/**
 * Compact Check In / Check Out controls for the faculty top navbar.
 * Check-in: click → GPS → Confirm → API (geofenced ≤100 m).
 * Manual check-out: click → Confirm → API (no GPS / geofence).
 * While a session is open, GPS is watched and the faculty is auto checked out
 * (no Confirm) once outside the work-location radius.
 */
export const FacultyCheckInOutNav: React.FC = () => {
  const { data: dashRes, isLoading, refetch: refetchDashboard } = useFacultyDashboard();
  const dashboard = dashRes?.data;
  const today = dashboard?.dailyAttendance?.today;
  const openSession = today?.openSession ?? false;

  const [pendingGeo, setPendingGeo] = useState<PendingGeoAction | null>(null);
  const [geoFetching, setGeoFetching] = useState(false);
  const [geoMsg, setGeoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [autoOutBanner, setAutoOutBanner] = useState(false);

  const checkInMutation = useFacultyCheckIn();
  const checkOutMutation = useFacultyCheckOut();
  const { mutateAsync: checkOutAsync } = checkOutMutation;

  const busy =
    geoFetching || checkInMutation.isPending || checkOutMutation.isPending;

  const handleAutoCheckOut = useCallback(
    async (coords: GeoCoords) => {
      try {
        await checkOutAsync({ ...coords, source: "AUTO_GEOFENCE" });
        setPendingGeo(null);
        setAutoOutBanner(true);
      } catch (err) {
        // Stale open-session state (e.g. already checked out elsewhere) — resync.
        void refetchDashboard();
        throw err;
      }
    },
    [checkOutAsync, refetchDashboard]
  );

  useFacultyGeofenceWatch({
    enabled: openSession && !isLoading,
    workLatitude: dashboard?.profile?.workLatitude,
    workLongitude: dashboard?.profile?.workLongitude,
    onOutside: handleAutoCheckOut,
  });

  useEffect(() => {
    if (!autoOutBanner) return;
    const id = setTimeout(() => setAutoOutBanner(false), AUTO_OUT_BANNER_MS);
    return () => clearTimeout(id);
  }, [autoOutBanner]);

  const clearPendingGeo = () => setPendingGeo(null);

  const handleCheckIn = async () => {
    setGeoMsg(null);
    setGeoFetching(true);
    try {
      const coords = await getCurrentPosition();
      setPendingGeo({ action: "check-in", coords });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? "Check-in failed";
      setGeoMsg({ type: "error", text: msg });
    } finally {
      setGeoFetching(false);
    }
  };

  const handleCheckOut = () => {
    setGeoMsg(null);
    setPendingGeo({ action: "check-out" });
  };

  const handleConfirmGeo = async () => {
    if (!pendingGeo) return;
    const action = pendingGeo.action;
    setGeoMsg(null);
    try {
      if (action === "check-in") {
        await checkInMutation.mutateAsync(pendingGeo.coords);
        setGeoMsg({ type: "success", text: "Checked in successfully!" });
      } else {
        await checkOutMutation.mutateAsync({ source: "MANUAL" });
        setGeoMsg({ type: "success", text: "Checked out successfully!" });
      }
      clearPendingGeo();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ??
        (err as { message?: string })?.message ??
        (action === "check-in" ? "Check-in failed" : "Check-out failed");
      setGeoMsg({ type: "error", text: msg });
      clearPendingGeo();
    }
  };

  const firstIn = today?.firstIn ?? today?.inTime ?? null;
  const lastOut = today?.lastOut ?? today?.outTime ?? null;
  const sessionCount = today?.sessionCount ?? 0;
  const lastPunch = today?.punches?.length ? today.punches[today.punches.length - 1] : null;

  const checkInTitle =
    sessionCount > 0 && lastOut
      ? `Last checked out at ${formatTime12h(lastOut)} (${sessionCount} session${sessionCount === 1 ? "" : "s"} today). Check in again with GPS.`
      : "Check in with GPS (geofenced)";
  const checkOutTitle = lastPunch
    ? `Checked in at ${formatTime12h(lastPunch.timeHmm)}${firstIn && firstIn !== lastPunch.timeHmm ? ` (first in ${formatTime12h(firstIn)})` : ""}. Check out.`
    : "Check out";

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {!openSession ? (
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-none"
            onClick={handleCheckIn}
            disabled={isLoading || busy}
            title={checkInTitle}
          >
            {geoFetching || checkInMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogIn className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Check In</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 bg-rose-500 hover:bg-rose-600 text-white border-0 shadow-none"
            onClick={handleCheckOut}
            disabled={isLoading || busy}
            title={checkOutTitle}
          >
            {checkOutMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Check Out</span>
          </Button>
        )}
        <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-white/60" title="Geofenced attendance">
          <MapPin className="h-3 w-3" />
        </span>
      </div>

      {autoOutBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 right-4 z-50 flex max-w-sm items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-lg"
        >
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <span className="flex-1">Auto checked out — outside work location</span>
          <button
            type="button"
            onClick={() => setAutoOutBanner(false)}
            className="text-amber-700 hover:text-amber-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Dialog
        open={pendingGeo !== null}
        onOpenChange={(open) => {
          if (!open) clearPendingGeo();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingGeo?.action === "check-out" ? "Confirm check-out" : "Confirm check-in"}
            </DialogTitle>
            <DialogDescription>
              {pendingGeo?.action === "check-out"
                ? "Confirm to save your check-out time."
                : "Location allowed. Confirm to save your time."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={clearPendingGeo}
              disabled={checkInMutation.isPending || checkOutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmGeo}
              disabled={checkInMutation.isPending || checkOutMutation.isPending}
              className={
                pendingGeo?.action === "check-out"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {(checkInMutation.isPending || checkOutMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={geoMsg !== null && pendingGeo === null}
        onOpenChange={(open) => {
          if (!open) setGeoMsg(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={
                geoMsg?.type === "error" ? "flex items-center gap-2 text-destructive" : undefined
              }
            >
              {geoMsg?.type === "error" && <AlertCircle className="h-5 w-5 shrink-0" />}
              {geoMsg?.type === "success" ? "Success" : "Unable to complete"}
            </DialogTitle>
            <DialogDescription
              className={geoMsg?.type === "error" ? "text-destructive" : undefined}
            >
              {geoMsg?.text}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant={geoMsg?.type === "error" ? "destructive" : "default"}
              onClick={() => setGeoMsg(null)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
