"use client";
import { motion } from "framer-motion";

export default function BootSplash() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a18]"
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-switch to-[#0a8aa3] text-3xl font-extrabold text-white shadow-[0_0_60px_rgba(0,195,227,0.6)]">
          GA
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60"
        >
          Portfolio OS
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
