import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../../config/logger";
import type { GoogleDriveFileMetadata } from "./google.types";
import { getGoogleHttpStatus, toGoogleAppError } from "./google-error.util";

export type RestrictedViewerPermission =
  | { domain: string; expiresAt?: never; emailAddress?: never }
  | { emailAddress: string; expiresAt: Date; domain?: never };

export const normalizeDriveFileId = (fileId: string): string =>
  fileId.trim().replace(/^files\//, "");

const isValidDriveFileId = (fileId: string): boolean =>
  /^[A-Za-z0-9_-]{10,200}$/.test(normalizeDriveFileId(fileId));

const isDomainPermission = (
  permission: RestrictedViewerPermission
): permission is Extract<RestrictedViewerPermission, { domain: string }> =>
  typeof permission.domain === "string";

/**
 * Retrieves metadata for a recording file in Google Drive
 */
export const getDriveFileMetadata = async (
  authClient: OAuth2Client,
  fileId: string
): Promise<GoogleDriveFileMetadata | null> => {
  const drive = google.drive({ version: "v3", auth: authClient });
  const normalizedFileId = normalizeDriveFileId(fileId);

  try {
    const response = await drive.files.get({
      fileId: normalizedFileId,
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
  } catch (error: unknown) {
    const status = getGoogleHttpStatus(error);
    if (status === 404) return null;
    logger.error(
      { status, fileId: normalizedFileId },
      "Failed to fetch Google Drive file metadata"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

/**
 * Validates the identifier and confirms the authenticated account can see it.
 */
export const validateFileId = async (
  authClient: OAuth2Client,
  fileId: string
): Promise<boolean> => {
  if (!isValidDriveFileId(fileId)) return false;
  const metadata = await getDriveFileMetadata(authClient, fileId);
  return metadata !== null;
};

export const checkDriveFileAccess = validateFileId;

/**
 * Grants restricted playback access. Domain access is preferred when configured;
 * otherwise a specific user permission must include the recording expiry.
 */
export const setRestrictedViewerPermission = async (
  authClient: OAuth2Client,
  fileId: string,
  permission: RestrictedViewerPermission
): Promise<void> => {
  if (!isValidDriveFileId(fileId)) {
    throw toGoogleAppError({ status: 404 }, "RECORDING_NOT_READY");
  }

  const drive = google.drive({ version: "v3", auth: authClient });
  const normalizedFileId = normalizeDriveFileId(fileId);
  try {
    const existingPermissions = await drive.permissions.list({
      fileId: normalizedFileId,
      supportsAllDrives: true,
      fields: "permissions(id,type,role,emailAddress,domain,expirationTime)",
    });
    const domainPermission = isDomainPermission(permission);
    const existing = existingPermissions.data.permissions?.find((entry) =>
      domainPermission
        ? entry.type === "domain" &&
          entry.domain?.toLowerCase() === permission.domain.toLowerCase()
        : entry.type === "user" &&
          entry.emailAddress?.toLowerCase() ===
            permission.emailAddress.toLowerCase()
    );

    if (existing?.id) {
      if (!domainPermission) {
        await drive.permissions.update({
          fileId: normalizedFileId,
          permissionId: existing.id,
          supportsAllDrives: true,
          requestBody: {
            role: "reader",
            expirationTime: permission.expiresAt.toISOString(),
          },
        });
      }
      return;
    }

    await drive.permissions.create({
      fileId: normalizedFileId,
      supportsAllDrives: true,
      sendNotificationEmail: false,
      requestBody: domainPermission
        ? {
            type: "domain",
            role: "reader",
            domain: permission.domain,
            allowFileDiscovery: false,
          }
        : {
            type: "user",
            role: "reader",
            emailAddress: permission.emailAddress,
            expirationTime: permission.expiresAt.toISOString(),
          },
    });
  } catch (error: unknown) {
    const status = getGoogleHttpStatus(error);
    logger.error(
      { status, fileId: normalizedFileId },
      "Failed to restrict Google Drive recording access"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

export interface SearchRecentMeetRecordingsOptions {
  /** Inclusive lower bound for file createdTime (ISO or Date). */
  createdAfter: Date;
  /** Inclusive upper bound for file createdTime (ISO or Date). */
  createdBefore: Date;
  /** Optional substring match against file name (e.g. Meet meeting code). */
  nameContains?: string;
  /** Max files to return (default 10). */
  pageSize?: number;
}

/**
 * Search organizer Drive for recent Google Meet recording videos.
 * Used when Meet conferenceRecords.recordings is still empty after class end.
 */
export const searchRecentMeetRecordings = async (
  authClient: OAuth2Client,
  options: SearchRecentMeetRecordingsOptions
): Promise<GoogleDriveFileMetadata[]> => {
  const drive = google.drive({ version: "v3", auth: authClient });
  const pageSize = Math.min(25, Math.max(1, options.pageSize ?? 10));
  const afterIso = options.createdAfter.toISOString();
  const beforeIso = options.createdBefore.toISOString();

  const queryParts = [
    "trashed = false",
    "(mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.video')",
    `createdTime >= '${afterIso}'`,
    `createdTime <= '${beforeIso}'`,
  ];
  if (options.nameContains?.trim()) {
    const safe = options.nameContains.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${safe}'`);
  }

  try {
    const response = await drive.files.list({
      q: queryParts.join(" and "),
      spaces: "drive",
      corpora: "user",
      orderBy: "createdTime desc",
      pageSize,
      fields:
        "files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime, videoMediaMetadata, parents)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];
    return files
      .filter((file) => Boolean(file.id))
      .map((file) => ({
        id: file.id!,
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
      }));
  } catch (error: unknown) {
    const status = getGoogleHttpStatus(error);
    logger.warn(
      { status, afterIso, beforeIso },
      "Failed to search Google Drive for Meet recordings"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

/**
 * Deletes a Drive file. A missing file is already in the desired state.
 */
export const deleteDriveFile = async (
  authClient: OAuth2Client,
  fileId: string
): Promise<{ alreadyDeleted: boolean }> => {
  if (!isValidDriveFileId(fileId)) {
    return { alreadyDeleted: true };
  }

  const drive = google.drive({ version: "v3", auth: authClient });
  const normalizedFileId = normalizeDriveFileId(fileId);
  try {
    await drive.files.delete({
      fileId: normalizedFileId,
      supportsAllDrives: true,
    });
    return { alreadyDeleted: false };
  } catch (error: unknown) {
    const status = getGoogleHttpStatus(error);
    if (status === 404) return { alreadyDeleted: true };
    logger.error(
      { status, fileId: normalizedFileId },
      "Failed to delete Google Drive recording"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};
