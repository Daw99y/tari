/**
 * THE NEWS PIPE — docs/DIRECTION.md §3.1.
 *
 * THIS IS A FEED READER AND IT IS NEVER A SCRAPER. It fetches feed documents
 * that publishers offer for exactly this, and it never fetches an article
 * page. What it keeps off a feed item is the headline, the source and the
 * link. Not the body, not a summary made from the body, not a cached copy.
 * A headline sends Wowhead traffic; their prose in our column makes us a
 * competitor they can do something about.
 *
 * WHAT IS IN HERE AND WHAT IS NOT, as verified by hand on 2026-09-09:
 *
 *   wowhead        /news/rss/all. Valid RSS 2.0, and every item carries
 *                  <category>, so "Classic" is a filter rather than a keyword
 *                  guess. Blue posts arrive through here already tagged, so
 *                  the Blizzard forums are not a second fetch.
 *   reddit         r/classicwow. NOT BUILT YET, and the naive version is a
 *                  trap: the plain .rss endpoint answers a browser and 403s a
 *                  datacenter IP, which is what Vercel is. It needs a
 *                  script-type OAuth app and a declared User-Agent, so it
 *                  lands as its own Source with its own fetch, not as another
 *                  URL in the list below.
 *   mmo-champion   EXCLUDED. Their robots.txt disallows the feed path. Do not
 *                  add it and do not work around it.
 *   blizzard       UNVERIFIED. The forums run Discourse and Discourse usually
 *                  exposes category .rss, so a feed probably exists — but
 *                  "probably" is not a source, and Wowhead already carries the
 *                  blue posts tagged. Verify before building.
 *
 * NO XML DEPENDENCY. RSS 2.0 is a flat list of <item> elements with flat
 * children, and the two hundred lines below read it without adding a parser to
 * a repo that has none. If a feed ever arrives that this cannot read, that is
 * the day to add the dependency — not before.
 */

import { hasDb, query } from "./db";

/** What the column draws. No body field exists here on purpose. */
export type NewsItem = {
  id: number;
  source: string;
  title: string;
  url: string;
  at: string;
  category: string | null;
  image: string | null;
};

/** One row on its way in, before the database has an opinion about it. */
export type Incoming = {
  source: string;
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date;
  category: string | null;
  imageUrl: string | null;
};

/** What one refresh of one source did. The route hands these back so a hand
 *  run says something more useful than "ok" — in particular `matched: 0` with
 *  `seen: 40` is the shape of a category filter that has gone stale, which is
 *  invisible in a plain success. */
export type SourceReport = {
  source: string;
  ok: boolean;
  seen: number;
  matched: number;
  inserted: number;
  /** Present only when ok is false. It goes to the server log and to a hand
   *  run, and never to a reader — see the failure rule at the bottom. */
  note?: string;
};

/* --------------------------------------------------------------------------
   READING RSS
   -------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

/** Feed text is escaped twice as often as not: `&amp;#39;` is real and common.
 *  One pass leaves `&#39;` on the screen, so this runs until it stops moving
 *  or twice, whichever is first. */
