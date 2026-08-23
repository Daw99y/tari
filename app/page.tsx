/* A boot check, not a design.
 *
 * This page exists so `npm run dev` starts and the API routes can be
 * exercised. The real landing page is step 3 of the build order in
 * docs/TARI.md §14, and it gets built on an empty canvas. Delete this file
 * when that work starts. */

export default function Page() {
  return (
    <main>
      <h1>Tari</h1>
      <p>The app boots. The landing page is not built yet.</p>
      <p>
        Read <code>docs/TARI.md</code> for the argument and{" "}
        <code>docs/STATUS.md</code> for the state.
      </p>
    </main>
  );
}
