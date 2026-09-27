"use client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AButtonIcon, BButtonIcon, DpadIcon, ChevronLeftIcon, ChevronRightIcon, SettingsIcon } from "./icons";

const HINTS = {
  home: [
    { keys: ["left", "right"], label: "BROWSE" },
    { keys: ["A"], label: "OPEN" },
    { keys: ["gear"], label: "SELECT: MENU" },
  ],
  modal: [
    { keys: ["dpad"], label: "▲▼ CART  ◀▶ PAGE" },
    { keys: ["B"], label: "BACK" },
  ],
  game: [
    { keys: ["dpad"], label: "PLAY" },
    { keys: ["B", "Esc"], label: "BACK" },
  ],
  settings: [
    { keys: ["dpad"], label: "CHOOSE" },
    { keys: ["B", "Esc"], label: "CLOSE" },
  ],
};

const steps = (n) => (t) => Math.floor(t * n) / n;
const GLYPHS = { A: AButtonIcon, B: BButtonIcon, dpad: DpadIcon, left: ChevronLeftIcon, right: ChevronRightIcon, gear: SettingsIcon };
const SIZE = { A: "h-[11px] w-[11px]", B: "h-[11px] w-[11px]", dpad: "h-[9px] w-[9px]" };

function Glyph({ k }) {
  if (k === "Esc") return <span className="border-2 border-gb-3 px-[3px] py-[1px] leading-none">ESC</span>;
  const Icon = GLYPHS[k];
  return <Icon className={SIZE[k] || "h-3 w-3"} />;
}

export default function HintBar({ context = "home" }) {
  const reduce = useReducedMotion();
  const hints = HINTS[context];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[70] hidden justify-center sm:flex">
      <AnimatePresence mode="wait">
        {hints && (
          <motion.div
            key={context}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12, ease: steps(2) } }}
            transition={{ duration: 0.2, ease: steps(4) }}
            className="pixel-box flex items-center gap-3 !px-3 !py-2 font-display text-[8px] leading-none"
            aria-hidden="true"
          >
            {hints.map(({ keys, label }, i) => (
              <span key={label} className="flex items-center gap-1.5">
                {keys.map((k, j) => (
                  <span key={k} className="flex items-center gap-1">
                    {j > 0 && k === "Esc" && <span>/</span>}
                    <motion.span
                      className="flex"
                      animate={reduce ? {} : { y: [0, 2, 0] }}
                      transition={{ duration: 0.3, ease: steps(2), delay: 0.6 + i * 0.35 + j * 0.12, repeat: Infinity, repeatDelay: 3.2 }}
                    >
                      <Glyph k={k} />
                    </motion.span>
                  </span>
                ))}
                <span>{label}</span>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
