import type { ClassId, Faction } from "./types";

/**
 * The addon parser — the site's half of the contract, as PHASE-ADDON-2.md
 * states the string:
 *
 *   WP2;WARRIOR;Horde;60;G:…;Q:…;S:…;P:…;B:…;T:…;R:…;H:…;Z:…;M:123456
 *
 * TA2 adds two: `L:` the quest log as it stands, and `K:` every talent's rank.
 * `Q:` is only what is finished, so without `L:` a chain four steps in and one
 * nobody has touched are the same string; `T:` is three totals, so without
 * `K:` a talent-gated trainer row can only be excused rather than decided.
 * Both are read exactly like every other key — an older string simply has
 * fewer of them, which is the whole point of a keyed tail.
 *
 * Semicolon-separated, one line, versioned by prefix. `G:` is 19 itemIds in
 * WoW slot order, 0 = empty. `Q:`, `S:` and `B:` are sorted ids as base36 — the
 * first id, then dot-separated deltas. `P:` is Name=rank pairs. `T:` is points
 * per talent tree in tab order. `R:` is Name=standingId pairs. `H:` and `Z:` are
 * a hearth and a zone as plain text. `M:` copper.
 *
 * WP1 is the same string without the five fields WP2 added, and SW1 is WP1
 * under the addon's old name. Both parse here on identical terms, forever: an
 * old addon pasting an old string always works, exactly as the localStorage
 * migrations promise. The error copy names WP2 because that is what a fresh
 * export says.
 *
 * Two rules govern everything here. The tail is read by key and never by
 * position, so WP3 can add a field between two of these without moving
 * anything; unknown keys and unknown prefixes are ignored rather than fatal.
 * And nothing throws: malformed input returns a stated error, so a half-pasted
 * string in the panel is a sentence rather than a blank.
 *
 * This module is client-side and dependency-free on purpose. Parsing is local
 * — no string content ever leaves the browser — and importing lib/zones.ts
 * for a class check would ship 441 zone files to get at a list of nine words.
 */

/**
 * Where a string waits while the page changes under it.
 *
 * The catalogue an import is matched against is per class and per side, so the
 * apply cannot honestly run anywhere but the page for that character. Two
 * surfaces take a paste from somewhere else — the landing's field, which has no
 * character at all, and the pill on a page for the wrong one — and both do the
 * same thing with it: stash the raw string here, navigate, and let the pill on
 * the destination pick it up and show the preview it can actually stand behind.
 *
 * It lives in this module because it is part of the contract rather than part
 * of either component, and because two of them now spell it.
 */
export const PENDING_IMPORT_KEY = "whelpplz:v1:pending-import";

const CLASS_TOKENS: Record<string, ClassId> = {
  WARRIOR: "warrior",
  HUNTER: "hunter",
  ROGUE: "rogue",
  MAGE: "mage",
  WARLOCK: "warlock",
  PRIEST: "priest",
  PALADIN: "paladin",
  SHAMAN: "shaman",
  DRUID: "druid",
};

export type ParsedCharacter = {
  cls: ClassId;
  faction: Faction;
  level: number;
  /** 19 itemIds in slot order, 0 = empty. */
  gear: number[];
  questIds: number[];
  spellIds: number[];
  professions: { name: string; rank: number }[];
  copper: number | null;
  /**
   * Everything in the bags, plus the bank as the addon last saw it. Equipped
   * ids are not in here — those are gear's — so the pair is read together
   * wherever the question is "does this character have one".
   *
   * Empty means the string said nothing, which is not the same as an empty
   * bag: a WP1 string has no B: field at all, and neither has a WP2 string
   * from a character carrying nothing.
   */
  bagIds: number[];
  /** Points per talent tree, in the client's own tab order. Empty when the
      string carried none. Parsed and parked; the Sixty lens spends it. */
  talents: number[];
  /** The factions the addon watches, as `Name` → standingId (1 hated … 8
      exalted). Parked with the talents. */
  reputations: { name: string; standing: number }[];
  /** Where the hearth is set, and the zone the export was taken in. Plain text
      as the client spelled it; null when the string carried neither. */
  hearth: string | null;
  zone: string | null;
  /** Who the string is, and the realm they stand on. Plain text as the client
      spelled it; null from any addon older than the fields. The community
      surfaces name a character rather than an account, and this is where that
      name comes from. */
  name: string | null;
  realm: string | null;
  /** TA1 (docs/CHARACTER.md). Race token as the client spells it ("Gnome",
      "Scourge"), sex as the client counts it (2 male, 3 female), the guild,
      and seconds played. Null from any older string. */
  /** Quest ids in the log right now — started, not finished. TA2. */
  questLogIds: number[];
  /** Every talent's rank, per tree, in the client's order. TA2. */
  talentPicks: number[][];
  race: string | null;
  sex: 2 | 3 | null;
  guild: string | null;
  played: number | null;
  /** The journal: what happened, where, at what level, when. Empty from any
      addon older than TA1. `time` is unix seconds. */
  journal: JournalEntry[];
};

