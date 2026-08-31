/* One app window, alone in its own document, for the landing's iframes.
 * The document is the point: the shell's phone styles key on the viewport,
 * and an iframe laid out at 1760px keeps a desktop viewport whatever screen
 * the landing itself is on. See app/(site)/mock/shots.tsx. */

import { notFound } from "next/navigation";

import { Shot, SHOT_IDS, type ShotId } from "../../mock/shots";

export function generateStaticParams() {
  return SHOT_IDS.map((id) => ({ id }));
}

export const metadata = { robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SHOT_IDS.includes(id as ShotId)) notFound();
  return <Shot id={id as ShotId} />;
}
