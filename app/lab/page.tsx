/* /lab — the specimen drawer.
 *
 * The real status-effect models from a 1.12 client, read in the browser
 * straight from the .m2 files in public/lab/m2. This page exists so the icon
 * vocabulary in docs/TARI.md §7 can be chosen from the actual objects, not
 * from memory. It is a working surface, not a shipped page. */

import type { Metadata } from "next";

import Specimen, { type SpecimenInfo } from "./Specimen";
import styles from "./lab.module.css";

export const metadata: Metadata = {
  title: "Lab · Tari",
  description: "Vanilla spell visuals, read from the client.",
  robots: { index: false, follow: false },
};

const SPECIMENS: SpecimenInfo[] = [
  {
    file: "Taunt_Head.m2",
    archive: "model.MPQ › Spells\\Taunt_Head.m2",
    title: "Taunt, over the head",
    inGame: "Three red spikes point down at a mob the moment it is taunted. It has noticed you and it is coming.",
    inTari: "Candidate for the pin marker. You noticed something; it is worth stopping for.",
  },
  {
    file: "TalkToMe.m2",
    archive: "interface.MPQ › Interface\\Buttons\\TalkToMe.m2",
    title: "Quest available",
    inGame: "The yellow exclamation over a quest giver. A task is waiting for you.",
    inTari: "Guide language. Kept here for contrast; not the pin marker.",
  },
  {
    file: "Sap_State_Head.m2",
    archive: "model.MPQ › Spells\\Sap_State_Head.m2",
    title: "Sapped",
    inGame: "Stars over the head. You cannot act.",
    inTari: "You stopped and looked.",
  },
  {
    file: "Sleep_State_Head.m2",
    archive: "model.MPQ › Spells\\Sleep_State_Head.m2",
    title: "Asleep",
    inGame: "Green Z’s over the head.",
    inTari: "Rested. The game itself paying you to stop.",
  },
  {
    file: "EntanglingRoots_State.m2",
    archive: "model.MPQ › Spells\\EntanglingRoots_State.m2",
    title: "Rooted",
    inGame: "Vines hold you in place.",
    inTari: "You stayed somewhere.",
  },
  {
    file: "Fear_State_Base.m2",
    archive: "model.MPQ › Spells\\Fear_State_Base.m2",
    title: "Feared, at the feet",
    inGame: "You run around uncontrollably at speed.",
    inTari: "The route tools.",
  },
  {
    file: "StunSwirl_State_Head.m2",
    archive: "model.MPQ › Spells\\StunSwirl_State_Head.m2",
    title: "Stunned",
    inGame: "The swirl over the head.",
    inTari: "Unassigned.",
  },
  {
    file: "Confused_State_Head.m2",
    archive: "patch.MPQ › SPELLS\\Confused_State_Head.m2",
    title: "Disoriented",
    inGame: "Over the head while you wander.",
    inTari: "Unassigned.",
  },
  {
    file: "Seduction_State_Head.m2",
    archive: "model.MPQ › Spells\\Seduction_State_Head.m2",
    title: "Seduced",
    inGame: "Hearts over the head.",
    inTari: "Unassigned.",
  },
  {
    file: "Taunt_Cast.m2",
    archive: "model.MPQ › Spells\\Taunt_Cast.m2",
    title: "Taunt, the cast",
    inGame: "The caster’s half of Taunt, at the base.",
    inTari: "Unassigned.",
  },
];

const PARTICLES_ONLY = [
  { file: "Fear_State_Head.m2", title: "Feared, over the head", textures: "SPELLS\\SHOCKWAVE9.BLP" },
  { file: "ShadowWordSilence_Breath.m2", title: "Silenced", textures: "Spells\\Gradient64FlipB.blp · World\\SkillActivated\\Containers\\Flare.blp" },
  { file: "Slow_Impact_Base.m2", title: "Slowed", textures: "PARTICLES\\TAIL_DUST3.BLP · SPELLS\\SHOCKWAVE1BGREY.BLP" },
  { file: "Polymorph_Impact.m2", title: "Polymorphed", textures: "Spells\\Clouds8x8Fade.blp · World\\SkillActivated\\Containers\\Sparkle.blp" },
  { file: "Disarm_Impact_Chest.m2", title: "Disarmed", textures: "World\\SkillActivated\\Containers\\Flare.blp" },
];

export default function LabPage() {
  return (
    <main className={styles.lab}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Tari · lab</p>
        <h1 className={styles.h1}>The status effects, read from the client.</h1>
        <p className={styles.lede}>
          Ten spell visuals from a 1.12 World of Warcraft client. The browser opens each <code>.m2</code> file and plays
          it: bones, keyframes, billboards, textures, colour and fade, all read from the file. Particles are not
          drawn. Drag to turn. <kbd>Space</kbd> pauses. Double-click or <kbd>W</kbd> for wireframe.
        </p>
      </header>

      <section className={styles.grid} aria-label="Specimens">
        {SPECIMENS.map((s) => (
          <Specimen key={s.file} s={s} />
        ))}
      </section>

      <section className={styles.particles} aria-labelledby="particles-h">
        <h2 id="particles-h" className={styles.h2}>
          Particles only
        </h2>
        <p className={styles.note}>
          These five have no mesh. The file holds emitters and texture names and nothing to draw. Listed so nobody
          goes looking twice.
        </p>
        <ul className={styles.plist}>
          {PARTICLES_ONLY.map((p) => (
            <li key={p.file}>
              <span className={styles.ptitle}>{p.title}</span>
              <a className={styles.mono} href={`/lab/m2/${p.file}`} download>
                {p.file}
              </a>
              <span className={styles.mono}>{p.textures}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.prov}>
        <h2 className={styles.h2}>Provenance</h2>
        <p className={styles.note}>
          Files were pulled from the 1.12.1 installer with <code>innoextract</code>, then out of{" "}
          <code>model.MPQ</code>, <code>interface.MPQ</code> and <code>patch.MPQ</code> with StormLib. Names came from{" "}
          <code>SpellVisualEffectName.dbc</code>. The jagged <code>!</code> from newer clients is not in any 1.12 archive;
          it belongs to the modern engine and would come from the Classic Era client via CASC. See{" "}
          <code>docs/LAB.md</code> for the exact commands.
        </p>
      </footer>
    </main>
  );
}
