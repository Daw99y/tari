"use client";

/* THE SECOND OPINION, ONCE THE BROWSER KNOWS WHAT YOU ARE WEARING.
 *
 * The server picked this zone on class and level alone, because that is all
 * the `tari_who` cookie carries — the gear lives in localStorage and the item
 * dictionary that prices it is fetched (lib/use-worn.ts). So the first answer
 * counts what is open here; this one counts what beats what you have, using
 * the same judge the rail's badges and the room's corner use
 * (lib/upgrade.ts). If the judged answer is a different zone, the column moves.
 *
 * IT RENDERS NOTHING. It is a rule, not a row.
 *
 * IT ONLY EVER MOVES AN AUTO-PICK. Where.tsx mounts it for `stamp === "picked"`
 * and nowhere else, so a zone the reader chose and a zone the client last saw
 * them in are both left alone. Overruling a reader's own click would be the
 * worst version of this feature.
 *
 * IT MOVES AT MOST ONCE. The judged pick is computed the moment the dictionary
 * lands and then the ref is set, so a re-render — a character switch, a mark
 * ticked — cannot start the column wandering while somebody is reading it.
 * Switching character is the one thing that resets it, because the whole
 * question is about a character.
 *
 * `replace` and not `push`: a reader pressing back should leave the dashboard,
 * not undo a decision the app made for them. */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { bestZone } from "@/lib/best-zone";
import { loadCharacter, WHO_EVENT, type Character } from "@/lib/character";
import { isOn, marksNow } from "@/lib/marks";
import { gearOf } from "@/lib/plan";
import { judgeFor } from "@/lib/upgrade";
import { useWornDict } from "@/lib/use-worn";

export default function Settle({ current }: { current: string }) {
  const router = useRouter();
  const [me, setMe] = useState<Character | null>(null);
  const settled = useRef<string | null>(null);

  useEffect(() => {
    const read = () => setMe(loadCharacter());
    read();
    window.addEventListener(WHO_EVENT, read);
    return () => window.removeEventListener(WHO_EVENT, read);
  }, []);

  const gear = useMemo(() => gearOf(me), [me]);
  const dict = useWornDict(gear);

  useEffect(() => {
    /* No character, or no dictionary yet, means no judgement yet — the same
       line lib/upgrade.ts holds. The server's answer stands until then. */
    if (!me || !dict) return;
    if (settled.current === me.key) return;
    settled.current = me.key;

    const store = marksNow();
    const found = (itemId: number) => isOn(store, me.key, "found", String(itemId));
    const judged = bestZone(me.cls, me.level, found, judgeFor(gear, dict));

    /* No room beats what this character wears. That is a real answer for a
       finished sixty, and the server's count is the better thing to be
       looking at than an empty screen, so nothing moves. */
    if (!judged || judged.room === current) return;

    router.replace(`/home?zone=${judged.room}&by=judge`, { scroll: false });
  }, [me, dict, gear, current, router]);

  return null;
}
