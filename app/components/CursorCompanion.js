"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const COUNT = 6;
const GAP = 14; // px of travel between sparkles
const PX = 3; // one sprite pixel on screen

// Alternating tiny plus-sparkles and single squares, fading out in steps.
export default function CursorCompanion() {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  const ref = useRef(null);

  useEffect(() => setFine(!window.matchMedia("(pointer: coarse)").matches), []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const dots = [...root.children];
    let i = 0;
    let last = null;

    const onMove = (e) => {
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < GAP) return;
      last = { x: e.clientX, y: e.clientY };
      const el = dots[i++ % COUNT];
      // Offset down-right so the trail sits behind the arrow tip; snap to the pixel grid.
      const x = Math.round((e.clientX + 10) / PX) * PX;
      const y = Math.round((e.clientY + 14) / PX) * PX;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: `translateY(${PX * 4}px)` },
        ],
        { duration: 520, easing: "steps(4, end)", fill: "forwards" }
      );
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine, reduce]);

  if (!fine || reduce) return null;

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[400]">
      {Array.from({ length: COUNT }, (_, k) =>
        k % 2 ? (
          <span key={k} className="absolute bg-gb-3 opacity-0" style={{ width: PX * 2, height: PX * 2 }} />
        ) : (
          <svg key={k} viewBox="0 0 3 3" shapeRendering="crispEdges" className="absolute text-gb-hi opacity-0" style={{ width: PX * 3, height: PX * 3 }}>
            <path d="M1 0h1v3H1zM0 1h3v1H0z" fill="currentColor" />
          </svg>
        )
      )}
    </div>
  );
}