export type JournalKind = "l" | "z" | "d" | "q";
export type JournalEntry = { kind: JournalKind; zone: string; level: number; time: number };

/** Every prefix this site reads, and it never drops one. SW1 is WP1 under the
    addon's old name; WP1 is WP2 without the five fields WP2 added; TA1 is
    WP2 under Tari's name with five more; TA2 is TA1 plus `L:` and `K:`.

    NEWEST FIRST, AND THE FIRST ONE NAMES THE SITE. The refusal below quotes
    this list's head, so a version bump that forgets this line tells the
    reader their own addon is from the future — which is exactly what shipped
    for ten minutes on 2026-08-31. Adding a prefix to the addon means adding
    it here in the same breath. */
const KNOWN_VERSIONS = ["TA2", "TA1", "WP2", "WP1", "SW1"] as const;
const READS = new Set<string>(KNOWN_VERSIONS);
const NEWEST = KNOWN_VERSIONS[0];

const JOURNAL_KINDS = new Set(["l", "z", "d", "q"]);

/** `kind|zone|level|time36` entries, dot-separated. A bad entry is dropped,
    not fatal: one garbled line is not a reason to lose the character. */
function readJournal(value: string): JournalEntry[] {
  if (!value) return [];
  const out: JournalEntry[] = [];
  for (const entry of value.split(".")) {
    const [kind, zone, level, time] = entry.split("|");
    if (!JOURNAL_KINDS.has(kind) || zone === undefined) continue;
    const lv = Number(level);
    const t = parseInt(time ?? "", 36);
    if (!Number.isInteger(lv) || lv < 1 || lv > 60 || !Number.isFinite(t) || t <= 0) continue;
    out.push({ kind: kind as JournalKind, zone, level: lv, time: t });
  }
  return out;
}

export type ParseResult =
  | { ok: true; character: ParsedCharacter }
  | { ok: false; error: string };

/**
 * Base36 delta decoding: `2s.4.1.2c` is one id and then how far each next id
 * sits above the last. A token that is not base36 poisons every id after it —
 * the deltas accumulate — so the whole field is dropped rather than half-read.
 */
function decodeIds(field: string): number[] {
  if (!field) return [];
  const out: number[] = [];
  let acc = 0;
  for (const part of field.split(".")) {
    if (!/^[0-9a-z]+$/.test(part)) return [];
    const n = parseInt(part, 36);
    if (!Number.isFinite(n)) return [];
    acc = out.length === 0 ? n : acc + n;
    out.push(acc);
  }
  return out;
}

