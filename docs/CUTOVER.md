# Cutover — giving Tari its own plumbing

Written 2026-08-25. Tick things off here; `docs/STATUS.md` §6 points at this.

Tari's code is new, but it still signs people in through **whelp plz's Discord
application** and reads **whelp plz's live database**. Fine on a laptop. Not
fine in public. These are the steps that fix it, in the order to do them, with
what each one is *for* — because "cutover" on its own means nothing.

Nothing here touches whelp plz. It keeps running and keeps writing events
until it retires, which happens when Tari launches or before.

---

## 1. Vercel — tell the deployed site where the armour is

**Why:** `/lab/doll` and the hero read `NEXT_PUBLIC_WARDROBE_URL`. Unset, they
look for 12,459 files under `public/lab/doll/items/`, which `.gitignore` keeps
out of the repo, so the deployed character has nothing to wear.

1. vercel.com → project **tari** → *Settings* → *Environment Variables*
2. Add, for **Production, Preview and Development**:

   ```
   NEXT_PUBLIC_WARDROBE_URL = https://daw99y.github.io/tari-wardrobe
   ```

   No trailing slash. `lib/wardrobe.ts` strips one anyway.
3. *Deployments* → latest → ⋯ → **Redeploy**. `NEXT_PUBLIC_*` is baked in at
   build time; changing it without a rebuild does nothing.
4. Open `tari-chi.vercel.app/lab/doll`, equip anything. If it shows up, done.
   If the model goes blank with no error, it is the CORS canvas taint —
   confirm the Pages response still sends `access-control-allow-origin: *`.

- [x] done — 2026-08-25, verified on `tari-chi.vercel.app/lab/doll`

## 2. Discord — a login app that says Tari

**Why:** the "Sign in with Discord" consent screen shows the application's
name and icon. Today that is whelp plz. Discord user ids are the same across
applications, so existing accounts still match on `provider_id` — nobody
loses anything.

1. discord.com/developers/applications → **New Application** → name it
   `Tari`. Add the fox mark as the icon when it exists.
2. *OAuth2* → copy **Client ID**, then **Reset Secret** and copy the secret.
   You only see it once.
3. *OAuth2* → **Redirects** → add all three:

   ```
   http://localhost:3000/api/auth/callback/discord
   https://tari-chi.vercel.app/api/auth/callback/discord
   https://tari.gg/api/auth/callback/discord
   ```

4. `.env.local`: replace `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`.
5. Vercel → tari → Environment Variables: add the same two, plus a fresh
   `AUTH_SECRET` (`openssl rand -base64 32`). **Do not reuse whelp plz's
   `AUTH_SECRET`** — separate signing keys mean a Tari session cookie is not
   a whelp plz one.
6. Redeploy. Sign in on localhost once and check the consent screen says
   Tari.

The deployed site cannot take a sign-in yet, and that is step 3's fault rather
than this one's. `hasAuth()` in `lib/auth.ts` also requires `DATABASE_URL`, and
step 3.4 leaves Production's empty on purpose, so `/api/auth/*` answers 404 on
`tari-chi.vercel.app` until the branch exists. The route means it: see the note
at the top of `app/api/auth/[...nextauth]/route.ts`.

Feedback webhook (`DISCORD_FEEDBACK_WEBHOOK`) can stay pointed at the same
forum channel for now; it is a channel, not an identity.

- [x] done — 2026-08-25. Local handshake checked: the authorize URL carries
  client id `…451986` and `scope=identify`. Vercel holds the same two values
  plus its own `AUTH_SECRET`.

## 3. Neon — Tari's own database

**Why:** whelp plz writes real events into its database every day, and the
schema rule is *additive only, never rename*. Tari needs somewhere it can break
things. `app/api/account/route.ts` runs `delete from users`; testing that once
against live data removes a real person.

**The branch plan died on 2026-08-25.** whelp plz's database lives in a
Vercel-managed Neon org, and the only door into it is *Open in Neon* on the
Vercel integration page. That flow asks for an email verification that never
arrives. No console, no branch.

