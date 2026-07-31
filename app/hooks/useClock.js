"use client";
import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function useClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000 * 10);
    return () => clearInterval(id);
  }, []);

  if (!now) return { time: "--:--", greeting: "Welcome" };

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const h = now.getHours();
  const greeting = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Up late";

  return { time, greeting };
}
