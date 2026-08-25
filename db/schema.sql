-- The live record. One table, and see lib/live.ts for what a row is and is not.
--
-- Run it once against the Neon branch:
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- There is no user column and there will not be one until accounts exist. A row
-- says "a rogue", which is what keeps this table clear of personal data.

create table if not exists events (
  id            bigserial primary key,
  kind          text        not null,
  cls           text        not null,
  faction       text,
  realm         text,
  subject       text,
  subject_name  text,
  place         text,
  level         int,
  created_at    timestamptz not null default now()
);

-- The card's own query: the last handful for one place, newest first.
create index if not exists events_place_at on events (place, created_at desc);
-- Realm scoping, which is the community's boundary. See COMMUNITY.md.
create index if not exists events_realm_at on events (realm, created_at desc);
-- Everything, everywhere, for the landing and for counting.
create index if not exists events_at on events (created_at desc);

-- Who this character is called, when the device knows. See lib/live.ts: a
-- character name is a public identity inside the game, and it is the only
-- identifier this table holds.
alter table events add column if not exists who text;

-- The wave: one tap meaning "I saw that". `client` is a random id the browser
-- keeps in localStorage and identifies nobody; it exists so the primary key can
-- enforce one wave per person per line. See app/api/wave/route.ts.
create table if not exists waves (
  event_id   bigint      not null references events(id) on delete cascade,
  client     text        not null,
  created_at timestamptz not null default now(),
  primary key (event_id, client)
);
create index if not exists waves_event on waves (event_id);

-- Who has signed in. The id is internal and everything else keys on it; the
-- provider pair sits beside it so a second provider is a row rather than a
-- migration. See lib/auth.ts.
create table if not exists users (
  id          bigserial   primary key,
  provider    text        not null,
  provider_id text        not null,
  created_at  timestamptz not null default now(),
  unique (provider, provider_id)
);

-- ===========================================================================
-- PHASE-SYNC-1 — the record follows the account.
--
-- Two tables, both cascading off `users`, which is what makes DELETE
-- /api/account complete without a line of its own: drop the user and the
-- record goes with them.
--
-- `updated_at` is stamped by the database and never by the browser. One of the
-- two machines here is a gaming PC that has been awake for a week and the
-- other is a phone; the only clock both agree on is this one. It also means
-- the ordering that decides a conflict is the order changes *arrived*, which
-- is the order that actually happened.
--
-- Column names are dull on purpose. `character`, `value` and `at` are all
-- keywords or type names in one SQL dialect or another, and a table that has
-- to be quoted forever to be read is a tax on every query after this one.
-- ===========================================================================

-- One row per mark, and a row is never deleted — it is switched off.
--
-- THE TOMBSTONE IS THE WHOLE DESIGN. Un-ticking on the phone has to beat the
-- laptop's older tick, and a set that only grows cannot express that. `on_mark
-- = false` is a fact with a time on it, exactly like `true`.
--
-- `val` carries the four set-shaped stores' null and equip's item id: equip is
-- a map of slot to item rather than a set, so its subject is the slot and its
-- value is what is in it. One nullable column buys the fifth store.
create table if not exists marks (
  user_id    bigint      not null references users(id) on delete cascade,
  char_key   text        not null,
  kind       text        not null,   -- found | wish | done | equip | been | fav
  subject    text        not null,   -- "12345", "i:scarlet-monastery-library"
  val        text,
  on_mark    boolean     not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, char_key, kind, subject)
);
-- The pull's only query: everything this account changed since a cursor.
create index if not exists marks_user_at on marks (user_id, updated_at);

-- The shelf. A profile is small, read whole and written whole, so it is one
-- jsonb rather than a column per field — and a StoredProfile that grows a
-- field is then a change to one TypeScript type instead of a migration.
-- `gone` for the same reason marks have `on_mark`. Without it, taking a
-- character off the shelf on the laptop is undone by the next pull from the
-- phone, and the reader watches a character they deleted walk back in.
create table if not exists characters (
  user_id    bigint      not null references users(id) on delete cascade,
  char_key   text        not null,
  profile    jsonb       not null,
  gone       boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, char_key)
);
create index if not exists characters_user_at on characters (user_id, updated_at);