**What replaced it:** Tari has a Neon project of its own, in KC's personal Neon
org rather than the Vercel-managed one.

| | |
| --- | --- |
| org | Kevin (Free) |
| project | Tari |
| region | AWS `us-east-1`, matching whelp plz |
| Postgres | 18 |
| default branch | `production` (Neon's own name, not `main`) |
| database | `neondb` |
| endpoint | `ep-weathered-king-avqln87b-pooler.c-11.us-east-1.aws.neon.tech` |

Done on 2026-08-25:

- `.env.local` `DATABASE_URL` points at that pooled endpoint.
- `db/schema.sql` ran against it. Five tables exist and hold nothing:
  `characters`, `events`, `marks`, `users`, `waves`.
- Local `/api/auth/providers` answers 200, so `hasAuth()` can see a database.

On Vercel, project **tari** → Environment Variables, `DATABASE_URL` = that
pooled string, ticked for **Preview** and **Development**. Done 2026-08-25.

**This project holds the real data.** whelp plz retires when Tari launches or
before, so there is no second writer to share a database with and nothing to
switch over to on launch day. Production points here as well, and whelp plz's
`events` rows get copied across once, before the old site goes dark. Reading
whelp plz's connection string needs no Neon console when that day comes: it sits
in the **whelpplz** Vercel project's own Environment Variables.

That leaves one thing to split later. Production and development share the
`production` branch today, which costs nothing while every table is empty. Make
a `dev` branch off it before the event log lands, then point `.env.local` and
Vercel's Preview and Development at the branch instead. Branching works in this
project, unlike whelp plz's: KC owns it and the console opens.

Leftovers: `DATABASE_URL_UNPOOLED`, `PGHOST`, `POSTGRES_URL` and the rest of
that block in `.env.local` still carry whelp plz's live credentials. Nothing in
the repo reads any of them. Delete the block next time you open the file.

- [x] Tari's Neon project made, schema applied, `.env.local` pointed at it
- [x] Vercel `tari`: `DATABASE_URL` on Preview and Development
- [x] Vercel `tari`: `DATABASE_URL` on Production too
- [ ] a `dev` branch, before the event log lands
- [ ] copy whelp plz's `events` across, before whelp plz goes dark

## 4. Domain — tari.gg

Both available on 2026-08-25, via Vercel's registrar:

| domain | price | job |
| --- | --- | --- |
| `tari.gg` | $129.99 / yr | the site |
| `taretha.com` | $11.25 / yr | lore redirect → tari.gg |

vercel.com → tari → *Settings* → *Domains* → **Buy**. Vercel wires DNS
itself. Then add the `tari.gg` redirect URL to the Discord app (step 2.3 —
already listed). For `taretha.com`, add it to the same project and set it to
**redirect to tari.gg (308)**.

Not urgent until there is a landing page worth sending anyone to. Buy it
before someone else does; wire it when the page exists.

Deferred on 2026-08-25. KC is not buying yet.

- [ ] bought
- [ ] attached

## 5. Housekeeping

- [x] `v1-whelpplz` tag on the old repo — exists.
- [ ] `git remote -v` in `undiscovered` still says `whelpplz`? Fine. Do not
  rename; Vercel's `whelpplz` project is linked to it.
- [ ] whelp plz's Neon console is shut: *Open in Neon* asks for an email
  verification that never arrives. Nothing needs it today, and the launch
  connection string can be read off the whelpplz Vercel project instead. Chase
  Neon support before something real depends on it.
- [ ] Decide `docs/TARI.md` §7.1 for the doll: it is public on
  `tari-chi.vercel.app/lab/doll` right now, `noindex` but reachable. Either
  accept that, or turn on **Vercel Authentication** (Settings → Deployment
  Protection, free on Hobby) until the answer is settled.

---

## After this

The plumbing is Tari's own, and the build order in `docs/TARI.md` §14 picks
up at **step 2 — the event log** and **step 3 — the landing page**. The two
questions that block the room (`STATUS.md` §6.1–2: SPA vs App Router, the
contrast system) are design decisions, not setup, and get their own session.
