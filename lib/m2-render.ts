/* Draws an M2Mesh on a 2D canvas the way the game would, minus particles.
 *
 * Per frame: sample every bone's translation/rotation/scale track at time t,
 * build the bone hierarchy, honour billboard flags against the current
 * camera, skin the vertices, project orthographically, sort triangles far to
 * near, and paint each one with its texture (affine-mapped through the
 * canvas transform), tinted by the batch's colour track, at the alpha the
 * colour and transparency tracks say, in the blend mode the render flags
 * say. Software rendering is fine here: the biggest specimen is 384
 * triangles. */

import { sampleTrack, type M2Mesh, type M2Sequence, type Vec3 } from "@/lib/m2";

/* ---------- small matrix kit: 3×4 row-major, [r0 r1 r2] each [m0 m1 m2 t] */

type M34 = Float32Array;

function identity(): M34 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
}

function mul(a: M34, b: M34, out: M34): M34 {
  for (let r = 0; r < 3; r++) {
    const a0 = a[r * 4];
    const a1 = a[r * 4 + 1];
    const a2 = a[r * 4 + 2];
    const a3 = a[r * 4 + 3];
    out[r * 4] = a0 * b[0] + a1 * b[4] + a2 * b[8];
    out[r * 4 + 1] = a0 * b[1] + a1 * b[5] + a2 * b[9];
    out[r * 4 + 2] = a0 * b[2] + a1 * b[6] + a2 * b[10];
    out[r * 4 + 3] = a0 * b[3] + a1 * b[7] + a2 * b[11] + a3;
  }
  return out;
}

function apply(m: M34, x: number, y: number, z: number, out: Float32Array, o = 0) {
  out[o] = m[0] * x + m[1] * y + m[2] * z + m[3];
  out[o + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
  out[o + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
}

/** T(pivot + trans) · R(q) · S(s) · T(-pivot), written out. */
function composeLocal(pivot: Vec3, trans: Float32Array, q: Float32Array, s: Float32Array, out: M34): M34 {
  const [qx, qy, qz, qw] = q;
  const xx = qx * qx;
  const yy = qy * qy;
  const zz = qz * qz;
  const xy = qx * qy;
  const xz = qx * qz;
  const yz = qy * qz;
  const wx = qw * qx;
  const wy = qw * qy;
  const wz = qw * qz;
  const r = [
    1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy),
    2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx),
    2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy),
  ];
  for (let row = 0; row < 3; row++) {
    out[row * 4] = r[row * 3] * s[0];
    out[row * 4 + 1] = r[row * 3 + 1] * s[1];
    out[row * 4 + 2] = r[row * 3 + 2] * s[2];
    // translation = pivot + trans - R·S·pivot
    out[row * 4 + 3] =
      pivot[row] + trans[row] - (out[row * 4] * pivot[0] + out[row * 4 + 1] * pivot[1] + out[row * 4 + 2] * pivot[2]);
  }
  return out;
}

/* ---------- camera */

export type Camera = { yaw: number; pitch: number };

/** Rotation-only view matrix V = Rpitch · Ryaw, WoW space in, view space out
 *  (view X toward the viewer, Y left, Z up). */
function viewMatrix(cam: Camera): { V: M34; Vinv: M34; YawInv: M34 } {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  // yaw about Z
  const Ryaw = new Float32Array([cy, -sy, 0, 0, sy, cy, 0, 0, 0, 0, 1, 0]);
  // pitch about view Y (mixes X and Z)
  const Rp = new Float32Array([cp, 0, sp, 0, 0, 1, 0, 0, -sp, 0, cp, 0]);
  const V = mul(Rp, Ryaw, identity());
  // Inverses of pure rotations are transposes.
  const Vinv = new Float32Array([V[0], V[4], V[8], 0, V[1], V[5], V[9], 0, V[2], V[6], V[10], 0]);
  const YawInv = new Float32Array([cy, sy, 0, 0, -sy, cy, 0, 0, 0, 0, 1, 0]);
  return { V, Vinv, YawInv };
}

const BB_SPHERICAL = 0x8;
const BB_CYL_X = 0x10;
const BB_CYL_Y = 0x20;
const BB_CYL_Z = 0x40;
const BB_ANY = BB_SPHERICAL | BB_CYL_X | BB_CYL_Y | BB_CYL_Z;

/* ---------- posing */

const ZERO3 = new Float32Array([0, 0, 0]);
const ONE3 = new Float32Array([1, 1, 1]);
const QID = new Float32Array([0, 0, 0, 1]);

export type Pose = { world: M34[]; t: number };

