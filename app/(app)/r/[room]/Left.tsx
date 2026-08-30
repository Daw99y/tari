"use client";

/* WHAT PEOPLE LEFT HERE. The middle of a room nobody has written.
 *
 * Two rooms out of seventy-nine have a guide file. The other seventy-seven
 * drew a photograph, a name at the top, and nothing at all across the middle,
 * which reads as a loading screen rather than a decision — and was the single
 * biggest reason the app felt unfinished.
 *
 * The answer is not filler. It is the product's own argument (docs/TARI.md
 * §2.2): the atom is the pin, so the room a writer has not reached is the
 * room its readers write. This is the same deck the guide deals
 * (Story.tsx) with the cards coming from people instead of from a file, and
 * the composer stands in the deck rather than beside it — you write here, and
 * what you wrote is the card on top when you are done.
 *
 * WHAT IT SAYS WITH AN EMPTY DECK. Only what the room already knows: that
 * nobody has written it, the pipeline's level band, and the room it stands
 * inside. It invents nothing, and the day reference/guide/<room>.json lands
 * Room.tsx draws the telling instead.
 *
 * `data-story` rather than a class of its own: the room already knows how to
 * make the telling step aside for the stage (room.module.css), and this wants
 * exactly that. One attribute, no new rule. */

import { useEffect, useRef, useState } from "react";

import { useDock } from "@/components/Dock";
import { PinFace } from "@/components/PinChip";
import { loadCharacter } from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { PIN_MAX, onTheMap, pinAge, pinsChannel, readPin, type Pin } from "@/lib/pins";
import type { Band } from "@/lib/room-bands";
import type { Room } from "@/lib/rooms";

import { useLive } from "../../Live";
import styles from "./left.module.css";

type Props = {
  room: Room;
  /** The pipeline's band for this room, when it has one. */
  band: Band | undefined;
  /** The room this one stands inside, for an instance, a city or a hub. */
  inside: Room | undefined;
  /** Whether the room has a map. Thirty-three do not, and in those a pin can
   *  only ever be left here. */
  plated: boolean;
  pins: Pin[];
};

type Sending = "idle" | "busy" | "signin" | "lost";

export default function Left({ room, band, inside, plated, pins }: Props) {
  const dock = useDock();
  const { realtime } = useLive();

  /* Server-read to start; the room's own channel lands the rest as they are
     said. Newest first, which is the order pinsIn already returns. */
  const [said, setSaid] = useState<Pin[]>(pins);
  const [at, setAt] = useState(0);
  const [writing, setWriting] = useState(false);

  /* A pin landing anywhere — this browser, another reader, or the map two
     inches away — arrives here. Merging by id keeps our own echo quiet. */
  useEffect(() => {
    if (!realtime) return;
    const chan = realtime.channels.get(pinsChannel(room.id));
    const onPin = (msg: { data?: unknown }) => {
      const p = readPin(msg.data);
      if (!p || p.parent !== null) return;
      setSaid((was) => (was.some((q) => q.id === p.id) ? was : [p, ...was]));
    };
    void chan.subscribe("pin", onPin);
    return () => {
      chan.unsubscribe("pin", onPin);
    };
  }, [realtime, room.id]);

  function landed(pin: Pin) {
    setSaid((was) => (was.some((q) => q.id === pin.id) ? was : [pin, ...was]));
    setAt(0);
    setWriting(false);
  }

  const card = said[Math.min(at, said.length - 1)];

  return (
    <section className={styles.left} data-story aria-label={`What people left in ${room.name}`}>
      {writing ? (
        <Say roomId={room.id} onDone={landed} onCancel={() => setWriting(false)} />
      ) : said.length === 0 ? (
        <Empty room={room} band={band} inside={inside} />
      ) : (
        <>
          <p className={styles.eyebrow}>Left here</p>
          <Card pin={card} onMap={onTheMap(card) ? () => dock?.openMapAt({ x: card.x!, y: card.y! }) : null} />
          {said.length > 1 ? (
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.page}
                onClick={() => setAt((i) => (i - 1 + said.length) % said.length)}
                aria-label="The one before"
              >
                ‹
              </button>
              <span className={styles.count}>
                {Math.min(at, said.length - 1) + 1} of {said.length}
              </span>
              <button
                type="button"
                className={styles.page}
                onClick={() => setAt((i) => (i + 1) % said.length)}
                aria-label="The one after"
              >
                ›
              </button>
            </div>
          ) : null}
        </>
      )}

      {writing ? null : (
        <button type="button" className={styles.act} onClick={() => setWriting(true)}>
          <PinFace className={styles.actFace} />
          {said.length === 0 ? "Leave the first pin" : "Leave a pin"}
        </button>
      )}

      {/* A room with a map can also be written on it, one spot at a time.
          The two are the same record; this only says where the other door is. */}
      {!writing && plated ? (
        <button type="button" className={styles.aside} onClick={() => dock?.openMap()}>
          or put one on the map
        </button>
      ) : null}
    </section>
  );
}

