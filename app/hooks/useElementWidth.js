"use client";
import { useEffect, useRef, useState } from "react";

// [ref, width, height] of an element, kept current with a ResizeObserver.
export function useElementWidth() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // offset size ignores CSS transforms (the console is scaled during zoom transitions)
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size.width, size.height];
}