export function poseBones(
  mesh: M2Mesh,
  t: number,
  seq: M2Sequence | null,
  cam: Camera,
  /** See `sampleTrack`. Character models pass true. */
  restWhenOutside = false,
): Pose {
  const { Vinv, YawInv } = viewMatrix(cam);
  const world: M34[] = [];
  const tr = new Float32Array(3);
  const q = new Float32Array(4);
  const s = new Float32Array(3);
  const local = identity();
  const tmp = identity();
  const p = new Float32Array(3);

  mesh.bones.forEach((bone, i) => {
    sampleTrack(bone.translation, t, seq, mesh.globalSequences, tr, ZERO3, restWhenOutside);
    sampleTrack(bone.rotation, t, seq, mesh.globalSequences, q, QID, restWhenOutside);
    sampleTrack(bone.scale, t, seq, mesh.globalSequences, s, ONE3, restWhenOutside);
    const parent = bone.parent >= 0 && bone.parent < i ? world[bone.parent] : null;
    const W = identity();

    if (bone.flags & BB_ANY) {
      // Billboard: the pivot travels with the hierarchy, the offsets around
      // it face the camera. World(v) = P + Rbb · (s_total ⊙ (v − pivot)).
      const pv = bone.pivot;
      if (parent) apply(parent, pv[0] + tr[0], pv[1] + tr[1], pv[2] + tr[2], p);
      else {
        p[0] = pv[0] + tr[0];
        p[1] = pv[1] + tr[1];
        p[2] = pv[2] + tr[2];
      }
      const ps = parent ? Math.hypot(parent[0], parent[4], parent[8]) : 1;
      const Rbb = bone.flags & BB_SPHERICAL ? Vinv : bone.flags & BB_CYL_Z ? YawInv : Vinv;
      for (let row = 0; row < 3; row++) {
        W[row * 4] = Rbb[row * 4] * s[0] * ps;
        W[row * 4 + 1] = Rbb[row * 4 + 1] * s[1] * ps;
        W[row * 4 + 2] = Rbb[row * 4 + 2] * s[2] * ps;
        W[row * 4 + 3] = p[row] - (W[row * 4] * pv[0] + W[row * 4 + 1] * pv[1] + W[row * 4 + 2] * pv[2]);
      }
    } else {
      composeLocal(bone.pivot, tr, q, s, local);
      if (parent) mul(parent, local, W);
      else W.set(local);
    }
    void tmp;
    world.push(W);
  });
  return { world, t };
}

/** Skin every vertex into model space with the given pose. */
export function skin(mesh: M2Mesh, pose: Pose, out: Float32Array): Float32Array {
  const n = mesh.vertexCount;
  const tmp = new Float32Array(3);
  for (let i = 0; i < n; i++) {
    const x = mesh.positions[i * 3];
    const y = mesh.positions[i * 3 + 1];
    const z = mesh.positions[i * 3 + 2];
    let ox = 0;
    let oy = 0;
    let oz = 0;
    let wsum = 0;
    for (let k = 0; k < 4; k++) {
      const w = mesh.boneWeights[i * 4 + k] / 255;
      if (w === 0) continue;
      const b = mesh.boneIndices[i * 4 + k];
      const M = pose.world[b];
      if (!M) continue;
      apply(M, x, y, z, tmp);
      ox += tmp[0] * w;
      oy += tmp[1] * w;
      oz += tmp[2] * w;
      wsum += w;
    }
    if (wsum === 0) {
      ox = x;
      oy = y;
      oz = z;
    } else if (wsum !== 1) {
      ox /= wsum;
      oy /= wsum;
      oz /= wsum;
    }
    out[i * 3] = ox;
    out[i * 3 + 1] = oy;
    out[i * 3 + 2] = oz;
  }
  return out;
}

/* ---------- fitting: union of the animated bounds over the sequence */

export type Fit = { center: Vec3; radius: number };

export function fitOverSequence(mesh: M2Mesh, seq: M2Sequence | null): Fit {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const buf = new Float32Array(mesh.vertexCount * 3);
  const cam: Camera = { yaw: 0, pitch: 0 };
  const steps = 16;
  const start = seq ? seq.start : 0;
  const end = seq ? seq.end : 1000;
  for (let k = 0; k <= steps; k++) {
    const t = start + ((end - start) * k) / steps;
    const pose = poseBones(mesh, t, seq, cam);
    skin(mesh, pose, buf);
    for (let i = 0; i < mesh.vertexCount; i++) {
      for (let a = 0; a < 3; a++) {
        const v = buf[i * 3 + a];
        if (v < min[a]) min[a] = v;
        if (v > max[a]) max[a] = v;
      }
    }
  }
  if (!isFinite(min[0])) return { center: [0, 0, 0], radius: 1 };
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1;
  return { center, radius };
}

