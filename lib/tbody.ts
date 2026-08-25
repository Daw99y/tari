/* A reader for `.tbody` — a character body with the animations nothing plays
 * taken out.
 *
 * `scripts/doll-strip.mjs` writes it from the same `.m2` that `lib/m2.ts`
 * reads. It carries exactly the fields `M2Mesh` has: view 0 resolved into
 * flat batches, bones with only the keys Stand and Stun sample, and none of
 * the LOD views, bounding volume or lookup tables the game needs and this
 * does not. A night elf female goes from 5.56 MB to 198 KB.
 *
 * The format is sequential — every array follows the count that sizes it and
 * nothing holds a byte offset — so there is no header to keep in step. Typed
 * arrays are padded to their own alignment and read as views into the buffer,
 * so parsing is a walk, not a copy. `parseM2` still handles spell visuals and
 * items, which are small and animated in full.
 */

import type { M2Batch, M2Bone, M2Mesh, M2Track, Vec3 } from "./m2";

const MAGIC = 0x31444254; // "TBD1", little-endian

class Reader {
  private buf: ArrayBuffer;
  private dv: DataView;
  private o = 0;
  constructor(buf: ArrayBuffer) {
    this.buf = buf;
    this.dv = new DataView(buf);
  }
  private align(n: number) {
    this.o = Math.ceil(this.o / n) * n;
  }
  u8() { return this.dv.getUint8(this.o++); }
  u16() { const v = this.dv.getUint16(this.o, true); this.o += 2; return v; }
  i16() { const v = this.dv.getInt16(this.o, true); this.o += 2; return v; }
  u32() { const v = this.dv.getUint32(this.o, true); this.o += 4; return v; }
  str() {
    const n = this.u16();
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.dv.getUint8(this.o + i));
    this.o += n;
    return s;
  }
  f32a(n: number) { this.align(4); const a = new Float32Array(this.buf, this.o, n); this.o += n * 4; return a; }
  u32a(n: number) { this.align(4); const a = new Uint32Array(this.buf, this.o, n); this.o += n * 4; return a; }
  u16a(n: number) { this.align(2); const a = new Uint16Array(this.buf, this.o, n); this.o += n * 2; return a; }
  u8a(n: number) { const a = new Uint8Array(this.buf, this.o, n); this.o += n; return a; }
}

function readTrack(r: Reader): M2Track {
  const interp = r.u16();
  const globalSeq = r.i16();
  const stride = r.u8();
  const n = r.u32();
  const times = r.u32a(n);
  const values = r.f32a(n * stride);
  return { interp, globalSeq, times, values, stride };
}

export function parseTbody(buf: ArrayBuffer): M2Mesh {
  const r = new Reader(buf);
  if (r.u32() !== MAGIC) throw new Error("Not a .tbody file (no TBD1 magic)");
  const format = r.u16();
  if (format !== 1) throw new Error(`.tbody format ${format} is newer than this reader`);

  const name = r.str();
  const version = r.u32();

  const vertexCount = r.u32();
  const positions = r.f32a(vertexCount * 3);
  const uvs = r.f32a(vertexCount * 2);
  const normals = r.f32a(vertexCount * 3);
  const boneIndices = r.u8a(vertexCount * 4);
  const boneWeights = r.u8a(vertexCount * 4);

  const indices = r.u16a(r.u32());

  const b = r.f32a(6);
  const bounds = { min: [b[0], b[1], b[2]] as Vec3, max: [b[3], b[4], b[5]] as Vec3 };

  const globalSequences = Array.from(r.u32a(r.u32()));

  const nSeq = r.u32();
  const sequences = [];
  for (let i = 0; i < nSeq; i++) sequences.push({ id: r.u32(), start: r.u32(), end: r.u32(), flags: r.u32() });

  const nTex = r.u32();
  const textures: (string | null)[] = [];
  const textureTypes: number[] = [];
  for (let i = 0; i < nTex; i++) {
    const type = r.u32();
    const path = r.str();
    textureTypes.push(type);
    textures.push(type === 0 ? path : null);
  }

  const nBones = r.u32();
  const bones: M2Bone[] = [];
  for (let i = 0; i < nBones; i++) {
    const flags = r.u32();
    const parent = r.i16();
    const p = r.f32a(3);
    bones.push({
      flags,
      parent,
      pivot: [p[0], p[1], p[2]],
      translation: readTrack(r),
      rotation: readTrack(r),
      scale: readTrack(r),
    });
  }

  const nColors = r.u32();
  const colors: M2Mesh["colors"] = [];
  for (let i = 0; i < nColors; i++) colors.push({ rgb: readTrack(r), alpha: readTrack(r) });

  const nTrans = r.u32();
  const transparencies: M2Track[] = [];
  for (let i = 0; i < nTrans; i++) transparencies.push(readTrack(r));

  const nAttach = r.u32();
  const attachments = [];
  for (let i = 0; i < nAttach; i++) {
    const id = r.u32();
    const bone = r.u32();
    const p = r.f32a(3);
    attachments.push({ id, bone, position: [p[0], p[1], p[2]] as Vec3 });
  }

  const nBatches = r.u32();
  const batches: M2Batch[] = [];
  for (let i = 0; i < nBatches; i++) {
    const start = r.u32();
    const count = r.u32();
    const colorIndex = r.i16();
    const transparencyIndex = r.i16();
    const flags = r.u16();
    const blend = r.u16();
    const texIndex = r.i16();
    const geoset = r.u16();
    batches.push({
      start,
      count,
      colorIndex,
      transparencyIndex,
      flags,
      blend,
      texture: texIndex >= 0 ? (textures[texIndex] ?? null) : null,
      textureType: texIndex >= 0 ? (textureTypes[texIndex] ?? 0) : 0,
      geoset,
    });
  }

  return {
    name,
    version,
    vertexCount,
    triangleCount: indices.length / 3,
    positions,
    uvs,
    normals,
    boneIndices,
    boneWeights,
    indices,
    batches,
    bones,
    sequences,
    globalSequences,
    colors,
    transparencies,
    textures,
    textureTypes,
    attachments,
    bounds,
  };
}

/** The body file for a manifest `model` name. The manifest still names the
 *  `.m2` the build read; the browser fetches the stripped one beside it. */
export function bodyFile(model: string): string {
  return model.replace(/\.m2$/i, ".tbody");
}
