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

// A hostname label per RFC 1123: alphanumeric at both ends, hyphens only in
// between. The case this exists for is deleting "pooler" from a Neon host but
// leaving its hyphen, which gives "ep-x-zavvuhzx-.c-2.eu-west-2..." — a host
// that parses fine and resolves to nothing, so the first sign of trouble is
// P1001 at migrate time with no hint as to which URL or which character.
const LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

// What is structurally wrong with a value that does start with a scheme.
// Returns null when the URL is usable.
//
// Only the offending hostname label is ever quoted back — never the username
// or password, which is why this reads `url.hostname` rather than slicing the
// raw string. A whole host could be shown safely (Prisma's own errors print
// it), but there is no need, and one label is enough to spot the fault.
function inspect(raw) {
  // Checked before parsing because `new URL` does not object: it quietly
  // percent-encodes a space rather than throwing. A space or line break
  // inside the value means the paste picked up a wrapped line.
  if (/\s/.test(raw)) return "it contains a space or a line break";

  let url;
  try {
    url = new URL(raw);
  } catch {
    return "it could not be parsed as a URL — check for an unescaped character in the password";
  }

  if (url.hostname === "") return "it has no hostname";

  const bad = url.hostname.split(".").find((label) => !LABEL.test(label));
  if (bad !== undefined) {
    return bad === ""
      ? "its hostname has an empty part — two dots in a row, or a leading or trailing dot"
      : `the hostname part ${JSON.stringify(bad)} is not valid — a part cannot start or end with a hyphen ` +
          `(deleting "pooler" but leaving its hyphen does exactly this)`;
  }

  // Neon always names a database; a URL without one connects to a default
  // that will not have the schema in it.
  if (url.pathname === "" || url.pathname === "/") return "it has no database name after the hostname";

  return null;
}

const problems = [];
const warnings = [];
const parsed = new Map();

for (const name of VARS) {
  const raw = process.env[name];

  // Absent is not an error here. Locally `npm install` runs without .env
  // loaded, so both are undefined and there is nothing to check; on a host
  // a missing one is reported by Prisma with a clear message of its own.
  if (raw === undefined) continue;

  if (SCHEMES.some((scheme) => raw.startsWith(scheme))) {
    const fault = inspect(raw);
    if (fault) {
      problems.push(`${name} is not a usable connection string:\n  ${fault}`);
      continue;
    }

    parsed.set(name, raw);

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

// The two should be the same string but for the pooler in the hostname. When
// they differ by more than that, one of them was copied from somewhere else —
// a different Neon project, or the wrong box — and the app and its migrations
// end up pointed at two different databases. A warning rather than fatal:
// against a plain Postgres with no pooler the two are legitimately identical,
// and an unusual-but-deliberate setup should not be blocked from deploying.
if (parsed.size === VARS.length) {
  const [pooled, direct] = VARS.map((name) => parsed.get(name).replace("-pooler", ""));
  if (pooled !== direct) {
    warnings.push(
      `DATABASE_URL and DIRECT_DATABASE_URL differ by more than "-pooler". They should be ` +
        `the same connection string, with the pooled host in DATABASE_URL only — otherwise ` +
        `the app and its migrations are using different databases.`,
    );
  }
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