export function parseImport(raw: string): ParseResult {
  try {
    const line = raw.trim();
    if (!line) return { ok: false, error: "Nothing to read yet." };

    const fields = line.split(";");
    const version = fields[0]?.trim().toUpperCase() ?? "";
    if (!/^(TA|WP|SW)\d+$/.test(version))
      return {
        ok: false,
        error: `Not an export — the string /tari gives you starts with ${NEWEST}.`,
      };
    /* Every version this site has ever emitted, and it keeps reading all of
       them: the fields are keyed, so an older string is simply one with fewer
       of them. A newer prefix is refused rather than half-read, because the
       one thing a future version can change that this code cannot survive is
       the four positional fields in front. */
    if (!READS.has(version))
      return {
        ok: false,
        error: `This is a ${version} string from a newer addon; this site reads ${NEWEST}.`,
      };

    const cls = CLASS_TOKENS[fields[1]?.trim().toUpperCase() ?? ""];
    if (!cls) return { ok: false, error: "The string names no class this site knows." };

    const factionToken = fields[2]?.trim().toLowerCase();
    const faction: Faction | null =
      factionToken === "horde" || factionToken === "alliance"
        ? factionToken
        : null;
    if (!faction)
      return { ok: false, error: "The string names no faction this site knows." };

    const rawLevel = Number(fields[3]?.trim());
    if (!Number.isFinite(rawLevel))
      return { ok: false, error: "The string carries no character level." };
    const level = Math.min(60, Math.max(1, Math.round(rawLevel)));

    const character: ParsedCharacter = {
      cls,
      faction,
      level,
      gear: [],
      questIds: [],
      spellIds: [],
      questLogIds: [],
      talentPicks: [],
      professions: [],
      copper: null,
      bagIds: [],
      talents: [],
      reputations: [],
      hearth: null,
      zone: null,
      name: null,
      realm: null,
      race: null,
      sex: null,
      guild: null,
      played: null,
      journal: [],
    };

    /* The tail: `K:value` fields in any order. An unknown key is skipped and a
       field that will not decode is treated as absent — both are the string
       being newer or worse than this code, and neither is worth refusing the
       class, level and side already in hand. */
    for (const part of fields.slice(4)) {
      const colon = part.indexOf(":");
      if (colon < 1) continue;
      const key = part.slice(0, colon).trim().toUpperCase();
      const value = part.slice(colon + 1).trim();
      switch (key) {
        case "G":
          character.gear = value
            .split(",")
            .slice(0, 19)
            .map((v) => {
              const n = Number(v);
              return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
            });
          break;
        case "Q":
          character.questIds = decodeIds(value);
          break;
        case "S":
          character.spellIds = decodeIds(value);
          break;
        case "L":
          character.questLogIds = decodeIds(value);
          break;
        case "K":
          /* One digit per talent, trees split on the dot. A tree with no
             points is a run of zeroes rather than an absent tree, so an empty
             segment is a malformed field and drops the whole thing — the same
             rule `T:` follows, and for the same reason: wrong is worse than
             missing. */
          character.talentPicks = /^[0-9]*(\.[0-9]*)*$/.test(value)
            ? value.split(".").map((tree) => tree.split("").map(Number))
            : [];
          break;
        case "P":
          character.professions = value
            .split(",")
            .map((pair) => {
              const eq = pair.lastIndexOf("=");
              if (eq < 1) return null;
              const rank = Number(pair.slice(eq + 1));
              if (!Number.isFinite(rank) || rank < 0) return null;
              return { name: pair.slice(0, eq).trim(), rank: Math.round(rank) };
            })
            .filter((p): p is { name: string; rank: number } => p !== null);
          break;
        case "B":
          character.bagIds = decodeIds(value);
          break;
        case "T": {
          /* Three integers, and a tree with no points spent is a 0 rather than
             an absence — the field is only omitted whole.
             A token that is not a whole number drops the whole field, and that
             is not pedantry: an addon whose client would not say how many
             points were spent emitted "T:..", and reading three empty strings
             as three zeroes would state that a level 60 has spent none. Wrong
             is worse than missing. */
          const parts = value.split(".");
          character.talents = parts.every((p) => /^\d+$/.test(p))
            ? parts.map((p) => Number(p))
            : [];
          break;
        }
        case "R":
          character.reputations = value
            .split(",")
            .map((pair) => {
              const eq = pair.lastIndexOf("=");
              if (eq < 1) return null;
              const standing = Number(pair.slice(eq + 1));
              if (!Number.isFinite(standing)) return null;
              return {
                name: pair.slice(0, eq).trim(),
                standing: Math.round(standing),
              };
            })
            .filter((r): r is { name: string; standing: number } => r !== null);
          break;
        case "H":
          character.hearth = value || null;
          break;
        case "Z":
          character.zone = value || null;
          break;
        case "N":
          character.name = value || null;
          break;
        case "E":
          character.realm = value || null;
          break;
        case "A":
          character.race = value || null;
          break;
        case "X":
          character.sex = value === "2" ? 2 : value === "3" ? 3 : null;
          break;
        case "U":
          character.guild = value || null;
          break;
        case "W": {
          const n = Number(value);
          character.played = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
          break;
        }
        case "J":
          character.journal = readJournal(value);
          break;
        case "M": {
          const n = Number(value);
          character.copper = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
          break;
        }
        default:
          break;
      }
    }

    /* The one field this module fills in rather than reads. See
       `raceFromLanguages` — the string states a faction and some builds omit
       the race, and a faction the creator ignores is the wrong journey file. */
    if (!character.race) {
      character.race = raceFromLanguages(character.professions, character.faction);
    }

    return { ok: true, character };
  } catch {
    /* The contract over everything above: this function does not throw. */
    return { ok: false, error: "That string would not read as an export." };
  }
}

