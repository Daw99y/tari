"use client";

/* THE CARD. docs/WELCOME.md §3; docs/CHARACTER.md.
 *
 * An Azeroth banking card, and the metaphor is doing real work rather than
 * being a joke about one. A payment card is the most familiar object in the
 * world for *this is who I am, this is who issued it, and here is the small
 * print on the back* — three questions the sheet had no place for. The
 * paperdoll answers what you wear; the facts in the other corner answer what
 * the import saw; this answers who Tari thinks you are and what you have asked
 * it to tell you.
 *
 * FRONT IS IDENTITY, BACK IS SETTINGS, and the press is the flip. Kacey's
 * ruling, 2026-08-31. Nothing on the back is reachable any other way, which is
 * the one thing to be careful about — so the flip is a real button with a real
 * label, it flips back on Escape, and the toggles inside are checkboxes rather
 * than anything invented.
 *
 * THE BOX NEVER CHANGES SIZE. Kacey, same day, and it corrected a mistake: the
 * back briefly grew taller to fit four things. Proportions are the whole
 * reason this object reads as a card, so the box is fixed on both faces and
 * the list scrolls inside it — with no scrollbar, under a mask (see
 * card.module.css). The consequence is that each row has one line, so the
 * small print moved to a single status line at the foot that reads whatever
 * the reader is pointing at. That is WoW's own pattern, not a compromise.
 *
 * THE CHIP IS THE IMPORT, AND ONLY THE IMPORT. On a real card the chip is what
 * makes it work; here it is lit when this character came from the armory or an
 * addon paste, and dark when it was made by hand.
 *
 * It does not mean "connected" and the wording is careful about that. Neither
 * the addon nor the armory reads anything live — the addon writes a string a
 * reader copies out of the game, the armory answers as of last logout. Both
 * are photographs. A chip that implied a live link would be the card telling
 * the reader's most important question a lie (lib/nudge.ts, the correction).
 *
 * NOTHING ON IT IS A NUMBER THAT GOES UP. §13. The only figures are the
 * character's own level, which the game owns, and dates, which are facts. No
 * pins-left count, no followers, no unread total — see lib/envelope.ts for why
 * the last one is the same mistake as the second.
 *
 * IT IS NOT A GATE. COMMUNITY.md: signed out, the back still shows the whole
 * list of what Tari would tell you, because that list is the clearest possible
 * statement of §3.1's promise. What it cannot do is remember the answer, and
 * it says so and offers the door.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

import FoxMark from "@/components/FoxMark";
import {
  CLASS_NAME,
  RACE_NAME,
  classIcon,
  crestIcon,
  racePortrait,
  type Character,
} from "@/lib/character";
import { CLASS_COLOR } from "@/lib/class-color";
import { NEVER, WORLD_THINGS, type Prefs } from "@/lib/nudge";

import { enterWithDiscord } from "../enter";
import styles from "./card.module.css";

type Props = {
  me: Character;
  /** The Discord handle, or null signed out. Same value the rail's foot has. */
  handle: string | null;
  /** Whether this deploy has a door at all (lib/auth.ts, hasAuth). */
  canSignIn: boolean;
};

/** "Member since" wants a month and a year, not a timestamp. A card prints
 *  the shortest true thing. */
function since(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase();
}

