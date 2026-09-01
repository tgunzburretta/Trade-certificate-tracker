import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Deliberately outside /public — Next.js only serves files that existed in
// /public at build time reliably, and anything under /public is served with
// no access control. Documents go through /api/documents/[certId] instead,
// which checks the requester's company before reading from here.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "heic"]);

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
};

export function contentTypeFor(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase()] || "application/octet-stream";
}

export async function saveUploadedDocument(
  companyId: string,
  file: File,
): Promise<{ path: string; name: string }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported file type. Use PDF, JPG, PNG, WEBP or HEIC.");
  }

  const dir = path.join(STORAGE_ROOT, companyId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return { path: `${companyId}/${filename}`, name: file.name };
}

/** relativePath must be a value previously returned by saveUploadedDocument. */
export async function readUploadedDocument(relativePath: string): Promise<Buffer> {
  const full = path.join(STORAGE_ROOT, relativePath);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) {
    throw new Error("Invalid document path");
  }
  return readFile(resolved);
}
