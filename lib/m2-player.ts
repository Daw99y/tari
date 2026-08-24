/* Loading and timing for M2 playback, shared by the lab plates and the hero.
 * Rendering lives in m2-render.ts; this file only fetches, parses, fetches
 * textures, fits, and turns a wall clock into (time, sequence). */

import { parseM2, type M2Mesh, type M2Sequence } from "./m2";
import { fitOverSequence, loadTextures, type Fit, type TextureSet } from "./m2-render";

export type LoadedM2 = { mesh: M2Mesh; textures: TextureSet; fit: Fit };

/** The sequence a state visual holds on: id 158 when present, else the first. */
export function holdSequence(mesh: M2Mesh): M2Sequence | null {
  return mesh.sequences.find((q) => q.id === 158) ?? mesh.sequences[0] ?? null;
}

export async function loadM2(src: string): Promise<LoadedM2> {
  const r = await fetch(src);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const buf = await r.arrayBuffer();
  const mesh = parseM2(buf);
  const textures = await loadTextures(mesh);
  const fit = fitOverSequence(mesh, holdSequence(mesh));
  return { mesh, textures, fit };
}

export type Clock = {
  /** Milliseconds a freshly mounted player should start at when motion is
   *  reduced: past the pop-in, halfway through the hold. */
  restingStart: number;
  /** Map milliseconds-since-start to a model time and the sequence it is in. */
  at(clock: number): { t: number; seq: M2Sequence | null };
};

/** Vanilla state visuals ship three sequences: 0 pops in, 158 loops, 159
 *  fades out. Play 0 once, then hold on 158. Sequence flag bit 1 marks a
 *  one-shot; when the held sequence is one-shot, keep its last frame for a
 *  beat before replaying so a plate is never blank for long. */
export function makeClock(mesh: M2Mesh, holdMs = 2000): Clock {
  const intro = mesh.sequences[0] ?? null;
  const loop = holdSequence(mesh);
  const introLen = intro ? Math.max(1, intro.end - intro.start) : 0;
  const oneShot = !!loop && (loop.flags & 1) === 1;
  const loopBody = loop ? Math.max(1, loop.end - loop.start) : 2000;
  const loopLen = loopBody + (oneShot ? holdMs : 0);
  const hasIntro = !!intro && !!loop && loop !== intro;
  return {
    restingStart: (hasIntro ? introLen : 0) + loopBody * 0.5,
    at(clock) {
      if (hasIntro && clock < introLen) return { t: intro!.start + clock, seq: intro };
      const local = (clock - (hasIntro ? introLen : 0)) % loopLen;
      const t = (loop ? loop.start : 0) + (oneShot ? Math.min(local, loopBody) : local);
      return { t, seq: loop };
    },
  };
}
