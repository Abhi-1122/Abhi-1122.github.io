"use client";
import { useEffect, useState } from "react";

export function useBattery() {
  const [pct, setPct] = useState(86);

  useEffect(() => {
    if (!navigator.getBattery) return;
    let battery;
    const apply = () => setPct(Math.round(battery.level * 100));
    navigator
      .getBattery()
      .then((b) => {
        battery = b;
        apply();
        battery.addEventListener("levelchange", apply);
      })
      .catch(() => {});
    return () => battery && battery.removeEventListener("levelchange", apply);
  }, []);

  return pct;
}
