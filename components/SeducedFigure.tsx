"use client";

/* The seduced rogue: a dressed human female out of the 1.12 client, standing
 * in the hero photograph, held in the Stun loop with the Seduction hearts
 * over her head.
 *
 * The body, the gear and the animation all come from the same machinery the
 * fitting bench at /lab/doll uses — the M2 reader, the geoset rules, the
 * composed body skin — with the choices pinned instead of picked: one race,
 * one gender, one outfit, one sequence. The hearts stay a 2D additive sprite
 * (see M2Sprite) because that is what the effect is; only the figure needs a
 * depth buffer and a light.
 *
 * Anything that fails to load leaves the photograph as it was. The figure is
 * an inhabitant, not the page. */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

import { composeBody, LAYER_ORDER, visibleGeosets, type BodyLayer, type Region } from "@/lib/doll";
import { parseM2, type M2Mesh } from "@/lib/m2";
import { bodyFile, parseTbody } from "@/lib/tbody";
import { loadTexture, MODEL_TO_SCENE, Piece, texKey } from "@/lib/m2-gl";
import { dress, namedTextureUrl, type Catalogue, type Item } from "@/lib/wardrobe";

const BASE = "/lab/doll";

/* ---------- who she is ---------- */

/* The pins below are mirrored in scripts/hero-bake.mjs, which bakes
 * hero.json from them. Change one, change the other, re-run the bake. */
const RACE = 1; // human
const GENDER = 1; // female
const LOOK = {
  skinColor: 3,
  faceVariation: 6,
  /** CharHairGeosets variation; the geoset comes from the manifest row. */
  hairVariation: 14,
  hairColor: 7,
  /** Facial style 2 of 7: the earrings. Pure geosets, no texture rows. */
  facialGeosets: [0, 0, 2] as [number, number, number],
};

/** The level 29 twink rogue, best in slot: Warcraft Tavern's list, Alliance
 *  side. Zealot Blade and Vendetta in the hands.
 *  `attach` overrides the socket for the off-hand blade — the catalogue files
 *  every one-hander under the right hand. */
const OUTFIT: { entry: number; attach?: number }[] = [
  // Worn but not drawn, the way the client draws them: the hat is off so her
  // hair shows, the shirt is under the tunic, and a guild tabard would drape
  // over the leathers this page exists to show. The bow stays in its slot
  // too — the ranged socket is the left hand, and Vendetta has it. All four
  // still sit in the landing page's sheet.
  { entry: 2264 }, // Mantle of Thieves
  { entry: 13108 }, // Tigerstrike Mantle
  { entry: 4119 }, // Raptor Hunter Tunic
  { entry: 9455 }, // Emissary Cuffs
  { entry: 6727 }, // Razzeric's Racing Grips
  { entry: 20117 }, // Highlander's Leather Girdle
  { entry: 9624 }, // Triprunner Dungarees
  { entry: 20114 }, // Highlander's Leather Boots
  { entry: 13033 }, // Zealot Blade, main hand
  { entry: 776, attach: 2 }, // Vendetta, forced to the left hand
];

/** AnimationData ids. 14 is Stun — the dazed CC sway the hero holds. 0 is
 *  Stand, the breathing idle a character sheet shows. */
const STUN = 14;
const STAND = 0;

export type Pose = "stunned" | "standing";

/* ---------- caches, shared for the life of the page ---------- */

const meshes = new Map<string, Promise<M2Mesh>>();
const textures = new Map<string, Promise<THREE.Texture>>();

function cachedModel(url: string): Promise<M2Mesh> {
  const hit = meshes.get(url);
  if (hit) return hit;
  const load = fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    const buf = await r.arrayBuffer();
    return url.endsWith(".tbody") ? parseTbody(buf) : parseM2(buf);
  });
  meshes.set(url, load);
  load.catch(() => meshes.delete(url));
  return load;
}

function cachedTexture(url: string): Promise<THREE.Texture> {
  const hit = textures.get(url);
  if (hit) return hit;
  const load = loadTexture(url);
  textures.set(url, load);
  load.catch(() => textures.delete(url));
  return load;
}