/** The P-field's names against the milestone catalogue: "First Aid" and
    "first aid" are one skill. The same slug lib/journey.ts keys milestones
    with, stated twice because sharing it would make this module import one
    that imports the world. */
/**
 * THE RACE, WHEN THE STRING DOES NOT SAY.
 *
 * `R:` is the race token and some builds of the addon do not emit it — a
 * TA1 string from 6.2.0 arrived on 2026-08-31 with a faction, a class and no
 * race at all, and the creator quietly kept whatever race was on the picker.
 * A Horde rogue saved as a Human is not a cosmetic error: faction decides
 * which journey file `/campfire` reads and which half of the class quests exist.
 *
 * `P:` answers it, and not by guessing. A 1.12 character knows exactly two
 * languages: their faction's — Common or Orcish — and their own race's. So
 * the language that is not the faction's names the race outright, and when
 * there is only the faction's, the character is the race whose own language
 * that is: a Human, or an Orc.
 *
 * It is still only a fallback. A string that carries `R:` is believed over
 * this, because a field the client filled in beats a field it implied.
 */
const RACE_BY_LANGUAGE: Record<string, string> = {
  gutterspeak: "Scourge",
  darnassian: "NightElf",
  dwarvish: "Dwarf",
  gnomish: "Gnome",
  taurahe: "Tauren",
  troll: "Troll",
  orcish: "Orc",
  common: "Human",
};

export function raceFromLanguages(
  professions: { name: string; rank: number }[],
  faction: Faction
): string | null {
  const spoken = professions
    .map((p) => /^language:\s*(.+)$/i.exec(p.name.trim())?.[1]?.trim().toLowerCase())
    .filter((v): v is string => !!v);
  if (spoken.length === 0) return null;
  const common = faction === "horde" ? "orcish" : "common";
  const own = spoken.find((l) => l !== common) ?? spoken.find((l) => l === common);
  return own ? (RACE_BY_LANGUAGE[own] ?? null) : null;
}

export function skillSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/* ---------------------------------------------------------------------------
   Weapon skills: the one reading the P: field carries that the plan can use.

   The addon exports every skill line the client reports — professions, weapon
   skills, Defense, languages — as `Name=rank`, and until now everything but the
   professions was thrown away. A weapon skill is worth keeping because it is the
   one number in the export that silently rots: a warrior at 40 swinging a sword
   he last raised at 24 loses to every mob he swings at, and nothing in the game
   tells him.

   The list is written by hand rather than derived. The client hands over
   localised names and there is no flag on a line saying "this one is a weapon",
   so a hand list is the only honest way to know — and it is sixteen words that
   have not changed since 2004.
--------------------------------------------------------------------------- */

/**
 * The lines whose cap is `level × 5`. Defense is not a weapon and obeys the same
 * arithmetic for the same reason, so it rides along here rather than in a list
 * of one.
 */
export const WEAPON_SKILLS = [
  "Swords",
  "Two-Handed Swords",
  "Axes",
  "Two-Handed Axes",
  "Maces",
  "Two-Handed Maces",
  "Daggers",
  "Fist Weapons",
  "Staves",
  "Polearms",
  "Bows",
  "Guns",
  "Crossbows",
  "Thrown",
  "Wands",
  "Unarmed",
  "Defense",
] as const;

const WEAPON_SLUGS = new Map(WEAPON_SKILLS.map((n) => [skillSlug(n), n] as const));

