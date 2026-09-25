import { useEffect, useState } from "react";
import { istTodayKey } from "@/utils/session-window";

/**
 * Live Asia/Kolkata calendar day (YYYY-MM-DD).
 * Refreshes on an interval and when the tab becomes visible so "Today"
 * flips after midnight without a full page reload.
 */
export const useIstTodayKey = (tickMs = 30_000): string => {
  const [todayKey, setTodayKey] = useState(() => istTodayKey());

  useEffect(() => {
    const refresh = () => {
      const next = istTodayKey();
      setTodayKey((prev) => (prev === next ? prev : next));
    };
    refresh();
    const id = window.setInterval(refresh, tickMs);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tickMs]);

  return todayKey;
};
