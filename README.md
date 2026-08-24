# Tari

`tari.gg` — a companion for WoW Classic where every zone, dungeon, raid and
city is a **room** you can stand in with everyone else who is there right now,
cross-realm and cross-region.

The goal is to slow the player down. The mechanism is community. The atom is
the pin: one person, one spot, one sentence, left for whoever arrives next at
that level.

Named for Taretha Foxton, the human girl at Durnholde who taught Thrall to
read. Thrall called her Tari.

**Read `docs/TARI.md` §0 before anything else.** It holds the argument.
`docs/STATUS.md` holds the state. Both are canonical in this repo.

---

## Run it

```bash
npm install
npm run dev
```

`.env.local` supplies five variables. The names live in `docs/STATUS.md` §3;
the values do not live in git.

| variable | what it is |
| --- | --- |
| `DATABASE_URL` | Neon Postgres |
| `AUTH_DISCORD_ID` | Discord OAuth client id |
| `AUTH_DISCORD_SECRET` | Discord OAuth client secret |
| `AUTH_SECRET` | NextAuth signing key |
| `DISCORD_FEEDBACK_WEBHOOK` | where `/api/feedback` posts |

The pair in `.env.local` today still points at the **whelp plz** Discord
application and the `main` database branch. Swap both before Tari goes
anywhere public.

```bash
npm run typecheck   # tsc --noEmit
```

## What is here

```
app/api/  auth  record  account  feedback     the four routes that survived
app/lab/  the specimen drawer: real 1.12 spell visuals, read in the browser
db/       schema.sql
lib/      auth  db  sync  import  types  utils  m2
          class-color  faction  feedback  zip
docs/     TARI.md  STATUS.md  LAB.md
public/lab/m2/   the .m2 files /lab reads. Blizzard's; reference only
```

`lib/import.ts` parses the WP2 addon export. It is the most valuable file in
the repo.

`app/page.tsx` is the landing hero: full-bleed room, the Seduction visual played live from its `.m2`.

## What is deliberately absent

The domain layer from whelp plz (`plan.ts`, `zones.ts`, `journey.ts`,
`training.ts`, `item.ts`, `zone-prose.ts`) stayed behind. It runs to about
250 KB and encodes the shape of the product Tari replaces. Bringing it in on
day one would anchor the rebuild to the old app. It returns later.

So did the old `globals.css`. It had reached 385 KB.

To pull one file across without dragging the history:

```bash
git remote add old git@github.com:Daw99y/undiscovered.git
git fetch old
git checkout old/main -- path/to/file
```

## The other repos

| repo | state |
| --- | --- |
| `undiscovered` | whelp plz. **Stays live. Do not maintain it.** It keeps the event log writing until Tari takes over. If it breaks, it breaks. |
| `CPLUS` | the data pipeline. Unchanged, not renamed, still in use. |

Additive schema changes only. Do not rename tables. At cutover Tari points at
the same database and inherits every event whelp plz wrote in the meantime.

## Open

1. SPA or App Router (`docs/TARI.md` §11.1). Blocks the room.
2. The contrast system: legible text over ~90 full-bleed backgrounds. Blocks
   the landing page.
3. The fox mark and the redrawn icon vocabulary (§7).
4. Pricing, moderation policy, landing hero copy.
