"use client";

/* THE CAMPFIRE. docs/TARI.md §5; docs/CARRYOVER.md.
 *
 * Whelp plz had four tabs about the reader — Journey, Trainer, Attunements,
 * Errands — and each one was a table you were meant to work through. This is
 * the one page they became, and it is not a table: the letter at the top says
 * what changed, and everything under it is the same news with enough detail to
 * act on, in the game's own order. Nothing here is ranked. Nothing says go.
 *
 * THE LETTER IS BOTH HALVES. lib/path.ts writes the gear sentences, which need
 * the item dictionary the same way the sheet does; lib/journey.ts writes the
 * level's. They are one letter and they print in that order, because what you
 * are wearing is older news than what you just levelled into.
 *
 * IT WORKS WITHOUT AN IMPORT. A made body is level 1 wearing nothing, and the
 * whole page is still true — the trainer has ranks for it, the chains are all
 * ahead of it, and that is a real first look at the road. The dictionary is
 * the only thing anything waits on, and only the gear sentences wait.
 *
 * TICKS ARE THE READER'S OWN. The addon cannot see a spellbook or a quest log
 * (docs/CHARACTER.md), so a trained visit and a finished step are `done` marks
 * the reader sets, on whelp plz's own subjects so an import can land in the
 * same store later without a migration. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import RA, { type RaName } from "@/components/RA";
import {
  CLASS_NAME,
  START_ROOM,
  loadCharacter,
  money,
  trades,
  type Character,
} from "@/lib/character";
import {
  journeyLetter,
  journeyOf,
  questMark,
  ranksOwed,
  readJourney,
  roomOf,
  skillMark,
  trainMark,
  training,
  walking,
  type Path as Journey,
  type Training,
  type TrainSpell,
  type Walk,
} from "@/lib/journey";
import { clearMarks, isOn, setMark, subjectsOn, useMarks } from "@/lib/marks";
import { letter, readPath } from "@/lib/path";
import { overlay, planKey, plannedAt } from "@/lib/plan";
import { getRoom, roomArt } from "@/lib/rooms";
import { SPELL_ICONS } from "@/lib/spell-icons";
import type { WornItem } from "@/lib/worn";

import styles from "./campfire.module.css";

const NO_ITEMS: number[] = [];

/* Which visit the reader left open, per character. localStorage rather than a
   mark: a mark is a fact about the character that follows them to another
   machine, and this is a fact about a scroll position. */
const VISIT_KEY = "tari:campfire:visit:";

function icon(stem: string | undefined): string | null {
  return stem ? `https://render.worldofwarcraft.com/us/icons/56/${stem}.jpg` : null;
}

