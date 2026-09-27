"use client";
import { useEffect, useRef, useState } from "react";

const EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];

// After `breatheMs` of no input → returns true (dashboard "breathes");
// after `sleepMs` → calls onSleep once. Paused while `enabled` is false.
export function useIdle({ breatheMs = 20000, sleepMs = 90000, onSleep, enabled = true }) {
  const [idle, setIdle] = useState(false);
  const onSleepRef = useRef(onSleep);
  onSleepRef.current = onSleep;

  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let breathe, sleep;
    const reset = () => {
      setIdle(false);
      clearTimeout(breathe);
      clearTimeout(sleep);
      breathe = setTimeout(() => setIdle(true), breatheMs);
      sleep = setTimeout(() => onSleepRef.current?.(), sleepMs);
    };
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(breathe);
      clearTimeout(sleep);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, breatheMs, sleepMs]);

  return idle;
}
