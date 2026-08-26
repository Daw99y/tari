# The shell — App Router, one frame, no SPA

Decided 2026-08-25. Closes `docs/TARI.md` §15.1 / `STATUS.md` §6.1.

## The decision

**App Router. No separate SPA.** The fear in `TARI.md` §11.1 — that a
persistent shell "fights App Router's grain" — was true of the Pages Router
and is not true now. App Router's rule is exactly the one we want:

> A **layout** mounts once and keeps its state. Only the **page** segment
> under it re-renders on navigation.

So the rail, the people column and the live connection live in a
layout; the room is the page. Changing room is a segment swap inside a frame
that never unmounts. That is the Linear/Discord shape, and it is the default
behaviour, not a workaround.

What we give up: nothing that matters. What we keep: RSC for the guide
(server-rendered cards, streamed), the API routes, one deploy, one repo, and
the marketing site in the same tree.

## Two route groups

```
app/
  layout.tsx                 html/body, fonts, globals.css. Nothing else.
  (site)/                    the marketing site. Server components, static.
    page.tsx                 the landing page (moves here from app/page.tsx)
    layout.tsx               site chrome — header, footer, the refusals
  (app)/                     the product. One persistent shell.
    layout.tsx               THE SHELL — mounts once, never re-renders on room change
    r/[room]/page.tsx        the room. The only thing that swaps.
    r/[room]/loading.tsx     DOES NOT EXIST. See "nothing spins".
  lab/                       stays as is — the specimen drawer and the doll
  api/                       stays as is
```

Route groups `(site)` and `(app)` share a URL space and nothing else. `/`
is the landing page; `/r/duskwood` is a room. No `/app` prefix — the URL
is the place.

## The shell layout, file by file

```
app/(app)/
  layout.tsx          server component. Reads session, hands it to <Shell>.
  Shell.tsx           'use client'. The three columns, wrapped in <Live>.
  Live.tsx            'use client'. THE ONE SOCKET — Ably. One Realtime
                      connection, a ChatClient and a Spaces client on it,
                      and the current room's scope around all three columns.
  Rail.tsx            'use client'. Azeroth as a list. Highlights via
                      useSelectedLayoutSegment('room'). Prefetches on hover.
  People.tsx          'use client'. Who's in the room. Reads chat presence
                      for the *current* room id, deduplicated by clientId,
                      plus a REST roll-up for the rooms next door.
  room-context.tsx    the current room id, set by the page, read by the
                      columns. A plain React context — the URL is the source
                      of truth, this is just a cheap mirror for the columns.

app/(app)/r/[room]/
  page.tsx            server component. Fetches the room's guide, art, loot
                      panel. Wraps the client bits in <RoomProvider id=…>.
  Room.tsx            server component still — see below. Full-bleed art,
                      framed map, and three client leaves on top of it:
                      Chat.tsx, Cursors.tsx, Moments.tsx.
```

**One connection, in `Live.tsx`, under `Shell.tsx`. The room's scope inside
it, also in the shell.** The connection lives in the layout and is never
torn down. The room scope is a subscription on it; swapping it on a room
change is a message, not a re-handshake. That is the whole "live feeling
survives navigation" requirement.

**Amended 2026-08-26.** This said the per-room provider belonged down in
`r/[room]/page.tsx`. It does not, and the reason is the shape of the shell
rather than anything about the vendor: the people column is a *sibling* of
the room, not a child of it, and it needs the same room's presence. One
scope wrapped around both columns and the stage is the only place both can
read it. `roomId` is already derived in `Shell.tsx` from the layout
segments, so nothing new had to be computed to move it.

**The room did not have to become a client component.** SHELL.md expected
`'use client'` to arrive with the cursors. It did not: the live layer is
three leaves — `Chat`, `Cursors`, `Moments` — each its own client
component, and everything above them stays HTML the server streams. Server
does the guide, client does the live, on the same page, which is the thing
this document says a SPA cannot do.

## Rules the structure enforces

**Layouts, never templates.** `template.tsx` remounts on every navigation.
It is the one file that would reintroduce the blink. It does not appear in
`(app)/`.

**Nothing spins.** No `loading.tsx` under `r/`. The rail prefetches the room
on hover (`router.prefetch` plus `<Link prefetch>`), so by the time the click
lands the RSC payload is in the router cache and the swap is synchronous.
If a room is ever slow enough to need a loading state, the fix is the data,
not a spinner.

