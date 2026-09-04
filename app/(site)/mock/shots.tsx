/* THE THREE WINDOWS, NAMED. One place decides what each landing mock shows;
 * the landing frames them (page.tsx) and /shot/[id] serves each one alone in
 * its own document — because the shell's phone styles key on the viewport,
 * and only an iframe gives the mock a viewport of its own. */

import RoomStage from "./RoomStage";
import SheetStage from "./SheetStage";
import StoryStage from "./StoryStage";
import Window from "./Window";

/* A 1760×980 desktop window. Not arbitrary: the sheet puts the paperdoll
 * away when the stage is 64rem or under (you/sheet.module.css, @container
 * stage), and the stage is the window minus the rail, the column and the
 * gaps. 1760 leaves it ~1230px — a real desktop, with room to spare. */
export const SHOT_W = 1760;
export const SHOT_H = 980;

export const SHOT_IDS = ["undercity", "you", "duskwood"] as const;
export type ShotId = (typeof SHOT_IDS)[number];

export function Shot({ id }: { id: ShotId }) {
  switch (id) {
    case "undercity":
      return (
        <Window
          current="undercity"
          column={{
            kind: "room",
            roomId: "undercity",
            count: "5 here",
            heads: [
              ["Tansy", "41 druid", "druid"],
              ["Okto", "33 hunter", "hunter"],
              ["Marrow", "29 warlock", "warlock"],
              ["Imcamtspel", "you", "rogue"],
              ["Bruk", "24 warrior", "warrior"],
            ],
            doorCounts: { "tirisfal-glades": 4 },
          }}
        >
          <RoomStage
            id="undercity"
            was="Lordaeron"
            pin={{
              who: "Marrow",
              cls: "warlock",
              meta: "29 warlock · 2h",
              body: "The ring is one loop and every quarter hangs off it. Walk it once without opening the map.",
            }}
            tally={1}
            drops={1}
          />
        </Window>
      );

    case "you":
      return (
        <Window column={{ kind: "pick" }}>
          <SheetStage />
        </Window>
      );

    case "duskwood":
      return (
        <Window
          current="duskwood"
          column={{
            kind: "room",
            roomId: "duskwood",
            count: "Just you",
            heads: [["Imcamtspel", "you", "rogue"]],
            doorCounts: { "elwynn-forest": 3 },
          }}
        >
          <StoryStage
            id="duskwood"
            was="Brightwood"
            card={{
              icon: "stitches",
              subject: "Stitches",
              tag: "Level 35 Elite · walks the road",
              yell: "DARKSHIRE... I HUNGER.",
              lines: ["Two Night Watch stands are in his way.", "Without help, he kills both."],
            }}
            pager={[9, 15]}
            drops={6}
          />
        </Window>
      );
  }
}
