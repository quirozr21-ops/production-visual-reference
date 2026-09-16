import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";

function storageRoot() {
  const root = process.env.VISUAL_REFERENCE_STORAGE_ROOT?.trim();
  return root || null;
}

export function hasServerImageStorage() {
  return storageRoot() !== null;
}

function resolveStoragePath(storagePath: string) {
  const root = storageRoot();
  if (!root) throw new Error("VISUAL_REFERENCE_STORAGE_ROOT is not configured.");

  const rootPath = resolve(root);
  const cleanSegments = storagePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
  const fullPath = resolve(rootPath, ...cleanSegments);
  const relativePath = relative(rootPath, fullPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Invalid visual reference storage path.");
  }

  return fullPath;
}

export async function writeServerImage(storagePath: string, bytes: Uint8Array) {
  const fullPath = resolveStoragePath(storagePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes, { flag: "wx" });
}

export async function readServerImage(storagePath: string) {
  const fullPath = resolveStoragePath(storagePath);
  try {
    return await readFile(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteServerImage(storagePath: string) {
  const fullPath = resolveStoragePath(storagePath);
  try {
    await rm(fullPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function imageContentType(storagePath: string) {
  switch (extname(storagePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    default:
      return "application/octet-stream";
  }
}
