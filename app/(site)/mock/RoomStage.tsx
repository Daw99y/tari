/* A ROOM, STILL. Room.tsx's stage with the live layer taken as props: the
 * photograph, the centred name, the deck switch in one corner, the compass in
 * the other, a card somebody left in the middle, and the summons and the chat
 * hint in the two lower corners. Same CSS files as the product; no wires. */

import Compass from "@/components/Compass";
import { PinFace } from "@/components/PinChip";
import UpArrow from "@/components/UpArrow";
import { authorColor } from "@/lib/class-color";
import type { PinClass } from "@/lib/pins";
import { CONTINENT_LABEL, getRoom, roomArt } from "@/lib/rooms";

import chat from "../../(app)/r/[room]/chat.module.css";
import decks from "../../(app)/r/[room]/decks.module.css";
import dock from "../../../components/dock.module.css";
import left from "../../(app)/r/[room]/left.module.css";
import room from "../../(app)/r/[room]/room.module.css";

const KIND_WORD: Record<string, string> = {
  city: "City",
  zone: "Zone",
  dungeon: "Dungeon",
  raid: "Raid",
  place: "Place",
};

export type MockPin = {
  who: string;
  cls: PinClass;
  meta: string;
  body: string;
};

export default function RoomStage({
  id,
  was,
  pin,
  pager,
  tally,
  drops,
}: {
  id: string;
  /** The room's former name, struck through over the title. */
  was?: string;
  pin: MockPin;
  /** [shown, of] — drawn only when the deck holds more than one. */
  pager?: [number, number];
  /** The count on the Left-here deck chip. */
  tally: number;
  /** The summons count in the lower corner. */
  drops?: number;
}) {
  const here = getRoom(id);
  if (!here) return null;

  return (
    <article className={room.room}>
      <img className={room.art} src={roomArt(id)} alt="" decoding="async" />
      <div className={room.scrim} />

      {/* the deck switch, top left — Decks.tsx with Left-here on the table */}
      <div className={decks.switch}>
        <div className={decks.bar}>
          <span className={decks.slot}>
            <img className={decks.face} src="/deck/telling.jpg" alt="" draggable={false} />
            <span className={decks.ring} />
          </span>
          <span className={decks.slot} data-on="">
            <img className={decks.face} src="/pins/map-x.png" alt="" draggable={false} />
            <span className={decks.ring} />
            <span className={decks.tally}>{tally}</span>
          </span>
          <span className={decks.slot}>
            <img className={decks.face} src="/deck/room.jpg" alt="" draggable={false} />
            <span className={decks.ring} />
          </span>
        </div>
        <p className={decks.word}>Left here</p>
      </div>

      {/* the compass, top right */}
      <span className={dock.compass}>
        <span className={dock.halo} />
        <Compass className={dock.rose} />
        <span className={dock.word}>View map</span>
      </span>

      {/* the deck itself, dead centre — Left.tsx's card, pager and action */}
      <section className={left.left} data-story data-deck>
        <p className={left.eyebrow}>Left here</p>
        <article className={left.card}>
          <p className={left.who}>
            <PinFace className={left.whoFace} />
            <strong style={{ color: authorColor(pin.cls) }}>{pin.who}</strong>
            <span className={left.whoMeta}>{pin.meta}</span>
          </p>
          <p className={left.body}>{pin.body}</p>
        </article>
        {pager ? (
          <div className={left.pager}>
            <span className={left.page}>‹</span>
            <span className={left.count}>
              {pager[0]} of {pager[1]}
            </span>
            <span className={left.page}>›</span>
          </div>
        ) : null}
        <span className={left.act}>
          <PinFace className={left.actFace} />
          Leave a pin
        </span>
        <span className={left.aside}>or put one on the map</span>
      </section>

      {/* the summons, bottom right */}
      {drops ? (
        <div className={room.objects}>
          <aside className={room.upgrades}>
            <div className={room.upWrap}>
              <span className={room.up}>
                <span className={room.upHalo} />
                <UpArrow className={room.upGlyph} />
                <span className={room.upCount}>{drops}</span>
              </span>
            </div>
          </aside>
        </div>
      ) : null}

      {/* the room names itself */}
      <div className={room.card}>
        <p className={room.line}>
          {KIND_WORD[here.kind]} · {CONTINENT_LABEL[here.continent]}
        </p>
        {was ? <p className={room.was}>{was}</p> : null}
        <h1 className={room.name}>{here.name}</h1>
      </div>

      {/* the chat's invitation, bottom left */}
      <div className={chat.chat}>
        <span className={chat.hint}>
          <kbd>↵</kbd> to talk
        </span>
      </div>
    </article>
  );
}
