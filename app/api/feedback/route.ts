/**
 * Where the feedback sheet posts, and where the notes end up.
 *
 * THE SINK IS A DISCORD FORUM CHANNEL, AND IT HAS TO BE A FORUM.
 *
 * This route used to mail through Resend, and it never delivered one note: the
 * key was never set, the route logged and 500'd, and the sheet honestly told
 * every reader their note had not sent. Both mail vars are gone, along with the
 * address that was the reason the route existed.
 *
 * A forum rather than a text channel, because a text channel is a feed — notes
 * scroll past and are gone — and a forum makes each note its own post, with a
 * title in a scannable list, tags to filter on, and a thread to work in. That
 * is a triage board.
 *
 * The consequence in code: a forum webhook REQUIRES `thread_name` and a text
 * channel rejects it. There is no body that works on both, so this commits to
 * the forum. Point `DISCORD_FEEDBACK_WEBHOOK` at a forum channel's webhook or
 * every post fails with Discord's own complaint in the log.
 *
 * `?wait=true` so Discord answers with the post it made, or with the reason it
 * did not. Without it the reply is a 204 that means nothing and the sheet would
 * be saying "sent" on faith.
 *
 * One embed rather than a bare message: a plain message caps at 2000 characters
 * and the textarea allows 4000, which an embed description holds with room. The
 * context rides in the embed's fields, where it reads as a labelled block
 * instead of a paragraph the note has to compete with.
 *
 * Tags are not applied here. Discord wants tag ids, the ids are per-channel,
 * and threading an env var of them through to earn what the title prefix
 * already says is a poor trade. Tag by hand until the volume makes that a
 * chore.
 */

import pkg from "../../../package.json";
import { CATEGORIES, FIELDS, NOTE_MAX } from "../../../lib/feedback";
import type { Category, Report, Subject } from "../../../lib/feedback";

/** Discord's own cap on a forum post's title. */
const TITLE_MAX = 100;

/** Discord's own cap on an embed description; the note fits inside it. */
const DESC_MAX = 4096;

/**
 * The version is stamped here rather than accepted from the body. The point of
 * the field is to read a complaint against the build it was made on, and a
 * value the client sends is a value a bot can send — the server is the only
 * party that knows which build answered the request.
 */
const VERSION = pkg.version;

/* ---------------------------------------------------------------------------
   The guard. Three speed bumps, no dependency.
--------------------------------------------------------------------------- */

/**
 * A handful of notes per IP per minute. In memory, which means per serverless
 * instance, which means it leaks under any real load — and that is fine. It is
 * a speed bump. The wall is a job for the day the traffic justifies one.
 */
const WINDOW_MS = 60_000;
const PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);
  /* The map would otherwise grow for the life of the instance. Anything with
     nothing inside the window is nobody this route needs to remember. */
  if (hits.size > 500)
    for (const [key, times] of hits)
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  return seen.length > PER_WINDOW;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/* ---------------------------------------------------------------------------
   Reading the body. Unknown keys are refused rather than dropped, so an attempt
   to send more than the four profile fields fails rather than half-succeeding.
--------------------------------------------------------------------------- */

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length <= max ? v : null;
}

function readSubject(v: unknown): Subject | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const keys = Object.keys(s);
  if (keys.some((k) => !["kind", "id", "name", "place"].includes(k)))
    return null;
  if (s.kind !== "item") return null;
  if (typeof s.id !== "number" || !Number.isInteger(s.id) || s.id < 0)
    return null;
  const name = str(s.name, 200);
  if (!name) return null;
  const place = s.place === null ? null : str(s.place, 120);
  if (place === null && s.place !== null) return null;
  return { kind: "item", id: s.id, name, place };
}

type Parsed = Report & { ok: true };

