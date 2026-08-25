/* Put the wardrobe on GitHub Pages, so a deployed page has art to draw.
 *
 *   node scripts/doll-publish.mjs            push what changed
 *   node scripts/doll-publish.mjs --dry-run  say what it would do
 *   node scripts/doll-publish.mjs --prune    also drop files the build no longer makes
 *   node scripts/doll-publish.mjs --repo ../somewhere-else
 *
 * The art cannot ship in this repo. Vercel fails a build above 15,000 source
 * files and the repo plus 12,460 pieces of item art comes to 16,712, so a
 * committed wardrobe does not deploy at all. It can ship in a *second* repo,
 * though, because Vercel never builds that one — and GitHub will serve a repo
 * as static files for nothing, over a CDN, with `access-control-allow-origin:
 * *` already set. That header is not a nicety here: every overlay the page
 * fetches is drawn into the canvas that becomes the body texture, and a
 * cross-origin draw without it taints the canvas and `toDataURL` throws.
 *
 * This is the free alternative to `doll-upload.mjs`, which does the same job
 * against a Vercel Blob store and wants a paid plan to be worth running. Both
 * still work. `NEXT_PUBLIC_WARDROBE_URL` is the only switch either one touches,
 * so moving between them is one environment variable and a redeploy.
 *
 * What Pages costs that the Blob store did not: it sends `max-age=600` on
 * everything and will not be talked out of it. A repeat visit inside ten
 * minutes is free either way; after that the browser revalidates and gets a
 * 304 on art that has not changed, so it pays a round trip per file rather
 * than a download. Fine for 12,460 small files on a warm CDN. Not fine if the
 * wardrobe ever grows to something that has to arrive in one paint.
 *
 * `catalogue.json` is deliberately not published. It stays in git next door,
 * the CDN compresses it from 1.2 MB to about 200 KB for nothing, and keeping
 * it beside the code that reads it means a rebuilt catalogue and a stale page
 * cannot drift apart.
 *
 * Re-running is cheap. Files are compared by size before they are copied and
 * git sends only what changed, so a rebuild that touches forty files pushes
 * forty files.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const OUT = "public/lab/doll/items";
const SUBS = ["m2", "tex", "icons"];

/* Where the second repo lives. A sibling of this one by default, because the
 * two are checked out together and nobody wants to remember a path. */
const DEFAULT_REPO = "../tari-wardrobe";

/* GitHub refuses a push containing a file this big and warns well before it.
 * Nothing in a 2004 client comes close, so tripping this means the build wrote
 * something it should not have. */
const MAX_FILE = 100 * 1024 * 1024;

const dryRun = process.argv.includes("--dry-run");
const prune = process.argv.includes("--prune");

const repoFlag = process.argv.indexOf("--repo");
const REPO = resolve(repoFlag > -1 ? process.argv[repoFlag + 1] : process.env.WARDROBE_REPO || DEFAULT_REPO);

/** Run a git command in the wardrobe repo and hand back its output. Errors are
 *  raised rather than printed: the two callers that expect a command to fail —
 *  both asking after a remote that may not exist yet — say so themselves, and
 *  git's own wording on the way past helps nobody. */
