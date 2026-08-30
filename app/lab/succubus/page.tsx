"use client";

/* The four succubus skins, side by side, so the choice is looked at rather
 * than argued about.
 *
 * CreatureDisplayInfo gives model 37 four texture families and the rows do
 * not say which one a warlock's own pet wears — the same model is a dozen
 * different NPCs. Reading atlases in a folder does not settle it either: the
 * body panel a UV actually lands on is a small part of a 256-pixel sheet, so
 * two families can look very different flat and nearly identical on her.
 *
 * Each column is the real model with the real animation, drawn from
 * public/lab/succubus/variants/. Pick one, point scripts/succubus-build.mjs
 * at that family, re-run it, and this page can go. */

import Succubus from "@/components/Succubus";

const FAMILIES = [
  ["plain", "SuccubusNewSkin", "display 4162 · no suffix"],
  ["magenta", "SuccubusNewSkinMagenta", "display 159 · the lowest row"],
  ["red", "SuccubusNewSkinRed", "display 10925"],
  ["blue", "SuccubusNewSkinBlue", "display 2737"],
] as const;

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--ground)",
        color: "var(--ink)",
        padding: "2rem clamp(1rem, 3vw, 2.5rem) 3rem",
      }}
    >
      <h1 style={{ font: "600 1.05rem/1.2 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
        Succubus skins
      </h1>
      <p style={{ font: "400 0.9rem/1.5 var(--sans)", color: "var(--mute)", maxWidth: "44rem", margin: "0.6rem 0 2rem" }}>
        Same model, same idle, four texture families out of the 1.12 client. The one the curtain ships is set in{" "}
        <code style={{ font: "0.85em var(--mono)" }}>scripts/succubus-build.mjs</code>.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          gap: "1rem",
        }}
      >
        {FAMILIES.map(([id, file, note]) => (
          <figure
            key={id}
            style={{
              margin: 0,
              background: "var(--panel-deep)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--hair)",
              overflow: "hidden",
            }}
          >
            <Succubus variant={id} className="succubus-cell" />
            <figcaption style={{ padding: "0.75rem 0.9rem 0.9rem" }}>
              <b style={{ font: "600 0.85rem var(--mono)", letterSpacing: "0.08em" }}>{id}</b>
              <span style={{ display: "block", font: "400 0.75rem/1.5 var(--mono)", color: "var(--mute)" }}>{file}</span>
              <span style={{ display: "block", font: "400 0.75rem/1.5 var(--mono)", color: "var(--mute)" }}>{note}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <style>{`.succubus-cell { position: relative; display: block; width: 100%; aspect-ratio: 3 / 4; }`}</style>
    </main>
  );
}
