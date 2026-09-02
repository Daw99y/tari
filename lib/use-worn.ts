/* THE WORN DICTIONARY, AS A HOOK. Every surface that judges upgrades needs
 * the dictionary rows for what the character wears, and three of them were
 * about to write the same fetch. One signature, one request, cached by the
 * gear it asks about; null until it lands, which every judge reads as "no
 * judgement yet" rather than guessing. */

import { useEffect, useState } from "react";

import type { WornItem } from "./worn";

export function useWornDict(gear: number[]): Record<string, WornItem> | null {
  const key = [...new Set(gear.filter((id) => typeof id === "number" && id > 0))]
    .sort((a, b) => a - b)
    .join(",");
  const [got, setGot] = useState<{ key: string; dict: Record<string, WornItem> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let gone = false;
    fetch(`/api/items?ids=${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, WornItem> | null) => {
        if (!gone && d) setGot({ key, dict: d });
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [key]);

  /* Nothing worn is a complete answer, not a pending one. */
  if (!key) return {};
  return got?.key === key ? got.dict : null;
}
