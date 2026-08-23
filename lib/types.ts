// Types are written against reference/SCHEMA.md, which is the contract, and
// checked against the actual pipeline output in reference/zones/*.json. Anything
// optional here is optional because the schema says a field rides on one source
// type only, not because the shipped files happen to disagree.
//
// Phase 3 renamed two buckets and added a third; there is no version field, so
// the shape *is* the contract and old names are gone rather than aliased.
//
// The phase-1 emission added fields rather than renaming any: zone meta grew
// `levelRange`, `continent` and `kind`; drop sources grew `elite` and `rare`.
// SCHEMA.md has not caught up with it, so the fields below were read off the
// 441 shipped files — every drop source carries both flags, every quest source
// carries neither, and all 49 zones carry all three meta fields.
//
// The phase-1.5 emission added `faction` to quest sources, and SCHEMA.md caught
// up with this one: all 4,296 quest sources across the 441 files carry it, no
// drop source does, and the values are the three the schema states.

/**
 * The nine classes the pipeline emits. It emitted two through phase 3 and six
 * after it; the shape of a file has never changed with the count, so this is
 * still the only line that has to.
 */
export type ClassId =
  | "warrior"
  | "hunter"
  | "rogue"
  | "mage"
  | "warlock"
  | "priest"
  | "paladin"
  | "shaman"
  | "druid";

/** Present in the schema, absent from every shipped file. Typed, never read by the UI. */
export type SpecId = string;

/**
 * All six, still, though the emission now floors at Uncommon: the app used to
 * filter Common and Poor out itself and no longer has to. Quality is a property
 * of an item rather than a decision the pipeline makes, so the type keeps the
 * values the game has and `qualityVar` keeps mapping all of them.
 */
export type Quality = "Poor" | "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

/** RELEVANCE.md part B. Ten values exist; five appear in the shipped files. */
export type Archetype =
  | "tank"
  | "healer"
  | "caster_dps"
  | "caster_generic"
  | "hybrid"
  | "physical_dps"
  | "generic"
  | "utility"
  | "random_suffix"
  | "junk";

export type StatPair = {
  type: string;
  value: number;
};

/**
 * The two sides. A fact about the character rather than a display preference,
 * which is why it filters and why it lives here beside the class rather than
 * beside the paper stock.
 */
export type Faction = "alliance" | "horde";

/**
 * What a quest source is open to. `"both"` is the common case by a distance —
 * neutral quest givers outnumber the contested ones — and it is a stated value,
 * not the absence of one. See `faction` on ItemSource for what absence means.
 */
export type SourceFaction = Faction | "both";

/**
 * `dropChance` and `lootPath` ride along on drop sources only; quest sources
 * carry neither. INGEST.md is explicit that lootPath (direct vs reference)
 * describes the loot mechanism and says nothing about how specific an item is,
 * so the UI never renders it.
 *
 * `instance` is the one risk flag on both source types — an instance quest is
 * still a quest you can only hand in inside a dungeon. `elite` and `rare` ride
 * the creature, so they ride drop sources only.
 */
