import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Local disk, used in development and when R2 is not configured. Deliberately
// outside /public — Next.js only reliably serves files that existed there at
// build time, and anything under /public has no access control. Documents are
// served through /api/documents/[certId], which checks the requester's company.
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

/**
 * Cloudflare R2 speaks the S3 API. When it's configured, documents go there
 * instead of local disk — a cloud host's filesystem is wiped on every deploy,
 * which would silently lose every certificate anyone had uploaded.
 */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

let r2Client: S3Client | null = null;

function getR2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      // R2_ENDPOINT lets tests point at a local S3-compatible server.
      endpoint:
        process.env.R2_ENDPOINT ||
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
      // Defensive, not currently load-bearing. Since v3.729 the SDK has at
      // times attached a CRC32 checksum to every request, which R2 rejects
      // ("You can only specify one non-default checksum at a time"). The
      // installed version does not do this for a Buffer body — verified by
      // inspecting the outgoing request in scripts/check-storage.ts — but
      // the default has changed before, so pin it rather than inherit it.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return r2Client;
}

function validate(file: File): string {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported file type. Use PDF, JPG, PNG, WEBP or HEIC.");
  }
  return ext;
}

export async function saveUploadedDocument(
  companyId: string,
  file: File,
): Promise<{ path: string; name: string }> {
  const ext = validate(file);
  // Scoping the key by company id keeps one tenant's documents from colliding
  // with another's; the random name means a key can't be guessed from the
  // company id alone.
  const key = `${companyId}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isR2Configured()) {
    await getR2().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: contentTypeFor(ext),
      }),
    );
    return { path: key, name: file.name };
  }

  const dir = path.join(STORAGE_ROOT, companyId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(STORAGE_ROOT, key), bytes);
  return { path: key, name: file.name };
}

/** relativePath must be a value previously returned by saveUploadedDocument. */
export async function readUploadedDocument(relativePath: string): Promise<Buffer> {
  if (isR2Configured()) {
    const result = await getR2().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: relativePath }),
    );
    if (!result.Body) throw new Error("Document body missing");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  const resolved = path.resolve(path.join(STORAGE_ROOT, relativePath));
  // Stops a stored path like "../../etc/passwd" escaping the storage root.
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) {
    throw new Error("Invalid document path");
  }
  return readFile(resolved);
}
