"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Classic handheld boot, inside the LCD: unlit screen → power on → logo scrolls down → "ba-ding".
// First visit per session waits for a key/click (which also unlocks audio); later visits auto-boot.
export default function GbBoot({ onPowerOn, onDone, sound }) {
  const [phase, setPhase] = useState("wait"); // wait → off → scroll → ding
  const [quick, setQuick] = useState(null);
  const started = useRef(false);

  function powerOn() {
    if (started.current) return;
    started.current = true;
    window.sessionStorage.setItem("gamedeck-booted", "1");
    onPowerOn?.();
    setPhase("scroll");
  }

  useEffect(() => {
    const q = window.sessionStorage.getItem("gamedeck-booted") === "1";
    setQuick(q);
    setPhase("off");
    if (q) window.setTimeout(powerOn, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (quick !== false) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      powerOn();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick]);

  const scrollDur = quick ? 0.7 : 1.6;

  return (
    <div
      onClick={powerOn}
      className={`relative flex h-full min-h-[inherit] w-full cursor-pointer select-none items-center justify-center transition-colors duration-500 ${
        phase === "off" || phase === "wait" ? "bg-[color-mix(in_srgb,var(--gb-0)_55%,#6b7d52)]" : "bg-gb-0"
      }`}
    >
      {(phase === "scroll" || phase === "ding") && (
        <motion.div
          initial={{ y: "-42vh" }}
          animate={{ y: 0 }}
          transition={{ duration: scrollDur, ease: (t) => Math.round(t * 40) / 40 }}
          onAnimationComplete={() => {
            if (phase !== "scroll") return;
            setPhase("ding");
            sound?.playBoot?.();
            window.setTimeout(onDone, quick ? 350 : 900);
          }}
          className="flex flex-col items-center gap-3 text-gb-3"
        >
          <span className="font-display text-[22px] leading-none sm:text-[34px]">
            Abhishek<sup className="text-[10px] sm:text-[12px]">®</sup>
          </span>
        </motion.div>
      )}

      {phase === "off" && quick === false && (
        <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-3 font-display text-[10px] text-gb-3 opacity-80 sm:text-[12px]">
          <span className="caret-blink">▶ PRESS ANY KEY</span>
          <span className="text-[8px] opacity-60">or slide the power switch</span>
        </div>
      )}
    </div>
  );
}
