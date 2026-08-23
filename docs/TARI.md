# Tari — the statement of record

**Read §0 first. Everything else exists to serve it.**

Written 2026-08-22, moved into the repo 2026-08-23. This file was previously
`FOXTON.md` inside a Claude project; **the repo copy is now canonical.**

Companion doc: `docs/STATUS.md` — that one holds state, this one holds the
argument.

---

## 0. The window

**Think about what happens the day fresh Classic+ realms open.**

Wowhead has no data. Nothing has been datamined into a usable database, and
what has been is guesswork. RestedXP is worthless — if zones changed, every
waypoint is a lie, and their product *is* the path. Sixtyupgrades has no items.
Questie has no quest coordinates. Icy Veins has no guides. **Every single tool
in the category is dead on arrival for the first few weeks.**

For the first time since 2004, nobody knows where anything is.

And the only source of knowledge in the world will be other players,
discovering things in real time, and telling each other.

> **That is a window where the entire playerbase is forced to slow down.**
> Not persuaded to. *Forced to.* Because there is no fast way through a world
> nobody has mapped.

It will happen once. It will last a few weeks. And it is the exact conditions
this product was designed for — except it wasn't designed for that. It was
designed for a philosophy, and then the universe scheduled the philosophy.

### 0.1 Which means Tari is not a companion app

> **Tari is how Classic+ gets discovered.**

Day one, a hundred thousand people walk into a world nobody has seen. Every
one of them finds something. There is one place where all of it lands —
cross-realm, live, pinned to where it happened.

Not a website with community features. **The collective memory of a world
being explored for the first time in twenty years.**

Nobody can compete in that moment, because every competitor is a *database*,
and a database needs its content to already exist. Tari's content arrives the
same day the world does.

### 0.2 What the window does to the build

Three consequences, and all three make the job **smaller**:

1. **For Classic+ content, nothing is scraped, written or photographed.** The
   players do it, live, because they are the only ones who can. The job is to
   be the surface it lands on.
2. **The empty-room problem inverts.** On day one an empty page is not a
   failure — it is an unexplored zone, and filling it is the entire point.
3. **The old world is the other half, and it is already owned.** The CPLUS
   database and the original photography cover everything Classic+ keeps.

| half | source |
| --- | --- |
| old Azeroth | the CPLUS pipeline + Kacey's own in-game photography |
| everything new | the crowd, live, the day it opens |

### 0.3 The launch rule

Ship before the fresh realms open, with the old world in place, so the
discovery layer is already running and already has people in it when the new
world arrives. **Being late to the window is the only unrecoverable mistake in
this document.**

---

## 1. The name

**Tari.** `tari.gg`. `taretha.com` as a lore redirect. **The mark is a fox** —
Tari is still Taretha *Foxton*.

Taretha Foxton grew up alongside Thrall at Durnholde Keep, secretly taught him
to read, and helped him escape. Blackmoore executed her for it. **Thrall
called her Tari.**

- **The product is a companion, and so was she.** She noticed, remembered, and
  helped without being asked, across the most impossible divide in the setting.
- **It sounds like something you're fond of.** Two syllables, vowel ending.
- **The payoff is delayed, and the delay is the point.** Nobody recognises it
  on day one. An app built to reward looking deeper is named in a way that
  rewards looking deeper.

The Taretha entry ships in the app, as a card in Hillsbrad. It is the first
field guide entry and it teaches the reader how to use everything else.

---

## 2. The goal, the mechanism, the atom

| | |
| --- | --- |
| **The goal** | slow the player down |
| **The mechanism** | community |
| **The atom** | the pin |

**Slowing down is not a feature. It is an outcome.** You cannot build "slow."
You can only build *reasons to go somewhere you would otherwise skip* — and
the only durable, infinite, uncopyable source of those reasons is other people.

So community is not the second goal sitting beside the first. **Community is
how the first one happens.**

> RestedXP shows you where to go so you can leave sooner.
> **Tari shows you where other people stopped.**

### 2.1 The test

Applied to every feature that will ever be proposed:

