import { useEffect, useRef } from "react";

/** Must match backend FACULTY_GEOFENCE_RADIUS_M. */
export const FACULTY_GEOFENCE_RADIUS_M = 100;

/** Fixes less precise than this are ignored so a poor GPS reading can't trigger auto-out. */
const MAX_ACCEPTED_ACCURACY_M = 200;
/** Backup poll for browsers that throttle watchPosition while stationary. */
const POLL_INTERVAL_MS = 45_000;
/** Wait before retrying after a failed auto check-out request. */
const RETRY_COOLDOWN_MS = 30_000;

type Coords = { latitude: number; longitude: number };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UseFacultyGeofenceWatchOptions {
  /** Watch only while a check-in session is open. */
  enabled: boolean;
  workLatitude: number | null | undefined;
  workLongitude: number | null | undefined;
  /** Called at most once per open session (retried after cooldown if it rejects). */
  onOutside: (coords: Coords) => Promise<unknown>;
}

/**
 * Watches device GPS while a session is open and fires `onOutside` once when the
 * device is farther than the geofence radius from the work location.
 * GPS errors are swallowed; permission denial stops the watcher.
 */
export function useFacultyGeofenceWatch({
  enabled,
  workLatitude,
  workLongitude,
  onOutside,
}: UseFacultyGeofenceWatchOptions): void {
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;

  const firedRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastFailureAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      firedRef.current = false;
      lastFailureAtRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || workLatitude == null || workLongitude == null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const geo = navigator.geolocation;
    let watchId: number | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const stop = () => {
      stopped = true;
      if (watchId != null) geo.clearWatch(watchId);
      if (pollId != null) clearInterval(pollId);
      watchId = null;
      pollId = null;
    };

    const handlePosition = (pos: GeolocationPosition) => {
      if (stopped || firedRef.current || inFlightRef.current) return;
      if (Date.now() - lastFailureAtRef.current < RETRY_COOLDOWN_MS) return;
      if (pos.coords.accuracy > MAX_ACCEPTED_ACCURACY_M) return;

      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const dist = haversineMeters(coords.latitude, coords.longitude, workLatitude, workLongitude);
      if (dist <= FACULTY_GEOFENCE_RADIUS_M) return;

      inFlightRef.current = true;
      onOutsideRef.current(coords)
        .then(() => {
          firedRef.current = true;
        })
        .catch(() => {
          lastFailureAtRef.current = Date.now();
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) stop();
    };

    watchId = geo.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 30_000,
    });
    pollId = setInterval(() => {
      geo.getCurrentPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 20_000,
      });
    }, POLL_INTERVAL_MS);

    return stop;
  }, [enabled, workLatitude, workLongitude]);
}
