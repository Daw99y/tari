/* Rail thumbnails.
 *
 * The rail draws all 75 rooms at once, and the shipped journey files are
 * full-bleed masters — 15 MB together. A 236px-wide strip does not need
 * 2560px of picture, so this writes a small copy of each next to it.
 *
 * Derived files, like the journey folder itself: re-runnable, and the
 * masters stay the source of truth.
 *
 *   node scripts/rail-thumbs.mjs
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const FROM = "public/journey";
const TO = "public/journey/rail";
/* Twice the widest the rail ever draws a row (15.5rem), so it stays sharp on
   a 2x display and nowhere near sharp enough to be a substitute for the art. */
const WIDTH = 500;

await mkdir(TO, { recursive: true });

const files = (await readdir(FROM)).filter((f) => f.endsWith(".webp"));
let bytes = 0;

for (const file of files) {
  const out = join(TO, file);
  const buf = await sharp(join(FROM, file))
    .resize({ width: WIDTH })
    .webp({ quality: 66 })
    .toBuffer();
  await writeFile(out, buf);
  bytes += buf.length;
}

const before = (
  await Promise.all(files.map((f) => stat(join(FROM, f)).then((s) => s.size)))
).reduce((a, b) => a + b, 0);

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`${files.length} thumbnails: ${mb(before)} → ${mb(bytes)}`);