> **Does this make someone linger in a place, or move through it faster?**

| | |
| --- | --- |
| upgrades shown **per-place** — "this drops here" | ✅ a reason to go somewhere |
| upgrades as a **shopping list across zones** | ❌ that's a route |
| quest **text, lore, what it is actually about** | ✅ |
| quest **"go here, kill 10"** | ❌ Questie already does it, better |
| pins, presence, chat | ✅ people are a reason to stay |
| routes, arrows, waypoints, a clock that counts up | ❌ never |

### 2.2 The atom

> **A pin. One person, standing in one spot, saying one thing.**

It stays. The next person who reaches that spot around that level sees it.

- **It is community** — a human made it, humans reply
- **It is slowing down** — it points at something with *no reward attached*
- **It is not a route** — one point, no order, no path between pins.
  Structurally cannot become RestedXP
- **It appreciates** — worth more next year, when more people reach that level
- **It works at one user** — you leave pins for the future, and the future
  arrives
- **It is the only thing in the product that is new to the world**

Chat, cursors, counters and annotations are all variations on it. Build the
pin perfectly; everything else is scaffolding.

---

## 3. Un-shard Azeroth

The structural idea, and the reason nobody can follow.

Classic's world is shattered into three hundred pieces. Blizzard cannot fix it
— realm isolation *is* Classic, layering was a scandal, cross-realm would
destroy the point.

> **There are three hundred Azeroths. Tari is the one where everyone is
> together.**

Wowhead has no presence layer. Discord is organised by *server you joined*,
not *place you are standing*. The addon already knows where everybody is, and
nobody else's does.

**Cross-region is also the warmth mechanism.** It is 3am in Perth and Oceanic
is asleep, but it is 8pm in Berlin and Stranglethorn is heaving.

**In lore:** Everlook, Ratchet, Gadgetzan, Booty Bay, Nighthaven. The neutral
towns are the only places in Azeroth where Alliance and Horde stand together.
Tari is neutral ground.

---

## 4. The room

### 4.1 What is a room

A place you can be standing in. Four kinds — **~46 zones, ~30 dungeons, 9
raids, 6 cities.** Roughly 90.

Everything else is an **entry inside** a room: quests, world drops, items,
NPCs, landmarks. Multi-wing buildings are one room, not four (Scarlet
Monastery, Dire Maul, Blackrock Spire, Stratholme, Maraudon).

**Presence rolls up and adjacency is shown**, so a quiet dungeon points next
door instead of rendering a bare zero:

> **Scholomance · 4 here · 12 outside in Western Plaguelands**

Cities are the presence showcase. Dungeons are the guide showcase.

### 4.2 It is a hangout, not a utility

A utility is finished the moment you have the answer — by run five you stop
opening it. **Nobody opens Discord because they need information.** They open
it because that is where everyone is.

- **The guide is conversational fuel, not reference material.** One strange
  fact about the Viewing Room beats a complete boss table. Exhaustive is
  Wowhead's job, and exhaustive is completion-shaped.
- **The page must look good with nobody on it and great with twelve.**
- **There is no completion state.** Nothing is ticked off.

**What makes run 30 different from run 1:** different people; spoilers
unlocked; the loot list has shrunk so it pivots to what you are still missing;
and **"since you were last here"** — four new cards, nine came through,
someone answered your question. That last one is Tari's line and it is the
only thing that makes a place you already know worth reopening.

### 4.3 The page

> ### Duskwood · at 24
>
> 1. **Who's here now** — presence, cursors, live, every realm
> 2. **Since you were last here** — Tari
> 3. **What's here** — the guide
> 4. **What closes** — the only clock the product owns
> 5. **Who came through at 24** — the permanent layer
> 6. **What they left** — the pins
> 7. **What drops here for you** — a panel, never a list across zones

**Emphasis, not a queue.** Full-bleed with Liveblocks across the whole surface
means it is a canvas, not a scroll. Nobody scrolls past lore to find drops.

**Two presence layers.** Cursors are ephemeral; log presence anyway and the
room gains a past — *"137 stood here today. Nobody has been to the Stockade in
three weeks."*

