"use client";

/* THE ROOM TALKS. docs/TARI.md §8: the live layer runs across the entire
 * room page, not inside a widget on it.
 *
 * So chat is here, in the bottom-left of the photograph, where the game
 * puts it and where docs/CONTRAST.md's scrim already holds the floor — the
 * bottom 26% and the left 46% are surface A, where ink may sit bare on the
 * art with no card under it. That is why this has no panel, no bubbles and
 * no border: the contrast measurement says it does not need them, and the
 * room is a photograph before it is an app.
 *
 * ENTER OPENS IT, ENTER SENDS IT, ESCAPE DROPS IT. The game's own contract,
 * and the reason the input is not a permanent box: a reader who is looking
 * at Duskwood should be looking at Duskwood.
 *
 * The name on a line comes from the message itself, not from presence. A
 * conversation you walk in on is mostly people who have already left, and
 * a line that says `g:k29fhz1` is not a line. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMessages, usePresenceListener, useTyping } from "@ably/chat/react";
import type { Message } from "@ably/chat";

import { readWho, SCROLLBACK, type Who } from "@/lib/ably";
import { CLASS_COLOR } from "@/lib/class-color";
import type { ClassId } from "@/lib/loot";

import { useLive } from "../../Live";
import styles from "./chat.module.css";

/** Long enough for a sentence about a quest, short enough that nobody
 *  paints the room with it. */
const LIMIT = 300;

type Line = {
  serial: string;
  clientId: string;
  text: string;
  name: string;
  cls: ClassId | null;
};

export default function Chat() {
  const { up, me } = useLive();
  if (!up || !me) return null;
  return <Talk me={me} />;
}

function Talk({ me }: { me: Who }) {
  const { meId } = useLive();
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const tail = useRef<HTMLDivElement>(null);

  const { sendMessage, historyBeforeSubscribe } = useMessages({
    listener: (event) => {
      if (event.type !== "message.created") return;
      setLines((was) => merge(was, [lineOf(event.message)]));
    },
  });
  const { keystroke, stop, currentlyTyping } = useTyping();
  const { presenceData } = usePresenceListener();

  /* What was said before you walked in. Ably keeps it; this is the reason
     an empty zone still shows a conversation rather than a void. */
  useEffect(() => {
    if (!historyBeforeSubscribe) return;
    let live = true;
    void historyBeforeSubscribe({ limit: SCROLLBACK })
      .then((page) => {
        if (live) setLines((was) => merge(was, page.items.map(lineOf)));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [historyBeforeSubscribe]);

  /* ENTER, anywhere in the room, opens the line. Not when the reader is
     already typing into something — ⌘K's field, the level box, a form. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  /* Pinned to the newest line, the way a chat pane is. */
  useEffect(() => {
    tail.current?.scrollIntoView({ block: "end" });
  }, [lines.length, open]);

  const close = useCallback(() => {
    setOpen(false);
    setDraft("");
    void stop().catch(() => {});
  }, [stop]);

  const send = useCallback(() => {
    const text = draft.trim().slice(0, LIMIT);
    if (!text) return close();
    /* The name rides with the message so history can name a stranger who
       has since walked out. Two short keys, because metadata is billed by
       the byte like everything else. */
    void sendMessage({ text, metadata: { n: me.name, c: me.cls } }).catch(() => {});
    close();
  }, [draft, me.cls, me.name, sendMessage, close]);

  /* Who is mid-sentence, named rather than counted — a room where you can
     see Fiend thinking is a room with somebody in it. */
  const typing = useMemo(() => {
    const names: string[] = [];
    for (const id of currentlyTyping) {
      if (id === meId) continue;
      const found = presenceData.find((m) => m.clientId === id);
      const who = readWho(found?.data);
      names.push(who?.name ?? "Someone");
    }
    return names;
  }, [currentlyTyping, meId, presenceData]);

  return (
    <section
      className={styles.chat}
      data-chat
      data-open={open || undefined}
      aria-label="Room chat"
    >
      <div className={styles.scroll}>
        <ol className={styles.lines}>
          {lines.map((line) => (
            <li key={line.serial} className={styles.line}>
              <span
                className={styles.who}
                style={line.cls ? { color: CLASS_COLOR[line.cls] } : undefined}
              >
                {line.name}
              </span>
              <span className={styles.said}>{line.text}</span>
            </li>
          ))}
        </ol>
        <div ref={tail} />
      </div>

      <p className={styles.typing} aria-live="polite">
        {typing.length === 0
          ? ""
          : typing.length === 1
            ? `${typing[0]} is typing…`
            : typing.length === 2
              ? `${typing[0]} and ${typing[1]} are typing…`
              : "Several people are typing…"}
      </p>

      {open ? (
        <div className={styles.bar}>
          <span className={styles.caret} aria-hidden="true">
            ›
          </span>
          <input
            ref={input}
            className={styles.field}
            value={draft}
            maxLength={LIMIT}
            placeholder={`Say something in the room`}
            aria-label="Say something in the room"
            onChange={(e) => {
              setDraft(e.target.value);
              void keystroke().catch(() => {});
            }}
            /* Losing focus closes an empty line and keeps a written one:
               reaching for the moments rail mid-sentence should not cost
               the sentence. */
            onBlur={() => {
              if (!draft.trim()) close();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          />
        </div>
      ) : (
        <button type="button" className={styles.hint} onClick={() => setOpen(true)}>
          <kbd>↵</kbd> to talk
        </button>
      )}
    </section>
  );
}

/* THE ONE PLACE A LINE ENTERS THE ROOM.
 *
 * History and the live listener overlap: `historyBeforeSubscribe` promises
 * what was said up to the moment the listener attached, but the two arrive
 * on different paths and the subscription can be remade under a reader who
 * never touched anything — a re-render with a fresh handle re-runs the
 * fetch. Sorting and deduplicating by serial makes both of those a
 * non-event, and it is also what puts the lines in order: a serial sorts
 * lexicographically in the order the server accepted the message, which is
 * the only clock every browser in the room agrees on.
 *
 * The tail is capped because a city that has been talking all day should
 * not cost a reader who just walked in a thousand DOM nodes. */
function merge(was: Line[], add: Line[]): Line[] {
  const seen = new Set(was.map((l) => l.serial));
  const next = was.slice();
  for (const line of add) {
    if (seen.has(line.serial)) continue;
    seen.add(line.serial);
    next.push(line);
  }
  next.sort((a, b) => (a.serial < b.serial ? -1 : a.serial > b.serial ? 1 : 0));
  return next.slice(-200);
}

/* One message, flattened to what the room draws. `metadata` came off
   somebody else's browser, so nothing in it is assumed. */
function lineOf(m: Message): Line {
  const meta = m.metadata as { n?: unknown; c?: unknown } | undefined;
  const name = typeof meta?.n === "string" && meta.n ? meta.n.slice(0, 24) : m.clientId;
  const cls = typeof meta?.c === "string" ? (meta.c as ClassId) : null;
  return { serial: m.serial, clientId: m.clientId, text: m.text, name, cls: cls && cls in CLASS_COLOR ? cls : null };
}
