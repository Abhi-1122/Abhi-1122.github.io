"use client";
import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

// Ticks every second. Pass `false` to only re-render when the minute changes.
export function useClock(everySecond = true) {
  const step = everySecond ? 1000 : 60000;
  const [stamp, setStamp] = useState(null);

  useEffect(() => {
    const tick = () => setStamp(Math.floor(Date.now() / step));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step]);

  if (stamp === null) return { time: "--:--", seconds: "--", date: null, greeting: "Welcome" };

  const date = new Date(stamp * step);
  const h = date.getHours();
  const time = `${pad(h)}:${pad(date.getMinutes())}`;
  const greeting = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Up late";

  return { time, seconds: pad(date.getSeconds()), date, greeting };
}
