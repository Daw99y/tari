/* A ROOM, TELLING. RoomStage's sibling: same photograph and chrome, but the
 * deck switch sits on Telling instead of Left-here, and the centre card is a
 * Story.tsx card — a beware/yell card, frozen on one stop, no live cycling
 * or paging. Same CSS files as the product; no wires. */

import UpArrow from "@/components/UpArrow";
import { CONTINENT_LABEL, getRoom, roomArt } from "@/lib/rooms";

import decks from "../../(app)/r/[room]/decks.module.css";
import dock from "../../../components/dock.module.css";
import room from "../../(app)/r/[room]/room.module.css";
import story from "../../(app)/r/[room]/story.module.css";

export type MockStoryCard = {
  icon: string;
  subject: string;
  tag: string;
  yell?: string;
  lines: string[];
};

export default function StoryStage({
  id,
  was,
  card,
  pager,
  drops,
}: {
  id: string;
  /** The room's former name, struck through over the title. */
  was?: string;
  card: MockStoryCard;
  /** [shown, of] — the deck's position on the road. */
  pager: [number, number];
  /** The summons count in the lower corner. */
  drops?: number;
}) {
  const here = getRoom(id);
  if (!here) return null;

  return (
    <article className={room.room}>
      <img className={room.art} src={roomArt(id)} alt="" decoding="async" />
      <div className={room.scrim} />

      {/* the deck switch, top left — Telling on the table */}
      <div className={decks.switch}>
        <div className={decks.bar}>
          <span className={decks.slot} data-on="">
            <img className={decks.face} src="/deck/telling.jpg" alt="" draggable={false} />
            <span className={decks.ring} />
          </span>
          <span className={decks.slot}>
            <img className={decks.face} src="/pins/map-x.png" alt="" draggable={false} />
            <span className={decks.ring} />
          </span>
          <span className={decks.slot}>
            <img className={decks.face} src="/deck/room.jpg" alt="" draggable={false} />
            <span className={decks.ring} />
          </span>
        </div>
        <p className={decks.word}>Telling</p>
      </div>

      {/* the compass, top right */}
      <span className={dock.compass}>
        <span className={dock.halo} />
        <span className={dock.word}>View map</span>
      </span>

      {/* the story, dead centre — Story.tsx's card, frozen on Stitches */}
      <section className={story.story} data-story data-deck>
        <div className={story.table}>
          <div className={story.deck} aria-hidden="true">
            <span className={story.sleeve} data-under="2" />
            <span className={story.sleeve} data-under="1" />
          </div>
          <div className={story.slot}>
            <article className={story.card}>
              <span className={story.tile}>
                <img src={`/story/${id}/${card.icon}.png`} alt="" draggable={false} />
              </span>
              <span className={story.text}>
                <span className={story.eyebrow} data-kind="beware">
                  It will kill you
                </span>
                <span className={story.name}>{card.subject}</span>
                <span className={story.tag}>{card.tag}</span>
                {card.yell ? (
                  <span className={story.yell}>
                    <span className={story.yellWho}>{card.subject} yells</span>
                    <span className={story.yellText}>{card.yell}</span>
                  </span>
                ) : null}
                <span className={story.lines}>
                  {card.lines.map((l) => (
                    <span key={l} className={story.line}>
                      {l}
                    </span>
                  ))}
                </span>
                <span className={story.acts}>
                  <span className={story.act}>Open the map here</span>
                </span>
              </span>
            </article>
          </div>
          <nav className={story.turns} aria-label="Turn the deck">
            <button type="button" className={story.turn}>
              <span className={story.turnGlyph} aria-hidden="true">
                ←
              </span>
              Raven Hill
            </button>
            <span className={story.count}>
              {pager[0]} <span className={story.countOf}>of {pager[1]}</span>
            </span>
            <button type="button" className={story.turn} data-east="">
              Darkshire
              <span className={story.turnGlyph} aria-hidden="true">
                →
              </span>
            </button>
          </nav>
        </div>
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
          {here.kind === "zone" ? "Zone" : "Place"} · {CONTINENT_LABEL[here.continent]}
        </p>
        {was ? <p className={room.was}>{was}</p> : null}
        <h1 className={room.name}>{here.name}</h1>
      </div>
    </article>
  );
}
