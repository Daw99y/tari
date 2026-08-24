/* A reader for the vanilla (1.12, version 256–263) M2 model format.
 *
 * It reads what the lab page needs to draw a spell visual the way the game
 * does, minus particles: skinned vertices, the first view's triangles and
 * render batches, bones with their keyframe tracks and billboard flags,
 * animation sequences, colour and transparency tracks, render flags and
 * texture names. Every offset below is a byte offset into the original file,
 * so the .m2 on disk stays the source of truth and nothing is re-authored.
 *
 * Layout reference: the legacy header on wowdev.wiki/M2 (versions <= 263),
 * with the vanilla-only fields kept (playable animation lookup at 0x2C, the
 * extra array at 0x6C, the `level` field in the submesh struct).
 */

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

/** A keyframe track. Times are milliseconds on the model's global timeline
 *  unless `globalSeq >= 0`, in which case they loop over that global
 *  sequence's length. Values are flat: `stride` numbers per key. */
export type M2Track = {
  interp: number;
  globalSeq: number;
  times: Uint32Array;
  values: Float32Array;
  stride: number;
};

export type M2Bone = {
  flags: number;
  parent: number;
  pivot: Vec3;
  translation: M2Track;
  rotation: M2Track;
  scale: M2Track;
};

export type M2Sequence = { id: number; start: number; end: number; flags: number };

export type M2Batch = {
  /** Offset into `indices` where this batch's triangle list starts. */
  start: number;
  /** Number of indices (triangles × 3). */
  count: number;
  /** Index into `colors`, or -1. */
  colorIndex: number;
  /** Index into `transparencies`, or -1. */
  transparencyIndex: number;
  /** Render flag bits: 1 unlit, 2 unfogged, 4 two-sided, 8 depth test, 16 depth write. */
  flags: number;
  /** Blend mode: 0 opaque, 1 alpha key, 2 alpha, 3 no-alpha add, 4 add, 5 mod, 6 mod2x. */
  blend: number;
  /** Texture path named in the file, or null for a game-supplied slot. */
  texture: string | null;
  /** The texture's type. 0 means the path above is real; anything else is a
   *  slot the game fills at runtime — 1 body skin, 2 object skin (an
   *  equipped item's own texture), 6 hair, 8 skin extra. */
  textureType: number;
  /** The submesh's geoset id (`level * 0x100 + id`). Character models use
   *  this to switch body parts on and off per equipped item; see
   *  `lib/doll.ts` for the groups. Effect models leave it at 0. */
  geoset: number;
};

/** A named socket on a bone. Equipped items hang off these. Id 0 is the
 *  right hand, 1 the left hand, 2 the shield hand; `lib/doll.ts` names the
 *  rest. `position` is an offset from the bone's pivot, in model space. */
export type M2Attachment = { id: number; bone: number; position: Vec3 };

export type M2Mesh = {
  name: string;
  version: number;
  vertexCount: number;
  triangleCount: number;
  /** x, y, z per vertex. WoW space: X toward the viewer, Y left, Z up. */
  positions: Float32Array;
  /** u, v per vertex. */
  uvs: Float32Array;
  /** x, y, z unit normal per vertex, same space as `positions`. Needed to
   *  light anything that does not set the unlit render flag — which is every
   *  item and character model, and almost no spell visual. */
  normals: Float32Array;
  /** Four bone indices per vertex. */
  boneIndices: Uint8Array;
  /** Four bone weights per vertex, 0..255. */
  boneWeights: Uint8Array;
  /** Vertex indices, three per triangle, resolved through the view's lookup. */
  indices: Uint16Array;
  batches: M2Batch[];
  bones: M2Bone[];
  sequences: M2Sequence[];
  globalSequences: number[];
  /** RGB track (stride 3) and alpha track (stride 1, already 0..1). */
  colors: { rgb: M2Track; alpha: M2Track }[];
  /** Alpha tracks, 0..1. */
  transparencies: M2Track[];
  textures: (string | null)[];
  /** Type per entry in `textures`, same indices. See `M2Batch.textureType`. */
  textureTypes: number[];
  attachments: M2Attachment[];
  bounds: { min: Vec3; max: Vec3 };
};

