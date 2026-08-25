"use client";

/* The fitting bench.
 *
 * Two panels flanking one figure. On the left, who the character is: the same
 * five choices the game's own creation screen offers, in the same order. On
 * the right, what the machine is doing — what they are wearing, and every mesh
 * chunk the file holds, so a wrong dressing rule is visible rather than
 * mysterious.
 *
 * The figure itself is lib/use-body.ts, shared with the creator. This file
 * is only the panels. */

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { QUALITY, ROW_LABELS, SLOT_LABEL, SLOT_ORDER } from "@/lib/doll";
import { DEFAULT_LOOK, useBody, wrap, type Look } from "@/lib/use-body";
import { itemsBySlot, WARDROBE, type Item as WardrobeItem } from "@/lib/wardrobe";

import styles from "./doll.module.css";

export default function Doll() {
  const [race, setRace] = useState(1);
  const [gender, setGender] = useState(0);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [equipped, setEquipped] = useState<Map<string, WardrobeItem>>(new Map());
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [leftovers, setLeftovers] = useState(false);
  const [regionMap, setRegionMap] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { hostRef, roster, r, options, fitted, catalogue, wardrobeFault, error, tris, families, hidden, ruled, shown } =
    useBody({ race, gender, look, equipped, regionMap, showAll, overrides });

  /* Every item that fits each slot, so the picker only has to filter by name. */
  const bySlot = useMemo(() => (catalogue ? itemsBySlot(catalogue) : new Map()), [catalogue]);

  /* At most this many rows, or a picker for the 674 two-handers spends longer
   * laying out than the scene does drawing. */
  const results = useMemo(() => {
    if (!picking) return { rows: [] as WardrobeItem[], total: 0, hidden: 0 };
    const all: WardrobeItem[] = bySlot.get(picking) ?? [];
    const q = query.trim().toLowerCase();
    const named = q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all;
    const hits = leftovers ? named : named.filter((i) => !i.leftover);
    return { rows: hits.slice(0, 120), total: hits.length, hidden: named.length - hits.length };
  }, [bySlot, picking, query, leftovers]);

  const slotCount = useCallback(
    (slot: string) => (bySlot.get(slot) ?? []).filter((i: WardrobeItem) => leftovers || !i.leftover).length,
    [bySlot, leftovers],
  );

  /* ---------- controls ---------- */

  const step = useCallback(
    (key: keyof Look, by: number, count: number) => setLook((prev) => ({ ...prev, [key]: wrap(fitted[key] + by, count) })),
    [fitted],
  );

  const randomise = () => {
    const pick = (n: number) => (n ? Math.floor(Math.random() * n) : 0);
    setLook({
      skin: pick(options.skin.length),
      face: pick(options.face.length),
      hair: pick(options.hair.length),
      hairColor: pick(options.hairColor.length),
      beard: pick(options.beard.length),
    });
  };

  const equip = (item: WardrobeItem) => {
    setEquipped((prev) => new Map(prev).set(item.slot, item));
    setPicking(null);
    setQuery("");
  };

  const takeOff = (slot: string) =>
    setEquipped((prev) => {
      const next = new Map(prev);
      next.delete(slot);
      return next;
    });

  const rows: { key: keyof Look; label: string; count: number; value: ReactNode }[] = [
    { key: "skin", label: "Skin", count: options.skin.length, value: <Swatch hex={options.skin[fitted.skin]?.hex} /> },
    { key: "face", label: "Face", count: options.face.length, value: null },
    {
      key: "hair",
      label: ROW_LABELS[race]?.hair ?? "Hair",
      count: options.hair.length,
      value: options.hair[fitted.hair]?.geoset === 0 ? <span className={styles.stepNote}>bald</span> : null,
    },
    {
      key: "hairColor",
      label: `${ROW_LABELS[race]?.hair ?? "Hair"} colour`,
      count: options.hairColor.length,
      value: <Swatch hex={options.hairColor[fitted.hairColor]?.hex} />,
    },
    {
      key: "beard",
      label: ROW_LABELS[race]?.facial ?? "Facial hair",
      count: options.beard.length,
      value: options.beard[fitted.beard]?.geosets.every((x) => x === 0) ? (
        <span className={styles.stepNote}>none</span>
      ) : null,
    },
  ];

  return (
    <div className={styles.bench}>
      <div className={styles.stage}>
        <div ref={hostRef} className={styles.viewport} />

        <section className={styles.creator} aria-label="Character">
          <div className={styles.roster}>
            {(["Alliance", "Horde"] as const).map((side) => (
              <div key={side} className={styles.side}>
                <p className={styles.sideName}>{side}</p>
                {roster[side].map((x) => (
                  <button
                    key={x.race}
                    type="button"
                    className={x.race === race ? `${styles.race} ${styles.raceOn}` : styles.race}
                    onClick={() => setRace(x.race)}
                    aria-pressed={x.race === race}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.genders} role="group" aria-label="Body">
            {r?.genders.map((x) => (
              <button
                key={x.gender}
                type="button"
                className={x.gender === gender ? `${styles.gender} ${styles.genderOn}` : styles.gender}
                onClick={() => setGender(x.gender)}
                aria-pressed={x.gender === gender}
              >
                {x.name}
              </button>
            ))}
          </div>

          <ul className={styles.steps}>
            {rows.map((row) => (
              <li key={row.key}>
                <div className={styles.step}>
                  <span className={styles.stepLabel}>{row.label}</span>
                  {row.count === 0 ? (
                    <span className={styles.stepEmpty}>none for this body</span>
                  ) : (
                    <>
                      {row.value}
                      <span className={styles.stepCount}>
                        {fitted[row.key] + 1}/{row.count}
                      </span>
                      <button
                        type="button"
                        className={styles.arrow}
                        onClick={() => step(row.key, -1, row.count)}
                        aria-label={`Previous ${row.label.toLowerCase()}`}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className={styles.arrow}
                        onClick={() => step(row.key, 1, row.count)}
                        aria-label={`Next ${row.label.toLowerCase()}`}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <button type="button" className={styles.randomise} onClick={randomise}>
            Randomise
          </button>
        </section>

        {error ? <p className={styles.fault}>{error}</p> : null}
        <p className={styles.hint}>
          Drag to turn. Scroll to move closer.
          {tris ? <span className={styles.count}>{tris.toLocaleString()} triangles</span> : null}
        </p>
      </div>

      <aside className={styles.rail}>
        <section>
          <h2 className={styles.railHead}>Equipment</h2>
          {wardrobeFault ? (
            <p className={styles.empty}>
              No wardrobe. Run <code className={styles.code}>node scripts/doll-items.mjs</code> to build it.
            </p>
          ) : !catalogue ? (
            <p className={styles.empty}>Reading the wardrobe…</p>
          ) : picking ? (
            <div className={styles.picker}>
              <div className={styles.pickerHead}>
                <button type="button" className={styles.back} onClick={() => setPicking(null)}>
                  ‹ Slots
                </button>
                <span className={styles.pickerSlot}>{SLOT_LABEL[picking]}</span>
              </div>
              <input
                className={styles.search}
                type="search"
                autoFocus
                value={query}
                placeholder={`Search ${slotCount(picking)} items`}
                onChange={(e) => setQuery(e.currentTarget.value)}
              />
              <ul className={styles.results}>
                {results.rows.map((item) => (
                  <li key={item.entry}>
                    <button type="button" className={styles.result} onClick={() => equip(item)}>
                      <Icon file={item.icon} />
                      <span className={styles.resultName} style={{ color: QUALITY[item.quality] }}>
                        {item.name}
                      </span>
                      <span className={styles.resultLevel}>{item.itemLevel || ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {results.total > results.rows.length ? (
                <p className={styles.railNote}>
                  {results.total - results.rows.length} more. Type to narrow it down.
                </p>
              ) : null}
              {results.total === 0 ? <p className={styles.railNote}>Nothing by that name.</p> : null}
              {results.hidden ? (
                <button type="button" className={styles.reset} onClick={() => setLeftovers(true)}>
                  Show {results.hidden} developer leftover{results.hidden === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <ul className={styles.slots}>
                {SLOT_ORDER.map((slot) => {
                  const item = equipped.get(slot);
                  const count = slotCount(slot);
                  return (
                    <li key={slot} className={styles.slotRow}>
                      <button
                        type="button"
                        className={styles.slotPick}
                        disabled={!count}
                        onClick={() => {
                          setPicking(slot);
                          setQuery("");
                        }}
                      >
                        <Icon file={item?.icon ?? null} />
                        <span className={styles.slotName}>{SLOT_LABEL[slot]}</span>
                        {item ? (
                          <span className={styles.slotItem} style={{ color: QUALITY[item.quality] }}>
                            {item.name}
                          </span>
                        ) : (
                          <span className={styles.slotCount}>{count || "—"}</span>
                        )}
                      </button>
                      {item ? (
                        <button
                          type="button"
                          className={styles.takeOff}
                          aria-label={`Take off ${SLOT_LABEL[slot]}`}
                          onClick={() => takeOff(slot)}
                        >
                          ×
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {equipped.size ? (
                <button type="button" className={styles.reset} onClick={() => setEquipped(new Map())}>
                  Take it all off
                </button>
              ) : null}
              <label className={styles.slot}>
                <input
                  type="checkbox"
                  aria-label="Show developer leftovers"
                  checked={leftovers}
                  onChange={(e) => setLeftovers(e.currentTarget.checked)}
                />
                <span className={styles.slotName}>Show developer leftovers</span>
              </label>
              <p className={styles.railNote}>
                {catalogue.items.filter((i) => leftovers || i[6] !== 1).length.toLocaleString()} items out of the
                client. Placeholders, balance tests and deprecated rows are real entries in the item table and are
                held back until asked for.
              </p>
              {catalogue.untrusted ? (
                <p className={styles.railNote}>
                  A further {catalogue.untrusted.toLocaleString()} are missing: the item table names a look the
                  client&rsquo;s files do not carry, so there is nothing honest to draw.
                </p>
              ) : null}
            </>
          )}
        </section>

        <section>
          <h2 className={styles.railHead}>Skin layout</h2>
          <label className={styles.slot}>
            <input
              type="checkbox"
              aria-label="Show region map"
              checked={regionMap}
              onChange={(e) => setRegionMap(e.currentTarget.checked)}
            />
            <span className={styles.slotName}>Show region map</span>
          </label>
          <p className={styles.railNote}>
            One flat colour per 128×32 slot of the 256×256 body skin. Use it to check which slot paints which body
            part.
          </p>
        </section>

        <section>
          <h2 className={styles.railHead}>Mesh chunks</h2>
          <p className={styles.railNote}>
            Every geoset in the file, by family. The bar is its triangle count. Switch one on to check a rule.
          </p>
          <label className={styles.slot}>
            <input
              type="checkbox"
              aria-label="Draw every chunk"
              checked={showAll}
              onChange={(e) => setShowAll(e.currentTarget.checked)}
            />
            <span className={styles.slotName}>Draw every chunk</span>
          </label>
          {overrides.size ? (
            <button type="button" className={styles.reset} onClick={() => setOverrides(new Map())}>
              Drop {overrides.size} manual change{overrides.size === 1 ? "" : "s"}
            </button>
          ) : null}

          {families.map((f) => (
            <div key={f.family} className={styles.family}>
              <p className={styles.familyName}>
                <span className={styles.familyKey}>{f.family === 0 ? "0" : `${f.family}xx`}</span>
                {f.name}
                {hidden.has(f.family) ? (
                  <span className={styles.hiddenTag}>
                    {hidden.get(f.family)!.slot} hides {hidden.get(f.family)!.group}
                  </span>
                ) : null}
              </p>
              <ul className={styles.geosets}>
                {f.rows.map((r) => {
                  const forced = shown.has(r.geoset) && !ruled.has(r.geoset);
                  return (
                    <li key={r.geoset}>
                      <label
                        className={[styles.geoset, shown.has(r.geoset) ? styles.on : "", forced ? styles.forced : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Geoset ${r.geoset}`}
                          checked={shown.has(r.geoset)}
                          onChange={(e) => {
                            // Read the event before the updater runs: React has
                            // cleared `currentTarget` by then.
                            const on = e.currentTarget.checked;
                            setOverrides((prev) => new Map(prev).set(r.geoset, on));
                          }}
                        />
                        <span className={styles.geosetId}>{r.geoset}</span>
                        <span className={styles.bar} style={{ ["--fill" as string]: `${(r.tris / f.max) * 100}%` }} />
                        <span className={styles.geosetTris}>{r.tris}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

/** An item's icon, straight out of Interface\\Icons. A slot with nothing in it
 *  keeps the same square so the rows do not jump when gear goes on. */
function Icon({ file }: { file: string | null }) {
  if (!file) return <span className={styles.iconEmpty} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- one 64px sprite out
  // of the client, no layout shift to guard against and no loader to pay for.
  return <img className={styles.icon} src={`${WARDROBE}/icons/${file}`} alt="" width={22} height={22} />;
}

function Swatch({ hex }: { hex?: string }) {
  if (!hex) return null;
  return <span className={styles.stepSwatch} style={{ background: hex }} aria-hidden />;
}
