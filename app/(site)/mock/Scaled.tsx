"use client";

/* A window at true size, scaled to the card.
 *
 * The window rides in an iframe rather than a div, and the iframe is the
 * feature: the shell's phone styles key on the viewport, and an iframe laid
 * out at the design width carries a desktop viewport of its own onto any
 * screen. The transform then shrinks pixels, not layout, so what the reader
 * sees is the desktop app the way a screenshot would show it — except hovers
 * still answer, because nothing here is a picture. */

import { useEffect, useRef, useState } from "react";

export default function Scaled({
  src,
  width,
  height,
  className,
}: {
  src: string;
  width: number;
  height: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const measure = () => setScale(host.clientWidth / width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [width]);

  return (
    /* The frame is absolute so its unscaled size never stretches the card:
       the aspect box is the only thing allowed to set the card's height. */
    <div ref={ref} className={className} style={{ aspectRatio: `${width} / ${height}`, position: "relative" }}>
      {scale > 0 ? (
        <iframe
          src={src}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            border: 0,
            display: "block",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        />
      ) : null}
    </div>
  );
}