export default function Campfire() {
  const [me, setMe] = useState<Character | null | undefined>(undefined);
  useEffect(() => setMe(loadCharacter()), []);

  const marks = useMarks();

  const key = planKey(marks, me?.key ?? null);
  const plan = useMemo(() => plannedAt(marks, me?.key ?? null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const gear = useMemo(() => (me ? overlay(me.gear, plan) : NO_ITEMS), [me, plan]);

  /* One class file, fetched when the page opens — 644 KB across nine classes
     and the reader is one of them (lib/journey.ts). */
  const [train, setTrain] = useState<Training | null>(null);
  useEffect(() => {
    if (!me) return;
    let gone = false;
    training(me.cls).then((t) => {
      if (!gone) setTrain(t);
    });
    return () => {
      gone = true;
    };
  }, [me?.cls]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The sheet's own fetch, for the sheet's own reason: only the dictionary
     knows the levels, and the gear half of the letter is about levels. */
  const [dict, setDict] = useState<Record<string, WornItem> | null>(null);
  useEffect(() => {
    if (!me) return;
    const ids = [...new Set(gear.filter((id) => id > 0))];
    if (ids.length === 0) {
      setDict({});
      return;
    }
    let gone = false;
    fetch(`/api/items?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, WornItem> | null) => {
        if (!gone && d) setDict(d);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [me, gear]);

  const worn = useMemo(
    () => (me ? readPath(gear, dict, me.cls, me.level, (id) => isOn(marks, me.key, "found", String(id))) : []),
    [me, gear, dict, marks],
  );

  const journey = useMemo(
    () =>
      me
        ? readJourney(train, journeyOf(me.faction), me.key, me.level, marks, trades(me.professions), me.questLog)
        : null,
    [me, train, marks],
  );

  const lines = useMemo(
    () => [...(journey ? journeyLetter(journey, me?.level ?? 1) : []), ...letter(worn, plan.size)],
    [worn, plan, journey, me?.level],
  );

  const [open, setOpen] = useState<string | null>(null);
  /* WHICH VISIT IS OPEN, AND IT IS REMEMBERED. Null means the newest one you
     owe, which is the answer to "what do I buy tonight" and the only visit
     most readers ever want spelled out. Eight expanded visits is a price
     list, which is what the old Trainer tab was and why nobody read it.
     Kacey, 2026-08-31: whichever one you left open comes back with you, so a
     reader working down an old level is not put back at the newest every
     time they look at a room. A visit you have since bought is forgotten
     rather than reopened empty — see `shown` below. */
  const [visit, setVisit] = useState<number | null>(null);
  useEffect(() => {
    if (!me) return;
    const saved = localStorage.getItem(VISIT_KEY + me.key);
    setVisit(saved === null ? null : Number(saved));
  }, [me?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  /* THE MADE VISITS ARE FOLDED. An imported level 40 has twenty of them and a
     column of twenty identical ticks reading "Bought" is a filing cabinet.
     They stay reachable — a tick you cannot take back is not a tick — behind
     one line that says how many there are. */
  const [made, setMade] = useState(false);

  /* THE RECORD CAN BE PUT BACK. A tick is a fact about the character and an
     import writes them by the dozen, so an import that named the wrong
     character leaves a page of them nobody made — Kacey, 2026-08-31, a level
     18 rogue reporting Molten Core cleared. Undoing that one press by press
     is fifty presses, so there is one press that does it.
     It asks twice, and forgets it asked. An armed button left armed is a
     button that goes off on the way past. */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  if (me === undefined) return null;
  if (me === null) {
    return (
      <div className={styles.none}>
        <p className={styles.quiet}>No one here yet.</p>
        <Link href="/you/new" className={styles.noneLink}>
          Make a character
        </Link>
      </div>
    );
  }

  const home = getRoom(START_ROOM[me.race] ?? "elwynn-forest");
  const tick = (subject: string) =>
    setMark(me.key, "done", subject, !isOn(marks, me.key, "done", subject));
  const ticked = (subject: string) => isOn(marks, me.key, "done", subject);
  const ticks = subjectsOn(marks, me.key, "done").length;

  const ranks = journey ? ranksOwed(journey) : 0;
  /* -1 is "the reader shut the one that was open", which is not the same as
     never having touched it and must not spring back to the default. A
     remembered level that is no longer owed — you went and bought it — is
     dropped, because reopening it would open a visit with nothing under it. */
  const kept = visit === -1 || journey?.owed.some((v) => v.level === visit) ? visit : null;
  const shown = kept ?? journey?.owed.find((v) => v.fresh)?.level ?? -1;
  const openVisit = (level: number) => {
    const next = shown === level ? -1 : level;
    setVisit(next);
    localStorage.setItem(VISIT_KEY + me.key, String(next));
  };
  const started = journey ? walking(journey) : [];
  const errands = journey?.errands ?? [];
  /* Everything your level has opened, ticked or not — a row that vanished
     when you ticked it would be a tick you could never take back. The count
     beside the heading is what is still open; the list is the whole of it. */
  const reached = errands.filter((e) => e.open);
  const openErrands = reached.filter((e) => !e.done);
  const nextErrand = errands.find((e) => !e.open) ?? null;

  return (
    <div className={styles.campfire}>
      {home ? <img className={styles.art} src={roomArt(home.id)} alt="" /> : null}
      <div className={styles.scrim} />

      <div className={styles.page}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            Campfire · Level {me.level} {CLASS_NAME[me.cls]}
          </p>
          <h1 className={styles.h1}>What changed</h1>
          <div className={styles.letter}>
            {lines.length ? (
              lines.map((l) => (
                <p key={l} className={styles.letterLine}>
                  {l}
                </p>
              ))
            ) : (
              <p className={styles.letterLine}>Nothing new since you were last here.</p>
            )}
          </div>
        </header>

        <div className={styles.grid}>
          {/* ---- the trainer */}
          {journey && (journey.visits.length || journey.ahead) ? (
            <section className={`${styles.panel} ${styles.wide}`}>
              <div className={styles.panelHead}>
                <Heading mark="book">At your trainer</Heading>
                <span className={styles.panelNote}>
                  {ranks ? `${ranks} ${ranks === 1 ? "rank" : "ranks"} · ${money(journey.copper)}` : "up to date"}
                </span>
              </div>

              <ul className={styles.list}>
                {(made ? journey.visits : journey.owed).map((v) => (
                  <li key={v.level} className={`${styles.visit} ${v.done ? styles.made : ""}`}>
                    <div className={styles.visitHead}>
                      <button
                        type="button"
                        className={`${styles.tick} ${v.done ? styles.tickOn : ""}`}
                        onClick={() => tick(trainMark(v.level))}
                        aria-label={`Mark level ${v.level} training as ${v.done ? "not done" : "done"}`}
                        aria-pressed={v.done}
                      >
                        <Check />
                      </button>
                      <button
                        type="button"
                        className={styles.visitWords}
                        onClick={() => openVisit(v.level)}
                        aria-expanded={shown === v.level}
                      >
                        <span className={styles.visitLevel}>
                          Level {v.level}
                          {v.fresh ? <i className={styles.fresh} aria-hidden="true" /> : null}
                        </span>
                        <span className={styles.visitLine}>
                          {v.done
                            ? "Bought"
                            : `${v.spells.length} ${v.spells.length === 1 ? "ability" : "abilities"}${
                                v.fresh ? " · the newest you have not bought" : ""
                              }`}
                        </span>
                      </button>
                      {shown === v.level && !v.done ? null : <Stack spells={v.spells} />}
                      <span className={styles.cost}>{money(v.totalCostCopper)}</span>
                    </div>

                    {/* A visit you have made keeps its row and loses its list:
                        the tick is the fact, the ranks were the errand. */}
                    <ul className={styles.list} hidden={v.done || shown !== v.level}>
                      {v.spells.map((s) => (
                        <li key={s.spellId} className={styles.row}>
                          {icon(SPELL_ICONS[s.spellId]) ? (
                            <img className={styles.icon} src={icon(SPELL_ICONS[s.spellId])!} alt="" loading="lazy" />
                          ) : (
                            <span className={styles.icon} />
                          )}
                          <span className={styles.words}>
                            <span className={styles.name}>
                              {s.name}
                              {s.rank ? ` · Rank ${s.rank}` : ""}
                            </span>
                            <span className={styles.line}>
                              {s.rank && s.rank > 1 ? `Up from the ${s.rank - 1} on your bar` : "New to you"}
                            </span>
                          </span>
                          <span className={styles.cost}>{money(s.costCopper)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              {journey.visits.length > journey.owed.length ? (
                <button type="button" className={styles.fold} onClick={() => setMade(!made)} aria-expanded={made}>
                  {made ? "Hide" : "Show"} the {countWord(journey.visits.length - journey.owed.length)} you have made
                </button>
              ) : null}

              {/* WHAT IS STILL AHEAD OF YOU. The one line on the page about a
                  level you have not reached, so it gets the hand too — dimmer
                  than the visits you could walk in and buy tonight, because
                  the gold is not the thing standing between you and it. */}
              {journey.ahead ? (
                <p className={`${styles.foot} ${styles.ahead}`}>
                  <Stack spells={journey.ahead.spells} className={styles.aheadHand} />
                  <span className={styles.aheadWords}>
                    At {journey.ahead.level}, {journey.ahead.spells.length} more —{" "}
                    {journey.ahead.spells.map((sp) => sp.name).join(", ")}.
                  </span>
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ---- the chains */}
          {journey?.chains.length ? (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <Heading mark="chain">The long chains</Heading>
                <span className={styles.panelNote}>
                  {started.length ? `${started.length} part-finished` : `${journey.chains.length} in all`}
                </span>
              </div>
              <ul className={styles.list}>
                {journey.chains.map((w) => (
                  <Chain
                    key={w.chain.name}
                    walk={w}
                    open={open === w.chain.name}
                    onOpen={() => setOpen(open === w.chain.name ? null : w.chain.name)}
                    ticked={ticked}
                    tick={tick}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {/* ---- the class quests */}
          {reached.length || nextErrand ? (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <Heading mark="scroll-unfurled">Your own quests</Heading>
                <span className={styles.panelNote}>
                  {openErrands.length ? `${openErrands.length} open` : "none open"}
                </span>
              </div>
              <ul className={styles.list}>
                {reached.map((e) => {
                  const where = e.startZone ?? e.startInstance;
                  const room = roomOf(where);
                  const body = (
                    <>
                      <button
                        type="button"
                        className={`${styles.tick} ${e.done ? styles.tickOn : ""}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          tick(questMark(e.questId));
                        }}
                        aria-label={`Mark ${e.name} as done`}
                        aria-pressed={e.done}
                      >
                        <Check />
                      </button>
                      <span className={styles.words}>
                        <span className={styles.name}>{e.name}</span>
                        <span className={styles.line}>
                          Level {e.level}
                          {where ? (
                            <>
                              {" · "}
                              <span className={room ? styles.door : undefined}>{where}</span>
                            </>
                          ) : null}
                          {e.reward ? ` · ${e.reward}` : ""}
                        </span>
                      </span>
                      {e.inLog && !e.done ? <span className={styles.held}>In your log</span> : null}
                    </>
                  );
                  const cls = `${styles.row} ${e.done ? styles.spent : ""}`;
                  return (
                    <li key={e.questId}>
                      {room ? (
                        <Link href={`/r/${room}?map=1`} className={`${cls} ${styles.rowLink}`}>
                          {body}
                        </Link>
                      ) : (
                        <span className={cls}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {nextErrand ? <p className={styles.foot}>The next one opens at {nextErrand.level}.</p> : null}
            </section>
          ) : null}

          {/* ---- what stops paying */}
          {journey?.fading.length ? (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <Heading mark="hourglass">About to stop paying</Heading>
                <span className={styles.panelNote}>within two levels</span>
              </div>
              <ul className={styles.list}>
                {journey.fading.map((f) => {
                  const body = (
                    <>
                      <span className={styles.icon} />
                      <span className={styles.words}>
                        <span className={styles.name}>
                          <span className={f.room ? styles.door : undefined}>{f.zone}</span>
                        </span>
                        <span className={styles.line}>
                          {f.questCount} {f.questCount === 1 ? "quest" : "quests"} ·{" "}
                          {f.inLevels === 0 ? "greys out now" : `greys out at ${f.top + 1}`}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={f.zone}>
                      {f.room ? (
                        <Link href={`/r/${f.room}?map=1`} className={`${styles.row} ${styles.rowLink}`}>
                          {body}
                        </Link>
                      ) : (
                        <span className={styles.row}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* ---- the trades */}
          {journey?.milestones.length ? (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <Heading mark="anvil">Your trades</Heading>
                <span className={styles.panelNote}>next threshold</span>
              </div>
              <ul className={styles.list}>
                {journey.milestones.map((m) => (
                  <li key={`${m.skill}-${m.atSkill}`} className={styles.row}>
                    <button
                      type="button"
                      className={`${styles.tick} ${ticked(skillMark(m.skill, m.atSkill)) ? styles.tickOn : ""}`}
                      onClick={() => tick(skillMark(m.skill, m.atSkill))}
                      aria-label={`Mark ${m.action} as done`}
                      aria-pressed={ticked(skillMark(m.skill, m.atSkill))}
                    >
                      <Check />
                    </button>
                    <span className={styles.words}>
                      <span className={styles.name}>{m.action}</span>
                      <span className={styles.line}>
                        {m.skill} {m.atSkill} · {m.where}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* ---- the record itself
            The only control here that is about the page rather than about the
            character. It sits under everything, in the quiet register, and it
            says the whole price on the second press. */}
        {ticks > 0 ? (
          <div className={styles.record}>
            <p className={styles.recordWords}>
              Ticks you never made? An import files a history under the name in
              the string. Paste the wrong character over this one and it lands
              here.
            </p>
            <button
              type="button"
              className={`${styles.clear} ${armed ? styles.armed : ""}`}
              onClick={() => {
                if (!armed) {
                  setArmed(true);
                  return;
                }
                clearMarks(me.key, "done");
                setArmed(false);
              }}
            >
              {armed
                ? `Clear ${ticks} ${ticks === 1 ? "tick" : "ticks"} — press again`
                : `Clear ${me.name}\u2019s ticks`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* WHAT IS UNDER A SHUT VISIT. "3 abilities" is a count, and a count is the
   one thing about a trainer visit nobody is deciding on — you are deciding
   whether tonight's gold buys anything you want. So the row carries the
   things themselves: the game's own icons, dealt like a hand of cards and
   falling away to the right, which is how you already know there are more
   than the four you can see. Four is the cap because five is a texture.

   They go when the visit opens, because the full rows are then saying the
   same thing louder and with names on. A bought visit never opens, so it
   keeps its hand for good — greyed, because it is a record of what you own
   rather than a list of what tonight's gold buys (campfire.module.css). */
function Stack({ spells, className }: { spells: TrainSpell[]; className?: string }) {
  return (
    <span className={className ? `${styles.stack} ${className}` : styles.stack} aria-hidden="true">
      {spells.slice(0, 4).map((s) => {
        const src = icon(SPELL_ICONS[s.spellId]);
        return src ? (
          <img key={s.spellId} className={styles.chip} src={src} alt="" loading="lazy" />
        ) : (
          <span key={s.spellId} className={styles.chip} />
        );
      })}
    </span>
  );
}

/* A PANEL'S NAME, WITH ITS MARK. Five panels of news, each one a heading and
   a list, and at a glance they were five paragraphs of the same weight. The
   mark is what tells them apart before the word is read: a chain for the
   chains, an hourglass for the zones running out of quests you can still be
   paid for. They are lit the campfire's own green, held back from full so
   the trainer visit you have not made is still the loudest thing on the
   page (campfire.module.css). */
function Heading({ mark, children }: { mark: RaName; children: string }) {
  return (
    <span className={styles.panelTitle}>
      <RA name={mark} className={styles.panelMark} />
      <h2 className={styles.panelName}>{children}</h2>
    </span>
  );
}

/* A chain, shut. Pressing it opens the steps, and a step is the only thing in
   here you tick one at a time — a chain is walked, not bought.

   A STEP IS A DOOR TOO. Every place the pipeline names is a room Tari draws
   (lib/journey.ts, roomOf), so a step that says "Blackrock Depths" opens it
   with the map unfolded, the same way the class quests above do. The place
   wears the door mark and the whole row is the press — the tick stays a tick,
   and swallows its own click so ticking a step never walks you out of the
   panel. */
function Chain({
  walk,
  open,
  onOpen,
  ticked,
  tick,
}: {
  walk: Walk;
  open: boolean;
  onOpen: () => void;
  ticked: (subject: string) => boolean;
  tick: (subject: string) => void;
}) {
  const done = walk.at === walk.of;
  return (
    <li className={`${styles.chain} ${walk.reach ? "" : styles.locked}`}>
      <button type="button" className={styles.chainHead} onClick={onOpen} aria-expanded={open}>
        <span className={styles.words}>
          <span className={styles.name}>{walk.chain.name}</span>
          <span className={styles.line}>
            {walk.reach ? `Opens ${walk.chain.target}` : `Opens ${walk.chain.target} · from ${walk.chain.minLevel}`}
          </span>
        </span>
        {done ? (
          <span className={styles.stamp}>Cleared</span>
        ) : walk.started ? (
          <span className={styles.held}>In your log</span>
        ) : (
          <span className={styles.tally}>
            {walk.at}/{walk.of}
          </span>
        )}
      </button>

      {walk.of > 1 ? (
        <div className={styles.bar}>
          <div className={styles.barOn} style={{ width: `${(walk.at / walk.of) * 100}%` }} />
        </div>
      ) : null}

      {open ? (
        <ul className={styles.steps}>
          {walk.chain.steps.map((s) => {
            const on = ticked(questMark(s.questId));
            const where = s.startZone ?? s.startInstance;
            const room = roomOf(where);
            const body = (
              <>
                <button
                  type="button"
                  className={`${styles.tick} ${on ? styles.tickOn : ""}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    tick(questMark(s.questId));
                  }}
                  aria-label={`Mark ${s.name} as done`}
                  aria-pressed={on}
                >
                  <Check />
                </button>
                <span className={styles.words}>
                  <span className={styles.name}>{s.name}</span>
                  {where ? (
                    <span className={styles.line}>
                      <span className={room ? styles.door : undefined}>{where}</span>
                    </span>
                  ) : null}
                </span>
                {!on && s.questId === walk.next?.questId && walk.started ? (
                  <span className={styles.held}>In your log</span>
                ) : null}
              </>
            );
            const cls = `${styles.step} ${on ? styles.spent : ""}`;
            return (
              <li key={s.questId}>
                {room ? (
                  <Link href={`/r/${room}?map=1`} className={`${cls} ${styles.rowLink}`}>
                    {body}
                  </Link>
                ) : (
                  <span className={cls}>{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/* "eight", for a sentence. The letter has its own copy of this and they do
   not share one on purpose: this counts rows on a button, that counts facts
   in a sentence, and the day one of them wants "8" the other must not move. */
function countWord(n: number): string {
  return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}

function Check() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 6.4 4.6 9 10 3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
