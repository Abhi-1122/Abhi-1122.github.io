"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function DemoFrame({ title, controls, children }) {
  return (
    <div className="pixel-box font-sans text-gb-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-display text-[10px] leading-relaxed">
          <span className="text-gb-hi">Try it:</span> {title}
        </div>
        {controls && <div className="flex flex-wrap items-center gap-2.5">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

export function DemoButton({ pressed, className = "", ...props }) {
  return (
    <button
      type="button"
      data-pressed={pressed ? "true" : undefined}
      className={`pixel-btn px-2.5 py-1.5 font-display text-[8px] leading-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Stat({ label, children }) {
  return (
    <div className="border-2 border-gb-3 bg-gb-0 px-2 py-1.5">
      <div className="font-display text-[8px]">{label}</div>
      <div className="font-display text-[13px] leading-none">{children}</div>
    </div>
  );
}

// quantise 0..1 progress so sprites hop in steps, Game Boy style
export const stepped = (p, n = 14) => Math.floor(p * n) / n;

// rAF loop calling step(dtMs) then re-rendering; half speed under reduced motion.
export function useSimLoop(step) {
  const reduced = useReducedMotion();
  const [, force] = useState(0);
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(100, now - last) * (reduced ? 0.5 : 1);
      last = now;
      stepRef.current(dt);
      force((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return reduced;
}