const VERTEX_SIZE = 48;
const SUBMESH_SIZE = 32;
const TEXUNIT_SIZE = 24;
const TEXTURE_SIZE = 16;
const TRACK_SIZE = 28;
const COLOR_SIZE = TRACK_SIZE * 2;
const BONE_SIZE = 108;
const SEQUENCE_SIZE = 68;
const ATTACHMENT_SIZE = 48;

function ascii(dv: DataView, off: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    const c = dv.getUint8(off + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export function parseM2(buf: ArrayBuffer): M2Mesh {
  const dv = new DataView(buf);
  const u32 = (o: number) => dv.getUint32(o, true);
  const u16 = (o: number) => dv.getUint16(o, true);
  const i16 = (o: number) => dv.getInt16(o, true);
  const f32 = (o: number) => dv.getFloat32(o, true);

  if (ascii(dv, 0, 4) !== "MD20") throw new Error("Not an M2 file (no MD20 magic)");
  const version = u32(4);
  if (version > 263) throw new Error(`M2 version ${version} is newer than the vanilla layout this reader knows`);

  const name = ascii(dv, u32(12), u32(8));

  /** Read a vanilla M2Track at `o`. `kind` decides how values are decoded. */
  const track = (o: number, kind: "vec3" | "quat" | "fixed16" | "float"): M2Track => {
    const interp = u16(o);
    const globalSeq = i16(o + 2);
    const nT = u32(o + 12);
    const oT = u32(o + 16);
    const nK = u32(o + 20);
    const oK = u32(o + 24);
    const times = new Uint32Array(nT);
    for (let i = 0; i < nT; i++) times[i] = u32(oT + i * 4);
    let stride = 1;
    let values: Float32Array;
    if (kind === "vec3") {
      stride = 3;
      values = new Float32Array(nK * 3);
      for (let i = 0; i < nK * 3; i++) values[i] = f32(oK + i * 4);
    } else if (kind === "quat") {
      stride = 4;
      values = new Float32Array(nK * 4);
      for (let i = 0; i < nK * 4; i++) values[i] = f32(oK + i * 4);
    } else if (kind === "fixed16") {
      values = new Float32Array(nK);
      for (let i = 0; i < nK; i++) values[i] = i16(oK + i * 2) / 0x7fff;
    } else {
      values = new Float32Array(nK);
      for (let i = 0; i < nK; i++) values[i] = f32(oK + i * 4);
    }
    return { interp, globalSeq, times, values, stride };
  };

  // Global sequences (loop lengths in ms)
  const nGS = u32(0x14);
  const oGS = u32(0x18);
  const globalSequences: number[] = [];
  for (let i = 0; i < nGS; i++) globalSequences.push(u32(oGS + i * 4));

  // Sequences
  const nSeq = u32(0x1c);
  const oSeq = u32(0x20);
  const sequences: M2Sequence[] = [];
  for (let i = 0; i < nSeq; i++) {
    const o = oSeq + i * SEQUENCE_SIZE;
    sequences.push({ id: u16(o), start: u32(o + 4), end: u32(o + 8), flags: u32(o + 16) });
  }

  // Bones
  const nBones = u32(0x34);
  const oBones = u32(0x38);
  const bones: M2Bone[] = [];
  for (let i = 0; i < nBones; i++) {
    const o = oBones + i * BONE_SIZE;
    bones.push({
      flags: u32(o + 4),
      parent: i16(o + 8),
      translation: track(o + 12, "vec3"),
      rotation: track(o + 40, "quat"),
      scale: track(o + 68, "vec3"),
      pivot: [f32(o + 96), f32(o + 100), f32(o + 104)],
    });
  }

  // Vertices
  const nVerts = u32(0x44);
  const oVerts = u32(0x48);
  const positions = new Float32Array(nVerts * 3);
  const normals = new Float32Array(nVerts * 3);
  const uvs = new Float32Array(nVerts * 2);
  const boneIndices = new Uint8Array(nVerts * 4);
  const boneWeights = new Uint8Array(nVerts * 4);
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
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
  if (nVerts === 0) {
    min[0] = min[1] = min[2] = 0;
    max[0] = max[1] = max[2] = 0;
  }

  // Colours and transparencies
  const nColors = u32(0x54);
  const oColors = u32(0x58);
  const colors: M2Mesh["colors"] = [];
  for (let c = 0; c < nColors; c++) {
    const o = oColors + c * COLOR_SIZE;
    colors.push({ rgb: track(o, "vec3"), alpha: track(o + TRACK_SIZE, "fixed16") });
  }
  const nTrans = u32(0x64);
  const oTrans = u32(0x68);
  const transparencies: M2Track[] = [];
  for (let t = 0; t < nTrans; t++) transparencies.push(track(oTrans + t * TRACK_SIZE, "fixed16"));
  const nTransLookup = u32(0xa4);
  const oTransLookup = u32(0xa8);
  const transLookup: number[] = [];
  for (let i = 0; i < nTransLookup; i++) transLookup.push(u16(oTransLookup + i * 2));

  // Textures (type 0 carries a path; other types are filled in by the game)
  const nTex = u32(0x5c);
  const oTex = u32(0x60);
  const textures: (string | null)[] = [];
  const textureTypes: number[] = [];
  for (let t = 0; t < nTex; t++) {
    const o = oTex + t * TEXTURE_SIZE;
    const type = u32(o);
    textures.push(type === 0 ? ascii(dv, u32(o + 12), u32(o + 8)) : null);
    textureTypes.push(type);
  }
  const nTexLookup = u32(0x94);
  const oTexLookup = u32(0x98);
  const texLookup: number[] = [];
  for (let i = 0; i < nTexLookup; i++) texLookup.push(u16(oTexLookup + i * 2));

  // Render flags: (flags, blend) pairs
  const nRF = u32(0x84);
  const oRF = u32(0x88);
  const renderFlags: { flags: number; blend: number }[] = [];
  for (let i = 0; i < nRF; i++) renderFlags.push({ flags: u16(oRF + i * 4), blend: u16(oRF + i * 4 + 2) });

  // Attachments. The header past 0xb0 runs: 14 floats of bounding box and
  // radius, then bounding triangles / vertices / normals, then attachments.
  const oAfterBounds = 0xb4 + 14 * 4;
  const nAttach = u32(oAfterBounds + 24);
  const oAttach = u32(oAfterBounds + 28);
  const attachments: M2Attachment[] = [];
  for (let i = 0; i < nAttach; i++) {
    const o = oAttach + i * ATTACHMENT_SIZE;
    attachments.push({
      id: u32(o),
      bone: u32(o + 4),
      position: [f32(o + 8), f32(o + 12), f32(o + 16)],
    });
  }

  // View 0 (the embedded skin): indices, triangles, submeshes, texture units
  const nViews = u32(0x4c);
  const oViews = u32(0x50);
  let indices = new Uint16Array(0);
  const batches: M2Batch[] = [];
  if (nViews > 0 && nVerts > 0) {
    const v = oViews;
    const nIdx = u32(v);
    const oIdx = u32(v + 4);
    const nTri = u32(v + 8);
    const oTri = u32(v + 12);
    const nSub = u32(v + 24);
    const oSub = u32(v + 28);
    const nTU = u32(v + 32);
    const oTU = u32(v + 36);

    const lookup = new Uint16Array(nIdx);
    for (let i = 0; i < nIdx; i++) lookup[i] = u16(oIdx + i * 2);
    indices = new Uint16Array(nTri);
    for (let i = 0; i < nTri; i++) indices[i] = lookup[u16(oTri + i * 2)];

    const subs: { istart: number; icount: number; geoset: number }[] = [];
    for (let s = 0; s < nSub; s++) {
      const o = oSub + s * SUBMESH_SIZE;
      // id, level, vstart, vcount, istart, icount, ...
      // The geoset id is 16 bits wide but stored split: `level` is its high
      // byte. Character models need the whole number (1301 is the robe
      // skirt, 401 a glove); effect models leave both at 0.
      subs.push({ istart: u16(o + 8), icount: u16(o + 10), geoset: u16(o + 2) * 0x100 + u16(o) });
    }

    for (let t = 0; t < nTU; t++) {
      const o = oTU + t * TEXUNIT_SIZE;
      const submesh = u16(o + 4);
      const colorIndex = i16(o + 8);
      const rfIndex = u16(o + 10);
      const texId = u16(o + 16);
      const transId = u16(o + 20);
      const sub = subs[submesh];
      if (!sub) continue;
      const texIdx = texLookup[texId];
      const rf = renderFlags[rfIndex] ?? { flags: 0, blend: 0 };
      const transIdx = transLookup[transId];
      batches.push({
        start: sub.istart,
        count: sub.icount,
        colorIndex: colorIndex >= 0 && colorIndex < nColors ? colorIndex : -1,
        transparencyIndex: transIdx !== undefined && transIdx < nTrans ? transIdx : -1,
        flags: rf.flags,
        blend: rf.blend,
        texture: texIdx !== undefined ? (textures[texIdx] ?? null) : null,
        textureType: texIdx !== undefined ? (textureTypes[texIdx] ?? 0) : 0,
        geoset: sub.geoset,
      });
    }
  }

  return {
    name,
    version,
    vertexCount: nVerts,
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
    bounds: { min, max },
  };
}

/* ------------------------------------------------------------------ */
/* Track sampling                                                      */

/** Sample a track at `t` ms. `seq` bounds the search to one sequence's
 *  window; global-sequence tracks ignore it and loop on their own clock. */
export function sampleTrack(
  tr: M2Track,
  t: number,
  seq: M2Sequence | null,
  globalSequences: number[],
  out: Float32Array,
  fallback: ArrayLike<number>,
  /** What to do with a track that has no keys inside `seq` at all. A character
   *  needs `true`: its jaw, eyes and ears are keyed in emotes and not in
   *  Stand, and borrowing a pose from whichever animation is nearest tears the
   *  face apart. A spell visual needs `false`: its bones are authored at the
   *  origin and only the animation moves them out, so resting one hides it. */
  restWhenOutside = false,
): Float32Array {
  const { times, values, stride } = tr;
  const nK = values.length / stride;
  if (nK === 0 || times.length === 0) {
    for (let k = 0; k < stride; k++) out[k] = fallback[k];
    return out;
  }
  let time = t;
  if (tr.globalSeq >= 0) {
    const len = globalSequences[tr.globalSeq] || 1;
    time = t % len;
  } else if (seq) {
    time = Math.max(seq.start, Math.min(seq.end, t));
  }
  // Find the key pair around `time` within the usable range.
  let lo = 0;
  let hi = Math.min(times.length, nK) - 1;
  if (tr.globalSeq < 0 && seq) {
    // Restrict to keys inside this sequence's window when there are any.
    let first = -1;
    let last = -1;
    for (let i = 0; i <= hi; i++) {
      if (times[i] >= seq.start && times[i] <= seq.end) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first >= 0) {
      lo = first;
      hi = last;
    } else if (restWhenOutside) {
      for (let k = 0; k < stride; k++) out[k] = fallback[k];
      return out;
    }
  }
  if (time <= times[lo]) {
    for (let k = 0; k < stride; k++) out[k] = values[lo * stride + k];
    return out;
  }
  if (time >= times[hi]) {
    for (let k = 0; k < stride; k++) out[k] = values[hi * stride + k];
    return out;
  }
  let i = lo;
  while (i < hi && times[i + 1] <= time) i++;
  const t0 = times[i];
  const t1 = times[i + 1];
  const f = tr.interp === 0 || t1 === t0 ? 0 : (time - t0) / (t1 - t0);
  if (stride === 4) {
    // Quaternion: normalised lerp, shortest path.
    let dot = 0;
    for (let k = 0; k < 4; k++) dot += values[i * 4 + k] * values[(i + 1) * 4 + k];
    const sgn = dot < 0 ? -1 : 1;
    let len = 0;
    for (let k = 0; k < 4; k++) {
      const v = values[i * 4 + k] * (1 - f) + sgn * values[(i + 1) * 4 + k] * f;
      out[k] = v;
      len += v * v;
    }
    len = Math.sqrt(len) || 1;
    for (let k = 0; k < 4; k++) out[k] /= len;
  } else {
    for (let k = 0; k < stride; k++) out[k] = values[i * stride + k] * (1 - f) + values[(i + 1) * stride + k] * f;
  }
  return out;
}
