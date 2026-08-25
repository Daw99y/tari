/* Bodies, minus the animations nothing plays.
 *
 * A vanilla character .m2 carries 126 to 143 sequences and Tari draws two:
 * Stand (id 0) and Stun (id 14). On a night elf female the other 140 are
 * 94% of the file — 5.24 MB of keyframes fetched, parsed and discarded on
 * every visit. Float keys barely gzip, so it is wire time, not repo weight.
 *
 * Rewriting an .m2 in place means fixing every absolute offset in its
 * header, which is why docs/DOLL.md left this undone. This writes a
 * different file instead: a flat, sequential binary carrying exactly the
 * fields `M2Mesh` has and nothing else — no views 1 to 3, no bounding
 * volume, no lookup tables already resolved at build time. `lib/tbody.ts`
 * reads it back into the same shape `parseM2` returns, so nothing
 * downstream changes.
 *
 *   node scripts/doll-strip.mjs            all sixteen bodies
 *   node scripts/doll-strip.mjs --keep 0,14,1,6
 *   node scripts/doll-strip.mjs --variants     keep every take of a kept id
 *
 * The .m2 files stay on disk as the source of truth. Re-run after
 * doll-build.mjs.
 */

import fs from "node:fs";
import path from "node:path";

const SRC = "public/lab/doll/m2";
const OUT = "public/lab/doll/body";

const argKeep = process.argv.indexOf("--keep");
const KEEP = new Set(
  (argKeep > 0 ? process.argv[argKeep + 1] : "0,14").split(",").map((s) => Number(s.trim())),
);
const VARIANTS = process.argv.includes("--variants");

/* ---------------------------------------------------------------- */
/* Reading the .m2. Offsets match lib/m2.ts; see the layout note there. */

const VERTEX_SIZE = 48, SUBMESH_SIZE = 32, TEXUNIT_SIZE = 24;
const TEXTURE_SIZE = 16, TRACK_SIZE = 28, BONE_SIZE = 108;
const SEQUENCE_SIZE = 68, ATTACHMENT_SIZE = 48;

