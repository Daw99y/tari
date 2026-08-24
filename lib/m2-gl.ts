/* Draws M2 models with WebGL, for anything solid and lit.
 *
 * The 2D canvas in m2-render.ts is right for spell visuals: a few hundred
 * additive triangles, painter-sorted, unlit. A character is none of those
 * things — thousands of opaque triangles that have to occlude each other and
 * catch a light — so this module hands the same parsed M2 to three.js and
 * lets a depth buffer do the sorting.
 *
 * Skinning stays on the CPU, reusing `poseBones` and `skin` from m2-render so
 * there is one implementation of the bone maths in the codebase. A body is
 * about three thousand vertices, which costs well under a millisecond; the
 * win is that attachments can read a bone's world matrix straight off the
 * pose, which is exactly what hanging a sword in a hand needs.
 */

import * as THREE from "three";

import { type M2Mesh, type M2Sequence } from "@/lib/m2";
import { poseBones, skin, type Pose } from "@/lib/m2-render";

/** Model space is Z-up with +X the way the model faces. Three.js is Y-up, so
 *  every piece hangs under a group carrying this one rotation. */
export const MODEL_TO_SCENE = new THREE.Euler(-Math.PI / 2, 0, 0);

/** Textures a model names for itself, keyed the way `texKey` flattens a game
 *  path. Most character models name none; the night elves and the undead name
 *  an eye glow. */
export type GlTextures = Map<string, THREE.Texture>;

export type PieceOptions = {
  /** Which geosets to draw. Null draws every batch — right for an item, wrong
   *  for a character, where the file holds every glove and boot at once. */
  geosets?: Set<number> | null;
  /** Textures for the slots the game fills at runtime, keyed by texture type:
   *  1 the composed body skin, 2 an item's own texture, 6 hair, 8 skin extra.
   *  A character needs at least 1 and 6; an item needs 2. */
  runtime?: Map<number, THREE.Texture>;
  /** Attach to this attachment id on the parent piece instead of standing on
   *  its own. */
  attachTo?: number;
  /** Draw every batch two-sided, whatever its render flags say. A character
   *  body needs this: the polygons around the mouth are wound inward, so
   *  front-face culling punches a hole clean through the face and you see the
   *  inside of the head. The game never shows it because those polygons sit
   *  behind the lips, but nothing here draws them from the inside. An item
   *  should be left alone — culling is free and its winding is honest. */
  doubleSided?: boolean;
};

/** One M2 in the scene: its geometry, its per-batch materials, and the buffers
 *  the skinning writes into. */
export class Piece {
  readonly mesh: M2Mesh;
  readonly object: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  readonly materials: THREE.Material[];
  readonly attachTo: number | null;

  private readonly posed: Float32Array;
  private readonly normals: Float32Array;
  private geosets: Set<number> | null;
  private pose: Pose | null = null;

  constructor(mesh: M2Mesh, textures: GlTextures, opts: PieceOptions = {}) {
    this.mesh = mesh;
    this.attachTo = opts.attachTo ?? null;
    this.geosets = opts.geosets ?? null;
    this.posed = new Float32Array(mesh.vertexCount * 3);
    this.normals = new Float32Array(mesh.vertexCount * 3);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.posed, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.normals, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    this.geometry = g;

    this.materials = mesh.batches.map((b) => {
      const named = b.texture ? textures.get(texKey(b.texture)) : null;
      const map = b.textureType === 0 ? named : (opts.runtime?.get(b.textureType) ?? named);
      const m = new THREE.MeshLambertMaterial({
        map: map ?? null,
        color: map ? 0xffffff : 0x888888,
        side: opts.doubleSided || b.flags & 0x4 ? THREE.DoubleSide : THREE.FrontSide,
      });
      // Blend 1 is a hard alpha key — the cutouts in hair and cloth. Blend 2
      // is real translucency. 3 and 4 are additive; nothing on a character
      // uses them, but an item's glow might.
      // Hair is a cutout whatever the blend says. The slots the game fills
      // with hair art — 6, and 8 on a tauren — carry textures that are mostly
      // transparent, and a batch marked opaque renders every empty texel as a
      // solid black slab.
      const cutout = b.textureType === 6 || b.textureType === 8;
      if (b.blend === 1 || (cutout && b.blend === 0)) {
        m.transparent = false;
        m.alphaTest = 0.5;
      } else if (b.blend === 2) {
        m.transparent = true;
        m.depthWrite = false;
      } else if (b.blend === 3 || b.blend === 4) {
        m.transparent = true;
        m.blending = THREE.AdditiveBlending;
        m.depthWrite = false;
      }
      return m;
    });

    this.object = new THREE.Mesh(g, this.materials);
    this.object.frustumCulled = false;
    this.applyGeosets();
  }