/**
 * How far behind the cap a skill has to fall before it is worth a row.
 *
 * Fifty points is ten levels of neglect, and it is a threshold rather than a
 * strict reading on purpose: a skill one or two points shy of the cap is a
 * character who swung a sword this morning, and a plan that says so is a plan
 * nobody reads twice.
 */
export const WEAPON_GAP = 50;

/**
 * How old a reading may be before it is thrown away rather than shown.
 *
 * A rank is only readable against the level it was taken at, so the reading ages
 * with the import: ten levels past it the cap is a guess stacked on a guess, and
 * a stale nag is worse than none.
 */
export const READING_STALE_AFTER = 10;

/**
 * Is what the string said still worth reading?
 *
 * One rule, stated once, for every line built on an import: the weapon ranks,
 * the last-seen sentence, and the zone the plan's ease() counts from. They age
 * together because they were all taken in the same photograph, and a screen
 * where one of them has expired and the others have not would be a screen
 * arguing with itself.
 */
export function readingFresh(
  importedAt: number | null | undefined,
  level: number
): boolean {
  return (
    typeof importedAt === "number" && level - importedAt <= READING_STALE_AFTER
  );
}

/** The item subclasses the emission states, against the skill each one trains.
    A subclass says nothing about hands — "Sword" is both — so a lagging
    two-hander and a lagging one-hander both answer to an equipped sword. */
const SUBCLASS_SKILLS: Record<string, string[]> = {
  Sword: ["Swords", "Two-Handed Swords"],
  Axe: ["Axes", "Two-Handed Axes"],
  Mace: ["Maces", "Two-Handed Maces"],
  Dagger: ["Daggers"],
  "Fist Weapon": ["Fist Weapons"],
  Staff: ["Staves"],
  Polearm: ["Polearms"],
  Bow: ["Bows"],
  Gun: ["Guns"],
  Crossbow: ["Crossbows"],
  Thrown: ["Thrown"],
  Wand: ["Wands"],
};

/** What an import leaves behind for the plan to read, and the level it was read
    at — the pair is what makes a rank mean anything. */
export type SkillReading = {
  skills: { name: string; rank: number }[];
  level: number;
};

/** One skill that fell behind, as the plan words it. */
export type WeaponGap = {
  /** The line's name, as the client spelled it. */
  name: string;
  rank: number;
  cap: number;
  gap: number;
  /** The reader's own weapon trains this skill. Set by weaponGaps' caller data,
      not by the arithmetic. */
  equipped?: boolean;
};

/**
 * Every weapon skill in the reading that has fallen past the threshold, worst
 * first.
 *
 * Returns nothing at all when the reading is too old to trust, and nothing when
 * the string carried no weapon line — an SoD export, a client that reported none
 * — because a warning built on an absent field is a warning about nothing.
 */
export function weaponGaps(
  reading: SkillReading | null,
  level: number,
  equippedSubclasses: string[] = []
): WeaponGap[] {
  if (!reading || level - reading.level > READING_STALE_AFTER) return [];

  const cap = reading.level * 5;
  const wanted = new Set(
    equippedSubclasses.flatMap((s) => SUBCLASS_SKILLS[s] ?? [])
  );

  const out: WeaponGap[] = [];
  for (const s of reading.skills) {
    const name = WEAPON_SLUGS.get(skillSlug(s.name));
    if (!name) continue;
    const gap = cap - s.rank;
    if (gap < WEAPON_GAP) continue;
    out.push({
      name,
      rank: s.rank,
      cap,
      gap,
      ...(wanted.has(name) ? { equipped: true } : null),
    });
  }

  /* The worst gap leads, and an equipped weapon breaks a tie — "your equipped
     sword" is the sentence worth printing when two skills are equally rusty. */
  return out.sort(
    (a, b) =>
      b.gap - a.gap ||
      Number(!!b.equipped) - Number(!!a.equipped) ||
      a.name.localeCompare(b.name)
  );
}

/* ---------------------------------------------------------------------------
   What the string is matched against, and the one rule that matches it.

   The catalogue's types live here rather than beside the function that builds
   it, so this module stays the light one: lib/journey.ts imports the world to
   assemble a catalogue, and the browser only ever needs the shape.
--------------------------------------------------------------------------- */

