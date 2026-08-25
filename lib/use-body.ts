"use client";

/* THE BODY, as a hook. docs/DOLL.md, docs/CHARACTER.md.
 *
 * Everything that draws a character — the manifest, the model, the
 * wardrobe, the WebGL scene, the dressing — pulled out of the lab bench so
 * two surfaces can stand on it: the bench (`app/lab/doll`), which keeps its
 * developer panels, and the creator (`app/(app)/you/new`), which does not.
 *
 * Inputs are the five choices and what is worn. Outputs are the host to
 * mount, what this body offers, and what the machine is doing. Nothing in
 * here renders a control. */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  composeBody,
  familyOf,
  FACTION,
  GEOSET_FAMILY,
  hiddenGroups,
  LAYER_ORDER,
  visibleGeosets,
  type BodyLayer,
  type Region,
} from "@/lib/doll";
import { parseM2, type M2Mesh } from "@/lib/m2";
import { bodyFile, parseTbody } from "@/lib/tbody";
import { loadTexture, MODEL_TO_SCENE, Piece, texKey } from "@/lib/m2-gl";
import { dress, loadCatalogue, namedTextureUrl, type Catalogue, type Dressed, type Item as WardrobeItem } from "@/lib/wardrobe";

export const BASE = "/lab/doll";

/** The three CharSections texture columns, named. */
export type Section = {
  kind: string;
  variation: number;
  color: number;
  files: Partial<
    Record<"skin" | "extra" | "lower" | "upper" | "hair" | "scalpLower" | "scalpUpper" | "pelvis" | "torso", string>
  >;
};

export type GenderBlock = {
  gender: number;
  name: string;
  model: string;
  namedTextures: Record<string, string>;
  hairStyles: { variation: number; geoset: number; showScalp: boolean }[];
  facialStyles: { variation: number; geosets: number[] }[];
  hairColors: (string | null)[];
  skinColors: (string | null)[];
  sections: Section[];
};

export type RaceBlock = { race: number; name: string; facialLabel: string; genders: GenderBlock[] };
export type Manifest = { races: RaceBlock[] };

/** The whole appearance, as indices into the option lists. Indices rather
 *  than values so switching body only has to clamp, never translate. */
export type Look = { skin: number; face: number; hair: number; hairColor: number; beard: number };

export const DEFAULT_LOOK: Look = { skin: 0, face: 0, hair: 1, hairColor: 0, beard: 0 };

export type Options = {
  skin: { hex: string; i: number }[];
  face: number[];
  hair: GenderBlock["hairStyles"];
  hairColor: { hex: string; i: number }[];
  beard: GenderBlock["facialStyles"];
};

const NO_OPTIONS: Options = { skin: [], face: [], hair: [], hairColor: [], beard: [] };

/** A look that fits this body's lists. An empty list means the manifest has
 *  not arrived, not that the body has no choices, so it is left alone. */
export function fitLook(look: Look, options: Options): Look {
  const fit = (i: number, n: number) => (n ? Math.min(i, n - 1) : i);
  return {
    skin: fit(look.skin, options.skin.length),
    face: fit(look.face, options.face.length),
    hair: fit(look.hair, options.hair.length),
    hairColor: fit(look.hairColor, options.hairColor.length),
    beard: fit(look.beard, options.beard.length),
  };
}

export const wrap = (i: number, n: number) => (n === 0 ? 0 : ((i % n) + n) % n);

/* Bodies arrive as `.tbody` — the same model with the 130-odd animations
 * nothing plays taken out (`scripts/doll-strip.mjs`). Worn items are small
 * and stay `.m2`. */
async function fetchModel(url: string): Promise<M2Mesh> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const buf = await r.arrayBuffer();
  return url.endsWith(".tbody") ? parseTbody(buf) : parseM2(buf);
}

/* Parsed models and uploaded textures, kept for the life of the page and
 * keyed by URL, which already carries the race and gender suffix. A shared
 * texture is safe: `Piece.dispose` disposes materials, not their maps. */
const meshes = new Map<string, Promise<M2Mesh>>();
const textures = new Map<string, Promise<THREE.Texture>>();

