"use client";
import { motion } from "framer-motion";
import { WifiIcon, BatteryIcon } from "./icons";

export default function Footer({ time, batteryPct, modalOpen, onStart, onBack }) {
  return (
    <footer className="flex items-center justify-between border-t border-[#edf0f2] pt-3.5 text-sm text-[#4b5563] dark:border-white/10 dark:text-slate-400">
      <div className="flex items-center gap-3 sm:gap-3.5">
        <span className="font-mono text-[13px] font-bold text-[#14181c] dark:text-white sm:text-[15px]">{time}</span>
        <WifiIcon className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
        <BatteryIcon pct={batteryPct} className="h-3 w-[22px] sm:h-3.5 sm:w-[26px]" />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {modalOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-black/5 bg-[#eef1f4] py-1.5 pl-2 pr-2.5 text-[11px] font-semibold transition-colors hover:bg-[#e2e8f0] dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 sm:gap-[7px] sm:py-[7px] sm:pl-2 sm:pr-3.5 sm:text-[13px]"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-pink-500 bg-white font-mono text-[10px] font-bold text-pink-600 sm:h-5 sm:w-5 sm:text-[11px]">
              B
            </span>
            <span className="hidden sm:inline">Back</span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.94 }}
          onClick={onStart}
          className="flex items-center gap-1.5 rounded-full border border-black/5 bg-cyan-switch/[0.14] py-1.5 pl-2 pr-2.5 text-[11px] font-semibold text-[#0a8aa3] dark:border-cyan-switch/20 dark:bg-cyan-switch/20 dark:text-cyan-200 sm:gap-[7px] sm:py-[7px] sm:pl-2 sm:pr-3.5 sm:text-[13px]"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-cyan-switch bg-cyan-switch font-mono text-[10px] font-bold text-white sm:h-5 sm:w-5 sm:text-[11px]">
            A
          </span>
          <span className="hidden sm:inline">Start</span>
        </motion.button>
      </div>
    </footer>
  );
}