function unescapeXml(s: string): string {
  let out = s;
  for (let i = 0; i < 2; i++) {
    const next = out.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
      const known = ENTITIES[name.toLowerCase()];
      if (known) return known;
      if (name[0] === "#") {
        const code =
          name[1] === "x" || name[1] === "X"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return whole;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

/** The text of one child element, CDATA unwrapped. Returns "" when absent,
 *  because every caller wants a string and none of them want a throw. */
function tag(xml: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(xml);
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(raw);
  return unescapeXml((cdata ? cdata[1] : raw).trim());
}

/** Every occurrence of a repeated child. <category> is the reason this exists:
 *  a Wowhead item carries several and only one of them decides the filter. */
function tags(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const raw = m[1].trim();
    const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(raw);
    const text = unescapeXml((cdata ? cdata[1] : raw).trim());
    if (text) out.push(text);
  }
  return out;
}

/** One attribute off the first matching self-closing or open tag. This is how
 *  the picture is found, and it is the ONLY way it is found: an <enclosure> or
 *  a media: element is the feed offering an image. Digging one out of
 *  <description> would mean reading the body, which is the one thing this
 *  module does not do. */
function attr(xml: string, name: string, key: string): string | null {
  const m = new RegExp(`<${name}\\b[^>]*\\b${key}\\s*=\\s*["']([^"']+)["']`, "i").exec(xml);
  return m ? unescapeXml(m[1]) : null;
}

function items(xml: string): string[] {
  return xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
}

/** A feed date, or null. RSS 2.0 says RFC 822 and `new Date` reads it; a feed
 *  that hands over something unreadable loses the item rather than writing an
 *  Invalid Date into a not-null column. */
function when(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* --------------------------------------------------------------------------
   THE SOURCES
   -------------------------------------------------------------------------- */

/** Politeness, and the thing Reddit will require by name when it lands. A feed
 *  publisher who wants to talk to us can find us from this line. */
const AGENT = "TariNewsReader/1.0 (+https://tari.gg)";

/** The categories that let a Wowhead item into the column, lowercased.
 *
 *  ONE STRING, NOT A KEYWORD SEARCH. §3.1 verified by hand that every item in
 *  this feed carries <category> and that "Classic" is the tag Classic coverage
 *  wears. If Wowhead ever renames it, the symptom is a refresh that reports
 *  `seen: 40, matched: 0`, and the fix is this array — not a heuristic. */
const WOWHEAD_CATEGORIES = ["classic"];

const WOWHEAD_FEED = "https://www.wowhead.com/news/rss/all";

async function fetchWowhead(): Promise<{ seen: number; kept: Incoming[] }> {
  const res = await fetch(WOWHEAD_FEED, {
    headers: { "user-agent": AGENT, accept: "application/rss+xml, application/xml, text/xml" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wowhead answered ${res.status}`);
  const xml = await res.text();

  const raw = items(xml);
  const kept: Incoming[] = [];

  for (const item of raw) {
    const cats = tags(item, "category");
    const hit = cats.find((c) => WOWHEAD_CATEGORIES.includes(c.trim().toLowerCase()));
    if (!hit) continue;

    const title = tag(item, "title");
    const url = tag(item, "link");
    const at = when(tag(item, "pubDate"));
    if (!title || !url || !at) continue;

    kept.push({
      source: "wowhead",
      /* The guid is the feed's own name for the item and is stable across
         edits to the headline; the link is the fallback and is stable enough. */
      externalId: tag(item, "guid") || url,
      title,
      url,
      publishedAt: at,
      category: hit,
      imageUrl:
        attr(item, "enclosure", "url") ??
        attr(item, "media:thumbnail", "url") ??
        attr(item, "media:content", "url"),
    });
  }

  return { seen: raw.length, kept };
}

/** The list the refresh route walks. Reddit joins it as a second entry with
 *  its own fetch when its OAuth app exists. */
const SOURCES: { name: string; read: () => Promise<{ seen: number; kept: Incoming[] }> }[] = [
  { name: "wowhead", read: fetchWowhead },
];

/* --------------------------------------------------------------------------
   WRITING AND READING
   -------------------------------------------------------------------------- */

/**
 * IDEMPOTENT BY THE UNIQUE INDEX, not by anything this function remembers.
 * `on conflict do nothing` on (source, external_id) means the second run of an
 * unchanged feed inserts nothing and reports nothing new, which is what makes
 * the route safe to hit by hand as often as you like.
 *
 * A headline that a publisher later edits does not update here. That is
 * deliberate: the row is what was published, and rewriting history in a column
 * a reader has already read is worse than a slightly stale headline.
 */
async function store(rows: Incoming[]): Promise<number> {
  let inserted = 0;
  for (const r of rows) {
    const back = await query<{ id: string }>(
      `insert into news (source, external_id, title, url, published_at, category, image_url)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (source, external_id) do nothing
       returning id`,
      [r.source, r.externalId, r.title, r.url, r.publishedAt.toISOString(), r.category, r.imageUrl]
    );
    if (back?.[0]) inserted++;
  }
  return inserted;
}

/**
 * Fetch every source and write what came back.
 *
 * ONE SOURCE FAILING IS NOT A FAILURE. Each source is caught on its own, and a
 * source that throws leaves whatever it wrote last time standing in the table.
 * The report says what happened for the person who ran it; the column says
 * nothing at all, because a reader did not ask about our fetching.
 */
export async function refreshNews(): Promise<SourceReport[]> {
  const out: SourceReport[] = [];

  for (const s of SOURCES) {
    try {
      const { seen, kept } = await s.read();
      const inserted = hasDb() ? await store(kept) : 0;
      out.push({ source: s.name, ok: true, seen, matched: kept.length, inserted });
    } catch (e) {
      console.error(`news: ${s.name} failed`, e);
      out.push({
        source: s.name,
        ok: false,
        seen: 0,
        matched: 0,
        inserted: 0,
        note: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return out;
}

/**
 * The column's read. Never throws and never explains itself: no database, no
 * rows, an empty list, and the surface draws its quiet empty state. An outage
 * upstream is our problem and not the reader's.
 */
export async function recentNews(limit = 12): Promise<NewsItem[]> {
  const n = Math.min(50, Math.max(1, Math.round(limit)));
  try {
    const rows = await query<{
      id: string;
      source: string;
      title: string;
      url: string;
      published_at: Date | string;
      category: string | null;
      image_url: string | null;
    }>(
      `select id, source, title, url, published_at, category, image_url
         from news
        order by published_at desc
        limit $1`,
      [n]
    );
    return (rows ?? []).map((r) => ({
      id: Number(r.id),
      source: r.source,
      title: r.title,
      url: r.url,
      at: new Date(r.published_at).toISOString(),
      category: r.category,
      image: r.image_url,
    }));
  } catch (e) {
    console.error("news: read failed", e);
    return [];
  }
}

/** What a source is called on screen. A row's `source` is a key, not a label. */
export const SOURCE_LABEL: Record<string, string> = {
  wowhead: "Wowhead",
  reddit: "r/classicwow",
};
