/**
 * THE PATH'S OTHER HALF. TARI.md §5; docs/CARRYOVER.md.
 *
 * lib/path.ts answers the question the gear asks — which slots the level has
 * left behind and which rooms fill them. This answers the one the level asks:
 * what the trainer is holding, which chain you are part-way down, which class
 * quest opened, and what is about to stop paying. Whelp plz had a tab for each
 * of those. Tari has neither a tab nor a plan; it has a letter and a page that
 * is the letter's own paper, so this module returns facts and never an order.
 *
 * IT NAMES, IT DOES NOT RANK. Whelp plz's `lib/plan.ts` scored every move
 * against every other one and printed the winner. That is the ranked catalogue
 * §2.1 refuses, and it is also the thing that made the old Journey tab a chore
 * list. Everything here comes back in the game's own order — by level, then by
 * the order the world puts it in — and the page draws it in that order. No
 * score, no lead card, no "do this next".
 *
 * WHAT THE READER TICKS IS WHAT IT KNOWS. The import cannot see a spellbook
 * or a quest log, so a trained rank and a finished step are things the reader
 * tells us, as `done` marks. The subjects are whelp plz's own — `q:{questId}`,
 * `t:{level}`, `p:{skill}:{atSkill}` — kept to the letter so that when the
 * addon does start reporting them, an imported record and three years of
 * hand-ticks land in the same store and cannot disagree about what a thing is
 * called (undiscovered/components/done-store.tsx).
 *
 * TRAINING SHIPS PER CLASS. The nine files are 644 KB together and a reader
 * is one class, so they are dynamic imports and the browser fetches one.
 * The two faction files are 34 KB and both ship.
 */

import alliance from "../reference/journey/alliance.json";
import horde from "../reference/journey/horde.json";
import type { ClassId } from "./loot";
import { isOn, type MarkStore } from "./marks";
import { ROOMS } from "./rooms";

/* --------------------------------------------------------------------------
   What the files say
-------------------------------------------------------------------------- */

export type TrainSpell = {
  spellId: number;
  name: string;
  /** Null where the ability has no ranks at all — Evasion, Vanish. */
  rank: number | null;
  costCopper: number;
  /** Every rank's spell id, so a row can say which one is already on your bar
   *  — and so the import can tell a bought rank from an unbought one, since
   *  the spellbook only ever shows the highest. */
  knownBy: number[];
  /** A row that is made rather than cast — the rogue's poisons. It never
   *  reaches a spellbook, so `P:` answers for it. */
  skill?: { name: string; atSkill: number };
  /** A row a character can legitimately not have: the continuation of a chain
   *  whose first rank is a talent. It never holds a visit open. */
  optional?: boolean;
};

/** Everything one trainer visit sells, at one level. */
export type TrainLevel = {
  level: number;
  spells: TrainSpell[];
  totalCostCopper: number;
};

export type ClassQuest = {
  level: number;
  name: string;
  startZone: string | null;
  startInstance: string | null;
  reward: string | null;
  rewardItemId: number | null;
  questId: number;
  faction: "alliance" | "horde" | null;
};

export type Milestone = {
  skill: string;
  atSkill: number;
  levelHint: number;
  action: string;
  itemId?: number;
  where: string;
};

export type Training = {
  class: string;
  abilities: TrainLevel[];
  classQuests: ClassQuest[];
  professionMilestones: Milestone[];
};

export type Step = {
  questId: number;
  name: string;
  startZone: string | null;
  startInstance: string | null;
  questLevel: number;
  minLevel: number;
};

export type Chain = {
  name: string;
  target: string;
  kind: string;
  minLevel: number;
  keyItemId: number | null;
  steps: Step[];
};

export type Band = {
  zone: string;
  band: [number, number] | null;
  questCount: number;
};

export type JourneyFile = {
  faction: string;
  attunements: Chain[];
  zoneBands: Band[];
};

/* --------------------------------------------------------------------------
   Loading
-------------------------------------------------------------------------- */

