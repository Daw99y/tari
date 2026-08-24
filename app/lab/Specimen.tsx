"use client";

import { useState } from "react";

import type { M2Mesh } from "@/lib/m2";

import M2Plate from "./M2Plate";
import styles from "./lab.module.css";

export type SpecimenInfo = {
  /** File name under /public/lab/m2 */
  file: string;
  /** Where it lives inside the client's archives */
  archive: string;
  title: string;
  inGame: string;
  inTari: string;
};

function hex(c: [number, number, number]) {
  return (
    "#" +
    c
      .map((v) =>
        Math.round(Math.max(0, Math.min(1, v)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

const BLEND = ["opaque", "alpha key", "alpha", "add", "add", "mod", "mod 2×"];

export default function Specimen({ s }: { s: SpecimenInfo }) {
  const [mesh, setMesh] = useState<M2Mesh | null>(null);

  // One swatch per distinct colour the file names (first key of each
  // batch's colour track), with that batch's blend mode.
  const swatches = mesh
    ? Array.from(
        new Map(
          mesh.batches.map((b) => {
            const c = b.colorIndex >= 0 ? mesh.colors[b.colorIndex].rgb.values : null;
            const rgb: [number, number, number] = c && c.length >= 3 ? [c[0], c[1], c[2]] : [1, 1, 1];
            return [hex(rgb), { rgb, blend: b.blend }];
          }),
        ).values(),
      )
    : [];
  const seq = mesh ? (mesh.sequences.find((q) => q.id === 158) ?? mesh.sequences[0]) : undefined;

  return (
    <figure className={styles.specimen}>
      <M2Plate src={`/lab/m2/${s.file}`} onLoaded={setMesh} />
      <figcaption className={styles.label}>
        <h2 className={styles.title}>{s.title}</h2>
        <p className={styles.path}>{s.archive}</p>
        <dl className={styles.facts}>
          <div>
            <dt>In game</dt>
            <dd>{s.inGame}</dd>
          </div>
          <div>
            <dt>In Tari</dt>
            <dd>{s.inTari}</dd>
          </div>
          <div>
            <dt>File</dt>
            <dd className={styles.mono}>
              {mesh ? (
                <>
                  {mesh.vertexCount} vertices · {mesh.triangleCount} triangles · {mesh.bones.length}{" "}
                  {mesh.bones.length === 1 ? "bone" : "bones"}
                  {seq ? ` · ${((seq.end - seq.start) / 1000).toFixed(1)} s ${(seq.flags & 1) === 1 ? "once" : "loop"}` : ""}
                </>
              ) : (
                "reading…"
              )}
            </dd>
          </div>
          {mesh && swatches.length > 0 ? (
            <div>
              <dt>Colour</dt>
              <dd className={styles.swatches}>
                {swatches.map((b) => (
                  <span key={hex(b.rgb)} className={styles.swatch}>
                    <i style={{ background: hex(b.rgb) }} aria-hidden />
                    <span className={styles.mono}>
                      {hex(b.rgb)} · {BLEND[b.blend] ?? `blend ${b.blend}`}
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {mesh && mesh.textures.some(Boolean) ? (
            <div>
              <dt>Textures</dt>
              <dd className={styles.mono}>{mesh.textures.filter(Boolean).join(" · ")}</dd>
            </div>
          ) : null}
        </dl>
        <a className={styles.download} href={`/lab/m2/${s.file}`} download>
          {s.file}
        </a>
      </figcaption>
    </figure>
  );
}
