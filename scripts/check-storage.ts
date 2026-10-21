/**
 * Round-trips a document through the R2 code path against a local
 * S3-compatible stub, and asserts the SDK is not sending the checksum
 * headers that Cloudflare R2 rejects.
 */
import { readFileSync } from "fs";
import Module from "module";
import { join } from "path";

// storage.ts carries the "server-only" guard, which throws outside the Next
// bundler. Swap it for the no-op the bundler itself substitutes, so this
// script exercises the real module. Production code keeps the guard.
const resolver = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const originalResolve = resolver._resolveFilename;
resolver._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") {
    // Absolute path, because the package's "exports" map hides this subpath.
    return join(process.cwd(), "node_modules/server-only/empty.js");
  }
  return originalResolve.call(this, request, ...rest);
};

// require, not import: the resolver patch above has to run before the module
// loads, and ESM imports hoist above it.
const { saveUploadedDocument, readUploadedDocument, isR2Configured } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../src/lib/storage") as typeof import("../src/lib/storage");

let passes = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { passes++; console.log(`  PASS  ${name}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`); }
};

function fakeFile(name: string, contents: string): File {
  return new File([new TextEncoder().encode(contents)], name, { type: "application/pdf" });
}

async function main() {
  check("R2 detected as configured", isR2Configured(), "env vars missing");

  const body = "%PDF-1.4 a certificate that must survive a redeploy";
  const saved = await saveUploadedDocument("company-abc", fakeFile("liability.pdf", body));

  check("key is scoped to the company", saved.path.startsWith("company-abc/"), saved.path);
  check("key does not reuse the original filename", !saved.path.includes("liability"), saved.path);
  check("original filename preserved for display", saved.name === "liability.pdf", saved.name);

  const fetched = await readUploadedDocument(saved.path);
  check("document round-trips byte for byte", fetched.toString() === body, fetched.toString().slice(0, 60));

  // A canary on the outgoing request shape rather than a check on our config:
  // the installed SDK does not add a CRC32 checksum for a Buffer body, so this
  // passes with or without requestChecksumCalculation set. Its value is
  // catching a future SDK upgrade that starts sending one again — R2 rejects
  // uploads carrying a checksum it did not ask for.
  const seen = JSON.parse(readFileSync("/tmp/s3-headers.json", "utf8"));
  const put = seen.find((r: { method: string }) => r.method === "PUT");
  check("a PUT reached the server", Boolean(put));
  if (put) {
    const checksumHeaders = Object.keys(put.headers).filter((h) =>
      h.toLowerCase().startsWith("x-amz-checksum"),
    );
    check(
      "no x-amz-checksum-* header sent (R2 rejects these)",
      checksumHeaders.length === 0,
      `found: ${checksumHeaders.join(", ")}`,
    );
    check(
      "not using aws-chunked streaming encoding",
      put.headers["content-encoding"] !== "aws-chunked",
      String(put.headers["content-encoding"]),
    );
  }

  // Rejections still work on the R2 path
  try {
    await saveUploadedDocument("company-abc", fakeFile("notes.txt", "nope"));
    check("rejects unsupported file types", false, "no error thrown");
  } catch (err) {
    check("rejects unsupported file types", /Unsupported file type/.test((err as Error).message));
  }

  try {
    const big = "x".repeat(9 * 1024 * 1024);
    await saveUploadedDocument("company-abc", fakeFile("big.pdf", big));
    check("rejects oversized files", false, "no error thrown");
  } catch (err) {
    check("rejects oversized files", /too large/i.test((err as Error).message));
  }

  console.log(`\n${passes} passed, ${failures.length} failed`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
