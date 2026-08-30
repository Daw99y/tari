"use client";

/* A quiet entrance: the block starts a step low and faded, and settles when
 * it scrolls into view. Once each — nothing re-animates on the way back up.
 * Under prefers-reduced-motion the CSS side renders everything settled, so
 * this observer's work is invisible there. */

import { useEffect, useRef, type ReactNode } from "react";

export default function Reveal({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  /** Milliseconds, for stepped rows. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.in = "true";
        io.disconnect();
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-reveal style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
