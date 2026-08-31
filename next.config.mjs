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

/**
 * The wardrobe catalogue is the one file under /lab whose name stays put while
 * its contents change: every `node scripts/doll-items.mjs` rewrites it in
 * place. A day of hard freshness is the right trade for art, whose file names
 * move when the bytes do — it is the wrong one here, because it leaves a
 * reader holding yesterday's item list with no way to ask for this one short
 * of a hard refresh, and a rebuild that adds items looks like a rebuild that
 * did nothing.
 *
 * `no-cache` is not `no-store`: the browser keeps the copy and asks whether it
 * is still good. Unchanged, that is a 304 and about two hundred bytes.
 */
const CATALOGUE_PATH = "/lab/doll/items/catalogue.json";

/** The hero figure's baked shopping list (scripts/hero-bake.mjs). Same deal
 *  as the catalogue: the name stays put while the contents change, so it
 *  revalidates instead of going stale for a day. */
const HERO_PATH = "/lab/doll/hero.json";

/**
 * The curtain's succubus, for the same reason again. Her five files are
 * rewritten in place every time `scripts/succubus-build.mjs` runs, and their
 * names never move — so a day of hard freshness means a change of skin does
 * not reach a returning reader at all, and the last one did not: the landing
 * page went on drawing yesterday's texture while the picker at /lab/succubus
 * drew today's, which reads as a rendering bug and is not one.
 *
 * The trade is five revalidations on a repeat visit, about two hundred bytes
 * each and no re-download. A first visit — the one the curtain exists for —
 * pays nothing, because there is nothing cached to ask about.
 */
const SUCCUBUS_PATH = "/lab/succubus/:path*";

export default {
  agentRules: false,
  // The item dictionary is read from disk at runtime; trace it into the route.
  outputFileTracingIncludes: { "/api/items": ["./reference/items.json"] },
  env: { NEXT_PUBLIC_APP_VERSION: version },
  /* /path was the campfire's address until 2026-08-31 (docs/TARI.md §5). A
   * bookmark is a promise, so the old name keeps working — permanently,
   * because the page is not coming back to it. */
  async redirects() {
    return [{ source: "/path", destination: "/campfire", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY },
      ...ART_PATHS.map((source) => ({ source, headers: [{ key: "Cache-Control", value: ART }] })),
      // After the art rule, so it wins the /lab/:path* match above.
      { source: CATALOGUE_PATH, headers: [{ key: "Cache-Control", value: "public, no-cache" }] },
      { source: HERO_PATH, headers: [{ key: "Cache-Control", value: "public, no-cache" }] },
      { source: SUCCUBUS_PATH, headers: [{ key: "Cache-Control", value: "public, no-cache" }] },
    ];
  },
};
