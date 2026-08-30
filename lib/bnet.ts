/* Battle.net armory fetch. docs: develop.battle.net → WoW Classic Profile APIs.
 *
 * Server-only: reads BNET_CLIENT_ID / BNET_CLIENT_SECRET, so nothing here may
 * be imported by client code. The route at app/api/armory owns the one door.
 *
 * Namespace is profile-classic1x-{region} — Era, Hardcore and SoD realms.
 * Data is as of the character's last logout; that staleness is Blizzard's,
 * not ours. */

export type BnetRegion = "us" | "eu" | "kr" | "tw";

export const BNET_REGIONS: BnetRegion[] = ["us", "eu", "kr", "tw"];

/** What the armory answers with — the fields Character can take. */
export type ArmoryCharacter = {
  name: string;
  realm: string;
  realmSlug: string;
  region: BnetRegion;
  race: number;
  sex: 0 | 1;
  cls: string;
  faction: "alliance" | "horde";
  level: number;
  guild: string | null;
  /** 19 itemIds in WoW slot order, 0 = empty — gear's own shape. */
  gear: number[];
};

export class ArmoryError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/* ---- token ---- */

let token: { value: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.expires) return token.value;
  const id = process.env.BNET_CLIENT_ID;
  const secret = process.env.BNET_CLIENT_SECRET;
  if (!id || !secret) throw new ArmoryError("Battle.net credentials missing", 500);
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new ArmoryError("Battle.net auth failed", 502);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // renew a minute early
  token = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return token.value;
}

/* ---- lookups ---- */

/** "Old Blanchy" → "old-blanchy", the API's realm spelling. */
export function realmSlug(realm: string): string {
  return realm.trim().toLowerCase().replace(/'/g, "").replace(/\s+/g, "-");
}

async function get(region: BnetRegion, path: string): Promise<Response> {
  const t = await getToken();
  return fetch(`https://${region}.api.blizzard.com${path}`, {
    headers: {
      Authorization: `Bearer ${t}`,
      "Battlenet-Namespace": `profile-classic1x-${region}`,
    },
  });
}

/** Blizzard slot type → gear index (slot id − 1). */
const SLOT_INDEX: Record<string, number> = {
  HEAD: 0, NECK: 1, SHOULDER: 2, SHIRT: 3, CHEST: 4, WAIST: 5, LEGS: 6,
  FEET: 7, WRIST: 8, HANDS: 9, FINGER_1: 10, FINGER_2: 11, TRINKET_1: 12,
  TRINKET_2: 13, BACK: 14, MAIN_HAND: 15, OFF_HAND: 16, RANGED: 17, TABARD: 18,
};

/** ChrClasses id → ClassId. */
const CLASS_ID: Record<number, string> = {
  1: "warrior", 2: "paladin", 3: "hunter", 4: "rogue", 5: "priest",
  7: "shaman", 8: "mage", 9: "warlock", 11: "druid",
};

export async function fetchArmoryCharacter(
  region: BnetRegion,
  realm: string,
  name: string,
): Promise<ArmoryCharacter> {
  const slug = realmSlug(realm);
  const charPath = `/profile/wow/character/${slug}/${encodeURIComponent(name.toLowerCase())}`;

  const [profileRes, equipRes] = await Promise.all([
    get(region, charPath),
    get(region, `${charPath}/equipment`),
  ]);

  if (profileRes.status === 404) throw new ArmoryError("Character not found", 404);
  if (!profileRes.ok) throw new ArmoryError("Armory unavailable", 502);

  const profile = await profileRes.json();
  const cls = CLASS_ID[profile.character_class?.id as number];
  if (!cls) throw new ArmoryError("Unsupported class", 502);

  const gear = new Array<number>(19).fill(0);
  if (equipRes.ok) {
    const equipment = await equipRes.json();
    for (const it of equipment.equipped_items ?? []) {
      const i = SLOT_INDEX[it.slot?.type as string];
      if (i !== undefined && it.item?.id) gear[i] = it.item.id;
    }
  }

  return {
    name: profile.name,
    // without a locale param the API answers every locale at once
    realm:
      typeof profile.realm?.name === "string"
        ? profile.realm.name
        : (profile.realm?.name?.en_US ?? realm),
    realmSlug: slug,
    region,
    race: profile.race?.id ?? 1,
    sex: profile.gender?.type === "FEMALE" ? 1 : 0,
    cls,
    faction: profile.faction?.type === "HORDE" ? "horde" : "alliance",
    level: profile.level ?? 1,
    guild: profile.guild?.name ?? null,
    gear,
  };
}
