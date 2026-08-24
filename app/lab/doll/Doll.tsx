"use client";

/* The fitting bench.
 *
 * Two panels flanking one figure. On the left, who the character is: the same
 * five choices the game's own creation screen offers, in the same order. On
 * the right, what the machine is doing — what they are wearing, and every mesh
 * chunk the file holds, so a wrong dressing rule is visible rather than
 * mysterious. */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

import {
  composeBody,
  familyOf,
  FACTION,
  GEOSET_FAMILY,
  hiddenGroups,
  ROW_LABELS,
  SLOT_ATTACH,
  visibleGeosets,
  type BodyLayer,
  type Region,
} from "@/lib/doll";
import { parseM2, type M2Mesh } from "@/lib/m2";
import { loadTexture, MODEL_TO_SCENE, Piece, type GlTextures } from "@/lib/m2-gl";

import styles from "./doll.module.css";

const BASE = "/lab/doll";

/** The three CharSections texture columns, named. Which column does what
 *  depends on the kind: a hair row is the hair mesh's texture and the two
 *  halves of the scalp; a face row is the lower and upper halves. */
type Section = {
  kind: string;
  variation: number;
  color: number;
  files: Partial<Record<"skin" | "lower" | "upper" | "hair" | "scalpLower" | "scalpUpper" | "pelvis", string>>;
};

type Item = {
  slot: string;
  displayId: number;
  geosetGroups: number[];
  hides: string[];
  models: (string | null)[];
  modelTextures: (string | null)[];
  body: Partial<Record<Region, string>>;
};

type GenderBlock = {
  gender: number;
  name: string;
  model: string;
  namedTextures: Record<string, string>;
  hairStyles: { variation: number; geoset: number; showScalp: boolean }[];
  facialStyles: { variation: number; geosets: number[] }[];
  hairColors: (string | null)[];
  skinColors: (string | null)[];
  sections: Section[];
  items: Item[];
};

type RaceBlock = { race: number; name: string; facialLabel: string; genders: GenderBlock[] };
type Manifest = { races: RaceBlock[] };

/** The whole appearance, as indices into the option lists below. Indices
 *  rather than values so switching body only has to clamp, never translate. */
type Look = { skin: number; face: number; hair: number; hairColor: number; beard: number };

async function fetchM2(file: string): Promise<M2Mesh> {
  const r = await fetch(`${BASE}/m2/${file}`);
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  return parseM2(await r.arrayBuffer());
}

const wrap = (i: number, n: number) => (n === 0 ? 0 : ((i % n) + n) % n);

