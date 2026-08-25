"use client";

/* THE CREATOR. Modelled on the game's own creation screen, in Tari's
 * register (docs/CHARACTER.md, "The creator").
 *
 * Four places, like the room: who you are on the left (race, body, class,
 * the five rows), the doll in the middle on the race's starting zone, one
 * placard on the right, the name and Accept at the bottom. Import is a
 * field above the races: paste the addon's string and everything it knows
 * is set. */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { QUALITY, ROW_LABELS } from "@/lib/doll";
import {
  CLASS_LINE,
  CLASS_NAME,
  CLASSES_OF,
  FACTION_OF,
  RACE_LINE,
  RACE_TOKEN,
  rollName,
  saveCharacter,
  START_ROOM,
  validName,
  type Character,
} from "@/lib/character";
import { parseImport, type ParsedCharacter } from "@/lib/import";
import type { ClassId } from "@/lib/loot";
import { getRoom, roomArt } from "@/lib/rooms";
import { DEFAULT_LOOK, useBody, wrap, type Look } from "@/lib/use-body";
import { itemsBySlot, type Item as WardrobeItem } from "@/lib/wardrobe";

import styles from "./creator.module.css";

const NO_GEAR = new Map<string, WardrobeItem>();

export default function Creator() {
  const router = useRouter();
  const [race, setRace] = useState(1);
  const [gender, setGender] = useState(0);
  const [cls, setCls] = useState<ClassId>("warrior");
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [name, setName] = useState("");
  const [imported, setImported] = useState<ParsedCharacter | null>(null);
  const [paste, setPaste] = useState("");
  const [pasteFault, setPasteFault] = useState<string | null>(null);
  const [equipped, setEquipped] = useState<Map<string, WardrobeItem>>(NO_GEAR);

  const { hostRef, roster, r, options, fitted, catalogue, error } = useBody({ race, gender, look, equipped });

  /* A class the race cannot be falls back to the first it can. */
  const classes = CLASSES_OF[race] ?? [];
  useEffect(() => {
    if (!classes.includes(cls)) setCls(classes[0]);
  }, [classes, cls]);

  /* The wardrobe by item id, for import. Built once per catalogue. */
  const byEntry = useMemo(() => {
    const map = new Map<number, WardrobeItem>();
    if (catalogue) for (const rows of itemsBySlot(catalogue).values()) for (const item of rows) map.set(item.entry, item);
    return map;
  }, [catalogue]);

  /* Imported gear, dressed once the wardrobe is in. */
  useEffect(() => {
    if (!imported || byEntry.size === 0) return;
    const worn = new Map<string, WardrobeItem>();
    for (const id of imported.gear) {
      const item = id ? byEntry.get(id) : undefined;
      if (item) worn.set(item.slot, item);
    }
    setEquipped(worn);
  }, [imported, byEntry]);

  const backdrop = getRoom(START_ROOM[race] ?? "elwynn-forest");

  const step = (key: keyof Look, by: number, count: number) =>
    setLook((prev) => ({ ...prev, [key]: wrap(fitted[key] + by, count) }));

  const roll = () => {
    const pick = (n: number) => (n ? Math.floor(Math.random() * n) : 0);
    setLook({
      skin: pick(options.skin.length),
      face: pick(options.face.length),
      hair: pick(options.hair.length),
      hairColor: pick(options.hairColor.length),
      beard: pick(options.beard.length),
    });
    if (!imported) setName(rollName());
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
    if (c.name) setName(c.name);
    if (c.race && RACE_TOKEN[c.race]) setRace(RACE_TOKEN[c.race]);
    if (c.sex) setGender(c.sex === 3 ? 1 : 0);
  };

  const ok = validName(name) && classes.includes(cls);

  const accept = () => {
    if (!ok) return;
    const character: Character = {
      key: imported?.realm && imported.name ? `${imported.realm}/${imported.name}` : `local/${crypto.randomUUID()}`,
      name,
      realm: imported?.realm ?? null,
      race,
      sex: gender === 1 ? 1 : 0,
      cls,
      faction: FACTION_OF[race],
      level: imported?.level ?? 1,
      look: fitted,
      gear: imported?.gear ?? [],
      importedAt: imported ? new Date().toISOString() : null,
      guild: imported?.guild ?? null,
      played: imported?.played ?? null,
      copper: imported?.copper ?? null,
      hearth: imported?.hearth ?? null,
      zone: imported?.zone ?? null,
      professions: imported?.professions ?? [],
    };
    saveCharacter(character);
    router.push(`/r/${START_ROOM[race]}?class=${cls}&at=${character.level}`);
  };

  const rows: { key: keyof Look; label: string; count: number; hex?: string; note?: string }[] = [
    { key: "skin", label: "Skin", count: options.skin.length, hex: options.skin[fitted.skin]?.hex },
    { key: "face", label: "Face", count: options.face.length },
    {
      key: "hair",
      label: ROW_LABELS[race]?.hair ?? "Hair",
      count: options.hair.length,
      note: options.hair[fitted.hair]?.geoset === 0 ? "bald" : undefined,
    },
    { key: "hairColor", label: `${ROW_LABELS[race]?.hair ?? "Hair"} colour`, count: options.hairColor.length, hex: options.hairColor[fitted.hairColor]?.hex },
    {
      key: "beard",
      label: ROW_LABELS[race]?.facial ?? "Facial hair",
      count: options.beard.length,
      note: options.beard[fitted.beard]?.geosets.every((x) => x === 0) ? "none" : undefined,
    },
  ];

  return (
    <div className={styles.creator}>
      {backdrop ? <img key={backdrop.id} className={styles.art} src={roomArt(backdrop.id)} alt="" /> : null}
      <div className={styles.scrim} />
      <div ref={hostRef} className={styles.doll} />

      {/* ---- left: who you are */}
      <section className={styles.who} aria-label="Who you are">
        <label className={styles.paste}>
          <span className={styles.eyebrow}>Import</span>
          <input
            type="text"
            value={paste}
            placeholder="Paste what /tari gave you"
            spellCheck={false}
            onChange={(e) => readPaste(e.currentTarget.value)}
          />
          {pasteFault ? <span className={styles.fault}>{pasteFault}</span> : null}
          {imported ? (
            <span className={styles.note}>
              {imported.name ?? "Your character"}, {imported.level} {CLASS_NAME[imported.cls]}
              {imported.realm ? ` · ${imported.realm}` : ""}. Pick a look.
            </span>
          ) : null}
        </label>

        {(["Alliance", "Horde"] as const).map((side) => (
          <div key={side} className={styles.side} data-side={side.toLowerCase()}>
            <p className={styles.eyebrow}>{side}</p>
            <div className={styles.chips}>
              {roster[side].map((x) => (
                <button
                  key={x.race}
                  type="button"
                  className={styles.chip}
                  aria-pressed={x.race === race}
                  disabled={!!imported?.race}
                  onClick={() => setRace(x.race)}
                >
                  {x.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.row}>
          <p className={styles.eyebrow}>Body</p>
          <div className={styles.chips}>
            {r?.genders.map((x) => (
              <button
                key={x.gender}
                type="button"
                className={styles.chip}
                aria-pressed={x.gender === gender}
                disabled={!!imported?.sex}
                onClick={() => setGender(x.gender)}
              >
                {x.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <p className={styles.eyebrow}>Class</p>
          <div className={styles.chips}>
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.chip}
                aria-pressed={c === cls}
                disabled={!!imported}
                onClick={() => setCls(c)}
              >
                {CLASS_NAME[c]}
              </button>
            ))}
          </div>
        </div>

        <ul className={styles.steps}>
          {rows.map((row) => (
            <li key={row.key} className={styles.step}>
              <span className={styles.stepLabel}>{row.label}</span>
              {row.count === 0 ? (
                <span className={styles.stepEmpty}>none for this body</span>
              ) : (
                <>
                  {row.hex ? <span className={styles.swatch} style={{ background: row.hex }} /> : null}
                  {row.note ? <span className={styles.stepNote}>{row.note}</span> : null}
                  <span className={styles.stepCount}>
                    {fitted[row.key] + 1}/{row.count}
                  </span>
                  <button type="button" className={styles.arrow} onClick={() => step(row.key, -1, row.count)} aria-label={`Previous ${row.label}`}>
                    ‹
                  </button>
                  <button type="button" className={styles.arrow} onClick={() => step(row.key, 1, row.count)} aria-label={`Next ${row.label}`}>
                    ›
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- right: the placard */}
      <aside className={styles.placard} aria-label="About this choice">
        <p className={styles.eyebrow}>{r?.name ?? ""}</p>
        <p className={styles.line}>{RACE_LINE[race]}</p>
        <p className={`${styles.eyebrow} ${styles.later}`}>{CLASS_NAME[cls]}</p>
        <p className={styles.line}>{CLASS_LINE[cls]}</p>
        {backdrop ? <p className={styles.where}>You wake up in {backdrop.name}.</p> : null}
        {equipped.size > 0 ? (
          <ul className={styles.worn}>
            {[...equipped.values()].map((i) => (
              <li key={i.entry} style={{ color: QUALITY[i.quality] }}>
                {i.name}
              </li>
            ))}
          </ul>
        ) : null}
      </aside>

      {/* ---- bottom: the name */}
      <footer className={styles.foot}>
        <input
          className={styles.name}
          type="text"
          value={name}
          maxLength={12}
          placeholder="Name"
          spellCheck={false}
          autoComplete="off"
          readOnly={!!imported?.name}
          onChange={(e) => setName(e.currentTarget.value.replace(/[^A-Za-zÀ-ÿ]/g, ""))}
        />
        <div className={styles.buttons}>
          <button type="button" className={styles.quiet} onClick={roll}>
            Roll
          </button>
          <button type="button" className={styles.accept} disabled={!ok} onClick={accept}>
            Accept
          </button>
        </div>
        {error ? <p className={styles.fault}>{error}</p> : null}
      </footer>
    </div>
  );
}
