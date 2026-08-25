"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { plateSrc, type Pin, type PinKind, type ZonePlate } from "@/lib/maps";

import styles from "./zone-map.module.css";

/* The map, framed inside the room, carrying the authored layer
 * (docs/TARI.md §11.2). Pins are nouns: a thing is at this spot. Nothing
 * here orders them, joins them, or says where to go next. */

type Cluster = { key: string; x: number; y: number; pins: Pin[] };

const KINDS: { id: PinKind; label: string }[] = [
  { id: "giver", label: "Quests" },
  { id: "turnin", label: "Turn-ins" },
  { id: "rare", label: "Rares" },
];

const WORD: Record<PinKind, string> = { giver: "Quest giver", turnin: "Turn-in", rare: "Rare" };

// Grid clustering in plate percent; the cell shrinks with zoom so clusters
// split as you push in. Neighbours the grid seam divided are merged after.
function cluster(pins: Pin[], zoom: number, px: (x: number) => number, py: (y: number) => number): Cluster[] {
  const cell = 4.2 / zoom;
  const grid = new Map<string, Cluster>();
  for (const p of pins) {
    const key = `${Math.floor(px(p.x) / cell)}:${Math.floor(py(p.y) / (cell * 1.5))}`;
    const c = grid.get(key) ?? { key, x: 0, y: 0, pins: [] };
    c.pins.push(p);
    grid.set(key, c);
  }
  const centre = (c: Cluster) => {
    c.x = c.pins.reduce((s, p) => s + px(p.x), 0) / c.pins.length;
    c.y = c.pins.reduce((s, p) => s + py(p.y), 0) / c.pins.length;
  };
  const out: Cluster[] = [];
  for (const c of grid.values()) {
    centre(c);
    const near = out.find((o) => Math.hypot(o.x - c.x, (o.y - c.y) / 1.5) < cell);
    if (near) {
      near.pins.push(...c.pins);
      near.key += "+" + c.key;
      centre(near);
    } else out.push(c);
  }
  return out;
}

function clampPan(p: { x: number; y: number }, z: number, el: DOMRect) {
  const mx = (el.width * (z - 1)) / 2;
  const my = (el.height * (z - 1)) / 2;
  return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
}

export default function ZoneMap({ plate, title }: { plate: ZonePlate; title: string }) {
  const [layers, setLayers] = useState<Record<PinKind, boolean>>({ giver: true, turnin: true, rare: true });
  const [areas, setAreas] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Cluster | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const { reg } = plate;
  const px = (x: number) => x * reg.sx + reg.ox;
  const py = (y: number) => y * reg.sy + reg.oy;

  const visible = useMemo(() => plate.pins.filter((p) => layers[p.kind]), [plate, layers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clusters = useMemo(() => cluster(visible, zoom, px, py), [visible, zoom, reg]);

  // Native listener: React's onWheel is passive and cannot stop the page scrolling.
  useEffect(() => {
    const node = frame.current!;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const el = node.getBoundingClientRect();
      setZoom((z) => {
        const next = Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const cx = e.clientX - el.left - el.width / 2;
        const cy = e.clientY - el.top - el.height / 2;
        const k = next / z;
        setPan((p) => clampPan({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }, next, el));
        return next;
      });
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  function onDown(e: PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setPan(clampPan({ x: d.px + dx, y: d.py + dy }, zoom, frame.current!.getBoundingClientRect()));
  }
  function onUp() {
    if (drag.current && !drag.current.moved) setActive(null);
    drag.current = null;
  }

  const [aw, ah] = plate.aspect;

  return (
    <div className={styles.stage} style={{ ["--aspect" as string]: `${aw} / ${ah}` }}>
      <div
        ref={frame}
        className={styles.frame}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className={styles.plate} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img
            src={plateSrc(plate, plate.widths[0])}
            srcSet={plate.widths.map((w) => `${plateSrc(plate, w)} ${w}w`).join(", ")}
            sizes="(min-width: 1400px) 1100px, 100vw"
            alt={title}
            draggable={false}
          />

          {areas ? (
            <svg className={styles.areas} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="zone-map-soft" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.9 1.35" />
                </filter>
              </defs>
              <g filter="url(#zone-map-soft)">
                {plate.areas.map((a) =>
                  a.points.map(([x, y], i) => (
                    <ellipse key={`${a.quest}-${a.name}-${i}`} cx={px(x)} cy={py(y)} rx={0.9} ry={1.35} />
                  )),
                )}
              </g>
            </svg>
          ) : null}

          {/* Pins counter-scale so they stay one size at every zoom */}
          {clusters.map((c) => {
            const one = c.pins.length === 1 ? c.pins[0] : null;
            return (
              <button
                key={c.key}
                className={styles.pin}
                data-kind={one ? one.kind : "cluster"}
                aria-pressed={active?.key === c.key}
                aria-label={one ? one.name : `${c.pins.length} here`}
                style={{ left: `${c.x}%`, top: `${c.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setActive(active?.key === c.key ? null : c)}
              >
                {one ? <Glyph kind={one.kind} /> : <span className={styles.count}>{c.pins.length}</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.layers} onPointerDown={(e) => e.stopPropagation()}>
          {KINDS.map((k) => (
            <button
              key={k.id}
              className={styles.chip}
              aria-pressed={layers[k.id]}
              onClick={() => setLayers({ ...layers, [k.id]: !layers[k.id] })}
            >
              <Glyph kind={k.id} /> {k.label}
            </button>
          ))}
          <button className={styles.chip} aria-pressed={areas} onClick={() => setAreas(!areas)}>
            Objectives
          </button>
          <span className={styles.zoom}>{zoom.toFixed(1)}×</span>
        </div>
      </div>

      <aside className={styles.rail}>{active ? <Rail c={active} /> : <Empty title={title} />}</aside>
    </div>
  );
}

function Glyph({ kind }: { kind: PinKind }) {
  if (kind === "rare")
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1 11 6 6 11 1 6Z" />
      </svg>
    );
  if (kind === "turnin")
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4" />
    </svg>
  );
}

function Rail({ c }: { c: Cluster }) {
  const one = c.pins.length === 1 ? c.pins[0] : null;
  return (
    <>
      <p className={styles.eyebrow}>{one ? WORD[one.kind] : "At this spot"}</p>
      <h2 className={styles.h2}>{one ? one.name : `${c.pins.length} here`}</h2>
      <ul className={styles.list}>
        {c.pins.map((p) => (
          <li key={`${p.id}-${p.x}`}>
            <div className={styles.item}>
              <Glyph kind={p.kind} />
              <span className={styles.name}>{p.name}</span>
              <span className={styles.meta}>{p.kind === "rare" ? `lvl ${p.lvl[0]}` : WORD[p.kind]}</span>
            </div>
            {p.quests.length ? (
              <ul className={styles.quests}>
                {p.quests.map((q) => (
                  <li key={q.id}>
                    <span>{q.title}</span>
                    <span className={styles.meta}>{q.lvl}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <>
      <p className={styles.eyebrow}>{title}</p>
      <h2 className={styles.h2}>What is here.</h2>
      <p className={styles.copy}>
        Press a mark to read what stands there. Scroll to push in; drag to move. A mark is a noun — no arrows, no
        order, no next.
      </p>
    </>
  );
}
