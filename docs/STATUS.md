# Tari — status and handoff

Updated 2026-08-23.

**This doc holds the state. `docs/TARI.md` holds the argument — read its §0
before anything else.**

Both docs now live in this repo and **the repo copy is canonical.** They were
previously only inside a Claude project, which meant no local session could
see them. Earlier references to `FOXTON.md` mean `docs/TARI.md`.

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
| Vercel | existing project, untouched | new project, to create |
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

**`npm run dev` will fail** — there is no `app/page.tsx`, `layout.tsx` or
`globals.css`. That is correct. The landing page is built on an empty canvas.

**Escape hatch** if something is needed from the old project later:

```bash
git remote add old git@github.com:Daw99y/undiscovered.git
git fetch old
git checkout old/main -- path/to/file   # one file, no history entanglement
```

---

## 5. Next actions

1. **Buy `tari.gg`** (~$130/yr — `.com`/`.io`/`.app` all taken) and
   `taretha.com` ($11.25) as a lore redirect.
2. **`du -sh` the art folders** in `undiscovered`: `relit-images`,
   `ReLit-WoW-Zone-images`, `art-sources`. **This number decides whether the
   art goes in git or in blob storage (Vercel Blob / R2).** Over a couple of
   hundred MB, it must not go in git.
3. **Tag `v1-whelpplz`** on the old repo if not already done.
4. **The landing page** — the next real work. See `TARI.md` §14 step 3.

---

## 6. Open and blocking

1. **SPA or App Router** (`TARI.md` §11.1). One persistent shell, not pages —
   this fights App Router's grain. Blocks the room build.
2. **The contrast system.** Legible text across ~90 full-bleed backgrounds.
   Blocks the landing page, highest-risk design unknown.
3. **The fox mark**, and the redrawn SVG icon vocabulary (`TARI.md` §7).
4. Pricing tiers, moderation policy, landing hero copy.

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
