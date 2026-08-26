# Tari — status and handoff

Updated 2026-08-26 (evening).

**This doc holds the state. `docs/TARI.md` holds the argument — read its §0
before anything else.**

Both docs now live in this repo and **the repo copy is canonical.** They were
previously only inside a Claude project, which meant no local session could
see them. Earlier references to `FOXTON.md` mean `docs/TARI.md`.

---

## 0. Latest — pins, the atom, 2026-08-26 (night)

**The atom is built** (docs/PINS.md — the shape; docs/TARI.md §2.2 — the
argument). A pin: one person, standing in one spot, saying one thing, and
it stays. Signed-in characters write; everyone reads; replies are one
level deep; all pins render with near-level ones louder (three rulings,
Kacey, 2026-08-26). The face is the hero's Seduced widget carried into
the room; the marker is the aggro `!`, drawn, in the pin pink.

- `db/schema.sql` — `pins` table, additive, tombstoned (`removed_at`),
  cascades off `users`. **Run it against Neon before this deploys.**
- `lib/pins.ts` / `lib/pins-db.ts` — the shape and the table read.
- `app/api/pins/route.ts` — GET public (stamps `mine`), POST 401 for
  strangers + rate-limited, DELETE tombstones your own. A landed pin is
  also published on `tari:<room>::pins` — the table is the history, the
  wire is the moment. No new env: the token capability (`tari:*`) and the
  occupancy roll-up (filters to `::$chat`) both already hold.
- `components/PinChip.tsx` — the face. `components/ZoneMap.tsx` — the
  layer, the thread rail, the composer ("Leave a pin" in the layer bar;
  press the plate to set the spot). Its authored POI layer renamed
  `poi`/`Poi` so "pin" means only the atom.
- `app/(app)/Live.tsx` — exposes the realtime handle; the map watches
  pins land on the one socket. ZoneMap is keyed by room in Dock now —
  it was keeping state across room changes.

