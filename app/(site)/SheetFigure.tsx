"use client";

/* The rogue, standing in the character sheet. SeducedFigure places itself by
 * pixel — HeroScene does that math against a photograph; here the frame is
 * the floor, so this measures its own box and stands her in the middle of
 * it. The body and the gear are the same machinery the hero uses, already
 * cached from the first load; only the loop differs. Nothing seduced her on
 * this screen, so she holds the Stand idle instead of the Stun sway. */

import { useEffect, useRef, useState } from "react";

import SeducedFigure from "@/components/SeducedFigure";

export default function SheetFigure({
  className,
  figureClassName,
  shadowClassName,
}: {
  className?: string;
  figureClassName?: string;
  shadowClassName?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={className}>
      {box ? (
        <SeducedFigure
          height={Math.round(box.h * 0.94)}
          left={Math.round(box.w / 2)}
          top={Math.round(box.h * 0.985)}
          pose="standing"
          turn={Math.PI / 2}
          className={figureClassName}
          shadowClassName={shadowClassName}
        />
      ) : null}
    </div>
  );
}