export type ItemSource = {
  type: "drop" | "quest";
  /** Opaque and stable across ingests. Never parsed, never derived from. */
  sourceId: number;
  sourceName: string;
  /** True when the source sits inside a dungeon or raid. */
  instance: boolean;

  /**
   * Quest only, and the only faction gate in the file. A Horde character cannot
   * take an Alliance quest, so a reward behind one is unreachable and comes off
   * the screen; see lib/faction.ts. Drop sources never carry it, because a
   * creature is not a faction — a Horde player can kill an Alliance quest
   * giver's boar.
   *
   * Optional here for the same reason `dropChance` is: it rides one source type.
   * Every quest source in every shipped file carries it, and lib/faction.ts
   * still treats an absent value as "both" rather than hiding the item — the
   * cost of that guard is nothing and the cost of the other default is an item
   * silently missing from a list.
   *
   * There is no faction on an item, and the app does not want one. An item
   * reachable only by one side's quests is faction-exclusive as a consequence of
   * its sources, which is a thing to derive rather than a thing to be told.
   */
  faction?: SourceFaction;

  /* Drop only. */
  dropChance?: number;
  sourceLevel?: { min: number; max: number };
  lootPath?: "direct" | "reference";

  /**
   * Two independent facts about the creature, not one scale. 3,739 sources are
   * elite without being rare (every dungeon pack), 428 are rare without being
   * elite, and 361 are both — the named single spawn that also hits like a
   * group mob, which is the case the phrase "rare elite" exists for.
   */
  elite?: boolean;
  rare?: boolean;

  /**
   * Drop only, and only inside an instance: the creature is a boss of it.
   *
   * Read off the shipped files rather than off SCHEMA.md, and the reading has
   * a shape worth stating, because the dungeon lens was designed around it and
   * had to be redesigned by it. 1,316 sources carry `boss: true` and every
   * single one of them also carries `endgame: true` — no source in the 1,254
   * levelling-range dungeon drops is flagged a boss. So there is nothing to
   * group a levelling dungeon's rows under; see lib/zones.ts, dungeonsForClass.
   */
  boss?: boolean;

  /**
   * The instance the source sits in, named — "Ragefire Chasm" — and the field
   * the dungeon lens groups by.
   *
   * It rides the creature, so drop sources carry it and quest sources do not:
   * all 43 instance-quest sources in the emission are missing it, which is why
   * the grouping falls back to the host zone's name. An instance's loot is
   * keyed to the zone that hosts its entrance, so Ragefire Chasm's items live
   * in the Orgrimmar files and this is the only field that says otherwise.
   */
  instanceName?: string;

  /**
   * Level-60 content: the raids and the dungeons tuned for a finished
   * character. 2,260 of the 3,521 items in `dungeonItems` sit behind one.
   *
   * It is the line between two lenses rather than a display flag. The dungeon
   * lens is a levelling view and drops everything carrying it; the Sixty lens
   * is the one that will render exactly this set.
   */
  endgame?: boolean;

  /* Quest only. `questLevel` is what the quest is tuned for and is the one to
     prefer; `minLevel` is the accept gate and does not carry a filter alone. */
  questLevel?: number;
  minLevel?: number;
};

export type Item = {
  itemId: number;
  name: string;
  /**
   * Icon filename, lowercase and extensionless ("inv_axe_23"), or `null` when
   * the pipeline knows it cannot be resolved. Never an empty string, and the
   * key is always present — `null` is a stated value, not a gap.
   *
   * The cause is one documented upstream defect: icon pointers referencing a
   * client newer than the 1.12.1 icon table. At two zone files it was 13 items;
   * across all 441 it is 2,913 of 8,689, and 1,169 of those sit in the two
   * buckets the app renders. A null is a common case rather than a curiosity,
   * which changes nothing about how it is handled and everything about how
   * often that path runs.
   * The UI does not distinguish causes: see `lib/item.ts`,
   * where a null and a failed request take the same branch and leave the drawn
   * glyph in place.
   */
  iconName: string | null;
  wowheadUrl: string;
  slot: string;
  quality: Quality;

  /**
   * What kind of thing it is inside its slot: the armor class for worn gear
   * ("Cloth", "Plate") and the weapon class for the rest ("Dagger", "Wand").
   * Sixteen values across the emission.
   *
   * Optional because the pipeline resolves it for 7,061 of the 8,689 items the
   * app renders and states nothing for the others — rings, necks, trinkets and
   * cloaks have no class in the game either, so the gap is the same one the
   * game has.
   *
   * It is not always new information. A shield is slot "Shield" and subclass
   * "Shield", which is the only pair in the emission where the two agree, and
   * the tooltip drops the duplicate rather than printing it twice.
   */
  itemSubclass?: string;
  /**
   * Whether one is all you may carry. Absent on the 7,948 items with no such
   * limit rather than `false` — the game prints the word or says nothing, and
   * so does the field.
   */
  unique?: boolean;

  /**
   * Four level fields answering four questions, and only one of them filters.
   *
   * `availableAtLevel` is when the item can realistically be got — the
   * creature's level for a drop, the quest's level for a reward — derived
   * during ingest from tables the app cannot see. It is the primary filter and
   * the reason the files ship unfiltered.
   *
   * `requiredLevel` is display only. Vanilla quest rewards carry 0, which is
   * every item in `zoneExclusive` for the Stranglethorn warrior file, so a
   * filter on it would offer a level 12 character the Bloodsail Admiral's Hat.
   *
   * `proficiencyLevel` is when the class learns the armor type. Surfaced
   * rather than filtered, so plate is stated as plate a warrior trains at 40
   * instead of quietly vanishing. 0 means the question does not apply.
   *
   * `itemLevel` ranks, never filters.
   */
  availableAtLevel: number;
  requiredLevel: number;
  proficiencyLevel: number;
  itemLevel: number;

  archetype: Archetype;
  spec?: SpecId;
  stats: StatPair[];
  sources: ItemSource[];

  /* ------------------------------------------------------------------
     What the next sweep adds. Typed now, absent from every shipped file
     today, and optional permanently rather than temporarily: a quest
     reward has no damage range and a cloak has no speed, so absence is a
     property of the item and not a state of the pipeline.

     Nothing branches on "has the sweep landed". The tooltip reads each
     field, renders the line it owns, and skips it when it is undefined —
     which is why the sweep arriving is a data change rather than a
     layout change, and why there is no placeholder anywhere waiting for
     it. See lib/item.ts for the line each one produces.
  ------------------------------------------------------------------ */

  /** How the item binds, or null when it binds not at all. */
  bind?: "pickup" | "equip" | null;
  /** Weapons. `speed` in seconds; DPS is derived, never carried. */
  damage?: { min: number; max: number; speed: number };
  /** Armor value, worn slots. */
  armor?: number;
  /** "Equip: Increases your chance to hit by 1%." — as the game words it. */
  effects?: string[];
  /** Vendor price in copper, split into g/s/c for display. */
  sellPriceCopper?: number;
  durability?: number;
};

