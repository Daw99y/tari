"use client";

/* CURSORS MOVE OVER AZEROTH ITSELF. docs/TARI.md §8: not a widget on the
 * room, the room. Someone hovers a spot and you watch it happen.
 *
 * POSITIONS COME FROM SPACES, NAMES COME FROM PRESENCE. Ably Spaces
 * batches cursor positions so a browser publishes one message per batch
 * interval rather than one per mouse event. Identity would double the size
 * of every one of those batches, so it does not ride with them: the chat
 * presence set already knows who each clientId is, and that is a lookup,
 * not a message.
 *
 * WHY THIS TALKS TO `space` AND NOT TO THE SDK'S HOOKS. `useSpace()` and
 * `useCursors()` return `space.enter.bind(space)` and
 * `cursors.set.bind(cursors)` — a fresh function object on every render.
 * Anything holding one in a dependency array re-runs on every render, and
 * because an incoming cursor re-renders this component, `enter()` in an
 * effect becomes a feedback loop: render, enter, presence message, render.
 * It puts about sixty presence messages a second on the space channel and
 * Ably starts refusing them at fifty. So the space handle is taken from
 * the context — that reference *is* stable — and enter, subscribe and set
 * are driven by hand.
 *
 * ABOVE CURSOR_CAP PEOPLE, THIS UNMOUNTS. lib/ably.ts carries the
 * argument — the cost is quadratic and the effect is confetti. */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePresenceListener } from "@ably/chat/react";
import type { CursorUpdate } from "@ably/spaces";
import { useSpace } from "@ably/spaces/react";

import { CURSOR_BATCH_MS, CURSOR_CAP, readWho, type Who } from "@/lib/ably";
import { CLASS_COLOR } from "@/lib/class-color";

import { useLive } from "../../Live";
import styles from "./cursors.module.css";

/** A pointer that has not moved in this long has been abandoned — the
 *  reader alt-tabbed, or went to make tea. Fade it rather than leave a
 *  name pinned to a tree. */
const IDLE_MS = 20_000;

/** Below this, a move is a twitch. Not worth a message. */
const MIN_STEP = 0.002;

type Pointer = { x: number; y: number; at: number; clientId: string };

export default function Cursors() {
  const { up } = useLive();
  /* No connection, no hooks: the room's providers are not mounted without
     one (app/(app)/Live.tsx), and a chat hook outside them throws. */
  if (!up) return null;
  return <Crowd />;
}

/* Counting happens out here so the machinery below mounts and unmounts
   whole as a room fills and empties. */
function Crowd() {
  const { presenceData } = usePresenceListener();
  const heads = new Set(presenceData.map((m) => m.clientId)).size;
  if (heads > CURSOR_CAP) return null;
  return <Pointers />;
}

function Pointers() {
  const { space } = useSpace();
  const { presenceData } = usePresenceListener();
  const layer = useRef<HTMLDivElement>(null);
  const [pointers, setPointers] = useState<Record<string, Pointer>>({});
  const [, tick] = useState(0);

  /* Enter once per space, and leave on the way out. Keyed on `space`,
     which comes from context and does not change between renders. */
  useEffect(() => {
    if (!space) return;
    void space.enter().catch(() => {});
    return () => {
      void space.leave().catch(() => {});
    };
  }, [space]);

  /* Incoming. Buffered into a ref and flushed once a frame: with a dozen
     pointers moving, one setState per message is a dozen renders a frame
     for a picture that can only change once. */
  useEffect(() => {
    if (!space) return;
    const buffer = new Map<string, Pointer>();
    let frame = 0;

    function flush() {
      frame = 0;
      if (buffer.size === 0) return;
      const batch = Object.fromEntries(buffer);
      buffer.clear();
      setPointers((was) => ({ ...was, ...batch }));
    }

    function onUpdate(u: CursorUpdate) {
      if (u.connectionId === space?.connectionId) return;
      buffer.set(u.connectionId, {
        x: u.position.x,
        y: u.position.y,
        at: Date.now(),
        clientId: u.clientId,
      });
      if (!frame) frame = requestAnimationFrame(flush);
    }

    space.cursors.subscribe("update", onUpdate);
    return () => {
      space.cursors.unsubscribe("update", onUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [space]);

  /* Outgoing. One publish per batch interval at most — the SDK batches on
     top of this, but calling `set` sixty times a second to have it collapse
     them is work nobody needs done. */
  useEffect(() => {
    if (!space) return;
    let pending: { x: number; y: number } | null = null;
    let last: { x: number; y: number } | null = null;

    function onMove(e: PointerEvent) {
      const box = layer.current?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) return;
      const x = (e.clientX - box.left) / box.width;
      const y = (e.clientY - box.top) / box.height;
      /* Off the room — the rail, the people column — is not a position. */
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      pending = { x, y };
    }

    const beat = setInterval(() => {
      if (!pending || !space) return;
      if (last && Math.abs(last.x - pending.x) < MIN_STEP && Math.abs(last.y - pending.y) < MIN_STEP) {
        return;
      }
      last = pending;
      void space.cursors.set({ position: pending }).catch(() => {});
    }, CURSOR_BATCH_MS);

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearInterval(beat);
    };
  }, [space]);

  /* Nothing pushes "this cursor went quiet", so the room checks. */
  useEffect(() => {
    const every = setInterval(() => tick((n) => n + 1), 4_000);
    return () => clearInterval(every);
  }, []);

  /* Positions are normalised 0–1 against the room, so everyone points at
     the same part of the same photograph whatever their window is. */
  const drawn = useMemo(() => {
    const now = Date.now();
    const whoBy = new Map<string, Who>();
    for (const m of presenceData) {
      const who = readWho(m.data);
      if (who) whoBy.set(m.clientId, who);
    }
    return Object.entries(pointers)
      .filter(([, p]) => now - p.at < IDLE_MS)
      .map(([connectionId, p]) => ({ connectionId, p, who: whoBy.get(p.clientId) ?? null }));
  }, [pointers, presenceData]);

  return (
    <div ref={layer} className={styles.layer} data-cursors aria-hidden="true">
      {drawn.map(({ connectionId, p, who }) => (
        <div
          key={connectionId}
          className={styles.pointer}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        >
          <Arrow color={who ? CLASS_COLOR[who.cls] : "#f2f0ea"} />
          {who ? (
            <span className={styles.tag} style={{ color: CLASS_COLOR[who.cls] }}>
              {who.name}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* The arrow carries its own dark outline, the way the map's pin markers do
 * (docs/CONTRAST.md: a vector with an outline needs no chip; its *text*
 * still does). */
function Arrow({ color }: { color: string }) {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 18" width="16" height="18">
      <path
        d="M1 1L1 14.2L4.6 11.1L7.1 16.6L9.9 15.3L7.4 10L12 9.4Z"
        fill={color}
        stroke="rgba(6,6,10,0.7)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
