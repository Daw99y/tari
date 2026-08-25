# The character — the creator, the addon, the account

Decided 2026-08-25. What a reader *is* inside Tari, how they get one, and
what the game tells us about it.

## The three sentences

**You are your character.** Not a profile, not a handle: a body from the
1.12 client, wearing what you wear, standing where you stand. The doll
(`docs/DOLL.md`) is the skin; this doc is what fills it.

**Two doors, one body.** *Import* — paste the addon's string and the game
fills in class, level, name, realm, gear, quests. *Create* — pick it all by
hand for a close-enough body. Either way you end up in the creator, because
the game cannot tell us what you look like (Classic Era has no API for skin,
face or hair) and the creator is where that gets chosen.

**Signed in is the line.** Anyone can make a body and stand in a room.
Only a Discord account can leave a pin, reply, wave, or be counted by name.
A created-only body is a costume; an imported body on an account is a
character. The rule is enforced in one place — the API routes — never in the
UI's imagination.

## The flow

```
first visit, or first sign-in with no character
   └─ /you/new            the creator (once; the doorstep TARI.md §9.1 allowed)
        ├─ Import          paste → parse → prefilled creator → Accept
        └─ Create          pick race · sex · class · look · name → Accept
                            ↓
                          /r/<start zone of the race>       every visit after: straight to the room
```

The creator is shown once. Skippable: "Later" gives a default body (human
or orc, warrior) and the rail. Reopened from `/you` any time.

## The creator

Modelled on the game's own creation screen, in Tari's register.

| game | Tari |
| --- | --- |
| Alliance blue / Horde red banners, race portraits | two columns of race chips (CONTRAST surface C), faction as the heading, in the game's order |
| male / female | two chips |
| class icons | class chips; a class the race cannot be is not shown |
| the doll on the starting zone | the doll (WebGL, `app/lab/doll`) full-bleed on `roomArt(startZone(race))` — the room's own scrim under it |
| race and class blurbs on the right | one placard (the guide's) — the race's two sentences, then the class's; the same voice as a room card |
| skin / face / hair / colour / facial sliders | five stepped rows, `‹ ›`, under the chips; labels from `ROW_LABELS` |
| Name, Randomize, Accept | name field (mono, one word, the game's rules: 2–12 letters, no spaces); *Roll* and *Accept*; Accept is the room's button on the art |

Four places, like the room: chips left, doll centre, placard right, name and
buttons bottom-centre. Nothing else. Changing race cross-fades the backdrop.

Import is a text field above the race chips: paste, and everything the
string knows is set and greyed (class, level, name, realm, gear on the
doll); race and sex too (`A:`/`X:`), which whelp plz never had. The reader
then picks the look and accepts.

## The data

`characters.profile` (jsonb, already in `db/schema.sql`) gains a `look`, and
the shape is one TypeScript type in `lib/character.ts`:

```ts
type Character = {
  key: string;            // "<realm>/<name>" for imported, "local/<uuid>" for created
  name: string;
  realm: string | null;   // null = created, not imported
  race: number;           // ChrRaces id, 1–8
  sex: 0 | 1;             // the doll's gender index
  cls: ClassId;
  faction: "alliance" | "horde";   // derived from race, stored anyway
  level: number;
  look: { skin: number; face: number; hair: number; hairColor: number; beard: number };
  gear: number[];         // 19 slots, 0 = empty; from G:
  importedAt: string | null;
};
```

Signed out: one character in `localStorage` under `tari:character`.
Signed in: the same object in `characters`, synced by the existing
`/api/record` push/pull; the localStorage copy is pushed on first sign-in
and then mirrors the account. No new table.

The current character is the one the room reads: `?class` and `?at` stop
being typed and start being it. The URL still wins when present, so a
shared link shows what the sharer saw.

## The addon

`addon/Tari/`. Interface 11507 (Classic Era). `/tari` opens the export
window. The string is WP2's, under a new prefix, with five fields added and
nothing that was there changed:

```
TA1;CLASS;Faction;level;G:…;Q:…;S:…;P:…;N:…;E:…;B:…;T:…;R:…;H:…;Z:…;A:Gnome;X:2;U:guild;W:seconds;J:…;M:copper
```

| key | new | what |
| --- | --- | --- |
| `A:` | ✓ | race token (`UnitRace`), e.g. `Gnome`, `Scourge` |
| `X:` | ✓ | sex (`UnitSex`): 2 male, 3 female |
| `U:` | ✓ | guild name |
| `W:` | ✓ | time played, seconds (`RequestTimePlayed`, cached) |
| `J:` | ✓ | **the journal** — see below |

`lib/import.ts` reads the tail by key, so the parser needs `TA1` added to
`KNOWN_VERSIONS` and five readers; WP2/WP1/SW1 strings keep parsing.

### The journal

The addon writes one line each time the character levels, enters a zone,
dies, or turns in a quest — with a timestamp — into per-character saved
variables, capped at the last 500 lines. It ships in `J:` as
`kind|zone|level|time` entries, dot-separated; time is unix seconds in
base36, zone is the zone name with `.|;:` stripped.

```
J:z|Duskwood|24|sx8k2q.q|Duskwood|24|sx8k9v.l|Duskwood|25|sx8mb0.d|Raven Hill Cemetery|25|sx8n11
```

Four kinds: `l` levelled, `z` entered, `d` died, `q` quest turned in. Import
writes these to `events` with `place` = the zone's room id, so the past
layer, "who came through at 24" and "137 stood here today" all fill from
the addon, before the Tauri client exists. A journal is only written to the
log when the account imports it; a costume has no past.

What the addon still cannot say: your look, and where on the map you stood.
The first is the creator's job. The second waits on the client (§9), or on
a later addon version reading `C_Map.GetPlayerMapPosition` — deliberately
not in TA1, because a position log is a route in disguise until pins exist
to hang it on.

## What this closes, and what it does not

Closes: the account/character question (`CARRYOVER.md`), how `/you` knows
who it is talking to, and the doorstep (TARI.md §9.1: this is it).

Does not close: pricing, moderation, or whether a created-only body can be
*seen* by others in a room. It cannot post; whether it appears in the
people column is a Liveblocks-day decision.