function readM2(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const u32 = (o) => dv.getUint32(o, true);
  const u16 = (o) => dv.getUint16(o, true);
  const i16 = (o) => dv.getInt16(o, true);
  const f32 = (o) => dv.getFloat32(o, true);
  const ascii = (o, len) => {
    let s = "";
    for (let i = 0; i < len; i++) {
      const c = dv.getUint8(o + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  if (ascii(0, 4) !== "MD20") throw new Error("not an M2");
  const version = u32(4);
  const name = ascii(u32(12), u32(8));

  // A track's times and keys are one flat run across every sequence; the
  // sequence windows carve it up. Keep the pairs whose timestamp lands in a
  // window we are keeping. A track on a global sequence ignores windows
  // entirely and loops on its own clock, so it is kept whole.
  const track = (o, kind, windows) => {
    const interp = u16(o), globalSeq = i16(o + 2);
    const nT = u32(o + 12), oT = u32(o + 16);
    const nK = u32(o + 20), oK = u32(o + 24);
    const stride = kind === "vec3" ? 3 : kind === "quat" ? 4 : 1;
    const n = Math.min(nT, nK);
    const times = [], values = [];
    for (let i = 0; i < n; i++) {
      const t = u32(oT + i * 4);
      if (globalSeq < 0 && !windows.some((w) => t >= w.start && t <= w.end)) continue;
      times.push(t);
      if (kind === "vec3") for (let k = 0; k < 3; k++) values.push(f32(oK + (i * 3 + k) * 4));
      else if (kind === "quat") for (let k = 0; k < 4; k++) values.push(f32(oK + (i * 4 + k) * 4));
      else values.push(i16(oK + i * 2) / 0x7fff);
    }
    return { interp, globalSeq, stride, times, values };
  };

  const nGS = u32(0x14), oGS = u32(0x18);
  const globalSequences = [];
  for (let i = 0; i < nGS; i++) globalSequences.push(u32(oGS + i * 4));

  const nSeq = u32(0x1c), oSeq = u32(0x20);
  const allSequences = [];
  for (let i = 0; i < nSeq; i++) {
    const o = oSeq + i * SEQUENCE_SIZE;
    allSequences.push({ id: u16(o), start: u32(o + 4), end: u32(o + 8), flags: u32(o + 16) });
  }
  // An id can appear more than once: vanilla ships variations of Stand that
  // the game picks between at random. Nothing here does — `use-body.ts` and
  // `SeducedFigure.tsx` both take the first match — so the rest are keys
  // nobody samples. `--variants` keeps them.
  const seen = new Set();
  const sequences = allSequences.filter((s) => {
    if (!KEEP.has(s.id)) return false;
    if (VARIANTS) return true;
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  if (!sequences.length) throw new Error(`no sequence matched --keep in ${name}`);

  const nBones = u32(0x34), oBones = u32(0x38);
  const bones = [];
  for (let i = 0; i < nBones; i++) {
    const o = oBones + i * BONE_SIZE;
    bones.push({
      flags: u32(o + 4),
      parent: i16(o + 8),
      translation: track(o + 12, "vec3", sequences),
      rotation: track(o + 40, "quat", sequences),
      scale: track(o + 68, "vec3", sequences),
      pivot: [f32(o + 96), f32(o + 100), f32(o + 104)],
    });
  }

  const nVerts = u32(0x44), oVerts = u32(0x48);
  const positions = new Float32Array(nVerts * 3);
  const normals = new Float32Array(nVerts * 3);
  const uvs = new Float32Array(nVerts * 2);
  const boneIndices = new Uint8Array(nVerts * 4);
  const boneWeights = new Uint8Array(nVerts * 4);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nVerts; i++) {
    const o = oVerts + i * VERTEX_SIZE;
    for (let k = 0; k < 3; k++) {
      const v = f32(o + k * 4);
      positions[i * 3 + k] = v;
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
    for (let k = 0; k < 4; k++) {
      boneWeights[i * 4 + k] = dv.getUint8(o + 12 + k);
      boneIndices[i * 4 + k] = dv.getUint8(o + 16 + k);
    }
    for (let k = 0; k < 3; k++) normals[i * 3 + k] = f32(o + 20 + k * 4);
    uvs[i * 2] = f32(o + 32);
    uvs[i * 2 + 1] = f32(o + 36);
  }
  if (nVerts === 0) { min.fill(0); max.fill(0); }

  const nColors = u32(0x54), oColors = u32(0x58);
  const colors = [];
  for (let c = 0; c < nColors; c++) {
    const o = oColors + c * TRACK_SIZE * 2;
    colors.push({ rgb: track(o, "vec3", sequences), alpha: track(o + TRACK_SIZE, "fixed16", sequences) });
  }
  const nTrans = u32(0x64), oTrans = u32(0x68);
  const transparencies = [];
  for (let t = 0; t < nTrans; t++) transparencies.push(track(oTrans + t * TRACK_SIZE, "fixed16", sequences));
  const nTransLookup = u32(0xa4), oTransLookup = u32(0xa8);
  const transLookup = [];
  for (let i = 0; i < nTransLookup; i++) transLookup.push(u16(oTransLookup + i * 2));

  const nTex = u32(0x5c), oTex = u32(0x60);
  const textures = [], textureTypes = [];
  for (let t = 0; t < nTex; t++) {
    const o = oTex + t * TEXTURE_SIZE;
    const type = u32(o);
    textures.push(type === 0 ? ascii(u32(o + 12), u32(o + 8)) : null);
    textureTypes.push(type);
  }
  const nTexLookup = u32(0x94), oTexLookup = u32(0x98);
  const texLookup = [];
  for (let i = 0; i < nTexLookup; i++) texLookup.push(u16(oTexLookup + i * 2));

  const nRF = u32(0x84), oRF = u32(0x88);
  const renderFlags = [];
  for (let i = 0; i < nRF; i++) renderFlags.push({ flags: u16(oRF + i * 4), blend: u16(oRF + i * 4 + 2) });

  const oAfterBounds = 0xb4 + 14 * 4;
  const nAttach = u32(oAfterBounds + 24), oAttach = u32(oAfterBounds + 28);
  const attachments = [];
  for (let i = 0; i < nAttach; i++) {
    const o = oAttach + i * ATTACHMENT_SIZE;
    attachments.push({ id: u32(o), bone: u32(o + 4), position: [f32(o + 8), f32(o + 12), f32(o + 16)] });
  }

  // View 0 only. Views 1 to 3 are the game's distance LODs and nothing reads them.
  const nViews = u32(0x4c), oViews = u32(0x50);
  let indices = new Uint16Array(0);
  const batches = [];
  if (nViews > 0 && nVerts > 0) {
    const v = oViews;
    const nIdx = u32(v), oIdx = u32(v + 4);
    const nTri = u32(v + 8), oTri = u32(v + 12);
    const nSub = u32(v + 24), oSub = u32(v + 28);
    const nTU = u32(v + 32), oTU = u32(v + 36);
    const lookup = new Uint16Array(nIdx);
    for (let i = 0; i < nIdx; i++) lookup[i] = u16(oIdx + i * 2);
    indices = new Uint16Array(nTri);
    for (let i = 0; i < nTri; i++) indices[i] = lookup[u16(oTri + i * 2)];
    const subs = [];
    for (let s = 0; s < nSub; s++) {
      const o = oSub + s * SUBMESH_SIZE;
      subs.push({ istart: u16(o + 8), icount: u16(o + 10), geoset: u16(o + 2) * 0x100 + u16(o) });
    }
    for (let t = 0; t < nTU; t++) {
      const o = oTU + t * TEXUNIT_SIZE;
      const sub = subs[u16(o + 4)];
      if (!sub) continue;
      const colorIndex = i16(o + 8);
      const rf = renderFlags[u16(o + 10)] ?? { flags: 0, blend: 0 };
      const texIdx = texLookup[u16(o + 16)];
      const transIdx = transLookup[u16(o + 20)];
      batches.push({
        start: sub.istart,
        count: sub.icount,
        colorIndex: colorIndex >= 0 && colorIndex < nColors ? colorIndex : -1,
        transparencyIndex: transIdx !== undefined && transIdx < nTrans ? transIdx : -1,
        flags: rf.flags,
        blend: rf.blend,
        texIndex: texIdx !== undefined && texIdx < nTex ? texIdx : -1,
        geoset: sub.geoset,
      });
    }
  }

  return {
    name, version, nVerts, positions, uvs, normals, boneIndices, boneWeights,
    indices, batches, bones, sequences, globalSequences, colors, transparencies,
    textures, textureTypes, attachments, bounds: { min, max },
    stats: { allSequences: allSequences.length },
  };
}

/* ---------------------------------------------------------------- */
/* Writing the .tbody. Sequential, little-endian, no offsets to fix.  */

class Writer {
  constructor() { this.parts = []; this.len = 0; }
  push(b) { this.parts.push(b); this.len += b.length; }
  align(n) { const pad = (n - (this.len % n)) % n; if (pad) this.push(Buffer.alloc(pad)); }
  u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v); this.push(b); }
  u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v & 0xffff); this.push(b); }
  i16(v) { const b = Buffer.alloc(2); b.writeInt16LE(v); this.push(b); }
  u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); this.push(b); }
  f32(v) { const b = Buffer.alloc(4); b.writeFloatLE(v); this.push(b); }
  str(s) { const b = Buffer.from(s ?? "", "utf8"); this.u16(b.length); this.push(b); }
  f32a(arr) { this.align(4); const b = Buffer.alloc(arr.length * 4); for (let i = 0; i < arr.length; i++) b.writeFloatLE(arr[i], i * 4); this.push(b); }
  u32a(arr) { this.align(4); const b = Buffer.alloc(arr.length * 4); for (let i = 0; i < arr.length; i++) b.writeUInt32LE(arr[i] >>> 0, i * 4); this.push(b); }
  u16a(arr) { this.align(2); const b = Buffer.alloc(arr.length * 2); for (let i = 0; i < arr.length; i++) b.writeUInt16LE(arr[i] & 0xffff, i * 2); this.push(b); }
  bytes(arr) { this.push(Buffer.from(arr.buffer ? arr : Uint8Array.from(arr))); }
  done() { return Buffer.concat(this.parts, this.len); }
}