  /** Rebuild the draw groups so only the wanted geosets are submitted. Three
   *  has no per-group visibility flag, so the group list is the filter. */
  private applyGeosets() {
    this.geometry.clearGroups();
    this.mesh.batches.forEach((b, i) => {
      if (this.geosets && !this.geosets.has(b.geoset)) return;
      this.geometry.addGroup(b.start, b.count, i);
    });
  }

  setGeosets(geosets: Set<number> | null) {
    this.geosets = geosets;
    this.applyGeosets();
  }

  /** Sample the bones at time `t` and skin into the buffers. */
  update(t: number, seq: M2Sequence | null) {
    // Rest any bone this sequence does not key: see `sampleTrack`.
    const pose = poseBones(this.mesh, t, seq, NO_CAMERA, true);
    this.pose = pose;
    skin(this.mesh, pose, this.posed);
    skinNormals(this.mesh, pose, this.normals);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  /** Where an attachment sits after posing, in model space. Null when this
   *  model has no such attachment. */
  attachmentMatrix(id: number, out: THREE.Matrix4): THREE.Matrix4 | null {
    const a = this.mesh.attachments.find((x) => x.id === id);
    if (!a || !this.pose) return null;
    const M = this.pose.world[a.bone];
    if (!M) return null;
    // The stored 3×4 is row-major; three.js `set` takes rows too.
    out.set(M[0], M[1], M[2], M[3], M[4], M[5], M[6], M[7], M[8], M[9], M[10], M[11], 0, 0, 0, 1);
    // The attachment's own offset rides in the bone's space.
    return out.multiply(new THREE.Matrix4().makeTranslation(a.position[0], a.position[1], a.position[2]));
  }

  dispose() {
    this.geometry.dispose();
    for (const m of this.materials) m.dispose();
  }
}

/* Billboards are a spell-visual trick and no character bone sets the flag, so
 * the pose never needs a real camera here. */
const NO_CAMERA = { yaw: 0, pitch: 0 };

/** Skin the normals with the same pose. Only the rotation part applies, so
 *  the translation column is dropped and the result renormalised. */
function skinNormals(mesh: M2Mesh, pose: Pose, out: Float32Array) {
  const n = mesh.vertexCount;
  for (let i = 0; i < n; i++) {
    const x = mesh.normals[i * 3];
    const y = mesh.normals[i * 3 + 1];
    const z = mesh.normals[i * 3 + 2];
    let ox = 0;
    let oy = 0;
    let oz = 0;
    let wsum = 0;
    for (let k = 0; k < 4; k++) {
      const w = mesh.boneWeights[i * 4 + k] / 255;
      if (w === 0) continue;
      const M = pose.world[mesh.boneIndices[i * 4 + k]];
      if (!M) continue;
      ox += (M[0] * x + M[1] * y + M[2] * z) * w;
      oy += (M[4] * x + M[5] * y + M[6] * z) * w;
      oz += (M[8] * x + M[9] * y + M[10] * z) * w;
      wsum += w;
    }
    if (wsum === 0) {
      ox = x;
      oy = y;
      oz = z;
    }
    const len = Math.hypot(ox, oy, oz) || 1;
    out[i * 3] = ox / len;
    out[i * 3 + 1] = oy / len;
    out[i * 3 + 2] = oz / len;
  }
}

/** The key a texture is filed under: the whole game path flattened, matching
 *  what the build script writes. Keying on the file name alone collides —
 *  every race ships its own `Character\<Race>\Hair00_00.blp`. */
function texKey(path: string): string {
  return path.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "_") + ".webp";
}

/** Load a PNG as a texture with the filtering the art expects: no mipmap
 *  shimmer on a 256-pixel skin, and no colour management on top of art that
 *  was authored for a fixed-function pipeline. */
export function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.flipY = false;
        t.needsUpdate = true;
        resolve(t);
      },
      undefined,
      () => reject(new Error(`texture failed: ${url}`)),
    );
  });
}