function read(body: unknown): Parsed | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !(FIELDS as readonly string[]).includes(k)))
    return null;

  const note = str(b.note, NOTE_MAX);
  if (!note || !note.trim()) return null;

  const category = CATEGORIES.includes(b.category as Category)
    ? (b.category as Category)
    : null;
  if (!category) return null;

  const path = str(b.path, 200);
  if (!path || !path.startsWith("/")) return null;

  if (typeof b.imported !== "boolean") return null;

  const out: Parsed = {
    ok: true,
    note: note.trim(),
    category,
    path,
    imported: b.imported,
  };

  if (b.cls !== undefined) {
    const cls = str(b.cls, 32);
    if (!cls) return null;
    out.cls = cls;
  }
  if (b.level !== undefined) {
    if (
      typeof b.level !== "number" ||
      !Number.isInteger(b.level) ||
      b.level < 1 ||
      b.level > 60
    )
      return null;
    out.level = b.level;
  }
  if (b.side !== undefined) {
    if (b.side !== "alliance" && b.side !== "horde") return null;
    out.side = b.side;
  }
  if (b.subject !== undefined) {
    const subject = readSubject(b.subject);
    if (!subject) return null;
    out.subject = subject;
  }
  if (b.hp !== undefined) {
    const hp = str(b.hp, 200);
    if (hp === null) return null;
    out.hp = hp;
  }

  return out;
}

/* ---------------------------------------------------------------------------
   The post.
--------------------------------------------------------------------------- */

/**
 * The post's title, and it is the whole reason the board is scannable:
 * category, then the subject when there is one, then the first words of the
 * note. "wrong data · Bartolo's Yeti Fur Cloak" is a list entry worth reading.
 * "New feedback" is not.
 */
function title(r: Parsed): string {
  const tail = r.subject?.name ?? r.note.replace(/\s+/g, " ").trim();
  const line = `${r.category} · ${tail}`;
  return line.length <= TITLE_MAX ? line : `${line.slice(0, TITLE_MAX - 1)}…`;
}

function fields(r: Parsed) {
  const out: { name: string; value: string; inline?: boolean }[] = [];
  const add = (name: string, value: string | undefined) => {
    if (value) out.push({ name, value, inline: true });
  };
  if (r.subject)
    out.push({
      name: "Item",
      value: `${r.subject.name} · ${r.subject.id}${
        r.subject.place ? ` · ${r.subject.place}` : ""
      }`,
    });
  add("Class", r.cls);
  add("Level", r.level === undefined ? undefined : String(r.level));
  add("Side", r.side);
  add("Imported", r.imported ? "yes" : "no");
  add("Path", r.path);
  add("Version", VERSION);
  return out;
}

async function post(url: string, r: Parsed): Promise<Response> {
  return fetch(`${url}${url.includes("?") ? "&" : "?"}wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      thread_name: title(r),
      embeds: [
        {
          description: r.note.slice(0, DESC_MAX),
          fields: fields(r),
        },
      ],
    }),
  });
}

export async function POST(req: Request) {
  const url = process.env.DISCORD_FEEDBACK_WEBHOOK;
  if (!url) {
    console.error("feedback: DISCORD_FEEDBACK_WEBHOOK is not set");
    return Response.json({ error: "not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const r = read(body);
  if (!r) return Response.json({ error: "bad request" }, { status: 400 });

  /* Caught. The answer is 200 and nothing is posted, because telling a bot it
     was caught teaches it to come back wearing something else. */
  if (r.hp) return Response.json({ ok: true });

  if (limited(clientIp(req)))
    return Response.json({ error: "slow down" }, { status: 429 });

  let res = await post(url, r);

  /* Discord allows roughly five posts every two seconds per webhook. On a 429
     it says how long to wait, so wait that long, once, and try once more. A
     second failure is told to the reader as a failure, because it is one. */
  if (res.status === 429) {
    let wait = 1000;
    try {
      const body = (await res.clone().json()) as { retry_after?: number };
      /* Seconds on the webhook route, and a float. Capped so a bad number
         cannot hold the request open. */
      if (typeof body.retry_after === "number")
        wait = Math.min(5000, Math.max(0, body.retry_after * 1000));
    } catch {}
    await new Promise((done) => setTimeout(done, wait));
    res = await post(url, r);
  }

  if (!res.ok) {
    /* Discord's own message, verbatim. The most likely cause is the URL
       pointing at a text channel rather than a forum, and Discord names that
       exactly — so the next person to hit it knows in one read. */
    console.error("feedback: discord rejected", res.status, await res.text());
    return Response.json({ error: "send failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