function git(...args) {
  return execFileSync("git", ["-C", REPO, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/** Every file the build wrote, as `{ rel, local, size }`. */
function localFiles() {
  const files = [];
  for (const sub of SUBS) {
    const dir = join(OUT, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const local = join(dir, name);
      files.push({ rel: `${sub}/${name}`, local, size: statSync(local).size });
    }
  }
  return files;
}

/** What the wardrobe repo already holds, keyed the same way, so the two lists
 *  can be compared without reading a byte of either. */
function publishedFiles() {
  const have = new Map();
  for (const sub of SUBS) {
    const dir = join(REPO, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      have.set(`${sub}/${name}`, statSync(join(dir, name)).size);
    }
  }
  return have;
}

/** The Pages URL a repo will be served at, worked back from its origin.
 *  GitHub lowercases the owner in the host but leaves the repo name alone. */
function pagesUrl() {
  let origin;
  try {
    origin = git("remote", "get-url", "origin");
  } catch {
    return null;
  }
  const m = origin.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) return null;
  const [, owner, repo] = m;
  return `https://${owner.toLowerCase()}.github.io/${repo}`;
}

/** Set the wardrobe repo up far enough to receive files. Creating it on GitHub
 *  and turning Pages on stays a human job: both need an authenticated account
 *  and neither is something a build script should do behind your back. */
function ensureRepo() {
  if (existsSync(join(REPO, ".git"))) return;

  if (existsSync(REPO) && readdirSync(REPO).length) {
    console.error(`${REPO} exists and is not a git repo. Move it or pass --repo.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`would create   ${REPO} and run git init`);
    return;
  }

  mkdirSync(REPO, { recursive: true });
  execFileSync("git", ["-C", REPO, "init", "-b", "main"], { stdio: "ignore" });
  console.log(`created   ${REPO}`);
}

/** The two files the repo needs that the build does not write.
 *
 *  `.nojekyll` is the load-bearing one. Without it Pages runs the tree through
 *  Jekyll, which drops anything starting with an underscore and takes minutes
 *  deciding to do so. Half the item art is named `_M`, `_F` or `_U`. */
function writeRepoFiles() {
  if (dryRun) return;
  writeFileSync(join(REPO, ".nojekyll"), "");
  writeFileSync(
    join(REPO, "README.md"),
    `# tari-wardrobe

Item art for [tari](https://github.com/Daw99y/tari), served over GitHub Pages.

Nothing here is written by hand. \`node scripts/doll-items.mjs\` in the tari
repo converts it out of a local 1.12 client, and \`node scripts/doll-publish.mjs\`
pushes it here. Edit either of those, not this.

The art lives in a repo of its own because tari deploys on Vercel, and Vercel
fails a build above 15,000 source files. Together the two are 16,712.
`,
  );
}

function main() {
  const files = localFiles();
  if (!files.length) {
    console.error(`Nothing under ${OUT}. Run \`node scripts/doll-items.mjs\` first.`);
    process.exit(1);
  }

  const tooBig = files.filter((f) => f.size > MAX_FILE);
  if (tooBig.length) {
    console.error(`GitHub will not take these:\n${tooBig.map((f) => `  ${f.rel} (${(f.size / 1e6).toFixed(0)} MB)`).join("\n")}`);
    process.exit(1);
  }

  const bytes = files.reduce((n, f) => n + f.size, 0);
  console.log(`local     ${files.length} files, ${(bytes / 1e6).toFixed(0)} MB`);

  ensureRepo();

  const have = publishedFiles();
  console.log(`published ${have.size} already there`);

  const todo = files.filter((f) => have.get(f.rel) !== f.size);
  const stale = [...have.keys()].filter((rel) => !files.some((f) => f.rel === rel));
  const todoBytes = todo.reduce((n, f) => n + f.size, 0);
  console.log(`copy      ${todo.length} files, ${(todoBytes / 1e6).toFixed(0)} MB`);
  if (stale.length) {
    console.log(`stale     ${stale.length} the build no longer makes${prune ? ", deleting" : " (--prune to remove)"}`);
  }

  if (dryRun) {
    console.log("\n--dry-run, nothing copied or pushed.");
    return;
  }

  for (const sub of SUBS) mkdirSync(join(REPO, sub), { recursive: true });
  let done = 0;
  for (const f of todo) {
    copyFileSync(f.local, join(REPO, f.rel));
    if (++done % 500 === 0 || done === todo.length) {
      process.stdout.write(`\r  ${done}/${todo.length} copied   `);
    }
  }
  if (todo.length) process.stdout.write("\n");

  if (prune) for (const rel of stale) rmSync(join(REPO, rel), { force: true });

  writeRepoFiles();

  git("add", "-A");
  const staged = git("status", "--porcelain");
  if (!staged) {
    console.log("\nNothing changed; Pages already matches the build.");
  } else {
    git("commit", "-m", `wardrobe: ${todo.length} changed, ${stale.length && prune ? `${stale.length} dropped, ` : ""}${files.length} total`);
    console.log(`\ncommitted ${basename(REPO)}`);
  }

  let origin;
  try {
    origin = git("remote", "get-url", "origin");
  } catch {
    console.log("\nNo remote yet. Create the repo and turn Pages on:");
    console.log(`  gh repo create tari-wardrobe --public --source ${REPO} --remote origin --push`);
    console.log("  gh api -X POST repos/:owner/tari-wardrobe/pages -f source[branch]=main -f source[path]=/");
    console.log("\nThen run this script again for the URL.");
    return;
  }

  if (staged) {
    console.log(`pushing   ${origin}`);
    execFileSync("git", ["-C", REPO, "push", "-u", "origin", "HEAD"], { stdio: "inherit" });
  }

  const base = pagesUrl();
  if (base) {
    console.log("\nSet this on the Vercel project, then redeploy:");
    console.log(`  NEXT_PUBLIC_WARDROBE_URL=${base}`);
    console.log("\nPages takes a minute or two to serve a fresh push.");
  }
}

try {
  main();
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
