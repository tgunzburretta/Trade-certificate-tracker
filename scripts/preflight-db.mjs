// Checks the two Postgres connection strings look like connection strings,
// before anything tries to use them.
//
// Prisma's own complaint about a malformed URL is "P1013: the scheme is not
// recognized", which says nothing about WHICH variable is wrong or what is
// wrong with it. In practice the cause is almost always that something came
// along with the URL when it was pasted into a hosting dashboard — the
// variable name, a pair of quotes, a `psql` prefix — and since the value is
// a password field you cannot see the start of it to tell. That turns a
// one-character problem into a deploy cycle per guess.
//
// This runs from `postinstall`, so it happens during `npm ci` — before
// `prisma migrate deploy`, which is the first thing that would otherwise
// fail. It has no dependencies for the same reason: at postinstall time we
// cannot rely on anything but Node itself.
//
// Nothing after `://` is ever printed. Everything before it is safe to show
// (credentials come after), and that prefix is exactly where the fault is.

const VARS = ["DATABASE_URL", "DIRECT_DATABASE_URL"];
const SCHEMES = ["postgresql://", "postgres://"];

// Why this value cannot be a connection string, in the words of whoever
// pasted it. Ordered most specific first — a value can match more than one.
function diagnose(raw) {
  if (raw.trim() === "") return "it is empty, or only whitespace";
  if (raw !== raw.trim()) return "it has whitespace at the start or end";
  if (/^["']/.test(raw)) return "it is wrapped in quotes — Render stores those as part of the value";
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(raw)) return "the variable name was pasted into the value as well";
  if (/^psql\b/.test(raw)) return "it was copied as a `psql ...` command rather than the bare URL";
  if (/^https?:\/\//.test(raw)) return "it is an http(s) URL — that is a dashboard link, not a connection string";
  return null;
}

const problems = [];
const warnings = [];

for (const name of VARS) {
  const raw = process.env[name];

  // Absent is not an error here. Locally `npm install` runs without .env
  // loaded, so both are undefined and there is nothing to check; on a host
  // a missing one is reported by Prisma with a clear message of its own.
  if (raw === undefined) continue;

  if (SCHEMES.some((scheme) => raw.startsWith(scheme))) {
    // The split exists so migrations avoid the pooler — see the comment on
    // `directUrl` in prisma/schema.prisma. A pooled URL here still connects,
    // so this cannot be fatal, but it fails later and confusingly.
    if (name === "DIRECT_DATABASE_URL" && raw.includes("-pooler")) {
      warnings.push(
        `${name} points at the pooled host (it contains "-pooler"). Migrations ` +
          `must not go through the pooler; remove "-pooler" from the hostname.`,
      );
    }
    continue;
  }

  const separator = raw.indexOf("://");
  const found =
    separator === -1
      ? `no "://" anywhere in the value (${raw.length} characters long)`
      : `it starts with ${JSON.stringify(raw.slice(0, separator + 3))}`;

  const cause = diagnose(raw);
  problems.push(
    [
      `${name} is not a valid connection string:`,
      `  ${found}`,
      cause ? `  Looks like ${cause}.` : null,
      `  It must start with "postgresql://" and nothing before it.`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

for (const warning of warnings) {
  console.warn(`[preflight] warning: ${warning}`);
}

if (problems.length > 0) {
  console.error("");
  console.error("Database connection strings are malformed — stopping before the build.");
  console.error("");
  for (const problem of problems) {
    console.error(problem);
    console.error("");
  }
  console.error("Expected shape (the two differ only by \"-pooler\" in the hostname):");
  console.error("  postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require");
  console.error("");
  process.exit(1);
}
