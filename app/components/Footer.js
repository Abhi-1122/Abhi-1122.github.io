"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useClock } from "../hooks/useClock";
import { WifiIcon, BatteryIcon, AButtonIcon, BButtonIcon } from "./icons";

const steps = (n) => (t) => Math.floor(t * n) / n;

function Clock({ reduce }) {
  const { time, seconds } = useClock();
  const [hh, mm] = time.split(":");
  const off = !reduce && Number(seconds) % 2 === 1;
  return (
    <span className="flex items-baseline font-mono leading-none" role="timer" aria-label={`${time}:${seconds}`}>
      <span className="text-[28px]">{hh}</span>
      <span className="text-[28px]" style={{ visibility: off ? "hidden" : "visible" }}>:</span>
      <span className="text-[28px]">{mm}</span>
      <span className="ml-1 text-[18px] text-gb-2">{seconds}</span>
    </span>
  );
}

// Signal steps 0→3 every few seconds; battery bars fill up one at a time on mount.
function useStepper(max, stepMs, restMs, enabled) {
  const [n, setN] = useState(max);
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    let t;
    const run = () => {
      setN(i);
      t = setTimeout(i < max ? () => (i++, run()) : () => ((i = 0), run()), i < max ? stepMs : restMs);
    };
    run();
    return () => clearTimeout(t);
  }, [max, stepMs, restMs, enabled]);
  return n;
}

function useFillIn(target, reduce) {
  const [pct, setPct] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || pct >= target) return setPct(target);
    const t = setTimeout(() => setPct((p) => Math.min(target, p + 25)), 180);
    return () => clearTimeout(t);
  }, [pct, target, reduce]);
  return pct;
}

function AbButton({ Glyph, label, onClick, initial, exit }) {
  return (
    <motion.button
      type="button"
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      exit={exit}
      whileTap={{ y: 3 }}
      transition={{ duration: 0.12, ease: steps(2) }}
      onClick={onClick}
      className="group flex items-center gap-1.5 px-1 py-0.5 text-gb-3 hover:text-gb-hi focus-visible:outline-dashed focus-visible:outline-[3px] focus-visible:outline-gb-hi"
    >
      <Glyph className="h-[22px] w-[22px]" />
      <span className="font-display text-[8px] leading-none">{label}</span>
    </motion.button>
  );
}

// `time` prop kept for compatibility; the footer runs its own per-second clock.
export default function Footer({ batteryPct = 86, modalOpen, onStart, onBack }) {
  const reduce = useReducedMotion();
  const bars = useStepper(3, 220, 4200, !reduce);
  const pct = useFillIn(batteryPct, reduce);
  const low = batteryPct <= 20;

  return (
    <footer className="flex min-h-11 items-center justify-between gap-3 border-t-[3px] border-gb-3 bg-gb-0 px-2 py-1 text-gb-3 sm:px-3">
      <div className="flex items-center gap-3">
        <Clock reduce={reduce} />
        <WifiIcon bars={bars} className="h-[18px] w-[18px]" />
        <span className={`flex ${low && !reduce ? "caret-blink text-gb-hi" : ""}`} role="img" aria-label={`Battery ${Math.round(batteryPct)}%`}>
          <BatteryIcon pct={pct} className="h-4 w-[34px]" />
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <AnimatePresence>
          {modalOpen && (
            <AbButton key="b" Glyph={BButtonIcon} label="BACK" onClick={onBack} initial={{ opacity: 0, y: 4 }} exit={{ opacity: 0, transition: { duration: 0 } }} />
          )}
        </AnimatePresence>
        <AbButton Glyph={AButtonIcon} label="START" onClick={onStart} initial={false} />
      </div>
    </footer>
  );
}
