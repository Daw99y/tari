"use client";

/* The succubus who holds the curtain while the hero rogue loads.
 *
 * She is the cheapest inhabitant in the project and that is the whole point.
 * The rogue is a body, ten items, a composed skin and twenty-nine requests
 * that cannot start until a manifest has been read. The succubus is one
 * stripped body and three textures whose names are known at build time, so
 * every byte she needs is preloaded from the document head alongside the HTML
 * and none of it waits on a round trip.
 *
 * Two sequences, both baked into the model by Blizzard: Stand (0), and
 * SuccubusEntice (194) — the animation the client plays when a warlock's pet
 * charms something. She holds Stand until the page behind her is ready, plays
 * the entice once, and leaves.
 *
 * Anything that fails to load leaves the curtain to its own text. She is an
 * ornament on a wait, never the thing being waited for. */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { parseTbody } from "@/lib/tbody";
import { loadTexture, MODEL_TO_SCENE, Piece, texKey } from "@/lib/m2-gl";
import {
  ENTICE,
  STAND,
  SUCCUBUS_BASE as BASE,
  SUCCUBUS_EYES as EYES,
  SUCCUBUS_MODEL,
  SUCCUBUS_SLOTS as SLOTS,
} from "@/lib/succubus";

type Props = {
  /** Flip to true and she plays the entice once, then calls `onFinished`.
   *  Flipping it back does nothing; the curtain only leaves once. */
  entice?: boolean;
  /** Fired at the last frame of the entice. */
  onFinished?: () => void;
  /** Fired when she has drawn her first frame, so the curtain can fade her
   *  in rather than pop her. */
  onReady?: () => void;
  /** A folder of alternate skin/wing/hair textures under `variants/`, used by
   *  the picker at /lab/succubus. The curtain never sets this — it draws the
   *  set the build published. */
  variant?: string;
  className?: string;
};

