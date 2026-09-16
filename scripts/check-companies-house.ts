/**
 * Exercises the Companies House adapter against a throwaway local HTTP server
 * standing in for the real register, so the mapping and failure handling can
 * be verified without an API key. Usage: npx tsx scripts/check-companies-house.ts
 */
import { createServer, type Server } from "http";
import { normaliseCompanyNumber, interpretProfile, CompaniesHouseProvider } from "../src/lib/verification/companiesHouse";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// --- company number normalisation ---
check("pads short numeric company numbers", normaliseCompanyNumber("1234567"), "01234567");
check("leaves full-length numbers alone", normaliseCompanyNumber("01234567"), "01234567");
check("uppercases Scottish prefix", normaliseCompanyNumber("sc123456"), "SC123456");
check("strips whitespace", normaliseCompanyNumber(" 012 345 67 "), "01234567");

// --- status mapping ---
check(
  "active company verifies",
  interpretProfile({ company_name: "ACME ROOFING LTD", company_status: "active", date_of_creation: "2019-01-15" }).status,
  "VERIFIED",
);
check(
  "dissolved company is adverse, not verified",
  interpretProfile({ company_status: "dissolved" }).status,
  "ADVERSE",
);
check("liquidation is adverse", interpretProfile({ company_status: "liquidation" }).status, "ADVERSE");
check("administration is adverse", interpretProfile({ company_status: "administration" }).status, "ADVERSE");
check(
  "unknown status is treated as adverse rather than assumed good",
  interpretProfile({ company_status: "some-new-status" }).status,
  "ADVERSE",
);
check(
  "detail reads for a human",
  interpretProfile({ company_status: "active", date_of_creation: "2019-01-15" }).detail,
  "Active · incorporated 15 January 2019",
);
check(
  "address is flattened and blank parts dropped",
  interpretProfile({
    company_status: "active",
    registered_office_address: { address_line_1: "12 High St", address_line_2: "", locality: "Leeds", postal_code: "LS1 1AA" },
  }).registeredAddress,
  "12 High St, Leeds, LS1 1AA",
);

// --- HTTP behaviour against a stand-in register ---
function startServer(handler: (path: string) => { code: number; body: string }): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const { code, body } = handler(req.url || "");
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function httpTests() {
  const provider = new CompaniesHouseProvider();
  process.env.COMPANIES_HOUSE_API_KEY = "test-key";

  // 200 OK
  let handle = await startServer(() => ({
    code: 200,
    body: JSON.stringify({ company_name: "ACME ROOFING LTD", company_status: "active", date_of_creation: "2019-01-15" }),
  }));
  process.env.COMPANIES_HOUSE_API_URL = handle.url;
  let result = await provider.check("1234567");
  check("200 response verifies and returns the registered name", [result.status, result.registeredName], ["VERIFIED", "ACME ROOFING LTD"]);
  handle.server.close();

  // 404 -> NOT_FOUND
  handle = await startServer(() => ({ code: 404, body: "{}" }));
  process.env.COMPANIES_HOUSE_API_URL = handle.url;
  result = await provider.check("99999999");
  check("404 maps to NOT_FOUND", result.status, "NOT_FOUND");
  handle.server.close();

  // 500 -> CHECK_FAILED (our problem, not theirs)
  handle = await startServer(() => ({ code: 500, body: "{}" }));
  process.env.COMPANIES_HOUSE_API_URL = handle.url;
  result = await provider.check("1234567");
  check("500 maps to CHECK_FAILED, NOT a failed company", result.status, "CHECK_FAILED");
  handle.server.close();

  // unreachable host -> CHECK_FAILED
  process.env.COMPANIES_HOUSE_API_URL = "http://127.0.0.1:1";
  result = await provider.check("1234567");
  check("unreachable register maps to CHECK_FAILED", result.status, "CHECK_FAILED");

  // malformed JSON -> CHECK_FAILED
  handle = await startServer(() => ({ code: 200, body: "not json at all" }));
  process.env.COMPANIES_HOUSE_API_URL = handle.url;
  result = await provider.check("1234567");
  check("unparseable body maps to CHECK_FAILED", result.status, "CHECK_FAILED");
  handle.server.close();

  // no API key -> CHECK_FAILED, and isConfigured() is false
  delete process.env.COMPANIES_HOUSE_API_KEY;
  check("isConfigured false without a key", provider.isConfigured(), false);
  result = await provider.check("1234567");
  check("missing key maps to CHECK_FAILED", result.status, "CHECK_FAILED");
}

httpTests().then(() => {
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
});
