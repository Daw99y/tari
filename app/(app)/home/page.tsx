/* THE FRONT DOOR. docs/DIRECTION.md §3 — three columns, one screen, and no
 * navigation for the common case.
 *
 * WHERE YOU ARE · WHO YOU ARE · WHAT IS HAPPENING. Rule 1 says a surface
 * answers at least one of those three. This one answers all of them at once,
 * which is why §5 makes it the product and the room the chassis under it.
 *
 * THE ZONE IS A SEARCH PARAM, AND THAT IS THE WHOLE STATE MODEL (SHELL.md,
 * "the URL is the state"). `?zone=duskwood` is where the first column is
 * looking. Changing it is a <Link>, so the loot file, the quest index and the
 * pins are all read here on the server and none of them ship to the browser —
 * the same division the room page keeps, for the same reason.
 *
 * THE DEFAULT IS A LAST-SEEN AND NEVER A WHEREABOUTS (§4.1, rule 9). Tari
 * cannot know where a reader is standing: the combat log buffers in memory and
 * flushes on logout, and the armory answers as of last logout. So with no
 * param the column opens on the zone the addon last reported, off the `tari_who`
 * cookie, stamped with the fact that it is a last-seen. Nothing on this screen
 * says "now" about a person, nothing pulses, and there is no live dot. Get that
 * wrong and the product lies on its own home screen.
 *
 * IT WORKS SIGNED OUT. Columns one and three answer a stranger exactly as they
 * answer a member (lib/auth.ts's doctrine). The session is read for one thing:
 * whether the middle column offers a door or draws one.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";

import { auth, hasAuth } from "@/lib/auth";
import { bestZone } from "@/lib/best-zone";
import { readSide, readWhere, readWho, WHO_COOKIE } from "@/lib/character";
import { questsHere } from "@/lib/here";
import { roomOf } from "@/lib/journey";
import { clampLevel, defaultLevel, isClassId, lootFor, panelFor } from "@/lib/loot";
import { recentNews } from "@/lib/news";
import { pinsIn } from "@/lib/pins-db";
import { getRoom } from "@/lib/rooms";

import What from "./What";
import Where from "./Where";
import Who from "./Who";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Tari",
};

/** The last resort, and it should almost never be reached: a reader with no
 *  last-seen and no room holding anything for their class and level. Duskwood
 *  for the same reason FIRST_ROOM is Duskwood — a place with weather in it. */
const FALLBACK = "duskwood";

type Props = {
  searchParams: Promise<{ zone?: string; by?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const cookie = jar.get(WHO_COOKIE)?.value;

  const who = readWho(cookie);
  const cls = isClassId(who?.cls) ? who.cls : null;
  const side = readSide(cookie);

  /* The zone the client last handed over, as a room. A name the pipeline
     knows and the rail does not — a battleground, say — maps to nothing, and
     the column falls through to the fallback rather than to an error. */
  const lastSeen = readWhere(cookie);
  const remembered = roomOf(lastSeen);

  const asked = sp.zone && getRoom(sp.zone) ? sp.zone : null;

  /* `?by=judge` is Settle's signature on a zone it moved the column to. The
     URL has to carry it: without it the app's own choice comes back looking
     like the reader's, the stamp reads "Looking at" over a decision nobody
     made, and Settle unmounts before it can ever agree with itself. */
  const byApp = sp.by === "judge";

  /* WHERE TO LOOK WHEN NOBODY HAS SAID (Kacey, 2026-09-09). The order is: the
     zone the reader asked for, then the zone the client last saw them in, then
     the zone holding the most for their class and level. Only when all three
     are silent does it fall through to Duskwood.

     The third is a count and not a judgement — a server component has the
     class and the level off the cookie and cannot have the gear, so the worn
     items are not weighed here. `Settle` asks the same function again in the
     browser with the upgrade judge attached, and moves the column if the
     judged answer is a different zone. See lib/best-zone.ts.

     A READER WITH NO CHARACTER GETS NO PICK. "Most for that character" has no
     meaning without one, and the shell sends anybody in that state to the
     creator anyway (Shell.tsx). They land on Duskwood at the zone's own level,
     which is what every room page does for a stranger. */
  const picked = asked || remembered || !who ? null : bestZone(cls, who.level);

  const roomId = asked ?? remembered ?? picked?.room ?? FALLBACK;
  const room = getRoom(roomId) ?? getRoom(FALLBACK)!;

  /* Which of the three put the column here, so the stamp over it can say so.
     Once a reader picks a zone the stamp is theirs, and saying "last seen"
     over a choice they just made would be the screen misreporting itself. */
  const stamp: "asked" | "seen" | "picked" = byApp
    ? "picked"
    : asked
      ? "asked"
      : remembered === room.id
        ? "seen"
        : picked
          ? "picked"
          : "asked";

  const file = lootFor(room.id);
  const level = who?.level ?? (file ? defaultLevel(file) : 60);
  const drops = file ? panelFor(file, cls, clampLevel(String(level), 60)) : [];
  const quests = questsHere(room.id, cls, level, side);

  const session = hasAuth() ? ((await auth()) as { uid?: number | null; handle?: string | null } | null) : null;
  const uid = typeof session?.uid === "number" ? session.uid : null;
  const pins = await pinsIn(room.id, uid);

  const news = await recentNews(14);

  return (
    <div className={styles.front}>
      <Where
        room={room}
        band={file?.band ?? null}
        stamp={stamp}
        level={level}
        knowsClass={cls !== null}
        drops={drops}
        quests={quests}
        pins={pins}
      />
      <Who handle={session?.handle ?? null} canSignIn={hasAuth()} />
      <What news={news} />
    </div>
  );
}
