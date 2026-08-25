"use client";

/* Full-bleed room with a live figure anchored to a point in the photograph.
 *
 * The image is object-fit: cover, so a percentage of the container is not a
 * percentage of the picture. This measures the container, works out the
 * cover crop, and plants the figure's feet in pixels on the hall floor. The
 * slow push-in is CSS; the figure rides inside the same transform so she
 * stays on her spot. */

import { useLayoutEffect, useRef, useState } from "react";

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
    <div ref={ref} className={className} aria-hidden="true">
      <img
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt}
        className={imageClassName}
        fetchPriority="high"
        decoding="async"
      />
      {box ? (
        <>
          <SeducedFigure
            left={box.left}
            top={box.top}
            height={box.w}
            onHead={setHead}
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
                left: box.left + (head.x - 0.5) * box.w * 0.62,
                /* The sprite's hearts sit low in their own frame, so centring
                 * the box on the helm socket lands them at her waist. Raised
                 * until the cluster starts at the crown of her bowed head. */
                top: box.top - box.w + (head.y - 0.26) * box.w,
                width: box.w * 0.55,
                height: box.w * 0.55,
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
