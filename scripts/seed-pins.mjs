/* PLANT THE SEEDS. docs/PINS.md — the seeds; docs/WELCOME.md §2.
 *
 * A room nobody has written draws the deck of what people left there, which on
 * day one is nothing, seventy-seven times over. This writes one pin from Tari
 * into each room in reference/seeds.json so no deck opens empty.
 *
 * A seed is a real row in `pins`, not a rendered decoration: it sits in the
 * deck, it can be replied to, and it appreciates like any other. What it is
 * not is a player — `who` is Tari, `cls` is "tari" (not a class), `level` is 0
 * (Tari never stood anywhere at a level), and x/y are null, because Tari did
 * not stand on a coordinate and inventing one would put a mark on the map that
 * nobody made.
 *
 * IDEMPOTENT. Matched on (room, Tari, body), so running it twice plants
 * nothing twice, and editing a line in the JSON plants the new one rather than
 * rewriting the old — rows are never updated here and never deleted, the same
 * tradition the tombstone keeps. Take an old seed back by hand if you replace
 * one.
 *
 * RUN IT FROM YOUR OWN TERMINAL:  node scripts/seed-pins.mjs [--dry]
 * The Cowork bridge's VM has no egress to Neon, so it cannot run this.
 */

import { existsSync, readFileSync } from "node:fs";

import pg from "pg";

const dry = process.argv.includes("--dry");

/** Load .env.local the way `next dev` would — a plain node script gets none of
 *  Next's env handling. Same shape as scripts/doll-upload.mjs. */
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch {
      /* Older node, or a malformed file. The check below reports it. */
    }
    if (process.env.DATABASE_URL) return;
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("No DATABASE_URL. `vercel env pull .env.local`, or export it.");
  process.exit(1);
}

const seeds = JSON.parse(readFileSync("reference/seeds.json", "utf8"));
const rooms = Object.entries(seeds).filter(([room]) => room !== "_");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

/** Tari's own row in `users`. Not an invented player: a provider of "tari"
 *  cannot collide with a real sign-in, and the unique key makes this safe to
 *  run again. */
async function tariId(db) {
  /* --dry writes nothing at all, this row included. */
  if (!dry) {
    await db.query(
      `insert into users (provider, provider_id) values ('tari', 'tari')
         on conflict (provider, provider_id) do nothing`
    );
  }
  const { rows } = await db.query(
    `select id from users where provider = 'tari' and provider_id = 'tari'`
  );
  if (!rows[0]) {
    if (dry) {
      console.log("Tari has no user row yet; a real run would make one.\n");
      return null;
    }
    throw new Error("Could not find or make Tari's user row.");
  }
  return rows[0].id;
}

async function main() {
  const db = await pool.connect();
  try {
    const uid = await tariId(db);
    if (uid !== null) console.log(`Tari is user ${uid}. ${rooms.length} rooms in the file.\n`);

    let planted = 0;
    let standing = 0;

    for (const [room, bodies] of rooms) {
      for (const body of bodies) {
        const { rows } = uid === null
          ? { rows: [] }
          : await db.query(
              `select id from pins
                where room = $1 and user_id = $2 and body = $3 and removed_at is null
                limit 1`,
              [room, uid, body]
            );
        if (rows[0]) {
          standing += 1;
          continue;
        }
        if (dry) {
          console.log(`  would plant  ${room}`);
          planted += 1;
          continue;
        }
        await db.query(
          `insert into pins (room, x, y, body, parent, user_id, who, cls, level)
           values ($1, null, null, $2, null, $3, 'Tari', 'tari', 0)`,
          [room, body, uid]
        );
        console.log(`  planted      ${room}`);
        planted += 1;
      }
    }

    console.log(
      `\n${dry ? "Would plant" : "Planted"} ${planted}. ${standing} already standing.`
    );
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
