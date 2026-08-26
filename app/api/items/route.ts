/* THE ITEM DICTIONARY'S DOOR. Every 1.12 item, by id, in the plate's own
 * fields — reference/items.json, read once and held. The stage asks for
 * what a character is wearing (a handful of ids) to draw the worn
 * comparison; nothing else calls this. GET, cacheable, no body. */

import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import type { WornItem } from "@/lib/worn";

let dict: Record<string, WornItem> | null = null;

async function load(): Promise<Record<string, WornItem>> {
  if (!dict) {
    const raw = await fs.readFile(path.join(process.cwd(), "reference", "items.json"), "utf8");
    dict = JSON.parse(raw) as Record<string, WornItem>;
  }
  return dict;
}

export async function GET(req: Request): Promise<NextResponse> {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((s) => /^\d+$/.test(s))
    .slice(0, 24);
  const all = await load();
  const out: Record<string, WornItem> = {};
  for (const id of ids) if (all[id]) out[id] = all[id];
  return NextResponse.json(out, {
    headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=2592000" },
  });
}
