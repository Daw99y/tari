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

/**
 * Art caching. Next serves everything in public/ with `max-age=0,
 * must-revalidate`, so a returning visitor pays a round trip per file for a
 * 304 on art that has not changed since 2004 — and a dressed character is a
 * couple of dozen files.
 *
 * A day of hard freshness, then a month of stale-while-revalidate: inside a
 * day nothing is requested at all, and after it the cached copy is served
 * instantly while the browser refreshes it behind the paint. A rebuild
 * reaches a returning visitor on their second load rather than their first,
 * which is the right trade for files whose names never move.
 */
const ART = "public, max-age=86400, stale-while-revalidate=2592000";

/** Every public/ subtree that is art and nothing else. */
const ART_PATHS = ["/lab/:path*", "/journey/:path*", "/Maps/:path*", "/brand/:path*", "/pane/:path*"];

export default {
  agentRules: false,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY },
      ...ART_PATHS.map((source) => ({ source, headers: [{ key: "Cache-Control", value: ART }] })),
    ];
  },
};