/**
 * An aggregate, never a list — 435 items for one class in one zone would
 * dominate both the payload and the page. `byLevel` is what lets a level picker
 * scale the count: five-level buckets keyed by their lower bound as a string,
 * on `requiredLevel`, with zero-count keys omitted. Absent key means zero, so
 * read the entries rather than indexing a range.
 */
export type WorldDrops = {
  count: number;
  levelRange: { min: number; max: number };
  byLevel: Record<string, number>;
};

/**
 * What the file contains, not what to display. `maxCharacterLevel: 60` means
 * every level is present and the filtering is the app's job — there are no
 * per-level files. `instanceLoot: true` means instanced content is included
 * rather than dropped, which is what `dungeonItems` holds.
 */
export type Coverage = {
  maxCharacterLevel: number;
  instanceLoot: boolean;
};

/**
 * What a place *is*, which turns out to be the load-bearing field of the whole
 * emission. A city and a battleground hold items and belong to a continent like
 * anywhere else, but neither is somewhere you go *for* the items: Orgrimmar's
 * 334 rewards are hand-ins for work done elsewhere, and Alterac Valley is a
 * queue. Only `zone` earns a stop on the itinerary. See lib/zones.ts.
 */
export type ZoneKind = "zone" | "city" | "battleground";

/** Two, in Classic. Carried for grouping and routing; nothing reads it yet. */
export type Continent = "Eastern Kingdoms" | "Kalimdor";

/**
 * The zone's own level band, as the pipeline states it rather than as the app
 * infers it. The distinction is not academic: the derived version this replaced
 * took min/max `availableAtLevel` across the class files, so a zone was as wide
 * as its loot happened to be and Duskwood — 20–30 in the game — read 18–37.
 * Cities and battlegrounds carry 1–60, which is true and useless, and is one
 * more reason `kind` decides their treatment rather than the range.
 */
export type ZoneMeta = {
  id: number;
  name: string;
  levelRange: { min: number; max: number };
  continent: Continent;
  kind: ZoneKind;
};

/** One pipeline file: one zone, one class, every level. */
export type ZoneFile = {
  zone: ZoneMeta;
  class: ClassId;
  coverage: Coverage;
  /** Items only 1–3 creatures in the game drop. The items with a story. */
  mobSpecificDrops: Item[];
  /**
   * Items obtainable only in this zone by any open-world route. Defined by
   * exclusivity, not by source type: nearly all are the zone's quest rewards,
   * but items whose every known source creature lives here land in it too —
   * First Mate Hat has no quest and only Bloodsail mobs drop it.
   */
  zoneExclusive: Item[];
  /** No open-world source in the zone: boss drops and instance quests alike. */
  dungeonItems: Item[];
  /** Shared continent-wide pools, aggregated to a count on purpose. */
  worldDrops: WorldDrops;
};
