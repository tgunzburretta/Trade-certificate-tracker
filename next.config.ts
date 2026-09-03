import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB body limit, well under the 8MB
      // document cap enforced in src/lib/storage.ts — without this, every
      // certificate photo over ~1MB (i.e. most phone camera photos) fails
      // with an unhandled 500 instead of the app's own error banner.
      bodySizeLimit: "9mb",
    },
  },
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    // Only sent when actually deployed over HTTPS (same signal used for the
    // session cookie's Secure flag) — HSTS is sticky in the browser, so
    // sending it on a plain-HTTP self-hosted deployment (see README) would
    // lock that domain out of ever falling back to HTTP.
    if ((process.env.APP_URL || "").startsWith("https://")) {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers: baseHeaders }];
  },
};

export default nextConfig;