**Level-and-place indexed, never time-indexed.**

```
WHERE room = 'duskwood' AND level BETWEEN me - 2 AND me + 2
```

Content appreciates instead of decaying, and every room becomes sixty rooms.

---

## 5. The path

The errand system merged with journey. **Not a to-do list — a letter waiting
when you get home**, and it is Tari's letter.

> You hit 34. Two new trainer ranks. A class chain starts in Stranglethorn.
> Three quests grey out in two levels.

**It says what changed, never where to go.** The one surface that is about
*you*, and the counterweight to the room.

---

## 6. The guide

> **Not more information. The 1% that is actually magic, extracted, made
> beautiful, and shaped to be talked about.**

**Cards, not paragraphs.** A "nobody notices this" card. A "cut from the game"
card. A "go look at this" card. Magazine, not encyclopedia.

### 6.1 The spoiler shield

> **First time here** — hide anything I haven't seen
> **Show me everything** — I've done this a hundred times

Same page, two products. The only guide in existence that respects the first
one, and it turns the thesis into a switch you can see.

### 6.2 The photography

Original in-game photography is a real moat. Wowhead has model-viewer renders;
Tari would have **photographs of the world, taken deliberately, at the right
time of day.** The Audubon format, and nobody in this space has it.

**Sequence it correctly or three weeks get wasted:**

1. **Scrape first** — wiki, Reddit, old forums, dev interviews, cut content
2. **Curate to the 1%** — 8–15 things per room worth a card
3. **That list becomes the shot list**
4. **Then go in-game** with a list, at the right hour, and take exactly those

The shot list is also the content plan: it tells you how big the job is and
which room to do first.

### 6.3 Sourcing

Warcraft Wiki and Wowpedia are **CC BY-SA** — reusable with attribution and
share-alike. **Wowhead comments are not licensed for reuse.** Scrape wide,
synthesise and rewrite, cite sources, stay off verbatim Wowhead. The curation
*is* the product.

### 6.4 Co-authored, live

Liveblocks storage and Yjs mean the guide can be written together in real
time, cursors in the text. **A living wiki people author together while
standing in the room it describes does not exist for any game** — and during
the §0 window it is the only way the new world gets documented at all.

---

## 7. The visual language — the inversion

WoW's status effect icons all mean **"you have been stopped."** In the game
that is something done to you. In Tari it is the point.

> **In WoW, being stopped is a loss of control.
> In Tari, being stopped is what you came for.**

