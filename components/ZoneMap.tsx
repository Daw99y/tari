"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import type { HuntSpot } from "@/lib/hunt";
import { iconUrl, type Item } from "@/lib/loot";
import { plateSrc, type Pin as Poi, type PinKind as PoiKind, type ZonePlate } from "@/lib/plate";

import { useLive } from "@/app/(app)/Live";
import { loadCharacter } from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { PIN_BAND, PIN_MAX, onTheMap, pinAge, pinsChannel, readPin, type Pin, type PinReply } from "@/lib/pins";

import { ItemHover } from "./ItemTooltip";
import PinChip, { PinFace } from "./PinChip";
import styles from "./zone-map.module.css";

/* The map, framed inside the room, carrying two layers. The authored one
 * (docs/TARI.md §11.2): pins are nouns — a thing is at this spot. And the
 * hunt (docs/DROPS.md): where the room's drops stand for *this* reader,
 * drawn in the app's own dark against the curated paper so whose layer is
 * whose stays legible. Nothing on either orders, joins, or says where to
 * go next. */

type Cluster = { key: string; x: number; y: number; pins: Poi[] };

const KINDS: { id: PoiKind; label: string }[] = [
  { id: "giver", label: "Quests" },
  { id: "turnin", label: "Turn-ins" },
  { id: "rare", label: "Rares" },
];

const WORD: Record<PoiKind, string> = { giver: "Quest giver", turnin: "Turn-in", rare: "Rare" };

