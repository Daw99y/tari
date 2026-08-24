/* Talking to a 1.12 client: where it lives, how to lift files out of it, and
 * how to turn its BLPs into something a browser will draw.
 *
 * Two build scripts need all of this — `doll-build.mjs` for the bodies and
 * `doll-items.mjs` for the gear — and an archive scan is the slowest thing
 * either of them does, so the grouping rules live here rather than being
 * written twice and drifting apart.
 */

import { execFileSync, spawn } from "node:child_process";
import { cpus } from "node:os";
import { join } from "node:path";

export const CLIENT = "/Users/daw99y/Downloads/WoW Classic";
export const DATA = join(CLIENT, "app/Data");
export const EXTRACTOR = join(CLIENT, "MPQExtractor/build/bin/MPQExtractor");
export const DBC = "/Users/daw99y/Documents/FLYFE/CPLUS/data/raw/dbc-all";

/* Patches override the base archives, so they are searched first. */
export const ARCHIVES = ["patch-2.MPQ", "patch.MPQ", "model.MPQ", "texture.MPQ", "interface.MPQ"];

/** The last segment of a game path. These use backslashes, which node's
 *  `basename` does not split on, so it cannot do this job. */
export function leaf(p) {
  return p.slice(p.lastIndexOf("\\") + 1);
}

/** The segment above the file. Two files can share a name across folders —
 *  `Plate_RaidWarrior_C_01_Pant_LU_U.blp` is in both LegUpperTexture and
 *  LegLowerTexture — so an output name that keeps only the file name would
 *  quietly drop one of them. */
export function parentOf(p) {
  const parts = p.split("\\");
  return parts.length > 1 ? parts[parts.length - 2] : "";
}

/** The name a converted file takes on disk: the last two path segments,
 *  lowercased and squashed. Unique across everything either script pulls. */
export function outName(gamePath, ext) {
  return (
    `${parentOf(gamePath)}_${leaf(gamePath)}`
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "_") + ext
  );
}

/** Pull every pattern out of the archives into `dir`, keeping the archive's
 *  own hierarchy. Extraction runs in reverse priority so a patch's copy of a
 *  file is the one left standing.
 *
 *  `-f` is not optional: every race ships a `Character\<Race>\Hair00_00.blp`,
 *  and flattening turns eight different haircuts into one file. */
export function extract(patterns, dir, archives = ARCHIVES) {
  for (const archive of [...archives].reverse())
    for (const pattern of patterns) {
      try {
        execFileSync(EXTRACTOR, ["-e", pattern, "-f", "-o", dir, join(DATA, archive)], { stdio: "ignore" });
      } catch {
        /* A pattern missing from an archive is normal. */
      }
    }
}

/** Convert `[src, dst]` BLP jobs to webp, spread across every core.
 *
 *  scripts/blp.py, not Pillow directly: Pillow drops the alpha plane on
 *  palettised BLPs, which is every item overlay in the client. Returns the
 *  `[src, reason]` pairs that failed. */
export async function convertBlps(jobs) {
  if (!jobs.length) return [];
  const workers = Math.max(1, Math.min(cpus().length, 8));
  const size = Math.ceil(jobs.length / workers);
  const chunks = [];
  for (let i = 0; i < jobs.length; i += size) chunks.push(jobs.slice(i, i + size));

  const runs = chunks.map(
    (chunk) =>
      new Promise((resolve, reject) => {
        const child = spawn("python3", ["scripts/blp.py"], { stdio: ["pipe", "pipe", "inherit"] });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`blp.py exit ${code}`))));
        child.stdin.end(JSON.stringify(chunk));
      }),
  );
  return (await Promise.all(runs)).flat();
}