export default function Doll() {
  const hostRef = useRef<HTMLDivElement>(null);
  /* Where the camera is pointing, kept outside the scene effect. Every option
   * change rebuilds the scene, and losing the framing each time makes
   * comparing two beards up close impossible. `dist` is a fraction of the
   * model's height so it survives a switch to a taller body. */
  const view = useRef({ yaw: Math.PI / 2, pitch: 0.06, zoom: 2.6 });
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [race, setRace] = useState(1);
  const [gender, setGender] = useState(0);
  const [body, setBody] = useState<M2Mesh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [worn, setWorn] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [tris, setTris] = useState(0);
  const [regionMap, setRegionMap] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [look, setLook] = useState<Look>({ skin: 0, face: 0, hair: 1, hairColor: 0, beard: 0 });

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

  /* What this body offers. A human female has 19 hairstyles and no beards; a
   * male has 12 and 8. The panel reads its lengths from here — and drops the
   * styles the model cannot draw. Human male beard styles 3 and 8 ask for
   * geosets 103 and 203, and the file stops at variant 2, so offering them
   * gives you a clean-shaven face and no clue why. */
  const options = useMemo(() => {
    if (!g) return { skin: [], face: [], hair: [], hairColor: [], beard: [] };
    // The three values target families 1, 2 and 3, and most races only use
    // one of them — an orc's piercings are all family 1, a troll's tusks all
    // family 3 — so the unused slots naming a mesh that is not there is
    // normal. A style is only useless when none of its parts can draw.
    const drawable = (variants: number[]) =>
      variants.every((v) => v === 0) || variants.some((v, i) => v !== 0 && carried.has((i + 1) * 100 + v));
    const variations = (kind: string) =>
      [...new Set(g.sections.filter((s) => s.kind === kind).map((s) => s.variation))].sort((a, b) => a - b);
    const colours = (list: (string | null)[]) =>
      list.map((hex, i) => ({ hex, i })).filter((c): c is { hex: string; i: number } => !!c.hex);
    return {
      skin: colours(g.skinColors),
      face: variations("face"),
      // Until the model is parsed there is nothing to check against, and
      // filtering on an empty set would collapse both lists to one entry.
      hair: carried.size ? g.hairStyles.filter((h) => h.geoset === 0 || carried.has(h.geoset)) : g.hairStyles,
      hairColor: colours(g.hairColors),
      beard: carried.size ? g.facialStyles.filter((f) => drawable(f.geosets)) : g.facialStyles,
    };
  }, [g, carried]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const m: Manifest = await (await fetch(`${BASE}/manifest.json`)).json();
        if (!live) return;
        setManifest(m);
        setWorn(new Set(m.races[0].genders[0].items.map((i) => i.slot)));
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
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
        const mesh = await fetchM2(g.model);
        if (live) setBody(mesh);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [g]);

  /* Clamp every index when the lists change, so switching to a body with
   * fewer hairstyles cannot leave a choice pointing past the end. */
  useEffect(() => {
    // An empty list means the manifest has not arrived yet, not that the body
    // has no choices — clamping against it would pin everything to zero.
    const fit = (i: number, n: number) => (n ? Math.min(i, n - 1) : i);
    setLook((prev) => ({
      skin: fit(prev.skin, options.skin.length),
      face: fit(prev.face, options.face.length),
      hair: fit(prev.hair, options.hair.length),
      hairColor: fit(prev.hairColor, options.hairColor.length),
      beard: fit(prev.beard, options.beard.length),
    }));
  }, [options]);

  /* Resolve the indices into meshes and textures. Hair takes two tables that
   * have to agree — one names the mesh, the other the paint — so they are
   * looked up together and never carried apart. */
  const chosen = useMemo(() => {
    const hair = options.hair[look.hair];
    const beard = options.beard[look.beard];
    const skinColor = options.skin[look.skin]?.i ?? 0;
    const hairColor = options.hairColor[look.hairColor]?.i ?? 0;
    const faceVariation = options.face[look.face] ?? 0;
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
      // A tauren's hair row names no usable hair texture: the female's file is
      // not in the archives at all, and the male's slot points at a face
      // texture, which is what put a slab of skin where his horns should be.
      // Fall through to the scalp art, which is the only tauren hair the
      // client ships.
      hairTexture:
        (hairRow.hair && !/face/i.test(hairRow.hair) ? hairRow.hair : undefined) ??
        hairRow.scalpLower ??
        hairRow.scalpUpper,
    };
  }, [g, options, look]);

  const wornItems = useMemo(
    () =>
      (g?.items ?? [])
        .filter((i) => worn.has(i.slot))
        .map((i) => ({ slot: i.slot, geosetGroups: i.geosetGroups, hides: i.hides })),
    [g, worn],
  );

  /* What the gear takes off. A helm that hides hair hides every style, so
   * ticking one on below forces it past a rule rather than fixing a bug. */
  const hidden = useMemo(() => hiddenGroups(wornItems), [wornItems]);

  /* What the rules alone draw. Anything shown that is not in here was forced
   * by hand. */
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
      max: Math.max(...rows.map((r) => r.tris)),
    }));
  }, [body]);

  /* ---------- the scene ---------- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !g || !body) return;

    let live = true;
    let frame = 0;
    const disposables: Piece[] = [];

    // Transparent: the stage paints Elwynn behind the canvas, and the figure
    // composites over it the way the game's own creation screen does.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const stage = new THREE.Group();
    stage.rotation.copy(MODEL_TO_SCENE);
    scene.add(stage);

    // A key light high and to the front, a cool fill from behind, and enough
    // ambient that the shaded side keeps its texture. Vanilla art was painted
    // with its own light already in it, so this stays gentle.
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.5);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899cc, 0.55);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    // The model faces +X, which the Z-up-to-Y-up rotation sends to +X in the
    // scene, so the camera stands on +X for a front view. Framing comes from
    // the model's own bounds: a tauren is half again a gnome's height, and a
    // fixed distance either crops one or strands the other.
    const height = Math.max(0.5, body.bounds.max[2] - body.bounds.min[2]);
    let dist = height * view.current.zoom;
    // Zooming in rises toward the head. Holding the camera on the chest makes
    // the face — the thing four of the five choices change — unreachable.
    const near = height * 0.4;
    const far = height * 6;
    const wide = height * 2.6; // the distance that frames the whole body
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

    (async () => {
      const activeItems = g.items.filter((i) => worn.has(i.slot));

      /* --- the body texture --- */
      const layers: BodyLayer[] = [];
      const push = (region: Region, file?: string) => {
        if (file) layers.push({ region, url: `${BASE}/tex/${file}` });
      };
      // The face first, then the hairline and the beard on top of it, then the
      // underwear, whose pelvis shares the leg-upper rectangle. Armour last.
      push("faceLower", chosen.face.lower);
      push("faceUpper", chosen.face.upper);
      if (chosen.showScalp) {
        push("faceLower", chosen.hair.scalpLower);
        push("faceUpper", chosen.hair.scalpUpper);
      }
      // A style with no geosets is a clean shave, and its texture row is not
      // a blank one — human male style 2 draws no mesh but its texture still
      // has a beard painted on it. Skip the paint when there is no geometry.
      if (chosen.beardGeosets.some((v) => v !== 0)) {
        push("faceLower", chosen.beard.lower);
        push("faceUpper", chosen.beard.upper);
      }
      push("legUpper", chosen.underwear.pelvis);
      for (const item of activeItems)
        for (const [region, file] of Object.entries(item.body)) push(region as Region, file);

      let bodyTex: THREE.Texture;
      if (regionMap) {
        bodyTex = await loadTexture(`${BASE}/tex/_regionmap.png`);
      } else {
        const canvas = await composeBody(`${BASE}/tex/${chosen.skin.skin ?? ""}`, layers);
        if (!live) return;
        const canvasTex = new THREE.CanvasTexture(canvas);
        canvasTex.colorSpace = THREE.SRGBColorSpace;
        canvasTex.flipY = false;
        bodyTex = canvasTex;
      }
      if (!live) return;

      // Slot 1 is the composed body. Slot 6 is the hair, except on a tauren,
      // whose model uses slot 8 for the mane where every other race uses 6 —
      // feed 8 the body skin and the mane comes out wearing armour.
      const runtime = new Map<number, THREE.Texture>([[1, bodyTex]]);
      if (chosen.hairTexture) {
        const hairTex = await loadTexture(`${BASE}/tex/${chosen.hairTexture}`);
        if (!live) return;
        runtime.set(6, hairTex);
        runtime.set(8, hairTex);
      }

      // Textures the model names for itself: the eye glow on a night elf or
      // an undead, a second skin on the gnome male.
      const named: GlTextures = new Map();
      for (const [key, file] of Object.entries(g.namedTextures)) {
        named.set(key, await loadTexture(`${BASE}/tex/${file}`));
        if (!live) return;
      }

      const bodyPiece = new Piece(body, named, { geosets: showAll ? null : shown, runtime });
      disposables.push(bodyPiece);
      stage.add(bodyPiece.object);

      /* --- worn models --- */
      const attached: { piece: Piece; attach: number }[] = [];
      for (const item of activeItems) {
        const sockets = SLOT_ATTACH[item.slot];
        if (!sockets) continue;
        for (const [i, file] of item.models.entries()) {
          if (!file) continue;
          const socket = sockets[Math.min(i, sockets.length - 1)];
          try {
            const mesh = await fetchM2(file);
            if (!live) return;
            const itemRuntime = new Map<number, THREE.Texture>();
            const texFile = item.modelTextures[i] ?? item.modelTextures[0];
            if (texFile) itemRuntime.set(2, await loadTexture(`${BASE}/tex/${texFile}`));
            if (!live) return;
            const piece = new Piece(mesh, new Map(), { runtime: itemRuntime });
            piece.object.matrixAutoUpdate = false;
            piece.update(0, mesh.sequences[0] ?? null);
            disposables.push(piece);
            stage.add(piece.object);
            attached.push({ piece, attach: socket });
          } catch (e) {
            console.warn(`doll: ${file} did not load`, e);
          }
        }
      }

      setTris(
        body.batches.reduce((n, b) => n + (showAll || shown.has(b.geoset) ? b.count / 3 : 0), 0) +
          attached.reduce((n, a) => n + a.piece.mesh.triangleCount, 0),
      );

      const stand = body.sequences.find((s) => s.id === 0) ?? body.sequences[0] ?? null;
      const span = stand ? Math.max(1, stand.end - stand.start) : 1000;
      const start = performance.now();
      const socketMatrix = new THREE.Matrix4();

      const tick = () => {
        if (!live) return;
        frame = requestAnimationFrame(tick);
        const t = (stand?.start ?? 0) + ((performance.now() - start) % span);
        bodyPiece.update(t, stand);
        for (const a of attached) {
          const m = bodyPiece.attachmentMatrix(a.attach, socketMatrix);
          if (m) a.piece.object.matrix.copy(m);
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
    })().catch((e) => {
      if (live) setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      for (const p of disposables) p.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [g, body, worn, shown, showAll, regionMap, chosen]);

  /* ---------- controls ---------- */

  const step = useCallback(
    (key: keyof Look, by: number, count: number) => setLook((prev) => ({ ...prev, [key]: wrap(prev[key] + by, count) })),
    [],
  );

  const randomise = () => {
    const pick = (n: number) => (n ? Math.floor(Math.random() * n) : 0);
    setLook({
      skin: pick(options.skin.length),
      face: pick(options.face.length),
      hair: pick(options.hair.length),
      hairColor: pick(options.hairColor.length),
      beard: pick(options.beard.length),
    });
  };

  const toggleSlot = (slot: string) =>
    setWorn((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });

  const rows: { key: keyof Look; label: string; count: number; value: ReactNode }[] = [
    { key: "skin", label: "Skin", count: options.skin.length, value: <Swatch hex={options.skin[look.skin]?.hex} /> },
    { key: "face", label: "Face", count: options.face.length, value: null },
    {
      key: "hair",
      label: ROW_LABELS[race]?.hair ?? "Hair",
      count: options.hair.length,
      value: options.hair[look.hair]?.geoset === 0 ? <span className={styles.stepNote}>bald</span> : null,
    },
    {
      key: "hairColor",
      label: `${ROW_LABELS[race]?.hair ?? "Hair"} colour`,
      count: options.hairColor.length,
      value: <Swatch hex={options.hairColor[look.hairColor]?.hex} />,
    },
    {
      key: "beard",
      label: ROW_LABELS[race]?.facial ?? "Facial hair",
      count: options.beard.length,
      // The same row is a beard, a set of tusks or a tauren's hair, so the
      // empty option cannot be called "shaven".
      value: options.beard[look.beard]?.geosets.every((x) => x === 0) ? (
        <span className={styles.stepNote}>none</span>
      ) : null,
    },
  ];

  return (
    <div className={styles.bench}>
      <div className={styles.stage}>
        <div ref={hostRef} className={styles.viewport} />

        <section className={styles.creator} aria-label="Character">
          <div className={styles.roster}>
            {(["Alliance", "Horde"] as const).map((side) => (
              <div key={side} className={styles.side}>
                <p className={styles.sideName}>{side}</p>
                {roster[side].map((x) => (
                  <button
                    key={x.race}
                    type="button"
                    className={x.race === race ? `${styles.race} ${styles.raceOn}` : styles.race}
                    onClick={() => setRace(x.race)}
                    aria-pressed={x.race === race}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.genders} role="group" aria-label="Body">
            {r?.genders.map((x) => (
              <button
                key={x.gender}
                type="button"
                className={x.gender === gender ? `${styles.gender} ${styles.genderOn}` : styles.gender}
                onClick={() => setGender(x.gender)}
                aria-pressed={x.gender === gender}
              >
                {x.name}
              </button>
            ))}
          </div>

          <ul className={styles.steps}>
            {rows.map((row) => (
              <li key={row.key}>
                <div className={styles.step}>
                  <span className={styles.stepLabel}>{row.label}</span>
                  {row.count === 0 ? (
                    <span className={styles.stepEmpty}>none for this body</span>
                  ) : (
                    <>
                      {row.value}
                      <span className={styles.stepCount}>
                        {look[row.key] + 1}/{row.count}
                      </span>
                      <button
                        type="button"
                        className={styles.arrow}
                        onClick={() => step(row.key, -1, row.count)}
                        aria-label={`Previous ${row.label.toLowerCase()}`}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className={styles.arrow}
                        onClick={() => step(row.key, 1, row.count)}
                        aria-label={`Next ${row.label.toLowerCase()}`}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <button type="button" className={styles.randomise} onClick={randomise}>
            Randomise
          </button>
        </section>

        {error ? <p className={styles.fault}>{error}</p> : null}
        <p className={styles.hint}>
          Drag to turn. Scroll to move closer.
          {tris ? <span className={styles.count}>{tris.toLocaleString()} triangles</span> : null}
        </p>
      </div>

      <aside className={styles.rail}>
        <section>
          <h2 className={styles.railHead}>Worn</h2>
          {g?.items.length ? (
            <ul className={styles.slots}>
              {g.items.map((item) => (
                <li key={item.slot}>
                  <label className={styles.slot}>
                    <input
                      type="checkbox"
                      aria-label={`Wear ${item.slot}`}
                      checked={worn.has(item.slot)}
                      onChange={() => toggleSlot(item.slot)}
                    />
                    <span className={styles.slotName}>{item.slot}</span>
                    <span className={styles.slotKind}>
                      {item.models.some(Boolean) ? `${item.models.filter(Boolean).length} model` : "texture"}
                    </span>
                    <span className={styles.slotId}>{item.displayId}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Run scripts/doll-build.mjs to fill this.</p>
          )}
        </section>

        <section>
          <h2 className={styles.railHead}>Skin layout</h2>
          <label className={styles.slot}>
            <input
              type="checkbox"
              aria-label="Show region map"
              checked={regionMap}
              onChange={(e) => setRegionMap(e.currentTarget.checked)}
            />
            <span className={styles.slotName}>Show region map</span>
          </label>
          <p className={styles.railNote}>
            One flat colour per 128×32 slot of the 256×256 body skin. Use it to check which slot paints which body
            part.
          </p>
        </section>

        <section>
          <h2 className={styles.railHead}>Mesh chunks</h2>
          <p className={styles.railNote}>
            Every geoset in the file, by family. The bar is its triangle count. Switch one on to check a rule.
          </p>
          <label className={styles.slot}>
            <input
              type="checkbox"
              aria-label="Draw every chunk"
              checked={showAll}
              onChange={(e) => setShowAll(e.currentTarget.checked)}
            />
            <span className={styles.slotName}>Draw every chunk</span>
          </label>
          {overrides.size ? (
            <button type="button" className={styles.reset} onClick={() => setOverrides(new Map())}>
              Drop {overrides.size} manual change{overrides.size === 1 ? "" : "s"}
            </button>
          ) : null}

          {families.map((f) => (
            <div key={f.family} className={styles.family}>
              <p className={styles.familyName}>
                <span className={styles.familyKey}>{f.family === 0 ? "0" : `${f.family}xx`}</span>
                {f.name}
                {hidden.has(f.family) ? (
                  <span className={styles.hiddenTag}>
                    {hidden.get(f.family)!.slot} hides {hidden.get(f.family)!.group}
                  </span>
                ) : null}
              </p>
              <ul className={styles.geosets}>
                {f.rows.map((r) => {
                  const forced = shown.has(r.geoset) && !ruled.has(r.geoset);
                  return (
                    <li key={r.geoset}>
                      <label
                        className={[styles.geoset, shown.has(r.geoset) ? styles.on : "", forced ? styles.forced : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Geoset ${r.geoset}`}
                          checked={shown.has(r.geoset)}
                          onChange={(e) => {
                            // Read the event before the updater runs: React has
                            // cleared `currentTarget` by then.
                            const on = e.currentTarget.checked;
                            setOverrides((prev) => new Map(prev).set(r.geoset, on));
                          }}
                        />
                        <span className={styles.geosetId}>{r.geoset}</span>
                        <span className={styles.bar} style={{ ["--fill" as string]: `${(r.tris / f.max) * 100}%` }} />
                        <span className={styles.geosetTris}>{r.tris}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

function Swatch({ hex }: { hex?: string }) {
  if (!hex) return null;
  return <span className={styles.stepSwatch} style={{ background: hex }} aria-hidden />;
}