/* ---------- textures */

export type TextureSet = Map<string, HTMLImageElement>;

/** Map a WoW texture path to the PNG we shipped under /lab/tex. */
export function textureUrl(path: string): string {
  const base = path.split("\\").pop() ?? path;
  return `/lab/tex/${base.toLowerCase().replace(/\.blp$/, "")}.png`;
}

export async function loadTextures(mesh: M2Mesh): Promise<TextureSet> {
  const set: TextureSet = new Map();
  const names = Array.from(new Set(mesh.batches.map((b) => b.texture).filter((x): x is string => !!x)));
  await Promise.all(
    names.map(
      (n) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            set.set(n, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = textureUrl(n);
        }),
    ),
  );
  return set;
}

/* ---------- tint cache: texture × colour → pattern */

type Tinted = { canvas: HTMLCanvasElement; pattern: CanvasPattern | null; w: number; h: number };
const tintCache = new Map<string, Tinted>();

function tinted(ctx: CanvasRenderingContext2D, img: HTMLImageElement, key: string, rgb: Vec3): Tinted {
  const q = rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 31));
  const k = `${key}|${q.join(",")}`;
  const hit = tintCache.get(k);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 1;
  c.height = img.naturalHeight || 1;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  if (q[0] !== 31 || q[1] !== 31 || q[2] !== 31) {
    g.globalCompositeOperation = "multiply";
    g.fillStyle = `rgb(${(q[0] / 31) * 255},${(q[1] / 31) * 255},${(q[2] / 31) * 255})`;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, 0, 0);
  }
  const t: Tinted = { canvas: c, pattern: ctx.createPattern(c, "repeat"), w: c.width, h: c.height };
  tintCache.set(k, t);
  return t;
}

/* ---------- the frame */

export type DrawOptions = {
  wire: boolean;
  dpr: number;
  /** Opaque ground the effect is added onto. Additive blending needs an
   *  opaque destination or it accumulates alpha instead of light. */
  background: string;
  /** Multiplies the fit. 1 frames the whole animation; more crops in. */
  zoom?: number;
};

type Tri = { a: number; b: number; c: number; depth: number; batch: number };

