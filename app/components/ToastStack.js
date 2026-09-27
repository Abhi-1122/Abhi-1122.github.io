"use client";
import { AnimatePresence, motion } from "framer-motion";

export default function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: (x) => Math.round(x * 4) / 4 }}
            className="pixel-box pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 font-display text-[9px] sm:text-[10px]"
            role="status"
          >
            {t.icon ? <span className="text-gb-hi">{t.icon}</span> : null}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