// Grid clustering in plate percent; the cell shrinks with zoom so clusters
// split as you push in. Neighbours the grid seam divided are merged after.
function cluster(pins: Poi[], zoom: number, px: (x: number) => number, py: (y: number) => number): Cluster[] {
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

export default function ZoneMap({
  plate,
  title,
  roomId,
  hunt = [],
  drops = [],
  pins = [],
  level = 60,
  focus = null,
  onOpenItem,
}: {
  plate: ZonePlate;
  title: string;
  /** The room as the wire and the table say it (`duskwood`). */
  roomId: string;
  /** The hunt layer: where the drawn rows' sources stand. */
  hunt?: HuntSpot[];
  /** The rows themselves, so a mark can name what it holds. */
  drops?: Item[];
  /** What people left here (docs/PINS.md), read on the server. */
  pins?: Pin[];
  level?: number;
  /** A spot the stage lent the map — looked at once, then let go. */
  focus?: { x: number; y: number } | null;
  /** Put an item on the stage, from a mark. */
  onOpenItem?: (item: Item) => void;
}) {
  const [layers, setLayers] = useState<Record<PoiKind, boolean>>({ giver: true, turnin: true, rare: true });
  const [areas, setAreas] = useState(true);
  const [hunting, setHunting] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Cluster | null>(null);
  const [quarry, setQuarry] = useState<HuntSpot | null>(null);
  /* THE PINS. Server-read to start, and the room's own channel lands the
     rest as they are said (docs/PINS.md — the table is the history, the
     wire is the moment). */
  const [said, setSaid] = useState<Pin[]>(pins);
  const [thread, setThread] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const { realtime } = useLive();
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

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

  /* A pin landing anywhere — this browser or another — arrives here. Own
     pins come back from the POST too; merging by id keeps the echo quiet. */
  useEffect(() => {
    if (!realtime) return;
    const chan = realtime.channels.get(pinsChannel(roomId));
    const onPin = (msg: { data?: unknown }) => {
      const p = readPin(msg.data);
      if (!p) return;
      setSaid((was) => {
        if (p.parent !== null)
          return was.map((t) =>
            t.id === p.parent && !t.replies.some((r) => r.id === p.id)
              ? { ...t, replies: [...t.replies, { id: p.id, body: p.body, who: p.who, cls: p.cls, level: p.level, at: p.at, mine: false }] }
              : t
          );
        if (was.some((t) => t.id === p.id)) return was;
        const { parent: _drop, ...pin } = p;
        return [pin, ...was];
      });
    };
    void chan.subscribe("pin", onPin);
    return () => chan.unsubscribe("pin", onPin);
  }, [realtime, roomId]);

  /* A lent map looks where it was pointed: pushed in, centred on the spot,
     the hunt layer on. The reader takes it from there. */
  useEffect(() => {
    if (!focus) return;
    const el = frame.current?.getBoundingClientRect();
    if (!el) return;
    const z = 2.6;
    setHunting(true);
    setZoom(z);
    setPan(
      clampPan(
        { x: (-(px(focus.x) - 50) / 100) * el.width * z, y: (-(py(focus.y) - 50) / 100) * el.height * z },
        z,
        el
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

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
  function onUp(e: PointerEvent) {
    const tapped = drag.current && !drag.current.moved;
    drag.current = null;
    if (!tapped) return;
    /* Placing: the press is the spot. The click's place on the transformed
       sheet is already pan- and zoom-aware, because getBoundingClientRect
       measures the transform. */
    if (placing) {
      const el = sheet.current?.getBoundingClientRect();
      setPlacing(false);
      if (el) {
        const mx = (((e.clientX - el.left) / el.width) * 100 - reg.ox) / reg.sx;
        const my = (((e.clientY - el.top) / el.height) * 100 - reg.oy) / reg.sy;
        if (mx >= 0 && mx <= 100 && my >= 0 && my <= 100) {
          setDraft({ x: mx, y: my });
          setThread(null);
          setActive(null);
          setQuarry(null);
          return;
        }
      }
      return;
    }
    setActive(null);
    setQuarry(null);
    setThread(null);
    setDraft(null);
  }

  const [aw, ah] = plate.aspect;

  return (
    <div
      className={styles.stage}
      style={{ ["--aspect" as string]: `${aw} / ${ah}`, ["--ar" as string]: aw / ah }}
    >
      <div
        ref={frame}
        className={styles.frame}
        data-placing={placing || undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div ref={sheet} className={styles.plate} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
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

          {/* The hunt: other spawns first, quiet, so the marks land on top. */}
          {hunting
            ? hunt.map((h) =>
                h.kind === "drop" && zoom > 1.6
                  ? h.p.slice(1).map(([sx, sy], i) => (
                      <span
                        key={`${h.creatureId}-${i}`}
                        className={styles.camp}
                        style={{ left: `${px(sx)}%`, top: `${py(sy)}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                        aria-hidden="true"
                      />
                    ))
                  : null,
              )
            : null}

          {/* Pins counter-scale so they stay one size at every zoom */}
          {clusters.map((c) => {
            const one = c.pins.length === 1 ? c.pins[0] : null;
            return (
              <button
                key={c.key}
                className={styles.poi}
                data-kind={one ? one.kind : "cluster"}
                aria-pressed={active?.key === c.key}
                aria-label={one ? one.name : `${c.pins.length} here`}
                style={{ left: `${c.x}%`, top: `${c.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setQuarry(null);
                  setThread(null);
                  setDraft(null);
                  setActive(active?.key === c.key ? null : c);
                }}
              >
                {one ? <Glyph kind={one.kind} /> : <span className={styles.count}>{c.pins.length}</span>}
              </button>
            );
          })}

          {/* The hunt's marks: the things themselves, standing where they
              drop. The face is the best item's own icon — a glance says
              what, hover says everything, press opens the list. A giver's
              mark wears the quest ring so "kill for it" and "run an errand
              for it" stay tellable apart. */}
          {hunting
            ? hunt.map((h) => {
                const face = drops.find((d) => d.itemId === h.itemIds[0]);
                const icon = face ? iconUrl(face) : null;
                return (
                  <button
                    key={`${h.kind}${h.creatureId ?? h.name}-${h.x}`}
                    className={styles.mark}
                    data-giver={h.kind === "giver" || undefined}
                    aria-pressed={quarry === h}
                    aria-label={`${h.name} — drops for you`}
                    style={{ left: `${px(h.x)}%`, top: `${py(h.y)}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setActive(null);
                      setThread(null);
                      setDraft(null);
                      setQuarry(quarry === h ? null : h);
                    }}
                  >
                    {face && icon ? (
                      <ItemHover item={face} level={level} focusable={false} className={styles.markFace}>
                        <img src={icon} alt="" loading="lazy" draggable={false} />
                      </ItemHover>
                    ) : (
                      <MarkGlyph giver={h.kind === "giver"} />
                    )}
                    {h.itemIds.length > 1 ? (
                      <span className={styles.markCount}>{h.itemIds.length}</span>
                    ) : null}
                    {h.kind === "giver" ? (
                      <span className={styles.markRing} aria-hidden="true">
                        <svg viewBox="0 0 12 12">
                          <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                );
              })
            : null}

          {/* THE PINS (docs/PINS.md): what people left, standing where it was
              said. The aggro `!` in the pin pink — you noticed something.
              Near the reader's level it stands full; far from it, quiet.
              Hover is the chip; press is the thread in the rail. */}
          {/* A pin with no spot was left in the room's card stack rather than
              here, and there is nowhere on this picture it belongs. It reads
              in the rail's feed below like every other one. */}
          {said.filter(onTheMap).map((p) => (
            <button
              key={`pin-${p.id}`}
              className={styles.pinMark}
              data-near={Math.abs(p.level - level) <= PIN_BAND || undefined}
              aria-pressed={thread === p.id}
              aria-label={`${p.who} left a pin here`}
              style={{ left: `${px(p.x!)}%`, top: `${py(p.y!)}%`, transform: `translate(-50%, -88%) scale(${1 / zoom})` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setActive(null);
                setQuarry(null);
                setDraft(null);
                setThread(thread === p.id ? null : p.id);
              }}
            >
              <PinFace className={styles.pinGlyph} />
              <span className={styles.pinHover} data-flip={py(p.y!) < 30 || undefined} aria-hidden="true">
                <PinChip body={p.body} who={p.who} cls={p.cls} level={p.level} at={p.at} />
              </span>
            </button>
          ))}

          {draft ? (
            <span
              className={styles.pinMark}
              data-ghost
              aria-hidden="true"
              style={{ left: `${px(draft.x)}%`, top: `${py(draft.y)}%`, transform: `translate(-50%, -88%) scale(${1 / zoom})` }}
            >
              <PinFace className={styles.pinGlyph} />
            </span>
          ) : null}

          {focus ? (
            <span
              className={styles.lent}
              style={{ left: `${px(focus.x)}%`, top: `${py(focus.y)}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
              aria-hidden="true"
            />
          ) : null}
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
          {hunt.length > 0 ? (
            <button className={styles.chip} data-hunt aria-pressed={hunting} onClick={() => setHunting(!hunting)}>
              <MarkGlyph /> Drops for you
            </button>
          ) : null}
          <button
            className={styles.chip}
            data-pin
            aria-pressed={placing}
            onClick={() => {
              setPlacing(!placing);
              setDraft(null);
            }}
          >
            <PinFace className={styles.chipFace} /> Leave a pin
          </button>
          <span className={styles.zoom}>{zoom.toFixed(1)}×</span>
        </div>
      </div>

      <aside className={styles.rail}>
        {draft ? (
          <Say
            roomId={roomId}
            at={draft}
            onDone={(p) => {
              setSaid((was) => (was.some((t) => t.id === p.id) ? was : [p, ...was]));
              setDraft(null);
              setThread(p.id);
            }}
            onCancel={() => setDraft(null)}
          />
        ) : thread !== null && said.some((p) => p.id === thread) ? (
          <Thread
            pin={said.find((p) => p.id === thread)!}
            roomId={roomId}
            onReply={(id, r) =>
              setSaid((was) =>
                was.map((t) =>
                  t.id === id && !t.replies.some((x) => x.id === r.id) ? { ...t, replies: [...t.replies, r] } : t
                )
              )
            }
            onTakeBack={(id) => {
              setSaid((was) => was.filter((t) => t.id !== id));
              setThread(null);
            }}
          />
        ) : quarry ? (
          <Quarry h={quarry} drops={drops} level={level} onOpenItem={onOpenItem} />
        ) : active ? (
          <Rail c={active} />
        ) : said.length > 0 ? (
          <Feed title={title} pins={said} onOpen={(id) => setThread(id)} />
        ) : (
          <Empty title={title} />
        )}
      </aside>
    </div>
  );
}

function Glyph({ kind }: { kind: PoiKind }) {
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

/* The hunt's own glyph: a ring with a centre — here, exactly. The giver's
 * variant carries the quest circle inside it so the two read as kin. */
function MarkGlyph({ giver = false }: { giver?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
      {giver ? (
        <circle cx="6" cy="6" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.1" />
      ) : (
        <circle cx="6" cy="6" r="1.6" />
      )}
    </svg>
  );
}

/* One source, pressed: what it holds for the reader. Hover a name for the
 * plate; press it and the item takes the stage. */
function Quarry({
  h,
  drops,
  level,
  onOpenItem,
}: {
  h: HuntSpot;
  drops: Item[];
  level: number;
  onOpenItem?: (item: Item) => void;
}) {
  const holds = drops.filter((d) => h.itemIds.includes(d.itemId));
  return (
    <>
      <p className={styles.eyebrow}>{h.kind === "giver" ? "Quest giver" : "Drops for you"}</p>
      <h2 className={styles.h2}>{h.name}</h2>
      {h.kind === "drop" && h.p.length > 1 ? (
        <p className={styles.copy}>{h.p.length} spots recorded — the mark is the busiest.</p>
      ) : null}
      <ul className={styles.list}>
        {holds.map((d) => {
          const icon = iconUrl(d);
          return (
            <li key={d.itemId}>
              <button type="button" className={styles.quarryRow} onClick={() => onOpenItem?.(d)}>
                <ItemHover item={d} level={level} focusable={false} className={styles.quarryIcon}>
                  {icon ? <img src={icon} alt="" loading="lazy" draggable={false} /> : null}
                </ItemHover>
                <span className={styles.quarryName} data-quality={d.quality}>
                  {d.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
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

/* THE COMPOSER. One field, one thing, said once (docs/PINS.md). Signing in
 * is asked for only at the moment it matters, and in the register of the
 * record — never a wall. */
function Say({
  roomId,
  at,
  onDone,
  onCancel,
}: {
  roomId: string;
  at: { x: number; y: number };
  onDone: (p: Pin) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "signin" | "lost">("idle");

  async function send() {
    const body = text.trim();
    if (!body || state === "busy") return;
    const c = loadCharacter();
    if (!c) {
      setState("signin");
      return;
    }
    setState("busy");
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room: roomId,
          x: at.x,
          y: at.y,
          body,
          who: { name: c.name, cls: c.cls, level: c.level },
        }),
      });
      if (res.status === 401) return setState("signin");
      if (!res.ok) return setState("lost");
      const json = (await res.json()) as { pin: Pin };
      onDone(json.pin);
    } catch {
      setState("lost");
    }
  }

  return (
    <>
      <p className={styles.eyebrow}>Right here</p>
      <h2 className={styles.h2}>Say one thing.</h2>
      <textarea
        className={styles.say}
        maxLength={PIN_MAX}
        rows={4}
        placeholder="What made you stop?"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
      />
      {state === "signin" ? (
        <p className={styles.copy}>A pin goes on the permanent record — sign in on the Character tab first.</p>
      ) : null}
      {state === "lost" ? <p className={styles.copy}>It did not take. Say it once more.</p> : null}
      <div className={styles.sayRow}>
        <button className={styles.sayBtn} disabled={!text.trim() || state === "busy"} onClick={() => void send()}>
          Leave it
        </button>
        <button className={styles.sayQuiet} onClick={onCancel}>
          Never mind
        </button>
      </div>
      <p className={styles.copy}>It stays. The next one through sees it.</p>
    </>
  );
}

/* One pin, opened: the chip, the answers under it, and a line to add one.
 * Your own pin carries the one quiet undo the record allows. */
function Thread({
  pin,
  roomId,
  onReply,
  onTakeBack,
}: {
  pin: Pin;
  roomId: string;
  onReply: (id: number, r: PinReply) => void;
  onTakeBack: (id: number) => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "signin" | "lost">("idle");

  async function send() {
    const body = text.trim();
    if (!body || state === "busy") return;
    const c = loadCharacter();
    if (!c) {
      setState("signin");
      return;
    }
    setState("busy");
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room: roomId,
          x: pin.x,
          y: pin.y,
          body,
          parent: pin.id,
          who: { name: c.name, cls: c.cls, level: c.level },
        }),
      });
      if (res.status === 401) return setState("signin");
      if (!res.ok) return setState("lost");
      const json = (await res.json()) as { pin: PinReply };
      onReply(pin.id, { id: json.pin.id, body, who: c.name, cls: c.cls, level: c.level, at: new Date().toISOString(), mine: true });
      setText("");
      setState("idle");
    } catch {
      setState("lost");
    }
  }

  async function takeBack() {
    const res = await fetch(`/api/pins?id=${pin.id}`, { method: "DELETE" });
    if (res.ok) onTakeBack(pin.id);
  }

  return (
    <>
      <p className={styles.eyebrow}>Someone stopped here</p>
      <PinChip body={pin.body} who={pin.who} cls={pin.cls} level={pin.level} at={pin.at} className={styles.railChip} />
      {pin.replies.length > 0 ? (
        <ul className={styles.replies}>
          {pin.replies.map((r) => (
            <li key={r.id} className={styles.reply}>
              <span className={styles.replyWho} style={{ color: CLASS_COLOR[r.cls] }}>
                {r.who}
              </span>
              <span className={styles.replyBody}>{r.body}</span>
              <span className={styles.replyAge}>{pinAge(r.at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        className={styles.say}
        maxLength={PIN_MAX}
        rows={2}
        placeholder="Answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
      />
      {state === "signin" ? (
        <p className={styles.copy}>An answer goes on the record too — sign in on the Character tab first.</p>
      ) : null}
      {state === "lost" ? <p className={styles.copy}>It did not take. Say it once more.</p> : null}
      <div className={styles.sayRow}>
        <button className={styles.sayBtn} disabled={!text.trim() || state === "busy"} onClick={() => void send()}>
          Reply
        </button>
        {pin.mine ? (
          <button className={styles.sayQuiet} onClick={() => void takeBack()}>
            Take it back
          </button>
        ) : null}
      </div>
    </>
  );
}

/* THE RAIL AT REST. When nobody has pressed anything, the room's pins are
 * what the rail holds — the record is the default reading, not a hidden
 * layer (Kacey, 2026-08-26). Press one and the map is unchanged; only the
 * rail turns to the thread. */
function Feed({
  title,
  pins,
  onOpen,
}: {
  title: string;
  pins: Pin[];
  onOpen: (id: number) => void;
}) {
  return (
    <>
      <p className={styles.eyebrow}>{title}</p>
      <h2 className={styles.h2}>Left here.</h2>
      <ul className={styles.feed}>
        {pins.map((p) => (
          <li key={p.id}>
            <button type="button" className={styles.feedRow} onClick={() => onOpen(p.id)}>
              <PinChip body={p.body} who={p.who} cls={p.cls} level={p.level} at={p.at} />
              {p.replies.length > 0 ? (
                <span className={styles.feedMeta}>
                  {p.replies.length} {p.replies.length === 1 ? "answer" : "answers"}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