/* ---------- manifest, narrowed to the one body this draws ---------- */

type Section = { kind: string; variation: number; color: number; files: Record<string, string | undefined> };
type GenderBlock = {
  gender: number;
  model: string;
  namedTextures: Record<string, string>;
  hairStyles: { variation: number; geoset: number }[];
  sections: Section[];
};

async function loadJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function itemByEntry(cat: Catalogue, entry: number): Item | null {
  const row = cat.items.find((x) => x[0] === entry);
  if (!row) return null;
  const [, displayId, inventoryType, quality, itemLevel, name, leftover] = row;
  const slot = cat.inventory[inventoryType]?.slot;
  if (!slot) return null;
  const icon = cat.display[displayId]?.i;
  return {
    entry,
    displayId,
    inventoryType,
    quality,
    itemLevel,
    name,
    slot,
    icon: icon ? cat.pool[icon] : null,
    leftover: leftover === 1,
  };
}

type Props = {
  /** Figure height in pixels; the box is sized from it. */
  height: number;
  /** Where her feet touch the floor, in container pixels. */
  left: number;
  top: number;
  /** Where her head landed, as fractions of this box — the helm socket
   *  projected through the camera, so the hearts can sit on it instead of on
   *  a guess. Fractions survive a resize; pixels would not. */
  onHead?: (pt: { x: number; y: number }) => void;
  /** Which loop she holds. The hero is stunned; the sheet just stands. */
  pose?: Pose;
  /** Extra camera yaw in radians. The hero keeps her three-quarter turn into
   *  the scene; the sheet spins the camera round to her front. */
  turn?: number;
  className?: string;
  shadowClassName?: string;
};

