import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../../config/logger";
import type { GoogleDriveFileMetadata } from "./google.types";

/**
 * Retrieves metadata for a recording file in Google Drive
 */
export const getDriveFileMetadata = async (
  authClient: OAuth2Client,
  fileId: string
): Promise<GoogleDriveFileMetadata | null> => {
  const drive = google.drive({ version: "v3", auth: authClient });

  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime, videoMediaMetadata",
    });

    const file = response.data;
    if (!file || !file.id) return null;

    return {
      id: file.id,
      name: file.name || "Class Recording",
      mimeType: file.mimeType || "video/mp4",
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      size: file.size ? Number(file.size) : undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      videoMediaMetadata: file.videoMediaMetadata
        ? {
            width: file.videoMediaMetadata.width || undefined,
            height: file.videoMediaMetadata.height || undefined,
            durationMillis: file.videoMediaMetadata.durationMillis || undefined,
          }
        : undefined,
    };
  } catch (err: any) {
    logger.error({ err: err?.message || err, fileId }, "Failed to fetch Google Drive file metadata");
    return null;
  }
};

/**
 * Validates whether the authenticated client has access to read the given Drive file
 */
export const checkDriveFileAccess = async (
  authClient: OAuth2Client,
  fileId: string
): Promise<boolean> => {
  const metadata = await getDriveFileMetadata(authClient, fileId);
  return metadata !== null;
};