export default function Succubus({ entice = false, onFinished, onReady, variant, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  /* The render loop reads these rather than closing over the props, so a
   * change of `entice` never rebuilds the scene under it. */
  const wants = useRef(false);
  const finish = useRef(onFinished);
  wants.current = entice;
  finish.current = onFinished;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let live = true;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let observer: ResizeObserver | null = null;
    let piece: Piece | null = null;

    (async () => {
      const [mesh, skins, eyes] = await Promise.all([
        fetch(SUCCUBUS_MODEL).then(async (r) => {
          if (!r.ok) throw new Error(`Succubus.tbody: ${r.status}`);
          return parseTbody(await r.arrayBuffer());
        }),
        Promise.all(
          SLOTS.map(
            async ([type, name]) =>
              [
                type,
                await loadTexture(variant ? `${BASE}/variants/${variant}-${name}.webp` : `${BASE}/${name}.webp`),
              ] as const,
          ),
        ),
        loadTexture(`${BASE}/${texKey(EYES)}`).catch(() => null),
      ]);
      if (!live) return;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 100);
      const stage = new THREE.Group();
      stage.rotation.copy(MODEL_TO_SCENE);
      scene.add(stage);

      /* Lit like a thing in a dark room and not like a creature viewer, but
       * lit. The first pass was a night scene and she came out a silhouette:
       * against a #06060a field there is nothing to bounce, so the ambient
       * has to do the work a room would. A warm key from the high left gives
       * her a shadow side, and a magenta rim from behind separates her wing
       * from the ground it is nearly the colour of. */
      scene.add(new THREE.AmbientLight(0xb9a8d8, 1.9));
      const key = new THREE.DirectionalLight(0xffd9bc, 1.7);
      key.position.set(-2.4, 4, 3.2);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xff4f9c, 1.1);
      rim.position.set(2.2, 2.4, -3.4);
      scene.add(rim);

      piece = new Piece(mesh, eyes ? new Map([[texKey(EYES), eyes]]) : new Map(), {
        runtime: new Map(skins),
        doubleSided: true,
      });
      stage.add(piece.object);

      /* She fills the frame, fitted to the pose she actually holds.
       *
       * Not to `mesh.bounds`: an M2's bounding box covers every sequence in
       * the file, and hers reaches four units along the model's forward axis
       * for a whip crack that this build does not even keep. Framing on that
       * box put her at a quarter of the height with the rest of the canvas
       * given over to empty room. So the idle is posed once and the box is
       * taken off the skinned vertices — her real silhouette, wings out. */
      const stand = mesh.sequences.find((s) => s.id === STAND) ?? mesh.sequences[0] ?? null;
      const entice = mesh.sequences.find((s) => s.id === ENTICE) ?? stand;
      piece.update(stand?.start ?? 0, stand);
      piece.geometry.computeBoundingBox();
      stage.updateMatrixWorld(true);
      const fit = new THREE.Box3().setFromObject(stage);
      const span = new THREE.Vector3();
      const middle = new THREE.Vector3();
      fit.getSize(span);
      fit.getCenter(middle);

      const fov = (camera.fov * Math.PI) / 180;
      /* Turned off square, so the wing behind her reads as depth rather than
       * as a second wing drawn flat beside the first. */
      const yaw = Math.PI / 2 - 0.42;
      /* A margin, not a fill: pressed to the edges she looks trapped, and
       * her horns want a little air over them. */
      const MARGIN = 1.12;

      const place = () => {
        /* Solved against the wider of her two horizontal extents, so no yaw
         * and no viewport can push a wingtip off the canvas. */
        const half = Math.tan(fov / 2);
        const vertical = (span.y / 2) * MARGIN / half;
        const horizontal = (Math.max(span.x, span.z) / 2) * MARGIN / (half * Math.max(0.3, camera.aspect));
        const dist = Math.max(vertical, horizontal);
        camera.position.set(Math.sin(yaw) * dist, middle.y + dist * 0.03, Math.cos(yaw) * dist);
        camera.lookAt(0, middle.y, 0);
      };

      const resize = () => {
        if (!renderer) return;
        const w = host.clientWidth;
        const hh = host.clientHeight;
        if (!w || !hh) return;
        renderer.setSize(w, hh);
        camera.aspect = w / hh;
        camera.updateProjectionMatrix();
        place();
      };
      observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      const length = (s: typeof stand) => (s ? Math.max(1, s.end - s.start) : 1000);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* The entice starts on the next wrap of the idle rather than the frame
       * the flag flips, so she finishes the breath she was taking. Cutting
       * mid-loop snaps her limbs; this costs at most one idle length. */
      let seq = stand;
      let started = performance.now();
      let enticing = false;
      let done = false;

      const draw = (now: number) => {
        if (!renderer || !piece) return;
        const elapsed = now - started;
        const run = length(seq);
        if (elapsed >= run) {
          if (enticing) {
            /* Hold the last frame. She has finished; the curtain is on its
             * way out and a snap back to idle would be seen. */
            piece.update((seq?.start ?? 0) + run, seq);
            renderer.render(scene, camera);
            if (!done) {
              done = true;
              finish.current?.();
            }
            return;
          }
          if (wants.current) {
            seq = entice;
            enticing = true;
          }
          started = now;
        }
        const t = (seq?.start ?? 0) + ((now - started) % length(seq));
        piece.update(t, seq);
        renderer.render(scene, camera);
      };

      if (reduce) {
        /* One still frame of the idle. The entice is a performance and a
         * reader who asked for stillness should not be given one — the
         * curtain still reports itself finished so the page arrives. */
        draw(started + length(stand) / 2);
        setReady(true);
        onReady?.();
        const wait = setInterval(() => {
          if (!wants.current || done) return;
          done = true;
          clearInterval(wait);
          finish.current?.();
        }, 100);
        return;
      }

      const tick = () => {
        frame = requestAnimationFrame(tick);
        draw(performance.now());
      };
      tick();
      setReady(true);
      onReady?.();
    })().catch(() => {
      /* No succubus: the curtain keeps its text and its progress, and the
       * page behind it arrives exactly as fast either way. */
      onReady?.();
    });

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      piece?.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the scene is
    // built once; `entice` and the callbacks are read through refs so a
    // re-render never tears it down mid-animation.
  }, []);

  return <div ref={hostRef} className={className} data-ready={ready ? "true" : "false"} aria-hidden="true" />;
}
