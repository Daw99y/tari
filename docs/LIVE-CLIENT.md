# LIVE-CLIENT.md

The spike from `DIRECTION.md` §4, run 2026-09-08 on Cybyr, level 60 rogue,
Whitemane-US, Classic Era client `1.15.9`, `PROJECT_ID,2`, macOS.

Everything below is quoted from `WoWCombatLog-090826_130859.txt` as the client
wrote it. Nothing here comes from documentation or from what the file is
supposed to do.

## The short answer

**Zone is derivable, exactly and by name. The file is not live.**

`DIRECTION.md` §4 was right that `ZONE_CHANGE` exists and right that it is
enough. It was wrong about the delivery. The Classic Era client buffers combat
log writes in memory and flushes them to disk on logout, not as they happen.
`STATUS.md` §0's ruling therefore survives this spike, for a different reason
than the one it gave: it is not that the client fails to record where you are
standing, it records it precisely. It is that a reader who is still playing has
not been given the file yet.

The Tauri client does **not** move to the top of the build order.

## 1. Is my current zone derivable?

**Yes, directly, from a dedicated line. No inference from mob names is needed.**

The client writes a `ZONE_CHANGE` and a `MAP_CHANGE` pair on every border
crossing, with the zone named as a string:

```
9/8/2026 13:11:26.0768  ZONE_CHANGE,1,"The Barrens",0
9/8/2026 13:11:36.3998  MAP_CHANGE,1413,"The Barrens",1612.500000,-5143.750000,2622.916504,-7510.416504
9/8/2026 13:15:06.9378  ZONE_CHANGE,1,"Mulgore",0
9/8/2026 13:15:06.9398  MAP_CHANGE,1412,"Mulgore",-272.916748,-3697.916504,2047.916748,-3089.583252
9/8/2026 13:17:50.4198  ZONE_CHANGE,1,"Dustwallow Marsh",0
9/8/2026 13:17:50.4218  MAP_CHANGE,1445,"Dustwallow Marsh",-2033.333252,-5533.333008,-975.000000,-6225.000000
```

Three crossings, three named zones, and `MAP_CHANGE` carries a stable numeric
map id alongside the name — `1413` Barrens, `1412` Mulgore, `1445` Dustwallow —
so a client would not have to match on English strings.

Four things the sample proves that matter more than the happy path:

**It fires out of combat.** These two crossings happened while walking, with no
combat anywhere near them. The signal does not depend on fighting something:

```
9/8/2026 13:19:29.2778  ZONE_CHANGE,1,"The Barrens",0
9/8/2026 13:19:43.7618  ZONE_CHANGE,1,"The Barrens",0
```

**It flaps on a border, badly.** Riding out of Orgrimmar produced four zone
changes in 850 milliseconds:

```
9/8/2026 13:11:24.0788  ZONE_CHANGE,1,"Durotar",0
9/8/2026 13:11:24.3198  ZONE_CHANGE,1,"Orgrimmar",0
9/8/2026 13:11:24.6828  ZONE_CHANGE,1,"Durotar",0
9/8/2026 13:11:24.9258  ZONE_CHANGE,1,"Orgrimmar",0
```

Anything that treats a `ZONE_CHANGE` as an arrival needs to debounce. A room
that a reader enters and leaves four times in under a second is not a room they
were ever in.

**`MAP_CHANGE` is not always a zone.** Mid-flight the map went to the
continent, and the zone-level `MAP_CHANGE` did not land until ten seconds after
the `ZONE_CHANGE` that preceded it:

```
9/8/2026 13:11:26.0768  ZONE_CHANGE,1,"The Barrens",0
9/8/2026 13:11:26.0788  MAP_CHANGE,1414,"Kalimdor",12799.899414,-11733.299805,17066.601563,-19733.210938
9/8/2026 13:11:36.3998  MAP_CHANGE,1413,"The Barrens",1612.500000,-5143.750000,2622.916504,-7510.416504
```

`ZONE_CHANGE` is the line to trust. `MAP_CHANGE` is a map, and sometimes the
map is a continent.

**The file names the character and realm outright**, on every combat line, so
identity needs no pairing step:

```
9/8/2026 13:22:29.1808  PARTY_KILL,Player-5066-017C67AD,"Cybyr-Whitemane-US",0x511,...
```