/* ---- an empty deck. Facts, and nothing dressed up as one. */

function Empty({ room, band, inside }: { room: Room; band: Band | undefined; inside: Room | undefined }) {
  /* A capital is levels one to sixty, which is the game rather than the
     room. A figure that tells nobody anything is worse than no figure. */
  const figure = band && band.max - band.min <= 34 ? `${band.min}–${band.max}` : null;

  return (
    <>
      <p className={styles.eyebrow}>Not written yet</p>
      {figure ? (
        <p className={styles.figure}>
          {figure}
          <span className={styles.figureWord}>levels</span>
        </p>
      ) : null}
      <p className={styles.lines}>
        {inside ? <span>Inside {inside.name}.</span> : null}
        <span>Nobody has said anything about {room.name}.</span>
      </p>
    </>
  );
}

/* ---- one card. The pin, as the room shows it: who said it, when, and the
   one sentence. The plate's own glass, at the size the guide's cards use. */

function Card({ pin, onMap }: { pin: Pin; onMap: (() => void) | null }) {
  return (
    <article className={styles.card}>
      <p className={styles.who}>
        <PinFace className={styles.whoFace} />
        <strong style={{ color: CLASS_COLOR[pin.cls] }}>{pin.who}</strong>
        <span className={styles.whoMeta}>
          {pin.level} {pin.cls} · {pinAge(pin.at)}
        </span>
      </p>
      <p className={styles.body}>{pin.body}</p>
      {pin.replies.length > 0 || onMap ? (
        <p className={styles.foot}>
          {pin.replies.length > 0 ? (
            <span>
              {pin.replies.length} {pin.replies.length === 1 ? "answer" : "answers"}
            </span>
          ) : null}
          {onMap ? (
            <button type="button" className={styles.footLink} onClick={onMap}>
              Where this was said
            </button>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

/* ---- the composer, standing in the deck.
 *
 * The map's own composer (components/ZoneMap.tsx, `Say`) asks the same
 * question about a spot the reader picked. This one asks it about the room,
 * and posts without an x or a y — which is the whole reason a dungeon can now
 * be written in at all (docs/PINS.md). */

function Say({
  roomId,
  onDone,
  onCancel,
}: {
  roomId: string;
  onDone: (p: Pin) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<Sending>("idle");
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => field.current?.focus(), []);

  async function send() {
    const body = text.trim();
    if (!body || state === "busy") return;
    const c = loadCharacter();
    if (!c) return setState("signin");
    setState("busy");
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room: roomId,
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
    <div className={styles.card} data-writing>
      <p className={styles.eyebrow}>Say one thing</p>
      <textarea
        ref={field}
        className={styles.field}
        maxLength={PIN_MAX}
        rows={3}
        placeholder="What should the next one through know?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
      />
      {state === "signin" ? (
        <p className={styles.note}>A pin goes on the permanent record. Sign in at the foot of the rail first.</p>
      ) : null}
      {state === "lost" ? <p className={styles.note}>It did not take. Say it once more.</p> : null}
      <div className={styles.sayRow}>
        <button
          type="button"
          className={styles.act}
          disabled={!text.trim() || state === "busy"}
          onClick={() => void send()}
        >
          Leave it
        </button>
        <button type="button" className={styles.aside} onClick={onCancel}>
          Never mind
        </button>
      </div>
      <p className={styles.note}>It stays. The next one through sees it.</p>
    </div>
  );
}