**The URL is the state.** Room = `/r/[room]`. Level filter, spoiler shield,
"first time here" = search params. Nothing about *where you are* lives in
client state that the URL does not also hold. Refresh, share, Tauri deep
link — all free.

**Motion continuity.** The rail thumbnail becoming the full-bleed background
is the View Transitions API: `experimental.viewTransition` in
`next.config.mjs`, and a shared `view-transition-name` on the rail art and
the room art. Transform and opacity only, per §11.3. This is the one place
we lean on an experimental flag; it degrades to a cut, not a break.

**Server does the guide, client does the live.** Guide cards, loot panel,
"what closes" are RSC in `page.tsx` — HTML, streamed, cached. Cursors, pins,
presence, chat are client components inside the same page reading Ably.
The page is both at once, which is the thing a SPA cannot do — and it did
not cost `Room.tsx` its `'use client'`; the three live leaves carry it.

## What this means for the other pieces

| piece | where it lands |
| --- | --- |
| Tauri client | a webview pointed at `tari.gg`. No second build. The client adds the file watcher and the custom titlebar; the app is the same app. |
| ⌘K | in `Shell.tsx`, above everything, `router.push` to a room |
| the path (§5) | `app/(app)/you/page.tsx` — a page in the same shell, rail stays |
| the atlas | `app/(app)/atlas/page.tsx` — same |
| landing → app | the hero's "enter" is a `<Link href="/r/duskwood">`. Crossing the group boundary mounts the shell once; after that it never remounts. |

## The next concrete step

Not the room. **The landing page**, in `(site)/`. It sets the type, the
colour, the fox, the contrast system — and moving `app/page.tsx` into
`app/(site)/page.tsx` is the first commit of this structure, at zero risk.
The `(app)` group gets created the day the room starts.

## What is built, 2026-08-25

Both groups exist and the shell runs.

`(site)/` — `page.tsx` and `page.module.css` moved out of `app/`, under a
pass-through `(site)/layout.tsx`. No chrome in it yet: the header, the footer
and the refusals wait on the type and colour decisions (`STATUS.md` §6.2,
§6.4). The URL and the hero did not change.

`(app)/` — `layout.tsx`, `Shell.tsx`, `Rail.tsx`, `People.tsx`,
`room-context.tsx`, `Command.tsx`, `not-found.tsx`, and
`r/[room]/{page,Room}.tsx`. `lib/rooms.ts` is the world: 75 rooms, one per
file in `public/journey`, checked against that folder rather than typed from
memory. The rail draws every one of them as its own photograph held down
dark; `scripts/rail-thumbs.mjs` writes the 500px copies it uses, because 75
masters is 14 MB and the small ones are 0.7 MB. ⌘K reaches any room by name.
The room is the art, the name, and nothing else.

**Two corrections to the structure above.** `useSelectedLayoutSegment('room')`
takes a parallel-route key, not a dynamic segment name — from the shell layout
it returns `"r"`. `Shell.tsx` reads `useSelectedLayoutSegments()` instead and
takes `[1]`. And `Room.tsx` is not a client component yet: nothing in it is
interactive until the pins are, and the `'use client'` line costs nothing to
add on that day.

### Still open, and known

**The live layer — landed 2026-08-26.** Ably, not Liveblocks; §8.1 has the
price that decided it. The seam turned out to be exactly one wrap of `<div
className={styles.shell}>`, as predicted. `ABLY_API_KEY` is the only new
environment variable; without it `/api/ably` answers 503, the connection
fails, `useLive().up` goes false and every surface reads exactly as it did
before — including the people column, which still refuses to draw a zero.

**The guide.** `r/[room]/page.tsx` renders the photograph and the name. The
seven bands of §4.3 need the pipeline's zone files, which are not in this
repo.

**Motion continuity is a cut, not a morph.** Next 16.3 has no
`experimental.viewTransition` key and React's `ViewTransition` ships on the
experimental channel only, so nothing starts a transition. The room's art
carries `view-transition-name: room-art` and waits.

**Nothing links to the shell.** The hero's "enter" (`<Link
href="/r/duskwood">`) is a one-line change to a hero that is still being
redlined, so `/r/duskwood` is reached by typing it.
