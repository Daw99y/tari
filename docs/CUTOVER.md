# Cutover — giving Tari its own plumbing

Written 2026-08-25. Tick things off here; `docs/STATUS.md` §6 points at this.

Tari's code is new, but it still signs people in through **whelp plz's Discord
application** and reads **whelp plz's live database**. Fine on a laptop. Not
fine in public. These are the steps that fix it, in the order to do them, with
what each one is *for* — because "cutover" on its own means nothing.

Nothing here touches whelp plz. It keeps running and keeps writing events.

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
6. Redeploy. Sign in on the deployed site once.

Feedback webhook (`DISCORD_FEEDBACK_WEBHOOK`) can stay pointed at the same
forum channel for now; it is a channel, not an identity.

- [x] done — 2026-08-25

## 3. Neon — a database branch to build on

**Why:** whelp plz writes real events into `main` every day and the schema
rule is *additive only, never rename*. A branch is a copy-on-write clone: free
to break, and at launch Tari points back at `main` and inherits everything
written in between.

1. console.neon.tech → the project → *Branches* → **Create branch**.
   Name `tari-dev`, parent `main`, include data.
2. Copy its **pooled** connection string (the host with `-pooler` in it —
   `lib/db.ts` insists on it).
3. `.env.local`: replace `DATABASE_URL`. The other `PG*`/`POSTGRES_*` lines
   are Vercel-template leftovers; nothing in the repo reads them. Delete or
   leave.
4. Vercel → tari → Environment Variables: `DATABASE_URL` = the `tari-dev`
   pooled string, for **Preview and Development only**. Leave Production
   empty for now — the site has no data surface yet, and an empty
   `DATABASE_URL` makes `lib/db.ts` report "no database" rather than crash.

**At launch:** Production `DATABASE_URL` = `main`'s pooled string. That is the
whole cutover of the data.

- [x] done — 2026-08-25. Production still has no `DATABASE_URL`; whelp plz
  keeps `main`. Postponed until launch, deliberately.

## 3.5 Ably — the live layer's key

One variable, `ABLY_API_KEY`, and it is the whole of the plumbing: the raw
key stays on the server and `/api/ably` mints per-browser tokens from it,
scoped to `tari:*` with a narrow op list. A deploy without it is not a
broken deploy — the connection fails, `useLive().up` goes false and every
surface reads as it did before the live layer existed.

1. Ably dashboard → the Tari app → **API Keys**.
2. The key needs `publish`, `subscribe`, `presence`, `history`, the two
   `annotation-*` ops, `message-update-own`, `message-delete-own` — and
   **`channel-metadata`**, which is the one that is easy to miss. Without it
   `/api/ably/occupancy` cannot enumerate channels, the next-door head
   counts silently stay at zero, and nothing logs an error in production.
   Resource `tari:*` is enough for all of it.
3. `.env.local`: `ABLY_API_KEY=appId.keyId:secret`.
4. Vercel → tari → Environment Variables: the same, all three environments.

**Rename the Ably app to Tari** if it was created as anything else — it is
cosmetic, but it is the name on every dashboard and log line from here on.

- [ ] not done — dev only as of 2026-08-26.

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

- [ ] bought — postponed, deliberately (2026-08-25)
- [ ] attached

## 5. Housekeeping

- [x] `v1-whelpplz` tag on the old repo — exists.
- [ ] `git remote -v` in `undiscovered` still says `whelpplz`? Fine. Do not
  rename; Vercel's `whelpplz` project is linked to it.
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
