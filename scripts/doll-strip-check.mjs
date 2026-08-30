/* Proves a stripped body draws what the original drew.
 *
 * Not a spot check: it poses every bone of all sixteen bodies with the
 * project's own `poseBones` and `skin`, at 61 frames across each kept
 * sequence, and compares every skinned vertex against the same pose taken
 * from the unstripped `.m2`. The static fields — geometry, batches,
 * textures, attachments, sequence windows — are compared outright.
 *
 * Run it after `doll-strip.mjs`, or after any change to the format:
 *
 *   node scripts/doll-strip-check.mjs
 *
 * A non-zero difference means the strip dropped a key the renderer samples.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};

/* Same `--src`/`--out` pair doll-strip.mjs takes, so whatever was stripped
 * can be proven by pointing this at the same two folders. */
const SRC = flag("--src", "public/lab/doll/m2");
const OUT = flag("--out", "public/lab/doll/body");
const FRAMES = 60;

/* m2-render imports through the `@/` alias, which plain node does not
 * resolve. Copy it and its one import next to each other in a temp folder. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tari-strip-"));
fs.copyFileSync("lib/m2.ts", path.join(tmp, "m2.ts"));
fs.writeFileSync(
  path.join(tmp, "m2-render.ts"),
  fs.readFileSync("lib/m2-render.ts", "utf8").replace(/"@\/lib\/m2"/g, '"./m2.ts"'),
);

const here = "file://" + process.cwd();
const { parseM2 } = await import(`${here}/lib/m2.ts`);
const { parseTbody } = await import(`${here}/lib/tbody.ts`);
const { poseBones, skin } = await import(`file://${tmp}/m2-render.ts`);

/** What `m2-gl.ts` passes: no character bone is a billboard. */
const NO_CAMERA = { yaw: 0, pitch: 0 };

const ab = (f) => {
  const b = fs.readFileSync(f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

let worst = 0;
let failures = 0;

for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith(".m2")).sort()) {
  const name = f.replace(/\.m2$/, "");
  const a = parseM2(ab(path.join(SRC, f)));
  const b = parseTbody(ab(path.join(OUT, `${name}.tbody`)));
  const bad = [];
  const same = (label, x, y) => { if (x !== y) bad.push(`${label} ${x} != ${y}`); };

  same("name", a.name, b.name);
  same("version", a.version, b.version);
  same("vertexCount", a.vertexCount, b.vertexCount);
  same("triangleCount", a.triangleCount, b.triangleCount);
  same("bones", a.bones.length, b.bones.length);
  same("batches", a.batches.length, b.batches.length);
  same("attachments", a.attachments.length, b.attachments.length);
  same("textures", a.textures.length, b.textures.length);
  same("globalSequences", a.globalSequences.length, b.globalSequences.length);
  for (const k of ["positions", "uvs", "normals", "boneIndices", "boneWeights", "indices"])
    for (let i = 0; i < a[k].length; i++)
      if (a[k][i] !== b[k][i]) { bad.push(`${k}[${i}]`); break; }
  for (let i = 0; i < a.batches.length; i++)
    for (const k of ["start", "count", "colorIndex", "transparencyIndex", "flags", "blend", "texture", "textureType", "geoset"])
      if (a.batches[i][k] !== b.batches[i]?.[k]) { bad.push(`batch ${i} ${k}`); break; }
  for (let i = 0; i < a.attachments.length; i++) {
    const x = a.attachments[i], y = b.attachments[i];
    if (!y || x.id !== y.id || x.bone !== y.bone || x.position.some((v, k) => v !== y.position[k])) { bad.push(`attachment ${i}`); break; }
  }

  const oa = new Float32Array(a.vertexCount * 3);
  const ob = new Float32Array(b.vertexCount * 3);
  let d = 0;
  for (const seq of b.sequences) {
    const sa = a.sequences.find((s) => s.id === seq.id);
    if (!sa) { bad.push(`sequence ${seq.id} missing from the source`); continue; }
    if (sa.start !== seq.start || sa.end !== seq.end || sa.flags !== seq.flags) bad.push(`sequence ${seq.id} window`);
    for (let i = 0; i <= FRAMES; i++) {
      const t = sa.start + ((sa.end - sa.start) * i) / FRAMES;
      skin(a, poseBones(a, t, sa, NO_CAMERA, true), oa);
      skin(b, poseBones(b, t, seq, NO_CAMERA, true), ob);
      for (let k = 0; k < oa.length; k++) d = Math.max(d, Math.abs(oa[k] - ob[k]));
    }
  }
  worst = Math.max(worst, d);
  if (bad.length) failures++;
  const kept = b.sequences.map((s) => s.id).join(",");
  console.log(
    `${name.padEnd(18)} ${bad.length ? "FAIL " + bad.slice(0, 3).join(" | ") : "ok"}` +
    `   seq ${kept}, ${a.vertexCount} verts x ${(FRAMES + 1) * b.sequences.length} frames, maxdiff ${d.toExponential(2)}`,
  );
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nWorst difference in any drawn vertex, any frame, any body: ${worst.toExponential(3)}`);
if (failures || worst !== 0) { console.error("STRIP CHECK FAILED"); process.exit(1); }
console.log("Every stripped body draws exactly what the original drew.");