/* Written out one by one rather than built from a template string, because a
   dynamic import the bundler cannot read at build time is a request at run
   time and this data is in the repo. */
const TRAINING: Record<ClassId, () => Promise<{ default: unknown }>> = {
  warrior: () => import("../reference/training/warrior.json"),
  hunter: () => import("../reference/training/hunter.json"),
  rogue: () => import("../reference/training/rogue.json"),
  mage: () => import("../reference/training/mage.json"),
  warlock: () => import("../reference/training/warlock.json"),
  priest: () => import("../reference/training/priest.json"),
  paladin: () => import("../reference/training/paladin.json"),
  shaman: () => import("../reference/training/shaman.json"),
  druid: () => import("../reference/training/druid.json"),
};

/** One class's training file. ~70 KB, fetched when the page opens. */
export async function training(cls: ClassId): Promise<Training> {
  return (await TRAINING[cls]()).default as Training;
}

export function journeyOf(faction: "alliance" | "horde"): JourneyFile {
  return (faction === "horde" ? horde : alliance) as unknown as JourneyFile;
}

/* --------------------------------------------------------------------------
   The marks. Whelp plz's subjects, unchanged.
-------------------------------------------------------------------------- */

/** An errand or an attunement step. */
export const questMark = (questId: number): string => `q:${questId}`;
/** A whole trainer visit — the level, not the spell. You go once and buy the
 *  lot, so one tick is the honest grain and the game's own ritual. */
export const trainMark = (level: number): string => `t:${level}`;
/** A profession's next threshold. */
export const skillMark = (skill: string, atSkill: number): string => `p:${skill}:${atSkill}`;

/* --------------------------------------------------------------------------
   The reading
-------------------------------------------------------------------------- */

/** A trainer visit, and whether you have made it. */
export type Visit = TrainLevel & { done: boolean; fresh: boolean };

/** A chain, with how far down it you are. */
export type Walk = {
  chain: Chain;
  /** Steps ticked. */
  at: number;
  /** Steps in the chain. */
  of: number;
  /** The first step not yet ticked, or null when it is finished. */
  next: Step | null;
  /** That step is in the quest log right now. TA2's `L:` field — the
   *  difference between a chain you are part-way down and one you have never
   *  touched, which `Q:` alone could never tell. */
  started: boolean;
  /** Whether the level requirement is met — a chain you cannot start yet is
   *  drawn, because knowing it is coming is the point of a long chain. */
  reach: boolean;
};

export type Errand = ClassQuest & { done: boolean; open: boolean; inLog: boolean };

/** A zone whose band you are about to leave. */
export type Fading = Band & { top: number; inLevels: number; room: string | null };

export type Path = {
  /** Every trainer visit at or below your level, oldest first, ticked or not.
   *  A visit you have made stays on the page — a row that vanished when you
   *  ticked it would be a tick you could never take back, and the reader who
   *  mis-taps level 30 has no way to say so. */
  visits: Visit[];
  /** The visits still owed — `visits` minus the ticked. The newest one carries
   *  `fresh`. */
  owed: Visit[];
  /** What those visits cost, in copper. */
  copper: number;
  /** The next visit above your level, so the page can say what is coming. */
  ahead: Visit | null;
  chains: Walk[];
  errands: Errand[];
  fading: Fading[];
  milestones: Milestone[];
};

/** Room id by zone name, so a row can be a door. Built once. */
const ROOM_BY_NAME = new Map(ROOMS.map((r) => [r.name.toLowerCase(), r.id]));

/* The five names in the pipeline that are not a room's name. Three of them
   are battlegrounds and correctly have no door — Tari has no room for a
   queue. "Dire Maul" is the building rather than a wing and pointing it at
   one of the three would be a guess, so it gets none either. The capital is
   the only real alias: the room is called Stormwind and the quest table calls
   it Stormwind City. */
const ALIAS: Record<string, string> = {
  "stormwind city": "stormwind-city",
};

export function roomOf(zone: string | null | undefined): string | null {
  if (!zone) return null;
  const k = zone.toLowerCase();
  return ROOM_BY_NAME.get(k) ?? ALIAS[k] ?? null;
}

