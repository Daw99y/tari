/**
 * THE RECORD, ON THIS MACHINE.
 *
 * lib/sync.ts is the conversation and app/api/record is the far end of it.
 * This is the near end: the marks the reader has made, held in the browser,
 * pushed when there is somebody to push them to.
 *
 * LOCAL FIRST, ALWAYS. A star is written to localStorage and drawn before
 * anything is asked of the network, and it stays written whether the request
 * lands, fails, or is never made because nobody signed in. COMMUNITY.md
 * governs: a stranger keeps the whole tool. Signing in with Discord adds one
 * thing and takes nothing away — the same star, on the other machine.
 *
 * WHY A GENERAL STORE FOR ONE FEATURE. The rail's stars are the first client
 * half of a sync whose server half has been finished and unused for a while.
 * Writing them as `fav` marks beside the other five kinds means the day
 * `found` and `wish` arrive they are a call to `setMark`, not a second copy
 * of this file. Nothing here knows what a room is.
 */

"use client";

import { useSyncExternalStore } from "react";

import { MAX_MARKS, type Mark, type MarkKind, type SyncPull } from "./sync";

const KEY = "tari:marks";

/** A queued change, with the number that says how old it is. The sequence is
 *  local scaffolding and never leaves the machine — `readPush` refuses a body
 *  carrying a field it did not ask for. */
type Queued = { seq: number; mark: Mark };

export type MarkStore = {
  /** char → kind → subject → val. A mark that is off is absent: this half of
   *  the record only has to remember what is true. `val` is null for the
   *  set-shaped kinds, which is all of them except equip. */
  on: Record<string, Partial<Record<MarkKind, Record<string, string | null>>>>;
  /** What the server has not accepted yet. */
  queue: Queued[];
  /** The server timestamp the last pull answered with. */
  since: string | null;
};

const EMPTY: MarkStore = { on: {}, queue: [], since: null };

let cache: MarkStore | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function read(): MarkStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const s = JSON.parse(raw) as MarkStore;
    /* A store written by an older build, or by nothing at all. Shape it
       rather than trusting it — this is the reader's own disk, but it is
       still the one input this file does not write itself. */
    if (!s || typeof s !== "object") return EMPTY;
    const store: MarkStore = {
      on: s.on && typeof s.on === "object" ? s.on : {},
      queue: Array.isArray(s.queue) ? s.queue : [],
      since: typeof s.since === "string" ? s.since : null,
    };
    for (const q of store.queue) seq = Math.max(seq, q.seq ?? 0);
    return store;
  } catch {
    return EMPTY;
  }
}

function snapshot(): MarkStore {
  return (cache ??= read());
}

/** The server render has no localStorage and must not guess at one. Every
 *  card draws unstarred for one frame; the effect that follows corrects it. */
function serverSnapshot(): MarkStore {
  return EMPTY;
}

function commit(next: MarkStore): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage off. The session still works; it just forgets at the door.
  }
  for (const l of listeners) l();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Subscribe a component to the whole record. Cheap: the object is replaced
 *  on every change and shared between every reader, so React's identity check
 *  is the comparison. */
export function useMarks(): MarkStore {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** The record as it stands, outside React. The sheet and the room's cards
 *  read it through `useMarks`; the stage asks a question once, in an effect,
 *  and has nothing to subscribe. Same object either way. */
export function marksNow(): MarkStore {
  try {
    return snapshot();
  } catch {
    return EMPTY;
  }
}

export function isOn(store: MarkStore, char: string, kind: MarkKind, subject: string): boolean {
  return store.on[char]?.[kind]?.[subject] !== undefined;
}

/** Every subject of one kind that is on, for one character. */
export function subjectsOn(store: MarkStore, char: string, kind: MarkKind): string[] {
  return Object.keys(store.on[char]?.[kind] ?? {});
}

/**
 * Make a mark, or take it back.
 *
 * The map and the queue move together and the disk takes both, so a tab that
 * closes mid-request loses nothing: the change is already written, and the
 * next tab to open pushes it.
 */
export function setMark(
  char: string,
  kind: MarkKind,
  subject: string,
  on: boolean,
  val: string | null = null
): void {
  const cur = snapshot();
  const kinds = { ...(cur.on[char] ?? {}) };
  const subjects = { ...(kinds[kind] ?? {}) };
  if (on) subjects[subject] = val;
  else delete subjects[subject];
  kinds[kind] = subjects;

  /* One row per subject in flight. A reader who taps a star four times sends
     the fourth answer once, not four answers in order. */
  const same = (q: Queued) =>
    q.mark.char === char && q.mark.kind === kind && q.mark.subject === subject;
  const queue = [...cur.queue.filter((q) => !same(q)), { seq: ++seq, mark: { char, kind, subject, val, on } }];

  commit({ on: { ...cur.on, [char]: kinds }, queue, since: cur.since });
  soon();
}

/* ---- the conversation */

/** 401 is signed out and 404 is a deploy with no database. Both mean there is
 *  nobody to talk to, and neither changes until the page reloads — so ask
 *  once and then stop, rather than firing a doomed request per star. */
let mute = false;
let flight: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE = 1200;

/** Signed out, and the caller already knows it. Saves the one refused request
 *  a star would otherwise cost. Nothing else changes: the mark is written and
 *  drawn either way, and signing in pushes the backlog. */
export function silence(): void {
  mute = true;
}

function soon(): void {
  if (mute) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void sync();
  }, DEBOUNCE);
}

/**
 * Push what changed, take back what the account changed elsewhere.
 *
 * One request does both — see lib/sync.ts on why it is not two. Failure is
 * not handled here beyond not making it worse: the marks stay queued, and the
 * next star or the next page load tries again.
 */
export async function sync(): Promise<void> {
  if (mute) return;
  if (flight) return flight;
  flight = run().finally(() => {
    flight = null;
  });
  return flight;
}

async function run(): Promise<void> {
  const before = snapshot();
  const sending = before.queue.slice(0, MAX_MARKS);
  const high = sending.length ? sending[sending.length - 1].seq : 0;

  let pull: SyncPull;
  try {
    const res = await fetch("/api/record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        since: before.since,
        marks: sending.map((q) => q.mark),
        chars: [],
      }),
    });
    if (res.status === 401 || res.status === 404) {
      mute = true;
      return;
    }
    if (!res.ok) return; // 429 or 503: try again on the next change.
    pull = (await res.json()) as SyncPull;
  } catch {
    return; // Offline. The queue keeps.
  }

  const cur = snapshot();
  /* Everything sent is settled, however the reader has moved since. A subject
     touched again mid-flight carries a higher sequence and survives. */
  const queue = cur.queue.filter((q) => q.seq > high);
  const pending = new Set(queue.map((q) => `${q.mark.char}|${q.mark.kind}|${q.mark.subject}`));

  const on: MarkStore["on"] = { ...cur.on };
  for (const m of pull.marks ?? []) {
    /* The reader's newer answer beats the server's older one. It is already
       queued, so the next push carries it. */
    if (pending.has(`${m.char}|${m.kind}|${m.subject}`)) continue;
    const kinds = { ...(on[m.char] ?? {}) };
    const subjects = { ...(kinds[m.kind] ?? {}) };
    if (m.on) subjects[m.subject] = m.val ?? null;
    else delete subjects[m.subject];
    kinds[m.kind] = subjects;
    on[m.char] = kinds;
  }

  commit({ on, queue, since: pull.at ?? cur.since });

  /* The page hit the cap. Ask again now — see the route on why waiting for
     the next tick would deliver a first sync one debounce at a time. */
  if (pull.more) void sync();
  else if (queue.length) soon();
}