function cachedModel(url: string): Promise<M2Mesh> {
  const hit = meshes.get(url);
  if (hit) return hit;
  const load = fetchModel(url);
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

/** One worn model and everything it needs to draw, or null if the client
 *  does not ship it for this body. */
async function loadWorn(model: { url: string; textureUrl: string | null; attach: number }) {
  try {
    const mesh = await cachedModel(model.url);
    const [own, named] = await Promise.all([
      model.textureUrl ? cachedTexture(model.textureUrl) : null,
      Promise.all(
        mesh.textures.filter((path): path is string => !!path).map(async (path) => {
          try {
            return [texKey(path), await cachedTexture(namedTextureUrl(path))] as const;
          } catch {
            console.warn(`doll: ${model.url} names ${path}, which is not in the wardrobe`);
            return null;
          }
        }),
      ),
    ]);
    return { mesh, own, named: named.filter((x): x is readonly [string, THREE.Texture] => x !== null), attach: model.attach };
  } catch (e) {
    console.warn(`doll: ${model.url} did not load`, e);
    return null;
  }
}

export type BodyInput = {
  race: number;
  gender: number;
  look: Look;
  equipped: Map<string, WardrobeItem>;
  /** The bench's switches. The creator leaves them at their defaults. */
  regionMap?: boolean;
  showAll?: boolean;
  overrides?: Map<number, boolean>;
};

const NO_OVERRIDES = new Map<number, boolean>();

export function useBody({ race, gender, look, equipped, regionMap = false, showAll = false, overrides = NO_OVERRIDES }: BodyInput) {
  const hostRef = useRef<HTMLDivElement>(null);
  /* Where the camera is pointing, kept across scene rebuilds. `zoom` is a
   * fraction of the model's height so it survives a switch to a taller body. */
  const view = useRef({ yaw: Math.PI / 2, pitch: 0.06, zoom: 2.6 });
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [body, setBody] = useState<M2Mesh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [wardrobeFault, setWardrobeFault] = useState<string | null>(null);
  const [tris, setTris] = useState(0);

  const r = useMemo(() => manifest?.races.find((x) => x.race === race) ?? null, [manifest, race]);
  const g = useMemo(() => r?.genders.find((x) => x.gender === gender) ?? r?.genders[0] ?? null, [r, gender]);

  /* The creation screen splits the roster by faction, so this does too. */
  const roster = useMemo(() => {
    const by = { Alliance: [] as RaceBlock[], Horde: [] as RaceBlock[] };
    for (const x of manifest?.races ?? []) by[FACTION[x.race] ?? "Alliance"].push(x);
    return by;
  }, [manifest]);

  /** Every geoset the loaded model actually carries. */
  const carried = useMemo(() => new Set((body?.batches ?? []).map((b) => b.geoset)), [body]);

  /* What this body offers, minus the styles the model cannot draw. */
  const options = useMemo<Options>(() => {
    if (!g) return NO_OPTIONS;
    const drawable = (variants: number[]) =>
      variants.every((v) => v === 0) || variants.some((v, i) => v !== 0 && carried.has((i + 1) * 100 + v));
    const variations = (kind: string) =>
      [...new Set(g.sections.filter((s) => s.kind === kind).map((s) => s.variation))].sort((a, b) => a - b);
    const colours = (list: (string | null)[]) =>
      list.map((hex, i) => ({ hex, i })).filter((c): c is { hex: string; i: number } => !!c.hex);
    return {
      skin: colours(g.skinColors),
      face: variations("face"),
      hair: carried.size ? g.hairStyles.filter((h) => h.geoset === 0 || carried.has(h.geoset)) : g.hairStyles,
      hairColor: colours(g.hairColors),
      beard: carried.size ? g.facialStyles.filter((f) => drawable(f.geosets)) : g.facialStyles,
    };
  }, [g, carried]);

  /* The look, as this body can actually wear it. */
  const fitted = useMemo(() => fitLook(look, options), [look, options]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const m: Manifest = await (await fetch(`${BASE}/manifest.json`)).json();
        if (live) setManifest(m);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  /* The wardrobe: 90 MB of item art that is not in git, so a checkout without
   * it still draws a naked character rather than a blank page. */
  useEffect(() => {
    let live = true;
    loadCatalogue().then(
      (c) => live && setCatalogue(c),
      (e) => live && setWardrobeFault(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, []);

  /* The character model, reloaded when the body changes. */
  useEffect(() => {
    if (!g) return;
    let live = true;
    setBody(null);
    (async () => {
      try {
        const mesh = await cachedModel(`${BASE}/body/${bodyFile(g.model)}`);
        if (live) setBody(mesh);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [g]);

  /* Resolve the indices into meshes and textures. */
  const chosen = useMemo(() => {
    const hair = options.hair[fitted.hair];
    const beard = options.beard[fitted.beard];
    const skinColor = options.skin[fitted.skin]?.i ?? 0;
    const hairColor = options.hairColor[fitted.hairColor]?.i ?? 0;
    const faceVariation = options.face[fitted.face] ?? 0;
    const section = (kind: string, variation: number, color: number) =>
      g?.sections.find((s) => s.kind === kind && s.variation === variation && s.color === color);
    const hairRow = section("hair", hair?.variation ?? 0, hairColor)?.files ?? {};
    return {
      hairGeoset: hair?.geoset ?? 0,
      showScalp: hair?.showScalp ?? false,
      beardGeosets: beard?.geosets ?? [0, 0, 0],
      skin: section("skin", 0, skinColor)?.files ?? {},
      face: section("face", faceVariation, skinColor)?.files ?? {},
      underwear: section("underwear", 0, skinColor)?.files ?? {},
      hair: hairRow,
      beard: section("facialHair", beard?.variation ?? 0, hairColor)?.files ?? {},
      // A tauren's hair row names no usable hair texture, and none is needed.
      hairTexture: hairRow.hair && !/face/i.test(hairRow.hair) ? hairRow.hair : undefined,
    };
  }, [g, options, fitted]);

  /* What every equipped item does to this body, in layering order. */
  const dressed = useMemo(() => {
    if (!catalogue) return [] as Dressed[];
    return [...equipped.values()]
      .sort((a, b) => LAYER_ORDER.indexOf(a.slot) - LAYER_ORDER.indexOf(b.slot))
      .map((item) => dress(catalogue, item, race, gender))
      .filter((d): d is Dressed => d !== null);
  }, [catalogue, equipped, race, gender]);

  const wornItems = useMemo(() => dressed.map((d) => d.worn), [dressed]);
  const hidden = useMemo(() => hiddenGroups(wornItems), [wornItems]);
  const ruled = useMemo(
    () => visibleGeosets({ hairGeoset: chosen.hairGeoset, facialHair: chosen.beardGeosets, items: wornItems }),
    [chosen, wornItems],
  );
  const shown = useMemo(() => {
    const set = new Set(ruled);
    for (const [geoset, on] of overrides) {
      if (on) set.add(geoset);
      else set.delete(geoset);
    }
    return set;
  }, [ruled, overrides]);

  /* Every geoset the file carries, grouped by family, with what each costs. */
  const families = useMemo(() => {
    if (!body) return [];
    const byGeoset = new Map<number, number>();
    for (const b of body.batches) byGeoset.set(b.geoset, (byGeoset.get(b.geoset) ?? 0) + b.count / 3);
    const grouped = new Map<number, { geoset: number; tris: number }[]>();
    for (const [geoset, t] of [...byGeoset].sort((a, b) => a[0] - b[0])) {
      const f = familyOf(geoset);
      if (!grouped.has(f)) grouped.set(f, []);
      grouped.get(f)!.push({ geoset, tris: t });
    }
    return [...grouped].map(([family, rows]) => ({
      family,
      name: GEOSET_FAMILY[family] ?? `family ${family}`,
      rows,
      max: Math.max(...rows.map((x) => x.tris)),
    }));
  }, [body]);

  /* ---------- the scene: built once per body ---------- */
  const rig = useRef<{
    stage: THREE.Group | null;
    bodyPiece: Piece | null;
    attached: { piece: Piece; attach: number }[];
    bodyTex: THREE.Texture | null;
  }>({ stage: null, bodyPiece: null, attached: [], bodyTex: null });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !body) return;

    let frame = 0;
    // Transparent: whatever is behind the host shows through, the way the
    // game's own creation screen composites the figure over its zone.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const stage = new THREE.Group();
    stage.rotation.copy(MODEL_TO_SCENE);
    scene.add(stage);
    rig.current.stage = stage;

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.5);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899cc, 0.55);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    const height = Math.max(0.5, body.bounds.max[2] - body.bounds.min[2]);
    let dist = height * view.current.zoom;
    const near = height * 0.4;
    const far = height * 6;
    const wide = height * 2.6;
    const targetFor = (d: number) => {
      const t = Math.min(1, Math.max(0, (d - near) / (wide - near)));
      return height * (0.94 - 0.42 * t);
    };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      view.current.yaw -= (e.clientX - lastX) * 0.008;
      view.current.pitch = Math.max(-0.7, Math.min(0.7, view.current.pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.max(near, Math.min(far, dist + e.deltaY * 0.004));
      view.current.zoom = dist / height;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const stand = body.sequences.find((s) => s.id === 0) ?? body.sequences[0] ?? null;
    const span = stand ? Math.max(1, stand.end - stand.start) : 1000;
    const start = performance.now();
    const socketMatrix = new THREE.Matrix4();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const { bodyPiece, attached } = rig.current;
      if (bodyPiece) {
        bodyPiece.update((stand?.start ?? 0) + ((performance.now() - start) % span), stand);
        for (const a of attached) {
          const m = bodyPiece.attachmentMatrix(a.attach, socketMatrix);
          if (m) a.piece.object.matrix.copy(m);
        }
      }
      const target = targetFor(dist);
      const { yaw, pitch } = view.current;
      camera.position.set(
        Math.sin(yaw) * Math.cos(pitch) * dist,
        target + Math.sin(pitch) * dist,
        Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      camera.lookAt(0, target, 0);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      const { bodyPiece, attached, bodyTex } = rig.current;
      bodyPiece?.dispose();
      for (const a of attached) a.piece.dispose();
      if (bodyTex instanceof THREE.CanvasTexture) bodyTex.dispose();
      rig.current = { stage: null, bodyPiece: null, attached: [], bodyTex: null };
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [body]);

  /* ---------- dressing the figure: everything fetched at once ---------- */
  useEffect(() => {
    const stage = rig.current.stage;
    if (!stage || !g || !body) return;
    let live = true;

    (async () => {
      const layers: BodyLayer[] = [];
      const push = (region: Region, file?: string) => {
        if (file) layers.push({ region, urls: [`${BASE}/tex/${file}`] });
      };
      push("faceLower", chosen.face.lower);
      push("faceUpper", chosen.face.upper);
      push("faceLower", chosen.hair.scalpLower);
      push("faceUpper", chosen.hair.scalpUpper);
      if (chosen.beardGeosets.some((v) => v !== 0)) {
        push("faceLower", chosen.beard.lower);
        push("faceUpper", chosen.beard.upper);
      }
      push("legUpper", chosen.underwear.pelvis);
      push("torsoUpper", chosen.underwear.torso);
      for (const d of dressed) layers.push(...d.layers);

      const cape = dressed.find((d) => d.capeUrl)?.capeUrl;

      const [skin, hairTex, extraTex, capeTex, namedPairs, worn] = await Promise.all([
        regionMap
          ? cachedTexture(`${BASE}/tex/_regionmap.png`)
          : composeBody(`${BASE}/tex/${chosen.skin.skin ?? ""}`, layers).then((canvas) => {
              const t = new THREE.CanvasTexture(canvas);
              t.colorSpace = THREE.SRGBColorSpace;
              t.flipY = false;
              return t as THREE.Texture;
            }),
        chosen.hairTexture ? cachedTexture(`${BASE}/tex/${chosen.hairTexture}`) : null,
        chosen.skin.extra ? cachedTexture(`${BASE}/tex/${chosen.skin.extra}`) : null,
        cape ? cachedTexture(cape) : null,
        Promise.all(
          Object.entries(g.namedTextures).map(
            async ([k, file]) => [k, await cachedTexture(`${BASE}/tex/${file}`)] as const,
          ),
        ),
        Promise.all(dressed.flatMap((d) => d.models.map((m) => loadWorn(m)))),
      ]);

      if (!live) {
        if (skin instanceof THREE.CanvasTexture) skin.dispose();
        return;
      }

      const runtime = new Map<number, THREE.Texture>([[1, skin]]);
      if (hairTex) runtime.set(6, hairTex);
      if (extraTex) runtime.set(8, extraTex);
      if (capeTex) runtime.set(2, capeTex);

      const bodyPiece = new Piece(body, new Map(namedPairs), { geosets: showAll ? null : shown, runtime });
      const attached = worn.filter((w) => w !== null).map((w) => {
        const piece = new Piece(w.mesh, new Map(w.named), { runtime: new Map(w.own ? [[2, w.own]] : []) });
        piece.object.matrixAutoUpdate = false;
        piece.update(0, w.mesh.sequences[0] ?? null);
        return { piece, attach: w.attach };
      });

      // Swap in one go, so a change never blinks the character out.
      const previous = rig.current;
      if (previous.bodyPiece) stage.remove(previous.bodyPiece.object);
      for (const a of previous.attached) stage.remove(a.piece.object);
      stage.add(bodyPiece.object);
      for (const a of attached) stage.add(a.piece.object);
      rig.current = { stage, bodyPiece, attached, bodyTex: skin };

      previous.bodyPiece?.dispose();
      for (const a of previous.attached) a.piece.dispose();
      if (previous.bodyTex instanceof THREE.CanvasTexture) previous.bodyTex.dispose();

      setTris(
        body.batches.reduce((n, b) => n + (showAll || shown.has(b.geoset) ? b.count / 3 : 0), 0) +
          attached.reduce((n, a) => n + a.piece.mesh.triangleCount, 0),
      );
    })().catch((e) => {
      if (live) setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      live = false;
    };
  }, [g, body, dressed, shown, showAll, regionMap, chosen]);

  return { hostRef, manifest, roster, r, g, body, options, fitted, catalogue, wardrobeFault, error, tris, families, hidden, ruled, shown };
}
