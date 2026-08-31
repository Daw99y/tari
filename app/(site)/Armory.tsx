"use client";

/* The armory door, on the landing page. docs/ARMORY-FINDING.md.
 *
 * Blizzard put Classic on the official armory just before BlizzCon 2026, and
 * the Battle.net profile API turned out to already serve Era, Hardcore and
 * Anniversary. `/api/armory` has read it since 08-30 and it needs no user
 * OAuth — which means this section does not have to *describe* the front
 * door. It can be the front door: the reader types a name and their own
 * character comes back, before they have signed in or downloaded anything.
 *
 * The example is load-bearing. Most people who scroll past will not type
 * their own character — some do not play any more — so the section arrives
 * with one already filled in and works on the first press. A demo nobody
 * triggers is a screenshot. */

import { useCallback, useEffect, useRef, useState } from "react";

import { CLASS_COLOR } from "@/lib/class-color";
import { CLASS_NAME, RACE_NAME, racePortrait } from "@/lib/character";
import type { ClassId } from "@/lib/types";

import styles from "./armory.module.css";

type Found = {
  name: string;
  realm: string;
  region: string;
  race: number;
  sex: 0 | 1;
  cls: string;
  faction: "alliance" | "horde";
  level: number;
  guild: string | null;
  gear: number[];
};

const REGIONS = [
  ["us", "US"],
  ["eu", "EU"],
  ["kr", "KR"],
  ["tw", "TW"],
] as const;

/* Proved live on 2026-08-30 and the one in ARMORY-FINDING.md, so if this
 * stops working the section is telling the truth about the API rather than
 * hiding a fault behind a mock. */
const EXAMPLE = { name: "Cybyr", realm: "Whitemane", region: "us" };

export default function Armory() {
  const [name, setName] = useState(EXAMPLE.name);
  const [realm, setRealm] = useState(EXAMPLE.realm);
  const [region, setRegion] = useState<string>(EXAMPLE.region);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const seq = useRef(0);

  const look = useCallback(async () => {
    if (!name.trim() || !realm.trim()) return;
    const mine = ++seq.current;
    setBusy(true);
    setFault(null);
    try {
      const q = new URLSearchParams({ region, realm: realm.trim(), name: name.trim() });
      const res = await fetch(`/api/armory?${q}`);
      const data = await res.json();
      if (seq.current !== mine) return;
      if (!res.ok) {
        setFound(null);
        setFault(data.error ?? "The armory did not answer");
      } else {
        setFound(data as Found);
      }
    } catch {
      if (seq.current === mine) setFault("The armory did not answer");
    } finally {
      if (seq.current === mine) setBusy(false);
    }
  }, [name, realm, region]);

  /* Answer once on first sight, so the section is already showing a character
   * by the time it is read rather than an empty box asking for work. */
  const armed = useRef(false);
  useEffect(() => {
    if (armed.current) return;
    armed.current = true;
    void look();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = (found?.cls ?? "warrior") as ClassId;
  const worn = found ? found.gear.filter(Boolean).length : 0;

  return (
    <div className={styles.wrap}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void look();
        }}
      >
        <label className={styles.field}>
          <span>Character</span>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
          />
        </label>
        <label className={styles.field}>
          <span>Realm</span>
          <input
            value={realm}
            onChange={(e) => setRealm(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
          />
        </label>
        <label className={`${styles.field} ${styles.narrow}`}>
          <span>Region</span>
          <select value={region} onChange={(e) => setRegion(e.currentTarget.value)}>
            {REGIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.go} disabled={busy}>
          {busy ? "Asking Blizzard…" : "Look me up"}
        </button>
      </form>

      <div className={styles.answer} aria-live="polite">
        {found ? (
          <figure className={styles.card} style={{ ["--cls" as string]: CLASS_COLOR[cls] }}>
            <img
              className={styles.portrait}
              src={racePortrait(found.race, found.sex)}
              alt=""
              width={120}
              height={120}
              loading="lazy"
            />
            <figcaption>
              <strong>{found.name}</strong>
              <span className={styles.line}>
                Level {found.level} {RACE_NAME[found.race] ?? ""} {CLASS_NAME[cls]}
              </span>
              <span className={styles.meta}>
                {found.guild ? `⟨${found.guild}⟩ · ` : ""}
                {found.realm} · {found.region.toUpperCase()}
              </span>
              <span className={styles.slots}>{worn} of 19 slots read</span>
            </figcaption>
          </figure>
        ) : fault ? (
          <p className={styles.fault}>{fault}</p>
        ) : (
          <p className={styles.fault}>&nbsp;</p>
        )}
      </div>
    </div>
  );
}
