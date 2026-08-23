/** @type {import('next').NextConfig} */

import { readFileSync } from "node:fs";

/**
 * The one version number, taken from package.json at build time so the footer
 * and the manifest can never disagree about which build a reader is on.
 */
const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

/**
 * The four headers a public site is expected to send. None of them changes
 * what the app does; they close the default-open behaviours a browser has to
 * assume when a server says nothing.
 */
const SECURITY = [
  // Serve files as the type declared, never as the type sniffed.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Full URL to ourselves, origin only to anyone else.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No one frames this site but this site.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Nothing here needs a camera, a mic, or a location.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

export default {
  agentRules: false,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY }];
  },
};
