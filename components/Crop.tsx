"use client";

/* A PIECE OF THE PLATE. docs/DROPS.md, "The route's first node".
 *
 * The same picture the map dock opens, scaled into a small frame and
 * centred on the spot a thing actually stands — the one part of the stage
 * whelp plz structurally could not have. The trick is done with the
 * element's own transform: translate(-x%, -y%) of a sheet positioned at
 * the frame's centre puts plate-percent (x, y) exactly under the middle,
 * with no measuring and nothing recomputed on resize.
 *
 * Not a map: no pan, no zoom, no pins, no layers. It is a photograph of a
 * place on the map, and pressing it (where the caller says so) opens the
 * real one. */

import { plateSrc, type ZonePlate } from "@/lib/plate";

import styles from "./crop.module.css";

export default function Crop({
  plate,
  x,
  y,
  p = [],
  zoom = 4,
  className,
}: {
  plate: ZonePlate;
  /** 1.12 map percent; `reg` carries them onto the picture. */
  x: number;
  y: number;
  /** Other spawns of the same thing. Drawn quiet; clipped by the frame. */
  p?: [number, number][];
  zoom?: number;
  className?: string;
}) {
  const { reg } = plate;
  const px = (v: number) => v * reg.sx + reg.ox;
  const py = (v: number) => v * reg.sy + reg.oy;
  const [aw, ah] = plate.aspect;
  const width = plate.widths[Math.min(1, plate.widths.length - 1)];

  return (
    <div className={className ? `${styles.crop} ${className}` : styles.crop} aria-hidden="true">
      <div
        className={styles.sheet}
        style={{
          width: `${zoom * 100}%`,
          aspectRatio: `${aw} / ${ah}`,
          transform: `translate(-${px(x)}%, -${py(y)}%)`,
        }}
      >
        <img src={plateSrc(plate, width)} alt="" draggable={false} />
        {p.map(([sx, sy], i) => (
          <span key={i} className={styles.spawn} style={{ left: `${px(sx)}%`, top: `${py(sy)}%` }} />
        ))}
        <span className={styles.here} style={{ left: `${px(x)}%`, top: `${py(y)}%` }} />
      </div>
      <span className={styles.vignette} />
    </div>
  );
}
