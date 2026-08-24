"use client";

/* Full-bleed room with a spell visual anchored to a point in the photograph.
 *
 * The image is object-fit: cover, so a percentage of the container is not a
 * percentage of the picture. This measures the container, works out the
 * cover crop, and places the effect in pixels over the figure standing in
 * the hall. The slow push-in is CSS; the effect rides inside the same
 * transform so it stays on the figure. */

import { useLayoutEffect, useRef, useState } from "react";

import M2Sprite from "./M2Sprite";

const CENTER = { x: 0.5, y: 0.5 };

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Anchor in the photograph, 0..1 across and down. */
  anchor: { x: number; y: number };
  /** Effect box width as a fraction of the rendered photograph width. */
  size: number;
  /** object-position for landscape and portrait containers, 0..1. Portrait
   *  crops are narrow, so the crop window can be steered onto the subject. */
  position?: { x: number; y: number };
  portraitPosition?: { x: number; y: number };
  effectSrc: string;
  /** Crop-in on the effect; 1 frames its whole animation. */
  zoom?: number;
  className?: string;
  imageClassName?: string;
  effectClassName?: string;
};

export default function HeroScene({
  src,
  width,
  height,
  alt,
  anchor,
  size,
  effectSrc,
  zoom = 1,
  position = CENTER,
  portraitPosition = position,
  className,
  imageClassName,
  effectClassName,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const portrait = W / H < 0.85;
      const pos = portrait ? portraitPosition : position;
      if (imgRef.current) imgRef.current.style.objectPosition = `${pos.x * 100}% ${pos.y * 100}%`;
      const s = Math.max(W / width, H / height);
      const rw = width * s;
      const rh = height * s;
      const ox = (W - rw) * pos.x;
      const oy = (H - rh) * pos.y;
      const next = { left: ox + rw * anchor.x, top: oy + rh * anchor.y, w: rw * size };
      setBox((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.w === next.w ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, anchor.x, anchor.y, size, position, portraitPosition]);

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
        <M2Sprite
          src={effectSrc}
          className={effectClassName}
          camera={{ yaw: 0, pitch: -0.08 }}
          zoom={zoom}
          style={{ left: box.left, top: box.top, width: box.w, height: box.w }}
        />
      ) : null}
    </div>
  );
}
