"use client";

/* A quiet M2 player for pages: no controls, no drag. Paints the effect onto
 * an opaque ground and lets the page blend it over whatever sits behind
 * (the hero uses mix-blend-mode: screen over the room photograph, which is
 * how additive light reads on an image). */

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { loadM2, makeClock, type LoadedM2 } from "@/lib/m2-player";
import { drawFrame, type Camera } from "@/lib/m2-render";

type Props = {
  src: string;
  /** Opaque ground colour; black lets CSS screen/plus-lighter show only the light. */
  background?: string;
  camera?: Camera;
  className?: string;
  style?: CSSProperties;
  /** 1 frames the whole animation; more crops in on the effect. */
  zoom?: number;
  /** Fires once the file has been read and the first frame can draw. */
  onReady?: () => void;
};

export default function M2Sprite({ src, background = "#000", camera, className, style, zoom = 1, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<LoadedM2 | null>(null);
  const cam = useRef<Camera>(camera ?? { yaw: 0, pitch: -0.1 });

  useEffect(() => {
    let alive = true;
    loadM2(src)
      .then((l) => {
        if (!alive) return;
        setLoaded(l);
        onReady?.();
      })
      .catch(() => {
        /* A missing file leaves the page as it was: the image still shows. */
      });
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
    let clock = reduce ? timeline.restingStart : 0;
    let last = performance.now();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const { t, seq } = timeline.at(clock);
      drawFrame(ctx, mesh, textures, fit, cam.current, t, seq, { wire: false, dpr, background, zoom });
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!reduce) clock += dt;
      if (visible) render();
      raf = requestAnimationFrame(tick);
    };
    render();
    if (!reduce) raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(() => render());
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [loaded, background, zoom]);

  return (
    <canvas ref={canvasRef} className={className} style={style} aria-hidden data-ready={loaded ? "true" : "false"} />
  );
}
