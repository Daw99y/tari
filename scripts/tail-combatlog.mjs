#!/usr/bin/env node
// Spike tailer: watches WoWCombatLog.txt and prints each new line with the
// wall-clock time it arrived, plus the gap to the timestamp the client wrote.
import fs from "node:fs";
import path from "node:path";

const DIR =
  process.env.WOW_LOG_DIR ||
  "/Applications/World of Warcraft/_classic_era_/Logs";
// The client may write WoWCombatLog.txt or a dated WoWCombatLog-MMDDYY_HHMMSS.txt.
// Always follow the newest matching file, and notice when it rotates.
function newestLog() {
  let best = null;
  for (const n of fs.readdirSync(DIR)) {
    if (!/^WoWCombatLog.*\.txt$/i.test(n)) continue;
    const f = path.join(DIR, n);
    const m = fs.statSync(f).mtimeMs;
    if (!best || m > best.m) best = { f, m };
  }
  return best?.f ?? null;
}
let FILE = null;
const POLL = 50;

let offset = 0;
let started = false;
let carry = "";

const pad = (n, w = 2) => String(n).padStart(w, "0");
const clock = (d) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;

// Client stamp is "9/8/2026 14:03:12.417" (or M/D HH:MM:SS.mmm on older builds).
function parseStamp(line, now) {
  const m = line.match(/^(\d+)\/(\d+)(?:\/(\d+))?\s+(\d+):(\d+):(\d+)\.(\d+)/);
  if (!m) return null;
  const [, mo, da, yr, h, mi, s, ms] = m;
  return new Date(
    yr ? Number(yr) : now.getFullYear(),
    Number(mo) - 1,
    Number(da),
    Number(h),
    Number(mi),
    Number(s),
    Number(ms.padEnd(3, "0").slice(0, 3)),
  );
}

function emit(line) {
  if (!line.trim()) return;
  const now = new Date();
  const stamp = parseStamp(line, now);
  const lag = stamp ? `+${now - stamp}ms` : "+?";
  process.stdout.write(`[${clock(now)} ${lag.padStart(8)}] ${line}\n`);
}

function tick() {
  const found = newestLog();
  if (found !== FILE) {
    FILE = found;
    started = false;
    offset = 0;
    carry = "";
  }
  if (!FILE) return;
  let st;
  try {
    st = fs.statSync(FILE);
  } catch {
    if (started) {
      console.log(`[${clock(new Date())}] --- file gone, waiting ---`);
      started = false;
      offset = 0;
    }
    return;
  }
  if (!started) {
    started = true;
    offset = 0; // read the whole file, the header carries the zone
    console.log(`[${clock(new Date())}] --- tailing ${FILE} from byte ${offset} ---`);
    return;
  }
  if (st.size < offset) {
    console.log(`[${clock(new Date())}] --- truncated, restarting ---`);
    offset = 0;
  }
  if (st.size === offset) return;
  const fd = fs.openSync(FILE, "r");
  const buf = Buffer.alloc(st.size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  offset = st.size;
  const chunk = carry + buf.toString("utf8");
  const lines = chunk.split("\n");
  carry = lines.pop() ?? "";
  for (const l of lines) emit(l.replace(/\r$/, ""));
}

console.log(`[${clock(new Date())}] watching ${DIR} for WoWCombatLog*.txt`);
setInterval(tick, POLL);
