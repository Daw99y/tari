"use client";

/* THE CREATOR. The game's own creation screen, place for place, in Tari's
 * register (docs/CHARACTER.md, "The creator").
 *
 * The client's layout, kept: one panel down the left holding the two faction
 * columns, the sex marks, the class row and the stepped look rows, with
 * Randomize at its foot; the figure in the middle on the race's starting
 * zone; two placards down the right with Accept and Back under them; the name
 * centred at the bottom with the turn arrows below it.
 *
 * The icons are Blizzard's — the race portraits, the class marks and the two
 * sex signs come straight out of a 1.12 client (`scripts/create-icons.py`).
 * The frames around them are not: the ornate gold plate is dropped for the
 * room's own dark card (docs/CONTRAST.md, surface B), which leaves the icons
 * as the only colour on the panel.
 *
 * Two things the game has no screen for, because the game knows them already:
 * level and sex are editable here, on an imported character as well as a made
 * one. Import is the field at the top of the panel: paste the addon's string
 * and everything it knows is set. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { QUALITY, ROW_LABELS } from "@/lib/doll";
import {
  classIcon,
  CLASS_LINE,
  CLASS_NAME,
  CLASSES_OF,
  crestIcon,
  FACTION_OF,
  loadCharacter,
  loadRoster,
  MAX_LEVEL,
  racePortrait,
  RACE_LINE,
  RACE_NAME,
  RACE_TOKEN,
  removeCharacter,
  rollName,
  saveCharacter,
  selectCharacter,
  sexIcon,
  SHEET_SLOTS,
  START_ROOM,
  validName,
  type Character,
} from "@/lib/character";
import { parseImport, type ParsedCharacter } from "@/lib/import";
import type { ClassId } from "@/lib/loot";
import { getRoom, roomArt } from "@/lib/rooms";
import { DEFAULT_LOOK, useBody, wrap, type Look } from "@/lib/use-body";
import {
  handedFor,
  itemsByEntry,
  type Item as WardrobeItem,
} from "@/lib/wardrobe";

import styles from "./creator.module.css";

const NO_GEAR = new Map<string, WardrobeItem>();
const NO_ITEMS: number[] = [];

const clampLevel = (n: number) => Math.min(MAX_LEVEL, Math.max(1, n));
const readLevel = (text: string) => clampLevel(Number.parseInt(text, 10) || 1);

export default function Creator() {
  const router = useRouter();
  const [race, setRace] = useState(1);
  const [gender, setGender] = useState(0);
  const [cls, setCls] = useState<ClassId>("warrior");
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [name, setName] = useState("");
  /* Level is held as what was typed, so the field can be empty mid-edit
   * without snapping back to 1 under the cursor. */
  const [levelText, setLevelText] = useState("1");
  const [imported, setImported] = useState<ParsedCharacter | null>(null);
  /* The character this screen is currently on, if it is one already saved.
   * Null means the screen is making a new one. */
  const [existing, setExisting] = useState<Character | null>(null);
  /* Everyone on this browser. Named `mine` because `roster` below is the
   * manifest's races by faction, and the two are not the same list. */
  const [mine, setMine] = useState<Character[]>([]);
  const [paste, setPaste] = useState("");
  const [pasteFault, setPasteFault] = useState<string | null>(null);
  const [equipped, setEquipped] = useState<Map<string, WardrobeItem>>(NO_GEAR);

  const { hostRef, spin, roster, r, options, fitted, catalogue, error } =
    useBody({ race, gender, look, equipped });

  const level = readLevel(levelText);
  /* Stepped off the field's own value rather than off `level`, so a run of
   * clicks inside one render each counts. */
  const stepLevel = (by: number) =>
    setLevelText((text) => String(clampLevel(readLevel(text) + by)));

  /** Put a saved character on the screen. Every field, including the paste
   *  box, which belongs to whoever was on the screen before. */
  const open = (c: Character) => {
    setExisting(c);
    setRace(c.race);
    setGender(c.sex);
    setCls(c.cls);
    setLook(c.look);
    setName(c.name);
    setLevelText(String(c.level));
    setImported(null);
    setPaste("");
    setPasteFault(null);
  };

  /** Clear the screen down to a fresh human warrior. */
  const startNew = () => {
    setExisting(null);
    setRace(1);
    setGender(0);
    setCls("warrior");
    setLook(DEFAULT_LOOK);
    setName("");
    setLevelText("1");
    setImported(null);
    setPaste("");
    setPasteFault(null);
    setEquipped(NO_GEAR);
  };

  /* Arriving: the roster, and whoever was last in play. */
  useEffect(() => {
    setMine(loadRoster());
    const me = loadCharacter();
    if (me) open(me);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Drop one, and land the screen on whoever is left. */
  const drop = (key: string) => {
    const next = removeCharacter(key);
    setMine(loadRoster());
    if (existing?.key !== key) return;
    if (next) open(next);
    else startNew();
  };

  /** Switch to another saved character, and make it the one the rest of the
   *  app is looking at — the rail and the room read the active one. */
  const switchTo = (c: Character) => {
    selectCharacter(c.key);
    open(c);
  };

  /* A class the race cannot be falls back to the first it can. */
  const classes = CLASSES_OF[race] ?? [];
  useEffect(() => {
    if (!classes.includes(cls)) setCls(classes[0]);
  }, [classes, cls]);

  /* The wardrobe by item id, for the gear an import or an edit carries. */
  const byEntry = useMemo(
    () =>
      catalogue ? itemsByEntry(catalogue) : new Map<number, WardrobeItem>(),
    [catalogue],
  );

  const gear = imported?.gear ?? existing?.gear ?? NO_ITEMS;

  /** True once the game itself has told us who this is. Race, class and name
   *  are then facts rather than choices, so they lock. Level and sex do not:
   *  a character levels, and the doll's sex is the reader's to set. */
  const fromGame = !!imported || !!existing?.importedAt;

  /* The gear, in the order a character sheet reads it: the ranged slot is not
   * in that order, so a bow is neither listed nor hung off a hand that is
   * already holding a blade (lib/character.ts, SHEET_BOTTOM). Kept as a list
   * rather than the map below because a character wears two rings and two
   * trinkets, and a map keyed by slot only remembers the second of each. */
  const worn = useMemo(() => {
    if (gear.length === 0 || byEntry.size === 0) return [];
    const out: { at: number; item: WardrobeItem }[] = [];
    for (const at of SHEET_SLOTS) {
      const id = gear[at - 1] ?? 0;
      const item = id ? byEntry.get(id) : undefined;
      if (item) out.push({ at, item: handedFor(at, item) });
    }
    return out;
  }, [gear, byEntry]);

  /* Dressed once the wardrobe is in. The slots that draw nothing — the neck,
   * the rings, the trinkets — collapse here and it costs nothing: they have no
   * model, no overlay and no geoset to lose. */
  useEffect(() => {
    /* Guarded on the wardrobe rather than on `worn`: an empty list is a real
     * answer once the catalogue is in — it is what switching to a character
     * who wears nothing looks like — and the figure has to undress for it. */
    if (byEntry.size === 0) return;
    setEquipped(
      worn.length
        ? new Map(worn.map(({ item }) => [item.slot, item]))
        : NO_GEAR,
    );
  }, [worn, byEntry]);

  const backdrop = getRoom(START_ROOM[race] ?? "elwynn-forest");

  const step = (key: keyof Look, by: number, count: number) =>
    setLook((prev) => ({ ...prev, [key]: wrap(fitted[key] + by, count) }));

  const rollLook = () => {
    const pick = (n: number) => (n ? Math.floor(Math.random() * n) : 0);
    setLook({
      skin: pick(options.skin.length),
      face: pick(options.face.length),
      hair: pick(options.hair.length),
      hairColor: pick(options.hairColor.length),
      beard: pick(options.beard.length),
    });
  };

  const readPaste = (raw: string) => {
    setPaste(raw);
    if (!raw.trim()) {
      setPasteFault(null);
      return;
    }
    const res = parseImport(raw.trim());
    if (!res.ok) {
      setPasteFault(res.error);
      return;
    }
    const c = res.character;
    setPasteFault(null);
    setImported(c);
    setCls(c.cls);
    setLevelText(String(clampLevel(c.level)));
    if (c.name) setName(c.name);
    if (c.race && RACE_TOKEN[c.race]) setRace(RACE_TOKEN[c.race]);
    if (c.sex) setGender(c.sex === 3 ? 1 : 0);
  };

  const ok = validName(name) && classes.includes(cls);
  /* An imported name is the character's real one. Nothing here may reroll it. */
  const nameLocked = fromGame && !!(imported?.name ?? existing?.name);

  const accept = () => {
    if (!ok) return;
    const key =
      existing?.key ??
      (imported?.realm && imported.name
        ? `${imported.realm}/${imported.name}`
        : `local/${crypto.randomUUID()}`);
    const character: Character = {
      key,
      name,
      realm: imported?.realm ?? existing?.realm ?? null,
      race,
      sex: gender === 1 ? 1 : 0,
      cls,
      faction: FACTION_OF[race],
      level,
      look: fitted,
      gear: [...gear],
      importedAt: imported
        ? new Date().toISOString()
        : (existing?.importedAt ?? null),
      guild: imported?.guild ?? existing?.guild ?? null,
      played: imported?.played ?? existing?.played ?? null,
      copper: imported?.copper ?? existing?.copper ?? null,
      hearth: imported?.hearth ?? existing?.hearth ?? null,
      zone: imported?.zone ?? existing?.zone ?? null,
      professions: imported?.professions ?? existing?.professions ?? [],
    };
    saveCharacter(character);
    router.push(`/r/${START_ROOM[race]}?class=${cls}&at=${character.level}`);
  };

  const rows: {
    key: keyof Look;
    label: string;
    count: number;
    hex?: string;
    note?: string;
  }[] = [
    {
      key: "skin",
      label: "Skin",
      count: options.skin.length,
      hex: options.skin[fitted.skin]?.hex,
    },
    { key: "face", label: "Face", count: options.face.length },
    {
      key: "hair",
      label: ROW_LABELS[race]?.hair ?? "Hair",
      count: options.hair.length,
      note: options.hair[fitted.hair]?.geoset === 0 ? "bald" : undefined,
    },
    {
      key: "hairColor",
      label: `${ROW_LABELS[race]?.hair ?? "Hair"} colour`,
      count: options.hairColor.length,
      hex: options.hairColor[fitted.hairColor]?.hex,
    },
    {
      key: "beard",
      label: ROW_LABELS[race]?.facial ?? "Facial hair",
      count: options.beard.length,
      note: options.beard[fitted.beard]?.geosets.every((x) => x === 0)
        ? "none"
        : undefined,
    },
  ];

  const sexName = r?.genders.find((x) => x.gender === gender)?.name ?? "Body";

  return (
    <div className={styles.creator}>
      {backdrop ? (
        <img
          key={backdrop.id}
          className={styles.art}
          src={roomArt(backdrop.id)}
          alt=""
        />
      ) : null}
      <div className={styles.scrim} />
      <div ref={hostRef} className={styles.doll} />

      {/* ---- left: the panel, top to bottom as the client stacks it */}
      <section className={styles.panel} aria-label="Who you are">
        <div className={styles.choices}>
          <label className={`${styles.card} ${styles.paste}`}>
            <span className={styles.eyebrow}>Import</span>
            <input
              type="text"
              value={paste}
              placeholder="Paste what /tari gave you"
              spellCheck={false}
              onChange={(e) => readPaste(e.currentTarget.value)}
            />
            {pasteFault ? (
              <span className={styles.fault}>{pasteFault}</span>
            ) : null}
          </label>

          <div className={`${styles.card} ${styles.banners}`}>
            {(["Alliance", "Horde"] as const).map((side) => (
              <div
                key={side}
                className={styles.banner}
                data-side={side.toLowerCase()}
              >
                <p className={styles.bannerHead}>
                  <img
                    src={crestIcon(side.toLowerCase() as "alliance" | "horde")}
                    alt=""
                    width={16}
                    height={16}
                  />
                  {side}
                </p>
                <div className={styles.column}>
                  {roster[side].map((x) => (
                    <button
                      key={x.race}
                      type="button"
                      className={styles.portrait}
                      aria-label={x.name}
                      aria-pressed={x.race === race}
                      disabled={fromGame}
                      onClick={() => setRace(x.race)}
                    >
                      <img
                        src={racePortrait(x.race, gender)}
                        alt=""
                        width={64}
                        height={64}
                        draggable={false}
                      />
                      {x.race === race ? (
                        <span className={styles.pickName}>{x.name}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`${styles.card} ${styles.body}`}>
            <div className={styles.group}>
              <p className={styles.groupHead}>{sexName}</p>
              <div className={styles.marks}>
                {r?.genders.map((x) => (
                  <button
                    key={x.gender}
                    type="button"
                    className={styles.mark}
                    aria-label={x.name}
                    aria-pressed={x.gender === gender}
                    onClick={() => setGender(x.gender)}
                  >
                    <img
                      src={sexIcon(x.gender)}
                      alt=""
                      width={64}
                      height={64}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <p className={styles.groupHead}>{CLASS_NAME[cls]}</p>
              <div className={styles.marks}>
                {classes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.mark}
                    aria-label={CLASS_NAME[c]}
                    aria-pressed={c === cls}
                    disabled={fromGame}
                    onClick={() => setCls(c)}
                  >
                    <img
                      src={classIcon(c)}
                      alt=""
                      width={64}
                      height={64}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className={`${styles.card} ${styles.steps}`}>
            {/* Level is Tari's row, not the game's: the client never asks,
                because it already knows. */}
            <li className={styles.step}>
              <span className={styles.stepBody}>
                <span className={styles.stepLabel}>Level</span>
                <input
                  className={styles.levelField}
                  type="text"
                  inputMode="numeric"
                  value={levelText}
                  aria-label="Level"
                  onChange={(e) =>
                    setLevelText(
                      e.currentTarget.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  onBlur={() => setLevelText(String(level))}
                />
              </span>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => stepLevel(-1)}
                aria-label="Lower the level"
              >
                ‹
              </button>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => stepLevel(1)}
                aria-label="Raise the level"
              >
                ›
              </button>
            </li>

            {rows.map((row) => (
              <li key={row.key} className={styles.step}>
                <span className={styles.stepBody}>
                  <span className={styles.stepLabel}>{row.label}</span>
                  {row.hex ? (
                    <span
                      className={styles.swatch}
                      style={{ background: row.hex }}
                    />
                  ) : null}
                  {row.note ? (
                    <span className={styles.stepNote}>{row.note}</span>
                  ) : null}
                  <span className={styles.stepCount}>
                    {row.count === 0
                      ? "—"
                      : `${fitted[row.key] + 1}/${row.count}`}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.arrow}
                  disabled={row.count === 0}
                  onClick={() => step(row.key, -1, row.count)}
                  aria-label={`Previous ${row.label}`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.arrow}
                  disabled={row.count === 0}
                  onClick={() => step(row.key, 1, row.count)}
                  aria-label={`Next ${row.label}`}
                >
                  ›
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button type="button" className={styles.quiet} onClick={rollLook}>
          Randomize look
        </button>
      </section>

      {/* ---- right: the two placards, and the two buttons under them. Where
           the client puts its logo, the shell already has Tari's. */}
      <aside className={styles.side}>
        <div className={styles.placards}>
          <article className={`${styles.card} ${styles.placard}`}>
            <header className={styles.placardHead}>
              <img
                className={styles.badge}
                src={racePortrait(race, gender)}
                alt=""
                width={64}
                height={64}
              />
              <h2 className={styles.placardName}>{r?.name ?? ""}</h2>
            </header>
            <p className={styles.line}>{RACE_LINE[race]}</p>
            {backdrop ? (
              <p className={styles.where}>You wake up in {backdrop.name}.</p>
            ) : null}
          </article>

          <article className={`${styles.card} ${styles.placard}`}>
            <header className={styles.placardHead}>
              <img
                className={styles.badge}
                src={classIcon(cls)}
                alt=""
                width={64}
                height={64}
              />
              <h2 className={styles.placardName}>{CLASS_NAME[cls]}</h2>
            </header>
            <p className={styles.line}>{CLASS_LINE[cls]}</p>
            {worn.length > 0 ? (
              <ul className={styles.worn}>
                {worn.map(({ at, item }) => (
                  <li key={at} style={{ color: QUALITY[item.quality] }}>
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          {mine.length > 0 ? (
            <section
              className={`${styles.card} ${styles.roster}`}
              aria-label="Your characters"
            >
              <p className={styles.eyebrow}>Characters</p>
              <ul className={styles.crew}>
                {mine.map((c) => (
                  <li
                    key={c.key}
                    className={styles.crewRow}
                    data-on={c.key === existing?.key || undefined}
                  >
                    <button
                      type="button"
                      className={styles.crewPick}
                      aria-label={`Play ${c.name}, level ${c.level} ${RACE_NAME[c.race]} ${CLASS_NAME[c.cls]}`}
                      aria-pressed={c.key === existing?.key}
                      onClick={() => switchTo(c)}
                    >
                      <img
                        src={classIcon(c.cls)}
                        alt=""
                        width={64}
                        height={64}
                        draggable={false}
                      />
                      <span className={styles.crewText}>
                        <span className={styles.crewName}>{c.name}</span>
                        <span className={styles.crewMeta}>
                          Level {c.level} {RACE_NAME[c.race]}{" "}
                          {CLASS_NAME[c.cls]}
                          {c.realm ? ` · ${c.realm}` : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.crewDrop}
                      onClick={() => drop(c.key)}
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={styles.crewNew}
                data-on={!existing || undefined}
                onClick={startNew}
              >
                New character
              </button>
            </section>
          ) : null}
        </div>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.accept}
            disabled={!ok}
            onClick={accept}
          >
            Accept
          </button>
          {existing ? (
            <Link href="/you" className={styles.quiet}>
              Back
            </Link>
          ) : null}
        </div>
      </aside>

      {/* ---- bottom centre: the name, and the two turn arrows */}
      <footer className={styles.foot}>
        <p className={styles.eyebrow}>Name</p>
        <input
          className={styles.name}
          type="text"
          value={name}
          maxLength={12}
          placeholder="Unnamed"
          spellCheck={false}
          autoComplete="off"
          readOnly={nameLocked}
          onChange={(e) =>
            setName(e.currentTarget.value.replace(/[^A-Za-zÀ-ÿ]/g, ""))
          }
        />
        {nameLocked ? null : (
          <button
            type="button"
            className={styles.quiet}
            onClick={() => setName(rollName())}
          >
            Randomize name
          </button>
        )}
        <div className={styles.turn}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => spin(-0.4)}
            aria-label="Turn left"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => spin(0.4)}
            aria-label="Turn right"
          >
            ›
          </button>
        </div>
        {error ? <p className={styles.fault}>{error}</p> : null}
      </footer>
    </div>
  );
}
