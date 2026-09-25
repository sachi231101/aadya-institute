/** Drive /preview URL. Opens in the browser so Google serves the video. */
export const buildDrivePreviewUrl = (fileId: string): string =>
  `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;

/** Google Drive / Meet viewer links are HTML pages — not playable in <video src>. */
export const isGoogleDriveViewerUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      (host.endsWith(".google.com") && url.includes("/file/d/"))
    );
  } catch {
    return /drive\.google\.com|docs\.google\.com/i.test(url);
  }
};

/** True for Drive file /preview (and /view) pages suitable for in-app iframe embed. */
export const isGoogleDriveEmbeddableUrl = (url?: string | null): boolean => {
  if (!isGoogleDriveViewerUrl(url)) return false;
  return /\/file\/d\/[^/]+\/(preview|view)/i.test(url!);
};

/** App-proxied recording stream for HTML5 <video> (tokenized backend Drive proxy). */
export const isAppRecordingStreamUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return false;
  return /\/recordings\/[^/?]+\/stream(\?|$)/i.test(url);
};

/**
 * Resolve playback URL for <video src>.
 *
 * App stream URLs must stay on the frontend origin (`/api/v1/...`) so Vite/nginx
 * proxies them. Rewriting to an absolute API host (different port/origin) causes
 * Helmet's Cross-Origin-Resource-Policy: same-origin to block the media body
 * (black player, no useful error).
 */
export const resolveRecordingPlaybackSrc = (url: string): string => {
  if (isAppRecordingStreamUrl(url)) {
    try {
      if (/^https?:\/\//i.test(url)) {
        const parsed = new URL(url);
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* fall through */
    }
    if (url.startsWith("/")) return url;
    return `/api/v1/${url.replace(/^\//, "")}`;
  }

  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
  if (url.startsWith("/api/v1")) {
    if (apiBase.startsWith("http")) {
      return `${apiBase}${url.slice("/api/v1".length)}`;
    }
    return url;
  }
  if (url.startsWith("/")) return url;
  return `${apiBase}/${url.replace(/^\//, "")}`;
};

/** Direct media URLs that an HTML5 video element can usually play. */
export const isDirectVideoUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return false;
  if (isAppRecordingStreamUrl(url)) return true;
  if (isGoogleDriveViewerUrl(url)) return false;
  return /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url) || url.includes("video/mp4");
};

const DEFAULT_PLAYBACK_ERROR =
  "Unable to play this recording. The stream may be unavailable — try again or contact your administrator.";

/**
 * When <video onError> fires, probe the stream URL for a useful API message.
 * Media elements do not expose HTTP status on their own.
 */
export const describeRecordingPlaybackError = async (
  playbackSrc: string
): Promise<string> => {
  if (!playbackSrc?.trim()) return DEFAULT_PLAYBACK_ERROR;
  try {
    const res = await fetch(playbackSrc, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      credentials: "same-origin",
    });
    if (res.ok || res.status === 206) {
      return DEFAULT_PLAYBACK_ERROR;
    }
    let message = "";
    try {
      const body = (await res.json()) as { message?: string };
      message = typeof body?.message === "string" ? body.message.trim() : "";
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 || res.status === 403) {
      return (
        message ||
        "Playback authorization expired. Close and open the recording again."
      );
    }
    if (res.status === 410) {
      return message || "This recording has expired.";
    }
    if (res.status >= 500) {
      return (
        message ||
        "The recording stream is temporarily unavailable. Please try again."
      );
    }
    return message || `${DEFAULT_PLAYBACK_ERROR} (HTTP ${res.status})`;
  } catch {
    return DEFAULT_PLAYBACK_ERROR;
  }
};
