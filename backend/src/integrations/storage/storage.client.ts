// Storage client — supports local filesystem (dev) or S3-compatible (prod)

import fs from "fs";
import path from "path";

const STORAGE_MODE = process.env.STORAGE_MODE || "local";
const LOCAL_UPLOADS_DIR = process.env.LOCAL_UPLOADS_DIR || "./uploads";

export const saveFile = async (
  buffer: Buffer,
  filename: string,
  folder = "recordings"
): Promise<string> => {
  if (STORAGE_MODE === "local") {
    const dir = path.join(LOCAL_UPLOADS_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/${folder}/${filename}`;
  }

  // TODO: S3 / R2 / GCS integration here
  throw new Error("Cloud storage not yet configured");
};

export const getFileUrl = (key: string): string => {
  if (STORAGE_MODE === "local") return `${process.env.APP_URL || ""}${key}`;
  return `${process.env.STORAGE_BUCKET_URL || ""}/${key}`;
};

export const deleteFile = async (key: string): Promise<void> => {
  if (STORAGE_MODE === "local") {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