function writeTrack(w, tr) {
  w.u16(tr.interp);
  w.i16(tr.globalSeq);
  w.u8(tr.stride);
  w.u32(tr.times.length);
  w.u32a(tr.times);
  w.f32a(tr.values);
}

function writeTbody(m) {
  const w = new Writer();
  w.push(Buffer.from("TBD1", "ascii"));
  w.u16(1); // format version
  w.str(m.name);
  w.u32(m.version);

  w.u32(m.nVerts);
  w.f32a(m.positions);
  w.f32a(m.uvs);
  w.f32a(m.normals);
  w.bytes(m.boneIndices);
  w.bytes(m.boneWeights);

  w.u32(m.indices.length);
  w.u16a(m.indices);

  w.f32a([...m.bounds.min, ...m.bounds.max]);

  w.u32(m.globalSequences.length);
  w.u32a(m.globalSequences);

  w.u32(m.sequences.length);
  for (const s of m.sequences) { w.u32(s.id); w.u32(s.start); w.u32(s.end); w.u32(s.flags); }

  w.u32(m.textures.length);
  for (let i = 0; i < m.textures.length; i++) { w.u32(m.textureTypes[i]); w.str(m.textures[i] ?? ""); }

  w.u32(m.bones.length);
  for (const b of m.bones) {
    w.u32(b.flags);
    w.i16(b.parent);
    w.f32a(b.pivot);
    writeTrack(w, b.translation);
    writeTrack(w, b.rotation);
    writeTrack(w, b.scale);
  }

  w.u32(m.colors.length);
  for (const c of m.colors) { writeTrack(w, c.rgb); writeTrack(w, c.alpha); }

  w.u32(m.transparencies.length);
  for (const t of m.transparencies) writeTrack(w, t);

  w.u32(m.attachments.length);
  for (const a of m.attachments) { w.u32(a.id); w.u32(a.bone); w.f32a(a.position); }

  w.u32(m.batches.length);
  for (const b of m.batches) {
    w.u32(b.start); w.u32(b.count);
    w.i16(b.colorIndex); w.i16(b.transparencyIndex);
    w.u16(b.flags); w.u16(b.blend);
    w.i16(b.texIndex); w.u16(b.geoset);
  }
  return w.done();
}

/* ---------------------------------------------------------------- */

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".m2")).sort();
let before = 0, after = 0;
console.log(`Keeping sequences ${[...KEEP].join(", ")} of each body.\n`);
for (const f of files) {
  const src = path.join(SRC, f);
  const buf = fs.readFileSync(src);
  const m = readM2(buf);
  const out = writeTbody(m);
  fs.writeFileSync(path.join(OUT, f.replace(/\.m2$/, ".tbody")), out);
  before += buf.length;
  after += out.length;
  const keys = m.bones.reduce((n, b) => n + b.translation.times.length + b.rotation.times.length + b.scale.times.length, 0);
  console.log(
    `${f.replace(/\.m2$/, "").padEnd(18)} ${(buf.length / 1048576).toFixed(2).padStart(5)} MB -> ${(out.length / 1024).toFixed(0).padStart(4)} KB` +
    `  ${(buf.length / out.length).toFixed(1).padStart(5)}x   ${m.stats.allSequences} seqs -> ${m.sequences.length}, ${keys} keys`,
  );
}
console.log(`\n${files.length} bodies: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(2)} MB  (${(before / after).toFixed(1)}x)`);
