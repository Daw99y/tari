"use client";

/* One specimen plate: fetches the real .m2, parses it in the browser, loads
 * the textures it names, and plays its first animation sequence on a canvas.
 * See m2-render.ts for what is and is not drawn. */

import { useEffect, useRef, useState } from "react";

import type { M2Mesh } from "@/lib/m2";
import { loadM2, makeClock, type LoadedM2 } from "@/lib/m2-player";
import { drawFrame, type Camera } from "@/lib/m2-render";

import styles from "./lab.module.css";

type Props = {
  /** Path under /public, e.g. /lab/m2/Taunt_Head.m2 */
  src: string;
  onLoaded?: (mesh: M2Mesh) => void;
};

/** Must match --vitrine in lab.module.css. */
const VITRINE = "#141318";

export default function M2Plate({ src, onLoaded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<LoadedM2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wire, setWire] = useState(false);
  const [paused, setPaused] = useState(false);
  const cam = useRef<Camera>({ yaw: 0, pitch: -0.22 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    let alive = true;
    loadM2(src)
      .then((l) => {
        if (!alive) return;
        setLoaded(l);
        onLoaded?.(l.mesh);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { mesh, textures, fit } = loaded;
    const timeline = makeClock(mesh);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let visible = true;
    let clock = reduce ? timeline.restingStart : 0; // ms since the start
    let last = performance.now();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const fitCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const css = canvas.clientWidth;
      if (canvas.width !== css * dpr) {
        canvas.width = css * dpr;
        canvas.height = css * dpr;
      }
      return dpr;
    };

    const render = () => {
      const dpr = fitCanvas();
      const { t, seq } = timeline.at(clock);
      drawFrame(ctx, mesh, textures, fit, cam.current, t, seq, { wire, dpr, background: VITRINE });
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!pausedRef.current && !reduce) clock += dt;
      if (visible) render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => render());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [loaded, wire]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    cam.current.yaw += dx * 0.01;
    cam.current.pitch = Math.max(-1.4, Math.min(1.4, cam.current.pitch - dy * 0.01));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const mesh = loaded?.mesh;

  return (
    <div className={styles.plate} data-state={error ? "error" : loaded ? "ready" : "loading"}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={mesh ? `${mesh.name}, ${mesh.triangleCount} triangles, animated. Drag to turn.` : "Loading model"}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setWire((w) => !w)}
        onKeyDown={(e) => {
          if (e.key === "w" || e.key === "W") setWire((w) => !w);
          if (e.key === " ") {
            e.preventDefault();
            setPaused((p) => !p);
          }
          if (e.key === "ArrowLeft") cam.current.yaw -= 0.15;
          if (e.key === "ArrowRight") cam.current.yaw += 0.15;
          if (e.key === "ArrowUp") cam.current.pitch -= 0.15;
          if (e.key === "ArrowDown") cam.current.pitch += 0.15;
        }}
      />
      {error ? <p className={styles.plateNote}>Could not read the file. {error}</p> : null}
      <div className={styles.plateControls}>
        <button type="button" className={styles.plateButton} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
        <button type="button" className={styles.plateButton} onClick={() => setWire((w) => !w)} aria-pressed={wire}>
          {wire ? "Solid" : "Wire"}
        </button>
      </div>
    </div>
  );
}