Clicked through live 2026-08-26 (night, Kacey's dev server): leave,
hover, thread, reply, the landing echo. Three fixes from that pass: POI
and hunt-mark clicks now clear an open thread (the rail looked stuck —
"the map went non-interactive"); the rail at rest shows the room's pins
as a feed (`Feed` in ZoneMap) instead of the empty explainer (Kacey's
call); the `!` mark sits on a small dark-glass plate — the bare glyph
was invisible on light parchment. Then (same night, Kacey's ruling) the
pin's icon became **the game's treasure map** (`INV_Misc_Map_01` →
`public/pins/map-x.png`), worn everywhere the pin appears — mark, chip,
"Leave a pin" — familiarity of the game's own objects over drawn
vocabulary; PINS.md and DESIGN.md record the §7.1 amendment. Also:
`_to_delete/` is excluded in tsconfig now, and `/lab/map` passes the new
required `roomId`. Still wants a second account to see
`mine` stay private, and a second browser for the live landing.

---

## 0.1 Earlier that day — the live layer, 2026-08-26

**The room is live.** Ably, not Liveblocks: §8.1 of `docs/TARI.md` carries
the price that decided it (Liveblocks caps a room at 10 simultaneous
connections on every plan worth buying). `ABLY_API_KEY` is the one new
environment variable — it must be set in Vercel before this deploys, and
the key needs **`channel-metadata`** among its capabilities or the
next-door head counts silently return `{}`. Add it to `docs/CUTOVER.md`'s
checklist.

Built and clicked through in two live connections on Duskwood:

- `lib/ably.ts` — the wire names, the `Who` on presence, `CURSOR_CAP`.
- `app/api/ably/route.ts` — mints scoped tokens. Signed in, the clientId is
  the account handle and the browser gets no say; signed out it is the
  browser's own key, prefixed `g:`. The raw key never leaves the server.
- `app/api/ably/occupancy/route.ts` — the §4.1 roll-up, two steps: enumerate
  live channels, then ask each for its occupancy. **The `by=value` form of
  Ably's enumeration is not served on this plan** — it silently returns bare
  channel names, which is a `{}` and a lost afternoon. Cached 12s.
- `app/(app)/Live.tsx` — one connection for the life of the shell; the
  room's scope swapped by name inside it. Presence is entered here, not in
  the chat: you are in Duskwood the moment you arrive.
- `app/(app)/People.tsx` — names the room, **deduplicated by clientId** (a
  reader with two tabs is one person), plus counts beside next door.
- `r/[room]/Chat.tsx`, `Cursors.tsx`, `Moments.tsx` — bottom-left,
  everywhere, bottom-centre. `docs/DESIGN.md` "The live layer — settled".

**Two traps, both hit and both fixed, both worth remembering.** Ably refuses
past 50 messages a second on one channel, and the Spaces React hooks return
`.bind()`ed functions that are new on every render — an effect keyed on one
becomes a render→enter→message→render loop that blows that limit from a
single browser. And chat history overlaps the live listener, so lines are
merged and ordered by `serial` rather than appended.

**Not done:** typing indicators are built but were untestable from one
signed-in account (a reader's own typing is filtered out) — check them with
two real people. Pins are next.

---

## 1. What Tari is, in four lines

**Tari** (`tari.gg`) — formerly *whelp plz*. A companion for WoW Classic where
every zone, dungeon, raid and city is a **room** you can stand in with everyone
else who is there right now, cross-realm and cross-region.

- **The goal:** slow the player down.
- **The mechanism:** community. Slowing down is an outcome, not a feature — the
  only durable source of reasons to linger somewhere is other people.
- **The atom:** the pin. One person, one spot, one sentence, left for whoever
  arrives next at that level.

**The name:** Taretha Foxton — the human girl at Durnholde who secretly taught
Thrall to read and helped him escape, and died for it. Thrall called her Tari.
Canon lore *and* a common surname, so it is ownable. The mark is a fox.

---

## 2. The window — why this exists now

**The day fresh Classic+ realms open, every tool in the category is dead.**
No Wowhead data. RestedXP's waypoints are lies — their product *is* the path.
No Sixtyupgrades items, no Questie coordinates, no Icy Veins guides. For the
first time since 2004 nobody knows where anything is, and the only source of
knowledge is players discovering things in real time and telling each other.

> A window where the entire playerbase is **forced** to slow down. Not
> persuaded to. Forced to. Because there is no fast way through a world nobody
> has mapped.

It happens once and lasts weeks. **Ship before the fresh realms open.**

Two content halves, no gap: the **old world** comes from the CPLUS pipeline
plus Kacey's own in-game photography; **everything new** comes from the crowd,
live. No content build required for Classic+ — only the surface.

BlizzCon is 12–13 September 2026. Classic+ is rumour, heavily leaked. Fresh
realms follow an announcement by anywhere from four weeks (Season of Discovery)
to six months (Cataclysm Classic), so the date cannot be planned — but a fresh
realm is a *levelling season*, not a launch day.

---

## 3. Three repos

| repo | local path | state |
| --- | --- | --- |
| **`Daw99y/tari`** | `~/Documents/FLYFE/Tari` | **NEW. The active project.** |
| **`undiscovered`** | `~/Documents/FLYFE/undiscovered` | **OLD (whelp plz). STAYS LIVE. Do not touch.** |
| **`CPLUS`** | separate | The data pipeline. **Unchanged, not renamed, still in use** |

**Why whelp plz stays live:** Kacey's brother uses it and gives feedback — and
critically, **it keeps the event log writing** while Tari is built. When Tari
goes live it points at the same database and inherits every event generated in
the meantime.

**Do not maintain whelp plz.** If it breaks, it breaks.

### Hosting and data

| | whelp plz | Tari |
| --- | --- | --- |
| domain | whelpplz.com | tari.gg (to buy) |
| Vercel | existing project, untouched | **`tari`** — exists, deploys `main` from GitHub, `tari-chi.vercel.app` |
| Neon | `main` — keeps running, keeps writing events | `tari-dev` branch (copy-on-write) |
| Discord OAuth | existing app | **new** application, own client id/secret |

Discord user ids are stable across applications, so accounts still match on
`provider_id`. **Additive schema changes only; do not rename tables** — at
cutover Tari points at `main` and inherits everything.

---

## 4. What happened on 2026-08-23

The rebrand was decided and the repo split executed.

History was deliberately **not** imported: the old repo stays alive so nothing
is lost, and its history carries heavy `.mov`/`.glb` blobs that would bloat the
new clone forever.

**Genesis commit — 20 files, 2,317 lines:**

```
.gitignore  package.json  tsconfig.json  next.config.mjs  postcss.config.mjs
db/schema.sql
lib/  auth.ts  db.ts  sync.ts  import.ts  types.ts  utils.ts
      class-color.ts  faction.ts  feedback.ts  zip.ts
app/api/  auth/[...nextauth]  record  account  feedback
```

`lib/import.ts` is the **WP2 addon-export parser** — the most valuable file in
the repo.

**Deliberately left behind:**

- **`app/globals.css` — 385 KB.** Not a stylesheet, an archaeological site, and
  the clearest evidence of why `design.md` feels broken. Start empty.
- **The domain layer** — `plan.ts` (56 KB), `zones.ts` (50 KB), `journey.ts`
  (40 KB), `training.ts`, `item.ts`, `zone-prose.ts`. ~250 KB encoding the *old
  product's shape*. It is the moat and it returns later; bringing it in on day
  one re-anchors the rebuild to the app being replaced.
- Every page and component. All rebuilt.

**`npm run dev` failed at the time** — no `app/page.tsx`, `layout.tsx` or
`globals.css`, which was correct: the landing page was to be built on an empty
canvas. All three exist now, along with the hero, `/lab` and `/lab/doll`.

**Escape hatch** if something is needed from the old project later:

```bash
git remote add old git@github.com:Daw99y/undiscovered.git
git fetch old
git checkout old/main -- path/to/file   # one file, no history entanglement
```

---

## 5. The doll, and where the deploy got to

`/lab/doll` builds any of the sixteen playable bodies and puts any of **9,723**
items on them. `docs/DOLL.md` holds the whole of it; this is only the state.

**Three commits sit on `main`, local and unpushed as of 2026-08-25:**

```
a683831  feat(doll): serve the wardrobe from a Blob store so it survives a deploy
5c00583  fix(doll): read the patched item table, not the one the client shipped with
0deaf4e  Merge feat/doll-wardrobe  (this one IS pushed)
```

**The bodies are stripped, as of 2026-08-25.** A character `.m2` carries 126
to 143 animations and the page plays two, Stand and Stun. `npm run doll:strip`
writes `public/lab/doll/body/*.tbody` — 46.7 MB down to 3.4 MB, and 2.0 MB
down to 127 KB gzipped on the human female the landing page draws.
`doll-strip-check.mjs` poses every bone of every body against the original and
the difference is zero. `docs/DOLL.md` §"The animations nothing plays" has it.
The unstripped `.m2` is now gitignored; run `git rm -r --cached
public/lab/doll/m2` once to untrack the 47 MB already committed.

**Three build steps, none in git.** `node scripts/doll-build.mjs` writes the
bodies, `npm run doll:strip` cuts them down, `node scripts/doll-items.mjs`
writes the wardrobe. Both need the 1.12
client at `~/Downloads/WoW Classic`. The wardrobe is 12,460 files and 103 MB
under `public/lab/doll/items/`, which `.gitignore` covers.

**It cannot go in *this* repo.** Vercel fails a build above 15,000 source files
and the repo plus the art comes to 16,712. That is a wall, not a preference.
So the art is served from elsewhere and `NEXT_PUBLIC_WARDROBE_URL` points at
it; unset, the page falls back to the local build.

Two scripts fill that variable. `scripts/doll-publish.mjs` pushes the art to a
second repo for GitHub Pages, which is free and is the route taken on
2026-08-25. `scripts/doll-upload.mjs` puts it in a Vercel Blob store, which
needs a paid plan and is written but still untested. The page cannot tell the
difference, so switching later is one variable and a redeploy.

**The wardrobe is live.** `https://daw99y.github.io/tari-wardrobe` serves
12,459 files and 106 MB, against the 1 GB Pages allows. Checked on 2026-08-25
against real files rather than the root: `.webp` comes back as `image/webp`,
`.m2` as `application/octet-stream`, and all of it with
`access-control-allow-origin: *`. Nothing is set on Vercel yet, so the deployed
page has not seen any of it.

### What is blocking it

1. ~~**No Vercel project for Tari exists.**~~ **Created 2026-08-25.** Project
   `tari` (`prj_ouY6au8NM83RdJaJMeeI5Loa371z`), linked to `Daw99y/tari`,
   production deploys on every push to `main`. Five deploys so far, all READY.
   `/lab/doll` renders in production **with the wardrobe** —
   `NEXT_PUBLIC_WARDROBE_URL` is set and the deployed doll dresses.
2. ~~**The account is on Hobby**, so Blob is not usable.~~ **Settled 2026-08-25
   by not using Blob.** The wardrobe goes to GitHub Pages instead, which is
   free, needs no card, and costs one more repo rather than one more account.
   Blob would have been 12,460 advanced operations against an unpublished
   Hobby ceiling, and exceeding it **pauses the store for 30 days** rather than
   billing. Vercel's fair-use terms also restrict Hobby to non-commercial use,
   which Tari is not (§6 pricing tiers). Both problems belong to a store Tari
   no longer needs. Cloudflare R2 stays the upgrade if Pages disappoints:
   unmetered egress and a year of cache instead of ten minutes.
3. ~~**CORS is unverified.**~~ **Checked 2026-08-25.** GitHub Pages answers
   with `access-control-allow-origin: *`, which is the header the composed body
   texture needs: every overlay is drawn into that canvas, and cross-origin art
   without it taints the canvas, WebGL refuses the upload, and the armour
   vanishes with no error worth reading. Pages also sends `cache-control:
   max-age=600`, so art older than ten minutes costs a revalidating round trip
   per file rather than a download. Both headers were read off a live Pages
   response, not off the documentation. Still unproven **on Tari's own art**
   until the first deploy.

### How the neighbours do it

Checked on 2026-08-25: sixtyupgrades.com serves its own art from an S3 bucket
behind `cdn.sixtyupgrades.com` (`REACT_APP_S3_ASSETS_URL`, us-west-2, Cognito).
Not Wowhead's CDN. Object storage plus a CDN, art out of the app repo, is the
normal shape in this niche — the plan above is that shape.

---

## 6. Open and blocking

**Plumbing is now Tari's own** (own Discord app, `tari-dev` Neon branch,
Vercel env) — `docs/CUTOVER.md`. Domain purchase and the production
database switch are postponed on purpose until there is something to launch.

1. ~~**SPA or App Router**~~ **Decided 2026-08-25: App Router, no SPA.**
   The shell is a layout, the room is a page; layouts persist across
   navigation, which is the behaviour §11.1 wanted. `docs/SHELL.md` has the
   structure file by file. Room build is unblocked on this axis.
2. ~~**The contrast system.**~~ **Decided 2026-08-25, from measurement.**
   All 77 backgrounds rendered as the CSS renders them: the title is ≥10:1
   everywhere with the existing scrim; the open canvas is not, so text above
   the scrim goes on a card or chip at `rgba(6,6,10,.86)` + blur. Dark ink on
   the art never passes. `docs/CONTRAST.md`; rerun `scripts/contrast.py`.
3. **The fox mark**, and the redrawn SVG icon vocabulary (`TARI.md` §7).
4. Pricing tiers, moderation policy, landing hero copy.
5. **Buy `tari.gg`** ($129.99/yr via Vercel, checked 2026-08-25 — `.com`/`.io`/
   `.app` all taken) and `taretha.com` ($11.25) as a lore redirect. Both
   available.
6. ~~**Tag `v1-whelpplz`** on the old repo.~~ Done — the tag exists.
7. **§7.1 and the doll.** A character viewer puts far more of Blizzard's art on
   screen than a spell plate does. Deploying it publicly is the deliberate
   decision `TARI.md` §7.1 asks for, and it has not been taken — only deferred
   by the fact that nothing is deployed. Hobby offers Vercel Authentication as
   the only protection; password protection is a Pro add-on.

---

## 7. Environment notes

- **Cowork folder grants are per-session.** A folder connected in one chat is
  not connected in another. As of 2026-08-23 the granted set includes
  `~/Documents/FLYFE/Tari`, `~/Documents/FLYFE/undiscovered`, and the `FLYFE`
  parent — but confirm per session rather than assuming.
- **`~/Documents/FLYFE` must never be a git repo.** A stray `git init` landed
  there once and was removed. If a `.git` appears in the parent, delete it.
- Cloud sessions = cross-repo context, specs, mockups, review.
  Local Claude Code = implementation + verify. ONE local session per repo.
- **Do not run git writes over the Cowork bridge** — it cannot unlink, so
  commits leave lock files behind. Read `.git/HEAD` and `.git/refs/` directly.
- Verification from the cloud: tar the source, stage into the container,
  `npm install` there, run tsc / `next dev` / Playwright. `next build` cannot
  finish — `next/font` fetches Inter and the network does not reach it.
- A real Postgres runs in the cloud container (port 5433). A signed-in session
  can be faked with `next-auth/jwt` `encode` and the dev `AUTH_SECRET`.

---

## 8. Other docs

Still in the Claude project, not yet in the repo — worth pulling across if they
become load-bearing:

| doc | what it is |
| --- | --- |
| `PACE.md` | why it exists. Amended 2026-08-22 with the window |
| `PHASE-MAP-1.md` | the plate contract, coordinates, Layer A/B. Still live |
| `SECOND-SCREEN.md` | the wake, "the game is the chat" — arguments, not conclusions |
| `COMMUNITY-turn.md` | the accounts turn — arguments, not conclusions |
| `RANKING.md` | in the old repo. What the ranking believes. Untouched |

---

## 9. Note for whoever picks this up

Kacey went through a long, circular design process and got genuinely low
partway. The direction is now settled and written down — **do not reopen it.**
Hold the thesis steady, push back honestly when something drifts from it, and
keep the next action small and concrete.

Watch for the pattern of switching projects when a hard question lands (OSRS,
addon-only, and a full rebrand all surfaced in one evening). Naming it kindly
once is helpful; nagging is not.
