/* Put the wardrobe in a Vercel Blob store, so a deployed page has art to draw.
 *
 *   node scripts/doll-upload.mjs            upload what is missing
 *   node scripts/doll-upload.mjs --dry-run  say what it would do
 *   node scripts/doll-upload.mjs --prune    also delete blobs the build dropped
 *
 * The art cannot ship in the repo. Vercel fails a build above 15,000 source
 * files and the repo plus 12,460 pieces of item art comes to 16,712, so this
 * is not a preference about repo weight — a committed wardrobe does not
 * deploy at all.
 *
 * `catalogue.json` is deliberately not uploaded. It stays in git, the CDN
 * compresses it from 1.2 MB to about 200 KB for nothing, and keeping it beside
 * the code that reads it means a rebuilt catalogue and a stale page cannot
 * drift apart.
 *
 * Re-running is cheap. The store is listed first and anything already there at
 * the same size is skipped, so a rebuild that changes forty files uploads
 * forty files.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { del, list, put } from "@vercel/blob";

const OUT = "public/lab/doll/items";
const SUBS = ["m2", "tex", "icons"];

/* Everything lands under one prefix so the store can hold other things later
 * and `--prune` still knows what it owns. */
const PREFIX = "wardrobe";

/* Art out of a 2004 client does not change. A year is the longest max-age
 * browsers and the CDN will honour, and it is the difference between a repeat
 * visit costing a request and costing nothing. */
const CACHE_SECONDS = 365 * 24 * 60 * 60;

const TYPES = { ".webp": "image/webp", ".m2": "application/octet-stream" };

/* Vercel's advanced-operation ceiling is 900/min on Hobby and 4,500/min on
 * Pro. Eight at a time sits under the lower one with room to spare, which
 * matters because a 429 halfway through 12,460 uploads is a bad way to find
 * out which plan the project is on. Raise it with UPLOAD_CONCURRENCY. */
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY) || 8;

const dryRun = process.argv.includes("--dry-run");
const prune = process.argv.includes("--prune");

/** Load .env.local the way `next dev` would. A plain node script gets none of
 *  Next's env handling, so the token has to be read here. */
function loadEnv() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch {
      /* Older node, or a malformed file. The check below reports it. */
    }
    if (process.env.BLOB_READ_WRITE_TOKEN) return;
  }
}

/** Every file the build wrote, as `{ pathname, local, size }`. */
function localFiles() {
  const files = [];
  for (const sub of SUBS) {
    const dir = join(OUT, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const local = join(dir, name);
      files.push({ pathname: `${PREFIX}/${sub}/${name}`, local, size: statSync(local).size });
    }
  }
  return files;
}

/** What the store already holds, keyed by pathname. Listing costs one advanced
 *  operation per thousand blobs — thirteen for the whole wardrobe — and saves
 *  twelve thousand pointless uploads. The URL is kept as well as the size: it
 *  is what `del` wants, and one of them gives the store's public base without
 *  having to upload anything to learn it. */
async function remoteFiles() {
  const have = new Map();
  let cursor;
  do {
    const page = await list({ prefix: `${PREFIX}/`, limit: 1000, cursor });
    for (const b of page.blobs) have.set(b.pathname, { size: b.size, url: b.url });
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return have;
}

/** The store's public base, worked back from any one blob's URL. */
function baseOf(url) {
  return url?.replace(new RegExp(`/${PREFIX}/.*$`), `/${PREFIX}`) ?? null;
}

/** Upload one file, backing off when the store says slow down. */
async function upload(file, attempt = 1) {
  try {
    return await put(file.pathname, readFileSync(file.local), {
      access: "public",
      // Without this the store appends a random suffix and the page cannot
      // build a URL from a file name.
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: TYPES[file.pathname.slice(file.pathname.lastIndexOf("."))] ?? "application/octet-stream",
      cacheControlMaxAge: CACHE_SECONDS,
    });
  } catch (e) {
    const rateLimited = /429|rate.?limit|too many/i.test(String(e));
    if (attempt > 5 || !rateLimited) throw e;
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    return upload(file, attempt + 1);
  }
}

/** Run `jobs` with at most `CONCURRENCY` in flight. */
async function pool(jobs, onDone) {
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await job();
      onDone();
    }
  });
  await Promise.all(workers);
}

async function main() {
  loadEnv();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("No BLOB_READ_WRITE_TOKEN.\n");
    console.error("Create a Blob store in the Vercel dashboard, then either");
    console.error("`vercel env pull .env.local` or paste the token into .env.local as");
    console.error("  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…");
    process.exit(1);
  }

  const files = localFiles();
  if (!files.length) {
    console.error(`Nothing under ${OUT}. Run \`node scripts/doll-items.mjs\` first.`);
    process.exit(1);
  }
  const bytes = files.reduce((n, f) => n + f.size, 0);
  console.log(`local     ${files.length} files, ${(bytes / 1e6).toFixed(0)} MB`);

  const have = await remoteFiles();
  console.log(`store     ${have.size} already there`);

  const todo = files.filter((f) => have.get(f.pathname)?.size !== f.size);
  const stale = [...have.keys()].filter((p) => !files.some((f) => f.pathname === p));
  const todoBytes = todo.reduce((n, f) => n + f.size, 0);
  console.log(`upload    ${todo.length} files, ${(todoBytes / 1e6).toFixed(0)} MB`);
  if (stale.length) console.log(`stale     ${stale.length} in the store the build no longer makes${prune ? ", deleting" : " (--prune to remove)"}`);

  if (dryRun) {
    console.log("\n--dry-run, nothing sent.");
    return;
  }

  let done = 0;
  let sample = null;
  const started = Date.now();
  await pool(
    todo.map((f) => async () => {
      const r = await upload(f);
      sample ??= r.url;
    }),
    () => {
      done++;
      if (done % 250 === 0 || done === todo.length) {
        const rate = done / ((Date.now() - started) / 1000);
        const left = Math.round((todo.length - done) / (rate || 1));
        process.stdout.write(`\r  ${done}/${todo.length} at ${rate.toFixed(0)}/s, ~${left}s left   `);
      }
    },
  );
  if (todo.length) process.stdout.write("\n");

  if (prune && stale.length) {
    await pool(
      stale.map((p) => () => del(have.get(p).url)),
      () => {},
    );
    console.log(`pruned    ${stale.length}`);
  }

  /* The page wants the store's public base, not one blob's URL. Either a file
   * just uploaded or one already listed will give it. */
  const base = baseOf(sample) ?? baseOf([...have.values()][0]?.url);
  console.log(todo.length ? "\nDone." : "\nNothing to upload; the store already matches the build.");
  if (base) {
    console.log("\nSet this on the Vercel project, then redeploy:");
    console.log(`  NEXT_PUBLIC_WARDROBE_URL=${base}`);
  }
}

main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