| icon | in game | in Tari |
| --- | --- | --- |
| **Aggro `!`** (the jagged alert) | a mob noticed *you* — something is coming | **you** noticed something. **This is the pin marker.** |
| **Sap** (the Z) | you can't act | you stopped and looked |
| **Entangling Roots** | held in place | you stayed somewhere |
| **Slow / Hamstring** | movement reduced | the product, in one word |
| **Rested** (inn Z's) | double XP for logging off | the game itself paying you to stop |
| **Fear** | you run around uncontrollably at speed | *the route tools* |

The aggro `!` beats the quest `!` precisely because a quest mark means *a task
awaits you* — guide language. The aggro `!` means *something here is worth
your attention* — pin language.

### 7.1 Two rules

**Icons are vocabulary, never rewards.** The moment a Rested badge is *earned*,
it is a streak in a costume and every refusal in §13 is dead.

**Redraw the theme icons; use the real ones only for content.** Vanilla icons
are 64×64 bitmaps drawn for CRT monitors and will look like mud on a 5K
display. Real BLPs for an item's icon in a loot list; hand-drawn vectors for
the UI vocabulary. Sharper, designed rather than ripped, and — the important
part — **your art, which means the paid tier can use it.**

Extraction: `Interface\ICONS\*.blp` from `interface.MPQ`, or the published
"2000+ vanilla 1.12 icons in PNG" pack. Overhead billboards are creature/spell
visuals in the M2 files.

---

## 8. The live layer

Liveblocks, ~$30/month. Chat is the boring 1/10 use. **It runs across the
entire room page, not inside a widget on it** — cursors move over Azeroth
itself.

| primitive | what it becomes |
| --- | --- |
| Presence + cursors | someone hovers a spot and you watch it happen |
| Comments / Threads | pins, pinned to coordinates, permanent, level-indexed |
| Broadcast | someone dings 60 and it crosses every screen |
| Storage + Yjs | §6.4 |
| Notifications | waiting when you get back, **never while playing** |

**The bar:** at 5–50 online it feels like a tight community; at 500 it feels
like a gold mine someone just found. Different designs, both true.

**Pricing risk:** billed per monthly active user. Price it before going deep.

---

## 9. The client

**Tauri v2, free forever.** Addons cannot make network requests, but
SavedVariables flush on `/reload`, and a desktop app can watch that file.

Minimap click → `ReloadUI()` → file flushes → watcher fires → POST → **the room
updates live.** The paste dies and presence becomes real.

**Frame it as checking in, not tracking.**

### 9.1 First launch

Choreography, not an emergent property — and no website can do it:

> Install. Open. Before you type anything, the client has read your WoW folder
> and Tari says: **"Grubnuk. 24 rogue. Whitemane. You were last in Duskwood."**

### 9.2 The reverse path

The client can also write **into** the WoW addon folder. The addon reads it on
load — no network, just disk, the way WeakAura and TSM imports work.

> **web → client → addon.** You are standing in Duskwood and the addon shows
> you the pin someone left there. One reload behind.

RestedXP's delivery mechanism carrying the opposite payload. It stays a noun —
*someone stopped here* — never a direction.

---

## 10. Addon and Discord

**The addon is a beacon.** Minimap icon, one click. Exports character, class,
level, faction, zone, name and realm. Renaming is free only until launch.
Panel deferred; §9.2 is its eventual second job.

An addon **cannot** cross realms — chat channels are realm- and
faction-scoped — which is why addon-only is not the product.

**Discord: mirror the events, not the chat.** A two-way chat bridge needs a
hosted gateway bot and the privileged Message Content intent, and it produces
a second-class experience in both directions — a worse Discord inside your app.

Instead: the site posts *things that happened* into Discord as rendered cards
(`@vercel/og`); reactions come back as counts. One-way out, reactions back,
and **every post is an ad for the site.**

Then: slash commands as HTTP interactions, Linked Roles, guild rooms, and
eventually **Discord Activity** — the room running inside a voice channel.

> **Do not compete with Discord. Be the thing open inside it.**

---

## 11. Craft, navigation and design

### 11.1 The architecture decision

**Stop thinking in pages. One persistent shell with a canvas inside it.**

Linear, Figma, Discord and Notion never *navigate* — the frame mounts once and
content swaps inside it. Rail, canvas and people column never blink. Changing
room is a state change, not a page load. **Liveblocks connections persist
across room changes**, or you re-handshake every move and the live feeling
dies.

This fights App Router's grain. Honest structure: **Next.js for the marketing
site and API, a client-rendered SPA for the app.** Decide before the room gets
built; retrofitting is a rewrite.

### 11.2 Layout

```
┌──────────┬───────────────────────┬──────────┐
│ YOU      │                       │  IN THE  │
│ the path │    THE ROOM           │  ROOM    │
│ ─────────│    full-bleed art     │          │
│ HERE NOW │    the guide          │  cursors │
│ Duskwood │    the map, framed    │  names   │
│ ─────────│    pins               │  chat    │
│ PINNED   │                       │          │
│ ATLAS ▸  │                       │          │
└──────────┴───────────────────────┴──────────┘
```

> Discord's rail is a list of servers you joined. **Tari's rail is Azeroth.**

**Full-bleed exactly once — the room.** Everything else framed and quiet. One
immersive surface creates hierarchy that framing everything cannot.

| asset | role |
| --- | --- |
| relit zone and instance art | the full-bleed ground |
| map plate (see `PHASE-MAP-1`) | framed *inside* the room, carrying pins |

**Hardest design problem: legible text on painted art**, ~90 backgrounds each
with its own value range. Needs a real system — scrim, blur, solid card backs,
a guaranteed contrast floor. The landing page solves it first.

### 11.3 The quality bar

**Nobody has ever made anything beautiful about this game.** Wowhead is a
spreadsheet with ads, Icy Veins is SEO, AtlasLoot is a table. That is the
largest gap in the category and one person with taste can close it.

**Narrow, not shallow.** One room at a standard nobody has reached beats ninety
adequate ones.

| | the bar |
| --- | --- |
| **Motion continuity** | the *same element* persists through a transition — the rail thumbnail **becomes** the full-bleed background |
| **Nothing ever spins** | prefetch on hover; the room is loaded before the click lands. A spinner means the architecture failed |
| **Frame budget** | transform and opacity only. Cursors on one canvas layer, not twelve DOM nodes. Blur once, deliberately |
| **Window chrome** | Tauri custom titlebar. One intentional frame on both platforms beats two defaults |
| **Keyboard** | ⌘K reaching any room, item or person — you are asking Tari |
| **Sound** | someone enters; a pin lands. Quiet, optional. Almost nobody does it |
| **Type on 5K** | real display face, optical sizing, hairlines at 0.5px |

### 11.4 design.md

**Retired, rewritten from scratch, and written *last*** — the landing page
establishes the vocabulary, the room stress-tests it, design.md records only
what survived both.

The old `globals.css` was **385 KB**. That is the evidence: the design system
grew instead of being designed. Start empty.

Register: light, generous, quiet, framed everywhere except the one page that
isn't. Discord is dark slate and 13px everything. **Tari is a museum with a
bar in it.**

---

## 12. Money

**WoW data free. The social layer paid.** Cosmetics, cursors, name colours,
badges, early access, moderator standing.

1. Cosmetics do not rot; the item DB needs re-scraping every patch
2. It stays clear of "you are selling Blizzard's data"
3. **The margin sits on what is uniquely yours.** Anyone can rebuild the item
   database. Nobody can rebuild the room.

Corollary from §7.1: **anything on the paid tier must be original art.**

---

## 13. The refusals

On the landing page, in the flat register. Each is something a growth team
would be fired for shipping.

- No notifications while you're playing. Tari will never pull you out.
- No streaks. Nothing punishes a week off.
- No infinite scroll. The feed ends, the way the evening ends.
- No ranking of players against each other.
- No number that only goes up. No karma, no followers, no points.
- No route, no arrow, no waypoint, no clock that counts up.
- Tari states the fact; **another player waves at it.**

---

## 14. Build order

**Target: live before fresh realms open** (§0.3), with the old world in place
so the discovery layer already has people in it when the new world lands.

1. ~~Rename, tag, split the repo~~ — done 2026-08-23
2. **The event log, running.** Never stops again. (Whelp plz staying live is
   what keeps it writing.)
3. **The landing page.** The design laboratory — type, colour, spacing, the
   fox mark, the voice, §11.2's contrast system. No data dependencies.
4. **One room, done to 15/10.** Full-bleed art, framed map, the guide, the
   spoiler shield, the loot panel, the adjacency line.
5. **`design.md` v2**, recording what survived 3 and 4.
6. **Pins.** The atom. Give it to five people.
7. **Presence + cursors.** Liveblocks across the whole room page.
8. **The Tauri client**, including §9.1.
9. **The wake.** The level-indexed layer.
10. **Scrape → curate → shot list → shoot**, per §6.2.
11. **The path.** Errands and journey merged.
12. **The atlas**, then the rest of the old world.

---

## 15. Still open

1. **SPA or App Router.** §11.1. Blocks the room.
2. **The contrast system.** §11.2. Blocks the landing page.
3. **The fox mark**, and the redrawn icon vocabulary.
4. **Pricing.** Tiers, numbers, free ceiling.
5. **Moderation policy.**
6. **Landing copy.** The hero line is Kacey's to redline. Candidate direction:
   the §7 inversion — *"you have been stopped"* to an audience who has been
   sapped ten thousand times and always hated it.
