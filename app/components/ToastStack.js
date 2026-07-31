"use client";
import { AnimatePresence, motion } from "framer-motion";

export default function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#14181c]/90 px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur-md"
          >
            {t.icon ? <span className="text-cyan-switch">{t.icon}</span> : null}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