export default function Card({ me, handle, canSignIn }: Props) {
  const [back, setBack] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [saving, setSaving] = useState(false);
  /* The thing the reader is pointing at, whose small print the signature line
     shows. WoW puts the explanation of the button under your cursor in one
     fixed strip rather than beside every button; the card does the same,
     because the list has to stay one line per row to fit inside a card that
     does not change size. */
  const [note, setNote] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  const signedIn = handle !== null;

  /* The reader's choices live on the account, so there is nothing to read
     until there is one. Signed out the list still draws — it is the promise,
     not the preference — and every row is simply off and unwritable. */
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    fetch("/api/prefs")
      .then((r) => r.json())
      .then((b: { prefs?: Prefs }) => {
        if (live && b.prefs) setPrefs(b.prefs);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [signedIn]);

  /* Escape turns the card back over. A surface you can only leave by finding
     the same small button again is a trap, and this one covers the corner of
     the sheet. */
  useEffect(() => {
    if (!back) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBack(false);
        cardRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [back]);

  const toggle = useCallback(
    (id: string, on: boolean) => {
      /* Written on the card first and asked about second: the tick is the
         reader's, and a checkbox that waits for a server before it moves is a
         checkbox that feels broken. lib/marks.ts keeps the same order. */
      const next = { ...prefs, [id]: on };
      setPrefs(next);
      setSaving(true);
      fetch("/api/prefs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefs: next }),
      })
        .catch(() => {})
        .finally(() => setSaving(false));
    },
    [prefs],
  );

  const cls = CLASS_COLOR[me.cls];
  const member = since(me.importedAt);
  const fed = me.importedAt !== null;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      data-back={back ? "" : undefined}
      style={{ ["--cls" as string]: cls }}
      tabIndex={-1}
    >
      <div className={styles.spin}>
        {/* ---- the face: three rows and nothing floating over them */}
        <div className={styles.face} aria-hidden={back}>
          <div className={styles.faceTop}>
            <FoxMark className={styles.fox} />
            <span className={styles.marks}>
              <button type="button" className={styles.flip} onClick={() => setBack(true)}>
                Turn over
              </button>
              <img className={styles.crest} src={crestIcon(me.faction)} alt="" decoding="async" />
            </span>
          </div>

          <div className={styles.middle}>
            {/* The chip, where a chip goes. Lit means imported, never
                connected — nothing in this product reads anything live. */}
            <span
              className={styles.chip}
              data-live={fed ? "" : undefined}
              title={fed ? "Imported from the armory or the addon" : "Made by hand — never imported"}
              aria-hidden="true"
            >
              <span className={styles.chipRule} />
              <span className={styles.chipRule} />
              <span className={styles.chipRule} />
            </span>

            <p className={styles.digits}>
              <span>{String(me.level).padStart(2, "0")}</span>
              <span>{RACE_NAME[me.race].toUpperCase()}</span>
              <span>{CLASS_NAME[me.cls].toUpperCase()}</span>
            </p>
          </div>

          <div className={styles.foot}>
            <span className={styles.holder}>
              <span className={styles.holderName}>{me.name}</span>
              <span className={styles.holderWhere}>
                {[me.realm ?? "No realm", member ? `Since ${member}` : "Made by hand"].join(" · ")}
              </span>
            </span>
            <span className={styles.network}>
              <img src={racePortrait(me.race, me.sex)} alt="" decoding="async" />
              <img src={classIcon(me.cls)} alt="" decoding="async" />
            </span>
          </div>
        </div>

        {/* ---- the back */}
        <div className={styles.rear} aria-hidden={!back}>
          <span className={styles.stripe} aria-hidden="true" />

          <p className={styles.promise} id={titleId}>
            {NEVER}
          </p>

          <ul className={styles.things} aria-labelledby={titleId}>
            {WORLD_THINGS.map((t) => {
              const on = prefs[t.id] === true;
              return (
                <li key={t.id} className={styles.thing}>
                  <label
                    className={styles.thingLabel}
                    onPointerEnter={() => setNote(t.note)}
                    onPointerLeave={() => setNote(null)}
                  >
                    <input
                      type="checkbox"
                      className={styles.tick}
                      checked={on}
                      disabled={!signedIn || !back}
                      onChange={(e) => toggle(t.id, e.target.checked)}
                      onFocus={() => setNote(t.note)}
                      onBlur={() => setNote(null)}
                    />
                    <span className={styles.thingSays}>{t.says}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className={styles.rearFoot}>
            <span className={styles.sig} data-note={note ? "" : undefined}>
              {note ?? (signedIn ? (saving ? "Saving…" : "It waits in the envelope.") : "Sign in to keep these.")}
            </span>
            {!signedIn && canSignIn ? (
              <form action={enterWithDiscord}>
                <input type="hidden" name="back" value="/you" />
                <button type="submit" className={styles.door}>
                  Discord
                </button>
              </form>
            ) : null}
            <button type="button" className={styles.flip} onClick={() => setBack(false)}>
              Turn back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