export default function SeducedFigure({
  height,
  left,
  top,
  onHead,
  pose = "stunned",
  turn = 0,
  className,
  shadowClassName,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let live = true;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let observer: ResizeObserver | null = null;
    let bodyPiece: Piece | null = null;
    let attached: { piece: Piece; attach: number }[] = [];
    let bodyTex: THREE.Texture | null = null;
    let cleanupPointer: (() => void) | null = null;

    (async () => {
      /* Everything she needs to know — her gender block out of the manifest,
       * her ten items out of the catalogue — is baked into one 3 KB file by
       * `scripts/hero-bake.mjs`. The full manifest and catalogue are 1.9 MB
       * between them, which is what made a first visit wait. Only the body
       * geometry follows, and alone. */
      const hero = await loadJson<{ g: GenderBlock; cat: Catalogue }>(`${BASE}/hero.json`);
      const { g, cat: catalogue } = hero;
      const body = await cachedModel(`${BASE}/body/${bodyFile(g.model)}`);
      if (!live) return;

      /* --- the look, resolved the way the bench resolves it --- */
      const section = (kind: string, variation: number, color: number) =>
        g.sections.find((s) => s.kind === kind && s.variation === variation && s.color === color)?.files ?? {};
      const hairStyle = g.hairStyles.find((h) => h.variation === LOOK.hairVariation) ?? g.hairStyles[0];
      const skinFiles = section("skin", 0, LOOK.skinColor);
      const face = section("face", LOOK.faceVariation, LOOK.skinColor);
      const underwear = section("underwear", 0, LOOK.skinColor);
      const hair = section("hair", hairStyle?.variation ?? 0, LOOK.hairColor);
      const hairTexture = hair.hair && !/face/i.test(hair.hair) ? hair.hair : undefined;

      /* --- the outfit --- */
      const dressed = OUTFIT.map((o) => ({ o, item: itemByEntry(catalogue, o.entry) }))
        .filter((x): x is { o: (typeof OUTFIT)[number]; item: Item } => x.item !== null)
        .sort((a, b) => LAYER_ORDER.indexOf(a.item.slot) - LAYER_ORDER.indexOf(b.item.slot))
        .map(({ o, item }) => {
          const d = dress(catalogue, item, RACE, GENDER);
          if (d && o.attach !== undefined) for (const m of d.models) m.attach = o.attach;
          return d;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      const layers: BodyLayer[] = [];
      const push = (region: Region, file?: string) => {
        if (file) layers.push({ region, urls: [`${BASE}/tex/${file}`] });
      };
      push("faceLower", face.lower);
      push("faceUpper", face.upper);
      push("faceLower", hair.scalpLower);
      push("faceUpper", hair.scalpUpper);
      push("legUpper", underwear.pelvis);
      push("torsoUpper", underwear.torso);
      for (const d of dressed) layers.push(...d.layers);
      const cape = dressed.find((d) => d.capeUrl)?.capeUrl;

      const [skinCanvas, hairTex, extraTex, capeTex, namedPairs, worn] = await Promise.all([
        composeBody(`${BASE}/tex/${skinFiles.skin ?? ""}`, layers),
        hairTexture ? cachedTexture(`${BASE}/tex/${hairTexture}`) : null,
        skinFiles.extra ? cachedTexture(`${BASE}/tex/${skinFiles.extra}`) : null,
        cape ? cachedTexture(cape) : null,
        Promise.all(
          Object.entries(g.namedTextures).map(
            async ([k, file]) => [k, await cachedTexture(`${BASE}/tex/${file}`)] as const,
          ),
        ),
        Promise.all(
          dressed.flatMap((d) =>
            d.models.map(async (model) => {
              try {
                const mesh = await cachedModel(model.url);
                const [own, named] = await Promise.all([
                  model.textureUrl ? cachedTexture(model.textureUrl) : null,
                  Promise.all(
                    mesh.textures
                      .filter((p): p is string => !!p)
                      .map(async (p) => {
                        try {
                          return [texKey(p), await cachedTexture(namedTextureUrl(p))] as const;
                        } catch {
                          return null;
                        }
                      }),
                  ),
                ]);
                return {
                  mesh,
                  own,
                  named: named.filter((x): x is readonly [string, THREE.Texture] => x !== null),
                  attach: model.attach,
                };
              } catch {
                return null;
              }
            }),
          ),
        ),
      ]);
      if (!live) return;

      const skinTex = new THREE.CanvasTexture(skinCanvas);
      skinTex.colorSpace = THREE.SRGBColorSpace;
      skinTex.flipY = false;
      bodyTex = skinTex;

      const runtime = new Map<number, THREE.Texture>([[1, skinTex]]);
      if (hairTex) runtime.set(6, hairTex);
      if (extraTex) runtime.set(8, extraTex);
      if (capeTex) runtime.set(2, capeTex);

      const shown = visibleGeosets({
        hairGeoset: hairStyle?.geoset ?? 0,
        facialHair: LOOK.facialGeosets,
        items: dressed.map((d) => d.worn),
      });

      /* --- the stage --- */
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(26, 0.85, 0.05, 100);
      const stage = new THREE.Group();
      stage.rotation.copy(MODEL_TO_SCENE);
      scene.add(stage);

      /* Lit for the hall, not the creation screen: a dim violet ambient so
       * her shadow side falls toward the room's own dark, a warm key from the
       * high left where the lanterns hang, and a faint red rim for the
       * hearts' glow. */
      scene.add(new THREE.AmbientLight(0x9a8fb0, 0.85));
      const key = new THREE.DirectionalLight(0xffd9a8, 1.1);
      key.position.set(-2, 5, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xff5a72, 0.4);
      rim.position.set(2, 3, -3);
      scene.add(rim);

      bodyPiece = new Piece(body, new Map(namedPairs), { geosets: shown, runtime });
      stage.add(bodyPiece.object);
      attached = worn
        .filter((w): w is NonNullable<(typeof worn)[number]> => w !== null)
        .map((w) => {
          const piece = new Piece(w.mesh, new Map(w.named), { runtime: new Map(w.own ? [[2, w.own]] : []) });
          piece.object.matrixAutoUpdate = false;
          piece.update(0, w.mesh.sequences[0] ?? null);
          stage.add(piece.object);
          return { piece, attach: w.attach };
        });

      /* Frame her body edge to edge — the box is her height, so her feet
       * land on the anchor. She faces the camera turned a little toward the
       * title. */
      const bodyH = Math.max(0.5, body.bounds.max[2] - body.bounds.min[2]);
      const dist = bodyH * 2.6;
      const target = bodyH * 0.48;
      const yaw = Math.PI / 2 - 0.35 - Math.PI / 4 + turn;
      const pitch = 0.03;
      const aim = (yawOff = 0, pitchOff = 0) => {
        const ya = yaw + yawOff;
        const pa = pitch + pitchOff;
        camera.position.set(
          Math.sin(ya) * Math.cos(pa) * dist,
          target + Math.sin(pa) * dist,
          Math.cos(ya) * Math.cos(pa) * dist,
        );
        camera.lookAt(0, target, 0);
      };
      aim();

      const resize = () => {
        if (!renderer) return;
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      const wanted = pose === "standing" ? STAND : STUN;
      const stun =
        body.sequences.find((s) => s.id === wanted) ?? body.sequences.find((s) => s.id === STAND) ?? null;
      const span = stun ? Math.max(1, stun.end - stun.start) : 1000;
      const started = performance.now();
      const socketMatrix = new THREE.Matrix4();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* She notices the cursor: the camera eases a few degrees toward it,
       * which reads as her turning to look. Off with reduced motion. */
      const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      if (!reduce) window.addEventListener("pointermove", onPointer);
      cleanupPointer = () => window.removeEventListener("pointermove", onPointer);

      let headSent = false;
      const draw = (t: number) => {
        if (!renderer || !bodyPiece) return;
        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        aim(pointer.x * 0.22, -pointer.y * 0.05);
        bodyPiece.update(t, stun);
        for (const a of attached) {
          const m = bodyPiece.attachmentMatrix(a.attach, socketMatrix);
          if (m) a.piece.object.matrix.copy(m);
        }
        renderer.render(scene, camera);
        if (!headSent && onHead) {
          // Helm socket, id 11: the one point that is her head whatever the
          // file's bounds say. Model space → stage → camera → this box.
          const m = bodyPiece.attachmentMatrix(11, socketMatrix);
          if (m) {
            headSent = true;
            stage.updateMatrixWorld();
            const v = new THREE.Vector3().setFromMatrixPosition(m).applyMatrix4(stage.matrixWorld).project(camera);
            onHead({ x: (v.x + 1) / 2, y: (1 - v.y) / 2 });
          }
        }
      };

      if (reduce) {
        // One still frame mid-sway; the pose reads without the motion.
        draw((stun?.start ?? 0) + span / 2);
      } else {
        const tick = () => {
          frame = requestAnimationFrame(tick);
          draw((stun?.start ?? 0) + ((performance.now() - started) % span));
        };
        tick();
      }
      setReady(true);
    })().catch(() => {
      /* A missing file leaves the page as it was: the room still shows. */
    });

    return () => {
      live = false;
      cleanupPointer?.();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      bodyPiece?.dispose();
      for (const a of attached) a.piece.dispose();
      if (bodyTex instanceof THREE.CanvasTexture) bodyTex.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- everything is
    // pinned; `onHead` fires once and must not rebuild the scene, and `pose`
    // is chosen by the caller at mount and never changes under it.
  }, []);

  /* The box: `height` tall, anchored by her feet. The shadow pools under her
   * boots; the hearts are the page's own additive sprite, drawn beside this
   * box rather than in it — an opacity fade isolates a blend group, and a
   * screen-blended canvas inside one goes black. */
  const style: CSSProperties = {
    left,
    top,
    width: height * 0.85,
    height,
  };

  return (
    <div className={className} style={style} data-ready={ready ? "true" : "false"}>
      {shadowClassName ? <span className={shadowClassName} aria-hidden /> : null}
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
