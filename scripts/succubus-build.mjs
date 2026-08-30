/* The succubus who holds the curtain, lifted out of the 1.12 client.
 *
 * The landing page's rogue is 29 files and a composed skin before she can
 * draw a frame. The succubus is four files and no compositing, which is why
 * she is the one who stands in front while the rogue loads: she can be
 * preloaded from the document head with no waterfall, because everything she
 * needs is known at build time rather than discovered from a manifest.
 *
 * She carries 23 sequences and this draws two — Stand (0) and SuccubusEntice
 * (194), the animation the client itself plays when a warlock's pet charms
 * something. The other 21 are three quarters of the file, so she goes through
 * the same strip the bodies do:
 *
 *   node scripts/succubus-build.mjs
 *   node scripts/succubus-build.mjs --variants   also the other three skins,
 *                                                for the picker at /lab/succubus
 *
 * Output lands in public/lab/succubus/. The unstripped .m2 stays beside it as
 * the source of truth and as the verifier's reference, the way the bodies
 * keep theirs under public/lab/doll/m2.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { ARCHIVES, convertBlps, extract } from "./client.mjs";

const OUT = "public/lab/succubus";
const M2_DIR = path.join(OUT, "m2");
const RAW = ".succubus-raw";

/** Stand, and the entice. Nothing else is ever asked for. */
const KEEP = "0,194";

/* Her three runtime texture slots, taken from CreatureDisplayInfo rather than
 * guessed. Row 159 — the lowest row on model 37, and the lavender pet every
 * warlock recognises:
 *
 *   TextureVariation  0 SuccubusNewSkinMagenta
 *                     1 SuccubusSkinWingMagenta
 *                     2 SuccubusHairMagenta
 *
 * Three things in that are worth not re-learning. The order is skin, wing,
 * hair — putting hair second hangs her wing leather on her head. The `New`
 * prefix is the patch art, and `SuccubusSkin*` beside it in the archives is
 * the release atlas on a different UV layout entirely, so the two families
 * are not interchangeable. And `Magenta` is the lavender one: the unsuffixed
 * `SuccubusNewSkin` is a pale salmon that reads as a sunburn.
 *
 * The eye glow names itself inside the model, so it is written under the
 * flattened name `texKey` in m2-gl will look for. */
const SKINS = [
  ["SuccubusNewSkinMagenta", "skin"],
  ["SuccubusSkinWingMagenta", "wing"],
  ["SuccubusHairMagenta", "hair"],
  ["SuccubusEyeGlowBlueGreen", "creature_succubus_succubuseyeglowbluegreen"],
];

/** Every family model 37 ships, as `[file suffix, folder name]`. */
const FAMILIES = [
  ["", "plain"],
  ["Magenta", "magenta"],
  ["Red", "red"],
  ["Blue", "blue"],
];

/* ---------------------------------------------------------------- */

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(M2_DIR, { recursive: true });

console.log("Lifting Creature\\Succubus\\* out of the archives...");
extract(["Creature\\Succubus\\*"], RAW, ARCHIVES);

const src = path.join(RAW, "Creature", "Succubus");
if (!fs.existsSync(path.join(src, "Succubus.m2"))) {
  throw new Error(`Succubus.m2 did not come out of any archive. Is the client still at the path in client.mjs?`);
}

fs.copyFileSync(path.join(src, "Succubus.m2"), path.join(M2_DIR, "Succubus.m2"));

console.log("\nStripping to sequences", KEEP);
const strip = (script) =>
  execFileSync("node", [script, "--src", M2_DIR, "--out", OUT, "--keep", KEEP], { stdio: "inherit" });
strip("scripts/doll-strip.mjs");

console.log("Converting textures...");
const jobs = SKINS.map(([file, name]) => [path.join(src, `${file}.blp`), path.join(OUT, `${name}.webp`)]);

/* The other three families, for the picker at /lab/succubus. Which one a
 * warlock's own pet wears is not a thing the client tables answer — the same
 * model is a dozen NPCs — and the flat atlases do not answer it either, since
 * the panel a UV lands on is a small part of the sheet. So they get rendered
 * and looked at. Off by default; the landing page never fetches these. */
if (process.argv.includes("--variants")) {
  const dir = path.join(OUT, "variants");
  fs.mkdirSync(dir, { recursive: true });
  for (const [suffix, family] of FAMILIES)
    jobs.push(
      [path.join(src, `SuccubusNewSkin${suffix}.blp`), path.join(dir, `${family}-skin.webp`)],
      [path.join(src, `SuccubusSkinWing${suffix}.blp`), path.join(dir, `${family}-wing.webp`)],
      [path.join(src, `SuccubusHair${suffix}.blp`), path.join(dir, `${family}-hair.webp`)],
    );
}

const failed = await convertBlps(jobs);
for (const [file, why] of failed) console.error(`  ! ${file}: ${why}`);

console.log("\nProving the strip draws what the original drew...");
strip("scripts/doll-strip-check.mjs");

fs.rmSync(RAW, { recursive: true, force: true });

const wire = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith(".tbody") || f.endsWith(".webp"))
  .map((f) => [f, fs.statSync(path.join(OUT, f)).size]);
console.log(`\n${OUT}/`);
for (const [f, n] of wire) console.log(`  ${String(Math.round(n / 1024)).padStart(4)} KB  ${f}`);
console.log(`  ${String(Math.round(wire.reduce((a, [, n]) => a + n, 0) / 1024)).padStart(4)} KB  in ${wire.length} files`);