Kills and deaths are their own events too — `PARTY_KILL` and `UNIT_DIED`, with
the victim named:

```
9/8/2026 13:22:29.1808  UNIT_DIED,0000000000000000,nil,0x80000000,0x80000000,Creature-0-5177-1-11-3238-00001F8FDE,"Stormhide",0x10a48,0x80000000,0
```

## 2. What is the write latency?

**There is none, because there is no incremental write. The file is flushed on
logout.** In this sample that was fourteen minutes.

This is the finding that decides the spike, so here is the evidence as
timestamps rather than as a claim.

The file was created when logging was first enabled and took the header
immediately:

| wall clock | file size on disk |
| --- | --- |
| 13:09:00 | 274 bytes |
| 13:19:55 | 274 bytes |
| 13:20:25 | 274 bytes |
| 13:21:37 | 274 bytes |
| 13:22:41 | 274 bytes |
| after logout, 13:24:38 | **16,681 bytes** |

Those sizes were read directly off disk, twice by two independent paths, at
each of those times.

Now compare against what the flushed file says was happening during that
window. Every one of these events was already over, and the client already
knew about it, while the file on disk still said 274 bytes:

```
9/8/2026 13:15:06.9378  ZONE_CHANGE,1,"Mulgore",0
9/8/2026 13:17:50.4198  ZONE_CHANGE,1,"Dustwallow Marsh",0
9/8/2026 13:22:29.1808  UNIT_DIED,...,"Stormhide",...
```

The kill at **13:22:29** was still not on disk when the folder was read at
**13:22:41**, twelve seconds later. It arrived, with everything else, only when
the character logged out. The flushed file spans `13:10:10.1548` to
`13:24:09.3008` and landed in a single write.

Two details worth keeping:

Re-running `/combatlog` mid-session writes a fresh `COMBAT_LOG_VERSION` header,
and **that header is also buffered.** It did not reach disk either:

```
9/8/2026 13:19:22.1448  COMBAT_LOG_VERSION,9,ADVANCED_LOG_ENABLED,0,BUILD_VERSION,1.15.9,PROJECT_ID,2
```

So "the file exists" and "the file is current" are unrelated. Only the very
first create flushed promptly.

The buffer is size-driven rather than time-driven, as far as this run shows.
Roughly 16.4 KB accumulated across fourteen minutes without a flush, so the
threshold is at least that. This is the likely reason Warcraft Logs' companion
appears to work live: a raid produces tens of kilobytes in seconds and pushes
the buffer over repeatedly. A single player walking across Kalimdor produces
almost nothing and never fills it. **Tari's readers are the second case, not
the first.**

## 3. Does it keep writing with the game windowed and unfocused?

**Not answered, and the question is moot at present.** Nothing is written
incrementally under any focus state, so there is no incremental write left to
test for focus sensitivity. Re-open this only if question 2 is ever solved.

## Also not covered

The walk was cut short and two items on §4's list did not happen: the character
did not die, and did not level. `UNIT_DIED` is confirmed for a mob, quoted
above, but a player death and a `LEVEL_UP`-equivalent line were not observed in
this run and are not claimed here either way.

## What a client would have to do

Since zone *is* derivable, this is worth writing down, but it is a constraint
list rather than a design, and §4's instruction not to build on this still
holds.

A desktop client cannot simply tail the file and learn where someone is
standing. It would have to accept that the data arrives in one batch at logout,
which makes it a better *photograph* than the addon export — it carries a full
timestamped movement history rather than a final position — but a photograph
all the same. The signal is retrospective. It would tell Tari where a reader
*was*, in order, with times, once they stopped playing.

If live presence is wanted rather than history, the honest paths are an addon
that maintains its own state and some other transport, or an accepted latency
measured in sessions rather than seconds. Neither is decided here.

The two things any consumer of this file will need regardless: debounce
`ZONE_CHANGE` against the border flapping shown above, and never treat file
presence or file mtime as a liveness signal, since a logged-in player who has
not fought yet may have no file on disk at all.

## The tailer

`scripts/tail-combatlog.mjs`. Reads only, never writes. Follows the newest
`WoWCombatLog*.txt` in the log directory, handles rotation and truncation, and
prints each new line with its arrival time and the gap to the timestamp the
client stamped on it. Point it with `WOW_LOG_DIR`, and set `TZ` to the client's
local zone or the gap column is meaningless.
