"use client";

/* Full-bleed room with a live figure anchored to a point in the photograph.
 *
 * The image is object-fit: cover, so a percentage of the container is not a
 * percentage of the picture. This measures the container, works out the
 * cover crop, and plants the figure's feet in pixels on the hall floor. The
 * slow push-in is CSS; the figure rides inside the same transform so she
 * stays on her spot. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Debuff from "./Debuff";

import M2Sprite from "./M2Sprite";
import SeducedFigure from "./SeducedFigure";

const CENTER = { x: 0.5, y: 0.5 };

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Where the figure's feet touch the floor, 0..1 across and down. */
  anchor: { x: number; y: number };
  /** Figure height as a fraction of the rendered photograph width. */
  size: number;
  /** Portrait crops render the photograph far wider than the container, so
   *  the same fraction makes a giant. These override both on narrow screens. */
  portraitAnchor?: { x: number; y: number };
  portraitSize?: number;
  /** object-position for landscape and portrait containers, 0..1. Portrait
   *  crops are narrow, so the crop window can be steered onto the subject. */
  position?: { x: number; y: number };
  portraitPosition?: { x: number; y: number };
  effectSrc: string;
  /** The debuff frame that rides beside her head. */
  chip?: { name: string; note: string };
  /** Fired when the photograph has decoded. Separate from the figure: it is
   *  by far the larger download, and the curtain names them as two steps
   *  because a reader waiting on one should not be told about the other. */
  onImage?: () => void;
  /** Fired when the figure has drawn her first frame. */
  onFigure?: () => void;
  /** Freeze the scene's push-in. True while a curtain covers the hero, so the
   *  slow move begins where the reader begins watching it rather than a few
   *  seconds in. */
  hold?: boolean;
  chipClassName?: string;
  className?: string;
  imageClassName?: string;
  figureClassName?: string;
  effectClassName?: string;
  shadowClassName?: string;
};

export default function HeroScene({
  src,
  width,
  height,
  alt,
  anchor,
  size,
  portraitAnchor = anchor,
  portraitSize = size,
  effectSrc,
  position = CENTER,
  portraitPosition = position,
  chip,
  chipClassName,
  onImage,
  onFigure,
  hold = false,
  className,
  imageClassName,
  figureClassName,
  effectClassName,
  shadowClassName,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; w: number } | null>(null);
  /* Her head, as fractions of the figure box, reported once the pose exists.
   * Until then the hearts wait unmounted rather than hover over a guess. */
  const [head, setHead] = useState<{ x: number; y: number } | null>(null);
  /* The cursor, -1..1 from screen centre. The figure leans toward it in its
   * own render loop; the hearts and the debuff frame drift here, each on a
   * slow transition so they trail her like things that float. */
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setTilt({
          x: Math.round(((e.clientX / window.innerWidth) * 2 - 1) * 50) / 50,
          y: Math.round(((e.clientY / window.innerHeight) * 2 - 1) * 50) / 50,
        });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* A cached photograph can finish decoding before React hydrates, and an
   * `onLoad` that already fired is an event nobody hears. Ask the element. */
  useEffect(() => {
    if (imgRef.current?.complete) onImage?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount.
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const portrait = W / H < 0.85;
      const pos = portrait ? portraitPosition : position;
      const a = portrait ? portraitAnchor : anchor;
      const sz = portrait ? portraitSize : size;
      if (imgRef.current) imgRef.current.style.objectPosition = `${pos.x * 100}% ${pos.y * 100}%`;
      const s = Math.max(W / width, H / height);
      const rw = width * s;
      const rh = height * s;
      const ox = (W - rw) * pos.x;
      const oy = (H - rh) * pos.y;
      const next = { left: ox + rw * a.x, top: oy + rh * a.y, w: rw * sz };
      setBox((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.w === next.w ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, anchor.x, anchor.y, size, portraitAnchor.x, portraitAnchor.y, portraitSize, position, portraitPosition]);

  return (
    <div ref={ref} className={className} data-hold={hold ? "true" : undefined} aria-hidden="true">
      <img
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt}
        className={imageClassName}
        fetchPriority="high"
        decoding="async"
        onLoad={onImage}
        /* A photograph that 404s or decodes badly still has to release the
         * curtain; the hero is allowed to be missing, the page is not. */
        onError={onImage}
      />
      {box ? (
        <>
          <SeducedFigure
            left={box.left}
            top={box.top}
            height={box.w}
            onHead={setHead}
            onReady={onFigure}
            className={figureClassName}
            shadowClassName={shadowClassName}
          />
          {/* The hearts ride on her head, blending with the photograph the
           * way additive light does. Kept beside the figure, not inside it:
           * its fade-in isolates a blend group and would black the sprite. */}
          {head ? (
            <M2Sprite
              src={effectSrc}
              className={effectClassName}
              camera={{ yaw: 0, pitch: -0.08 }}
              zoom={1.6}
              style={{
                left: box.left + (head.x - 0.5) * box.w * 0.85 + box.w * 0.1,
                /* The sprite's hearts sit low in their own frame, so centring
                 * the box on the helm socket lands them at her waist. Raised
                 * until the cluster starts at the crown of her bowed head,
                 * then nudged 40px up and right to taste. */
                top: box.top - box.w + (head.y - 0.26) * box.w + box.w * 0.05,
                width: box.w * 0.4,
                height: box.w * 0.4,
                translate: `${tilt.x * 10}px ${tilt.y * 6}px`,
                transition: "translate 600ms cubic-bezier(0.2, 0.6, 0.3, 1)",
              }}
            />
          ) : null}
          {chip && head ? (
            <Debuff
              name={chip.name}
              note={chip.note}
              className={chipClassName}
              style={{
                left: box.left + (head.x - 0.5) * box.w * 0.85 + box.w * 0.28,
                top: box.top - box.w + head.y * box.w - box.w * 0.06,
                translate: `${tilt.x * 18}px ${tilt.y * 10}px`,
                transition: "translate 900ms cubic-bezier(0.2, 0.6, 0.3, 1)",
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
