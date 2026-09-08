/**
 * WHAT A ZONE IS HOLDING FOR ONE CHARACTER — the front door's first column.
 * docs/DIRECTION.md §3.
 *
 * THE QUESTS WERE ALREADY IN THE REPO. This module found nothing new: every
 * room file in `reference/rooms` files an item under the thing that hands it
 * over, and 494 of those things across 45 rooms are quests, named, with the
 * quest's own tuning level, its accept gate and its faction. What was missing
 * was a reader that asked the index that question instead of the item one.
 *
 * SO IT IS THE QUESTS THAT PAY, AND NOT EVERY QUEST IN THE ZONE. A collect-ten
 * -pelts errand that ends in copper has no item and is therefore not in the
 * pipeline at all. The column must not imply otherwise, which is why the
 * heading says what these are rather than calling them "quests here".
 *
 * IT USES THE SAME WINDOW AS THE DROPS. `lib/window.ts` is the app's one
 * opinion about what "for me, now" means, and a column that drew drops through
 * one window and quests through another would be two answers to one question.
 * A level-60 reader standing in Duskwood is told the zone is behind them,
 * which is true, rather than shown a list they finished forty levels ago.
 *
 * IT NAMES, IT DOES NOT RANK. The game's own order — by the quest's level,
 * then by name. No score, no lead row, no "do this next" (lib/journey.ts holds
 * the same line and the argument behind it).
 */

import { lootFor, type ClassId, type Item, type Quality } from "./loot";
import { WINDOW_ABOVE, WINDOW_BELOW } from "./window";

/** One quest in this zone that pays in gear, and what it pays. */
export type QuestHere = {
  /** The quest id, which is the pipeline's `sourceId` for a quest source. */
  id: number;
  name: string;
  /** The quest's own tuning level — what the game calls its level. */
  level: number;
  /** The level it will let you accept it at, when the pipeline knows. */
  minLevel: number | null;
  /** Absent means both sides can take it. */
  faction: "alliance" | "horde" | null;
  /** Whether any step of it is inside an instance. */
  instance: boolean;
  /** What it hands over, best colour first. Never empty — a quest with no
   *  reward is not in the index in the first place. */
  rewards: { itemId: number; name: string; quality: Quality; iconName: string | null }[];
};

const QUALITY_RANK: Record<Quality, number> = {
  Legendary: 5,
  Epic: 4,
  Rare: 3,
  Uncommon: 2,
  Common: 1,
  Poor: 0,
};

/** Whether a quest's side lets this character take it. A source with no
 *  faction, or `both`, is open to everyone. */
function open(side: string | undefined, mine: "alliance" | "horde" | null): boolean {
  if (!side || side === "both") return true;
  return mine === null || side === mine;
}

/**
 * The quests in this room that pay a class this character can use, tuned near
 * this level.
 *
 * `cls` null is a reader with no character — every class, which is the same
 * branch `panelFor` takes and for the same reason. `faction` null is the same
 * for sides.
 */
export function questsHere(
  roomId: string,
  cls: ClassId | null,
  level: number,
  faction: "alliance" | "horde" | null,
): QuestHere[] {
  const file = lootFor(roomId);
  if (!file) return [];

  const found = new Map<number, QuestHere>();

  for (const item of file.items) {
    if (cls && !item.classes.includes(cls)) continue;

    for (const src of item.sources) {
      if (src.type !== "quest") continue;
      if (!open(src.faction, faction)) continue;

      /* The quest's own level is the window's subject, exactly as an item's
         availableAtLevel is for a drop. Falling back to the accept gate is
         for the handful of rows the pipeline tuned one way and not the
         other; falling back to the item is the last resort and still a fact
         about when this row is for you. */
      const at = src.questLevel ?? src.minLevel ?? item.availableAtLevel;
      if (at < level - WINDOW_BELOW || at > level + WINDOW_ABOVE) continue;

      const already = found.get(src.sourceId);
      const reward = {
        itemId: item.itemId,
        name: item.name,
        quality: item.quality,
        iconName: item.iconName,
      };

      if (already) {
        already.rewards.push(reward);
        continue;
      }

      found.set(src.sourceId, {
        id: src.sourceId,
        name: src.sourceName,
        level: at,
        minLevel: src.minLevel ?? null,
        faction: src.faction === "alliance" || src.faction === "horde" ? src.faction : null,
        instance: !!src.instance,
        rewards: [reward],
      });
    }
  }

  const quests = [...found.values()];
  for (const q of quests) {
    q.rewards.sort(
      (a, b) => QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality] || a.name.localeCompare(b.name),
    );
  }

  return quests.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** The best colour in a pile of rewards, so a quest row can wear the rarity of
 *  the finest thing it hands over — the way the game colours a name. */
export function bestQuality(q: QuestHere): Quality {
  return q.rewards[0]?.quality ?? "Common";
}

/** How many rooms hold quests at all, for the one place that needs to say so.
 *  Not every zone is in the index and a column that implied otherwise would be
 *  claiming coverage the pipeline does not have. */
export function hasQuests(roomId: string): boolean {
  const file = lootFor(roomId);
  if (!file) return false;
  return file.items.some((i: Item) => i.sources.some((s) => s.type === "quest"));
}
