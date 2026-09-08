/* THE NEWS REFRESH — docs/DIRECTION.md §3.1, and lib/news.ts for the rules.
 *
 * GET, because Vercel Cron only ever issues a GET. It is also the reason there
 * is no POST: two verbs doing one job is two things to keep in step.
 *
 * SAFE TO CALL BY HAND, AS OFTEN AS YOU LIKE. The unique index on
 * (source, external_id) makes a second run insert nothing, so this route is
 * idempotent by the schema rather than by anything it remembers. Hobby caps
 * cron at once a day (vercel.json), so a hand run is the top-up in between.
 *
 * THE GUARD IS OPT-IN. With CRON_SECRET set — which is what Vercel sends as
 * `Authorization: Bearer` on its own cron calls — anything without it is 401.
 * Without the variable the route is open, which is what a local dev server and
 * a repo checkout with no secrets want. It reads and writes headlines from a
 * public feed, so the guard is about not being a free fetch button rather than
 * about protecting anything in the table.
 *
 * WHAT IT ANSWERS IS FOR THE PERSON WHO RAN IT, never for a reader. `seen: 40,
 * matched: 0` is the shape of a category filter that has gone stale and is
 * invisible in a plain "ok", which is the whole reason the counts are here.
 */

import { hasDb } from "@/lib/db";
import { refreshNews } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* No caching layer between the cron and the feed. */
export const revalidate = 0;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "no" }, { status: 401 });

  const report = await refreshNews();

  /* 200 even when a source fell over. The cron is not a monitor and a red run
     in Vercel's log for a Wowhead hiccup teaches us to ignore red runs. The
     failure is in the body and in the server log, where it can be read. */
  return Response.json({
    ok: true,
    db: hasDb(),
    at: new Date().toISOString(),
    sources: report,
  });
}