/**
 * The path, for one character.
 *
 * `train` is null until the class file lands. Everything that does not depend
 * on it is still returned, for the same reason lib/path.ts waits on the item
 * dictionary: half a fact drawn now and corrected a moment later is worse than
 * a slot that fills in.
 *
 * THE ORDER IS THE GAME'S. Visits ascend by level. Chains come back in the
 * file's order, which is the order the world opens them. Errands ascend by
 * level. Nothing is sorted by how much it is worth, because nothing here
 * knows what anything is worth.
 */
export function readJourney(
  train: Training | null,
  file: JourneyFile,
  key: string,
  level: number,
  marks: MarkStore,
  professions: { name: string; rank: number }[] = [],
  questLog: number[] = [],
): Path {
  const ticked = (subject: string) => isOn(marks, key, "done", subject);
  const log = new Set(questLog);

  /* ---- the trainer */

  const visits: Visit[] = [];
  let ahead: Visit | null = null;
  if (train) {
    const reached = train.abilities.filter((a) => a.level <= level);
    /* `fresh` is the newest visit you are owed, not the newest that exists:
       a reader who skipped four levels of training is not "new at 40", they
       are four visits behind, and the newest of those is the one the letter
       leads with. */
    const open = reached.filter((a) => !ticked(trainMark(a.level)));
    const newest = open.length ? open[open.length - 1].level : -1;
    for (const a of reached) {
      const done = ticked(trainMark(a.level));
      visits.push({ ...a, done, fresh: !done && a.level === newest });
    }
    const next = train.abilities.find((a) => a.level > level);
    if (next) ahead = { ...next, done: false, fresh: false };
  }
  const owed = visits.filter((v) => !v.done);
  const copper = owed.reduce((n, v) => n + v.totalCostCopper, 0);

  /* ---- the chains */

  const chains: Walk[] = file.attunements.map((chain) => {
    const at = chain.steps.filter((s) => ticked(questMark(s.questId))).length;
    const next = chain.steps.find((s) => !ticked(questMark(s.questId))) ?? null;
    return {
      chain,
      at,
      of: chain.steps.length,
      next,
      started: !!next && log.has(next.questId),
      reach: level >= chain.minLevel,
    };
  });

  /* ---- the errands */

  /* SIDED, AND THAT IS NOT COSMETIC. The class-quest table holds every race's
     version of the same errand — a warrior's level 10 is ten rows, five of
     which are in cities this character will be killed on sight in. A quest
     with no faction on it belongs to both. */
  const side = file.faction === "horde" ? "horde" : "alliance";
  const errands: Errand[] = train
    ? train.classQuests
        .filter((q) => !q.faction || q.faction === side)
        .map((q) => ({
          ...q,
          done: ticked(questMark(q.questId)),
          open: q.level <= level,
          inLog: log.has(q.questId),
        }))
        .sort((a, b) => a.level - b.level)
    : [];

  /* ---- what stops paying
     A zone pays until you leave its band. Two levels is the warning the old
     Journey tab gave and it is the right one: far enough to act on, near
     enough to be true. A zone with no band in the file is not guessed at. */
  const fading: Fading[] = file.zoneBands
    .filter((b): b is Band & { band: [number, number] } => Array.isArray(b.band))
    .map((b) => ({ ...b, top: b.band[1], inLevels: b.band[1] - level, room: roomOf(b.zone) }))
    .filter((b) => b.inLevels >= 0 && b.inLevels <= 2 && b.questCount > 0)
    .sort((a, b) => a.inLevels - b.inLevels || b.questCount - a.questCount);

  /* ---- the trades
     Only for a profession the character actually has, and only the next
     threshold above where they stand. A list of every milestone in the game
     is the encyclopedia §6 refuses. */
  const milestones: Milestone[] = [];
  if (train) {
    for (const p of professions) {
      const mine = train.professionMilestones
        .filter((m) => m.skill.toLowerCase() === p.name.toLowerCase())
        .filter((m) => !ticked(skillMark(m.skill, m.atSkill)))
        .sort((a, b) => a.atSkill - b.atSkill);
      const next = mine.find((m) => m.atSkill > p.rank) ?? mine.find((m) => m.atSkill <= p.rank);
      if (next) milestones.push(next);
    }
  }

  return { visits, owed, copper, ahead, chains, errands, fading, milestones };
}