/** One scratch layer per canvas, reused every frame for additive batches. */
const layers = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function layerFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  let l = layers.get(canvas);
  if (!l) {
    l = document.createElement("canvas");
    layers.set(canvas, l);
  }
  if (l.width !== canvas.width || l.height !== canvas.height) {
    l.width = canvas.width;
    l.height = canvas.height;
  }
  return l.getContext("2d")!;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  mesh: M2Mesh,
  textures: TextureSet,
  fit: Fit,
  cam: Camera,
  t: number,
  seq: M2Sequence | null,
  opts: DrawOptions,
) {
  const canvas = ctx.canvas;
  const W = canvas.width;
  const H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, W, H);
  if (mesh.vertexCount === 0) return;

  const pose = poseBones(mesh, t, seq, cam);
  const model = skin(mesh, pose, new Float32Array(mesh.vertexCount * 3));
  const { V } = viewMatrix(cam);
  const scale = ((W * 0.38) / fit.radius) * (opts.zoom ?? 1);

  const n = mesh.vertexCount;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sd = new Float32Array(n);
  const p = new Float32Array(3);
  for (let i = 0; i < n; i++) {
    apply(V, model[i * 3] - fit.center[0], model[i * 3 + 1] - fit.center[1], model[i * 3 + 2] - fit.center[2], p);
    sx[i] = W / 2 - p[1] * scale;
    sy[i] = H / 2 - p[2] * scale;
    sd[i] = p[0];
  }

  // Per-batch colour and alpha at time t.
  const rgbBuf = new Float32Array(3);
  const aBuf = new Float32Array(1);
  const batchRGB: Vec3[] = [];
  const batchA: number[] = [];
  mesh.batches.forEach((b) => {
    let rgb: Vec3 = [1, 1, 1];
    let a = 1;
    if (b.colorIndex >= 0) {
      const c = mesh.colors[b.colorIndex];
      sampleTrack(c.rgb, t, seq, mesh.globalSequences, rgbBuf, ONE3);
      rgb = [rgbBuf[0], rgbBuf[1], rgbBuf[2]];
      sampleTrack(c.alpha, t, seq, mesh.globalSequences, aBuf, ONE3);
      a *= aBuf[0];
    }
    if (b.transparencyIndex >= 0) {
      sampleTrack(mesh.transparencies[b.transparencyIndex], t, seq, mesh.globalSequences, aBuf, ONE3);
      a *= aBuf[0];
    }
    batchRGB.push(rgb);
    batchA.push(Math.max(0, Math.min(1, a)));
  });

  // Triangles per batch, back faces culled unless the file says two-sided.
  // Winding: (b−a)×(c−a) is the outward normal in every vanilla file we
  // read, which in this projection means a positive 2-D cross product.
  const perBatch: Tri[][] = mesh.batches.map(() => []);
  mesh.batches.forEach((bt, bi) => {
    if (batchA[bi] <= 0.002) return;
    const twoSided = (bt.flags & 0x4) !== 0;
    const end = Math.min(bt.start + bt.count, mesh.indices.length);
    for (let k = bt.start; k + 2 < end; k += 3) {
      const a = mesh.indices[k];
      const b = mesh.indices[k + 1];
      const c = mesh.indices[k + 2];
      if (!twoSided && !opts.wire) {
        const cross = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sy[b] - sy[a]) * (sx[c] - sx[a]);
        if (cross <= 0) continue;
      }
      perBatch[bi].push({ a, b, c, depth: (sd[a] + sd[b] + sd[c]) / 3, batch: bi });
    }
  });

  const uv = mesh.uvs;

  const paint = (g: CanvasRenderingContext2D, tri: Tri) => {
    const bt = mesh.batches[tri.batch];
    const rgb = batchRGB[tri.batch];
    const x0 = sx[tri.a], y0 = sy[tri.a];
    const x1 = sx[tri.b], y1 = sy[tri.b];
    const x2 = sx[tri.c], y2 = sy[tri.c];

    if (opts.wire) {
      g.strokeStyle = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.9)`;
      g.lineWidth = Math.max(1, 0.75 * opts.dpr);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x2, y2);
      g.closePath();
      g.stroke();
      return;
    }

    // Seams: push each corner ~half a pixel away from the centroid. The
    // overlap is harmless because each batch is painted source-over.
    const cxm = (x0 + x1 + x2) / 3;
    const cym = (y0 + y1 + y2) / 3;
    const grow = 0.55 * opts.dpr;
    const G: number[] = [];
    for (const [px, py] of [[x0, y0], [x1, y1], [x2, y2]] as const) {
      const dx = px - cxm;
      const dy = py - cym;
      const l = Math.hypot(dx, dy) || 1;
      G.push(px + (dx / l) * grow, py + (dy / l) * grow);
    }

    const img = bt.texture ? textures.get(bt.texture) : undefined;
    let painted = false;
    if (img) {
      const tx = tinted(g, img, bt.texture!, rgb);
      if (tx.pattern) {
        const s0 = uv[tri.a * 2] * tx.w, t0 = uv[tri.a * 2 + 1] * tx.h;
        const s1 = uv[tri.b * 2] * tx.w, t1 = uv[tri.b * 2 + 1] * tx.h;
        const s2 = uv[tri.c * 2] * tx.w, t2 = uv[tri.c * 2 + 1] * tx.h;
        const det = (s1 - s0) * (t2 - t0) - (s2 - s0) * (t1 - t0);
        if (Math.abs(det) > 1e-4) {
          const a = ((x1 - x0) * (t2 - t0) - (x2 - x0) * (t1 - t0)) / det;
          const c = ((x2 - x0) * (s1 - s0) - (x1 - x0) * (s2 - s0)) / det;
          const e = x0 - a * s0 - c * t0;
          const b = ((y1 - y0) * (t2 - t0) - (y2 - y0) * (t1 - t0)) / det;
          const d = ((y2 - y0) * (s1 - s0) - (y1 - y0) * (s2 - s0)) / det;
          const f = y0 - b * s0 - d * t0;
          // Clip to the grown screen triangle, then fill its texture-space
          // bounding box through the affine map. The clip means a badly
          // conditioned map can never paint outside its own triangle.
          g.save();
          g.beginPath();
          g.moveTo(G[0], G[1]);
          g.lineTo(G[2], G[3]);
          g.lineTo(G[4], G[5]);
          g.closePath();
          g.clip();
          g.transform(a, b, c, d, e, f);
          g.fillStyle = tx.pattern;
          const minS = Math.min(s0, s1, s2) - 2;
          const maxS = Math.max(s0, s1, s2) + 2;
          const minT = Math.min(t0, t1, t2) - 2;
          const maxT = Math.max(t0, t1, t2) + 2;
          g.fillRect(minS, minT, maxS - minS, maxT - minT);
          g.restore();
          painted = true;
        } else {
          // Degenerate UVs (every corner on one texel): solid fill with that
          // texel, tinted. Good enough for the 8×8 whites.
          const gg = tx.canvas.getContext("2d")!;
          const px = gg.getImageData(
            Math.max(0, Math.min(tx.w - 1, Math.floor(s0))),
            Math.max(0, Math.min(tx.h - 1, Math.floor(t0))),
            1,
            1,
          ).data;
          g.fillStyle = `rgba(${px[0]},${px[1]},${px[2]},${px[3] / 255})`;
          g.beginPath();
          g.moveTo(G[0], G[1]);
          g.lineTo(G[2], G[3]);
          g.lineTo(G[4], G[5]);
          g.closePath();
          g.fill();
          painted = true;
        }
      }
    }
    if (!painted) {
      g.fillStyle = `rgb(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255})`;
      g.beginPath();
      g.moveTo(G[0], G[1]);
      g.lineTo(G[2], G[3]);
      g.lineTo(G[4], G[5]);
      g.closePath();
      g.fill();
    }

    // Lit batches get a simple lambert darkening; most spell visuals are unlit.
    if (!(bt.flags & 0x1)) {
      const ux = x1 - x0, uy = y1 - y0, uz = (sd[tri.b] - sd[tri.a]) * scale;
      const vx = x2 - x0, vy = y2 - y0, vz = (sd[tri.c] - sd[tri.a]) * scale;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      const lam = Math.abs((nx * 0.4 - ny * 0.3 + nz * 0.87) / l);
      const dark = (1 - (0.45 + 0.55 * lam)) * 0.7;
      if (dark > 0.01) {
        g.fillStyle = `rgba(0,0,0,${dark})`;
        g.beginPath();
        g.moveTo(G[0], G[1]);
        g.lineTo(G[2], G[3]);
        g.lineTo(G[4], G[5]);
        g.closePath();
        g.fill();
      }
    }
  };

  const isAdd = (blend: number) => blend === 3 || blend === 4;
  const isMod = (blend: number) => blend === 5 || blend === 6;

  if (opts.wire) {
    ctx.globalCompositeOperation = "source-over";
    for (const list of perBatch) for (const tri of list) paint(ctx, tri);
    return;
  }

  // 1. Opaque and alpha-blended batches, painter's order, straight on — but
  //    only at full opacity. A batch mid-fade goes through the scratch layer
  //    below instead: its grown triangles overlap on purpose (see `paint`),
  //    and painting the overlaps straight on at partial alpha double-blends
  //    every shared edge into a visible line — the hearts read as wireframe
  //    while they pulse.
  const layer = layerFor(canvas);
  const direct: Tri[] = [];
  const faded: number[] = [];
  mesh.batches.forEach((bt, bi) => {
    if (isAdd(bt.blend) || isMod(bt.blend)) return;
    if (batchA[bi] > 0.998) direct.push(...perBatch[bi]);
    else if (perBatch[bi].length) faded.push(bi);
  });
  direct.sort((p1, p2) => p1.depth - p2.depth);
  ctx.globalCompositeOperation = "source-over";
  for (const tri of direct) paint(ctx, tri);
  for (const bi of faded) {
    const list = perBatch[bi];
    list.sort((p1, p2) => p1.depth - p2.depth);
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalCompositeOperation = "source-over";
    layer.globalAlpha = 1;
    layer.clearRect(0, 0, W, H);
    for (const tri of list) paint(layer, tri);
    ctx.globalAlpha = batchA[bi];
    ctx.drawImage(layer.canvas, 0, 0);
  }
  ctx.globalAlpha = 1;

  // 2. Additive and modulate batches: each on its own layer (source-over,
  //    so a batch never doubles against itself), then blended once.
  mesh.batches.forEach((bt, bi) => {
    if (!isAdd(bt.blend) && !isMod(bt.blend)) return;
    const list = perBatch[bi];
    if (list.length === 0) return;
    list.sort((p1, p2) => p1.depth - p2.depth);
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalCompositeOperation = "source-over";
    layer.globalAlpha = 1;
    layer.clearRect(0, 0, W, H);
    for (const tri of list) paint(layer, tri);
    ctx.globalCompositeOperation = isAdd(bt.blend) ? "lighter" : "multiply";
    ctx.globalAlpha = batchA[bi];
    ctx.drawImage(layer.canvas, 0, 0);
  });
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}
