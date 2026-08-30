/* GET /api/armory?region=us&realm=old-blanchy&name=Kacey
 *
 * The one door to lib/bnet.ts. Answers ArmoryCharacter as JSON, or
 * { error } with the status ArmoryError chose. Cached five minutes per
 * character — armory data only moves on logout anyway. */

import { NextRequest, NextResponse } from "next/server";
import { ArmoryError, BNET_REGIONS, fetchArmoryCharacter, type BnetRegion } from "@/lib/bnet";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const region = (q.get("region") ?? "us").toLowerCase() as BnetRegion;
  const realm = q.get("realm")?.trim() ?? "";
  const name = q.get("name")?.trim() ?? "";

  if (!BNET_REGIONS.includes(region))
    return NextResponse.json({ error: "Unknown region" }, { status: 400 });
  if (!realm || !name)
    return NextResponse.json({ error: "Need a name and a realm" }, { status: 400 });

  try {
    const character = await fetchArmoryCharacter(region, realm, name);
    return NextResponse.json(character, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    if (e instanceof ArmoryError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Armory unavailable" }, { status: 502 });
  }
}