/* --------------------------------------------------------------------------
   Counting, for the letter and the chip
-------------------------------------------------------------------------- */

/** How many ranks the trainer is holding for you, across every owed visit. */
export function ranksOwed(path: Path): number {
  return path.owed.reduce((n, v) => n + v.spells.length, 0);
}

/** Chains you are part-way down and have not finished. Started, not merely
 *  possible: seven chains you have never touched is not news. */
export function walking(path: Path): Walk[] {
  return path.chains.filter((w) => w.at > 0 && w.at < w.of);
}

/** Errands open and not done. */
export function errandsOpen(path: Path): Errand[] {
  return path.errands.filter((e) => e.open && !e.done);
}

/** One number for the rail's chip: everything the path is holding. It counts
 *  visits rather than ranks, because the chip is a nudge and five ranks in one
 *  trip is one trip. */
export function waiting(path: Path): number {
  return path.owed.length + errandsOpen(path).length + walking(path).length;
}

/* --------------------------------------------------------------------------
   The letter's other sentences.

   TARI.md §5's own example is the specification:

     > You hit 34. Two new trainer ranks. A class chain starts in
     > Stranglethorn. Three quests grey out in two levels.

   Four short declaratives, each one a fact that changed. No verbs of
   instruction, no "you should", no room named as a destination — a place is
   named only because the fact happened there. lib/path.ts's `letter` writes
   the gear half in the same register and the page prints them together.

   IT SAYS NOTHING RATHER THAN SAYING NOTHING MUCH. Every sentence here is
   absent when its fact is absent. A letter that had to fill four lines would
   start reporting that seven attunements exist, which is the encyclopedia
   wearing a friendly voice.
-------------------------------------------------------------------------- */

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function count(n: number): string {
  return WORD[n] ?? String(n);
}

