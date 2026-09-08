# Tomorrow — 2026-09-09

Three sessions, in order. Each prompt is self-contained. Start a fresh chat for
each one; do not carry the previous session's context.

`docs/DIRECTION.md` is canonical for direction as of 2026-09-08. `docs/STATUS.md`
is stale (31 Aug) and describes a product that no longer exists.

---

## Session 1 — the spike (morning, ~2h) — DONE 2026-09-09

**Result: no.** Zone is derivable exactly by name, but nothing flushes to disk
until logout. `docs/LIVE-CLIENT.md` has the raw lines; `DIRECTION.md` §4 is the
settled ruling. The client's job is journal, not mirror. Do not reopen this.

<details>
<summary>the prompt as it ran</summary>

Kacey plays, Claude writes the tailer and reads the output.

```
Read docs/DIRECTION.md §4 first, then docs/STATUS.md §0. STATUS.md is stale as
of 31 August and DIRECTION.md supersedes it wherever they disagree.

The job is one spike and nothing else. STATUS.md ruled on 31 August that
"nothing in this product knows where a reader is standing or whether they are
playing." That is true of SavedVariables, which flush only on logout or
/reload. I want to know whether it is false of WoWCombatLog.txt, which the
client writes continuously while you play and which Warcraft Logs' own desktop
companion tails live.

I will be in-game. Write me a small tailer (node or python, whatever is
cheapest) that watches my WoWCombatLog.txt and prints new lines with
timestamps. I will then walk across three zone borders, kill something in each,
die once, and level once. You read what comes out.

Answer three questions in writing, and do not answer them from training data,
answer them from what my log actually emitted:

1. Is my current zone derivable? Directly from a line, or inferred from mob
   names, or not at all?
2. What is the write latency between something happening and the line landing?
3. Does it keep writing with the game windowed and unfocused?

Write the answers to docs/LIVE-CLIENT.md, including the raw sample lines that
prove each one. If zone is derivable, say so plainly and say what the client
would have to do. Do not design the client, do not start building it, and do
not touch anything else in the repo.

Rules: run no git command at all, status included, it leaves .git/index.lock
behind and my next commit fails. Do not touch app/lab/succubus/, app/(site)/,
next.config.mjs or components/. npx tsc --noEmit is the cheap check; next build
fails at its last step over the bridge.
```

---

</details>

---

## Session 2 — the docs rewrite (midday, ~2h) — DONE 2026-09-09

All five landed: `TARI.md` §2 rewritten and §13 deleted, `WELCOME.md` refusals
struck and §8.1 overturned, `STATUS.md` §0 added, `START-HERE` rule 7 deleted
and its rules replaced with `DIRECTION.md` §2, `REFUSALS` emptied.
One to-do fell out: `db/schema.sql`'s comment on the missing
`follows.followed` index still reads as a refusal. It is a to-do now.

<details>
<summary>the prompt as it ran</summary>

```
Read docs/DIRECTION.md in full. It was written 2026-09-08 and it supersedes
docs/TARI.md §2 and §13 and every refusal in docs/WELCOME.md. The job today is
to make the rest of the repo agree with it. No new features, no new surfaces.

Do these, in this order, and show me each diff before writing:

1. docs/TARI.md — §0 stays exactly as it is, it is promoted not replaced.
   Rewrite §2 ("the goal, the mechanism, the atom") to DIRECTION.md §1's three
   beats. Delete §13 entirely. Anywhere else in the file that asserts a
   refusal, strike it and note the strike.
2. docs/WELCOME.md — strike §0, §3.1, §3.2, §4.1, §5.2, §7 and §8, keeping the
   features those sections describe and deleting only the law. §8.1's
   places-not-players ruling is overturned; say so. Keep the one rule that
   survives: a toggle that can never fire never ships.
3. docs/STATUS.md — it is 64k and last updated 31 August. Do not rewrite it.
   Add a new §0 saying what changed on 8 and 9 September and that everything
   below it predates the direction change.
4. The session rules — wherever START-HERE's rule list lives in the repo,
   delete "Direction is settled. Hold it steady, do not reopen it." Replace
   the philosophical rules with DIRECTION.md §2's eight. Keep the operational
   ones (git over the bridge, the untouchable directories, .tbody, public/ is
   not a master, vanilla 1.12, additive schema, dev server in my terminal).
5. app/(site)/page.tsx — empty the REFUSALS array. Do not redesign the landing
   page, just take the six lines off. I will write the replacement copy myself.

Rules: run no git command at all, status included. Do not touch
app/lab/succubus/, next.config.mjs or components/. app/(site)/page.tsx is
normally off limits and this is the one authorised exception, REFUSALS only.
npx tsc --noEmit to check.
```

---

</details>

---

## Session 3 — /classicplus (afternoon) — NEXT

```
Read docs/DIRECTION.md §5 and docs/PINS.md and docs/SHELL.md.

Build one new room at /classicplus. It is a room like every other room:
presence, chat, cursors, moments, one deck, one Tari-signed seed. The primitive
is generic and the unwritten room was settled on 30 August, so this should be
assembly, not invention. If you find yourself designing a new surface, stop and
tell me why.

It is the room for a game that does not exist yet. Its first event is the
BlizzCon Classic Game Deep Dive, Saturday 15:30 PDT, which is Sunday 13th
06:30 Perth. After that it is the permanent Classic+ room, so do not name
anything in it after BlizzCon.

The one piece of content it needs on open: the panel schedule, in Perth, US
Pacific and CET, as the seed pin.

Rules: run no git command at all, status included. Do not touch
app/lab/succubus/, app/(site)/, next.config.mjs or components/. The dev server
runs in my terminal, not yours; the bridge VM has no egress to Ably or Neon.
npx tsc --noEmit is the check.
```

---

## The rest of the week

| day | |
| --- | --- |
| Thu 10 | finish /classicplus. Indexed zone pages for the fifteen told rooms. |
| Fri 11 | draft the r/classicwow post. Its value is the panel schedule plus a room to watch it in. |
| Sat 12 | post it. |
| Sun 13, 06:30 | be in the room. |

Then branch on what Blizzard says. DIRECTION.md §5 has the three branches and
the build order after.