/**
 * One trainer row, as the matcher sees it. Three shapes in one type, because
 * the emission answers three different questions about whether a character can
 * be expected to have a spell — see the header comment in
 * CPLUS/scripts/build_training.py for how each is derived.
 */
export type CatalogSpell = {
  /**
   * Every id that proves this row known: the spell itself and every higher
   * rank of its chain. The client's spellbook shows one entry per spell — the
   * highest rank known — so a level 60 who bought Eviscerate Rank 9 has only
   * that id, and the trainer's Rank 8 would otherwise match nothing.
   *
   * Optional, and its absence is the pre-fix emission rather than a spell with
   * no ids: the matcher falls back to `spellId` alone, which is exactly the
   * behaviour this replaced.
   */
  knownBy?: number[];
  /** The join key, and the fallback when a file predates `knownBy`. */
  spellId?: number;
  /**
   * A skill line and the rank it wants, when the row is made rather than cast
   * — the rogue's poisons and Blinding Powder. These never appear in the
   * spellbook at all (the client keeps them in the tradeskill window), so no
   * spell id can match one and the addon's P: field answers instead.
   */
  skill?: { name: string; atSkill: number };
  /**
   * A row a character can legitimately not have: the continuation of a chain
   * whose first rank is a talent. It never holds a batch open.
   */
  optional?: boolean;
};

export type CatalogBatch = { level: number; spells: CatalogSpell[] };

export type ImportCatalog = {
  /** Errand and attunement-step quest ids. */
  questIds: number[];
  batches: CatalogBatch[];
  /** Per milestone: the done id and the rank that earns it. */
  milestones: { id: string; slug: string; atSkill: number }[];
};

/** What an import will write, and what the preview says it will write. */
export type ImportMatch = {
  /** done-store ids, ready to merge. */
  ids: string[];
  quests: number;
  /** Trainer visits credited, over those the character is high enough for. */
  batches: number;
  batchesEligible: number;
  milestones: number;
};

function spellKnown(
  s: CatalogSpell,
  known: Set<number>,
  skills: Map<string, number>
): boolean {
  if (s.skill) {
    const rank = skills.get(skillSlug(s.skill.name));
    return rank !== undefined && rank >= s.skill.atSkill;
  }
  const ids = s.knownBy?.length
    ? s.knownBy
    : typeof s.spellId === "number"
      ? [s.spellId]
      : [];
  return ids.some((id) => known.has(id));
}

/**
 * The whole of what a pasted string means for this character, decided once.
 *
 * The preview line and the confirm both call this and neither knows anything
 * the other does not — a preview that counts one thing and a confirm that
 * writes another is a preview that lies, and this is the only way to be sure
 * it cannot.
 *
 * A trainer visit is credited when every row that can hold it open is known.
 * Optional rows (talent chains) are dropped from that test rather than assumed
 * known, and a batch made of nothing but optional rows is credited on positive
 * evidence instead — one of them known — because an empty `every` is a batch
 * credited for having nothing in it.
 */
export function matchImport(
  catalog: ImportCatalog,
  character: ParsedCharacter
): ImportMatch {
  const ids: string[] = [];

  const questIds = new Set(catalog.questIds);
  let quests = 0;
  for (const id of character.questIds) {
    if (questIds.has(id)) {
      ids.push(`q:${id}`);
      quests++;
    }
  }

  const known = new Set(character.spellIds);
  const skills = new Map(
    character.professions.map((p) => [skillSlug(p.name), p.rank] as const)
  );

  let batches = 0;
  let batchesEligible = 0;
  for (const b of catalog.batches) {
    if (b.level > character.level || b.spells.length === 0) continue;
    batchesEligible++;
    const gating = b.spells.filter((s) => !s.optional);
    const trained = gating.length
      ? gating.every((s) => spellKnown(s, known, skills))
      : b.spells.some((s) => spellKnown(s, known, skills));
    if (trained) {
      ids.push(`t:${b.level}`);
      batches++;
    }
  }

  let milestones = 0;
  for (const [slug, rank] of skills) {
    for (const m of catalog.milestones) {
      if (m.slug === slug && m.atSkill <= rank) {
        ids.push(m.id);
        milestones++;
      }
    }
  }

  return { ids, quests, batches, batchesEligible, milestones };
}
