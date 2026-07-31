"use client";
import { useEffect, useState } from "react";

export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) return;
    let raf;
    const start = performance.now();
    const from = 0;
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
