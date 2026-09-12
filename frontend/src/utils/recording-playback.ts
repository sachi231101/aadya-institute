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

/** Direct media URLs that an HTML5 video element can usually play. */
export const isDirectVideoUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return false;
  if (isGoogleDriveViewerUrl(url)) return false;
  return /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url) || url.includes("video/mp4");
};