function up(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * The journey's half of the letter, longest-standing fact first.
 *
 * THE TRAINER SENTENCE COUNTS RANKS, NOT TRIPS. "Two new trainer ranks" is
 * §5's own wording and a rank is what a player pictures. The page below it
 * groups them into trips, because that is what you actually do.
 *
 * THE CHAIN SENTENCE PREFERS A CHAIN YOU ARE ON. A chain part-way down is
 * news; a chain that merely exists is a catalogue. Only when nothing is
 * started does it mention one that just came into reach, and then it says so
 * as an opening rather than an instruction.
 */
export function journeyLetter(path: Path, level: number): string[] {
  const lines: string[] = [];

  const ranks = ranksOwed(path);
  if (ranks) {
    const trips = path.owed.length;
    /* One trip is the ordinary case and needs no arithmetic about trips. Two
       or more means the reader has been walking past their trainer, which is
       a different fact and worth its own clause. */
    lines.push(
      trips <= 1
        ? `${up(count(ranks))} new trainer ${ranks === 1 ? "rank" : "ranks"}.`
        : `${up(count(ranks))} trainer ranks waiting, over ${count(trips)} visits.`,
    );
  }

  const on = walking(path);
  if (on.length) {
    /* A chain whose next step is in your bag right now leads, whatever else
       is part-finished — it is the only thing on this page you could be
       doing rather than starting. */
    const w = on.find((c) => c.started) ?? on[0];
    const where = w.next?.startZone ?? w.next?.startInstance ?? null;
    lines.push(
      w.started
        ? `${w.next?.name} is in your log, ${w.at} of ${w.of} down ${w.chain.name}.`
        : on.length > 1
          ? `${up(count(on.length))} chains part-finished, the nearest ${w.at} of ${w.of} down.`
          : `${w.chain.name} is ${w.at} of ${w.of} done${where ? `, and picks up in ${where}` : ""}.`,
    );
  } else {
    /* Newly in reach, and only just — a chain that has been open for twenty
       levels is not something that changed. */
    const opened = path.chains.filter((w) => w.reach && w.at === 0 && level - w.chain.minLevel <= 2);
    if (opened.length) lines.push(`${opened[0].chain.name} is open to you now.`);
  }

  const errands = errandsOpen(path);
  if (errands.length) {
    const carrying = errands.find((e) => e.inLog);
    if (carrying) {
      lines.push(`${carrying.name} is in your log.`);
    } else {
      const e = errands[errands.length - 1];
      const where = e.startZone ?? e.startInstance;
      lines.push(where ? `A class chain starts in ${where}.` : `${e.name} is open.`);
    }
  }

  if (path.fading.length) {
    const soon = path.fading[0];
    const quests = path.fading.filter((f) => f.inLevels === soon.inLevels).reduce((n, f) => n + f.questCount, 0);
    const when =
      soon.inLevels === 0 ? "at this level" : soon.inLevels === 1 ? "in a level" : `in ${count(soon.inLevels)} levels`;
    lines.push(`${up(count(quests))} ${quests === 1 ? "quest greys" : "quests grey"} out ${when}.`);
  }

  return lines;
}

/* --------------------------------------------------------------------------
   What the addon already knew.

   THE IMPORT ANSWERS THIS, AND IT ALWAYS COULD. `/tari`'s string carries `S:`
   — every spell id in the spellbook — and `Q:` — every quest id completed —
   and lib/import.ts has parsed both since it was written. It also carries
   `matchImport`, which turns them into exactly the `done` subjects this module
   names. The one thing missing was the catalogue to match them against, and
   its header comment says where that comes from: here.

   THE SPELLBOOK ONLY SHOWS THE HIGHEST RANK. A rogue who bought Eviscerate
   Rank 9 has one id in `S:`, and the trainer's Rank 8 row would match nothing
   — so every row carries `knownBy`, every rank that proves it, and CPLUS
   emitted that field for this. The rogue's poisons never appear in a
   spellbook at all (the client keeps them in the tradeskill window), so those
   rows carry a `skill` instead and the string's `P:` field answers them.

   ONLY THE PASTE. The armory knows a character's gear and level and nothing
   about their spellbook or quest log, so an armory lookup credits nothing —
   correctly, and lib/import.ts already hands it empty lists.
-------------------------------------------------------------------------- */

import { matchImport, skillSlug, type ImportCatalog, type ImportMatch, type ParsedCharacter } from "./import";
import { setMarks } from "./marks";

/** Everything a pasted string can be matched against, for one class and side. */
export function importCatalog(train: Training, file: JourneyFile): ImportCatalog {
  return {
    questIds: [
      ...file.attunements.flatMap((a) => a.steps.map((s) => s.questId)),
      ...train.classQuests.map((q) => q.questId),
    ],
    batches: train.abilities.map((b) => ({
      level: b.level,
      spells: b.spells.map((s) => ({
        spellId: s.spellId,
        knownBy: s.knownBy,
        skill: s.skill,
        optional: s.optional,
      })),
    })),
    milestones: train.professionMilestones.map((m) => ({
      id: skillMark(m.skill, m.atSkill),
      slug: skillSlug(m.skill),
      atSkill: m.atSkill,
    })),
  };
}

/**
 * Credit a pasted character with everything the string proves, as `done` marks.
 *
 * Returns what it wrote, so the creator can say so — a paste that silently
 * ticks forty things is the app doing something large without mentioning it.
 */
export async function creditImport(key: string, parsed: ParsedCharacter): Promise<ImportMatch | null> {
  if (parsed.spellIds.length === 0 && parsed.questIds.length === 0 && parsed.professions.length === 0) return null;
  const train = await training(parsed.cls);
  const match = matchImport(importCatalog(train, journeyOf(parsed.faction)), parsed);
  setMarks(key, "done", match.ids);
  return match;
}
