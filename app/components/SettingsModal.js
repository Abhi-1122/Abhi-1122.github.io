"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SKILLS, ADDITIONAL_INFO } from "../data/portfolioData";
import { CloseIcon } from "./icons";

const TABS = [
  { key: "skills", label: "Technical Skills" },
  { key: "info", label: "Additional Information" },
];

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState("skills");

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 10, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative flex max-h-[80vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl dark:bg-[#161a20]"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[#f0f2f4] px-6 py-5 dark:border-white/10">
        <h2 className="text-lg font-bold">System Settings</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef1f4] text-[#4b5563] transition hover:bg-[#e2e8f0] hover:text-[#14181c] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 dark:hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <aside className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-[#f0f2f4] bg-[#fafbfc] p-2.5 dark:border-white/10 dark:bg-white/[0.03] sm:w-[210px] sm:flex-col sm:border-b-0 sm:border-r sm:p-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-cyan-switch/[0.14] text-[#0a8aa3] dark:bg-cyan-switch/20 dark:text-cyan-200"
                  : "text-[#4b5563] hover:bg-[#eef1f4] dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <section className="flex-1 overflow-y-auto p-6 sm:p-7">
          <AnimatePresence mode="wait">
            {tab === "skills" ? (
              <motion.div key="skills" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                {SKILLS.map((g) => (
                  <div key={g.group} className="mb-5 last:mb-0">
                    <h4 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-[#4b5563] dark:text-slate-400">{g.group}</h4>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((item) => (
                        <span key={item} className="rounded-lg bg-[#eef1f4] px-3 py-1.5 text-[13px] font-semibold dark:bg-white/10 dark:text-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="info" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                {ADDITIONAL_INFO.map((item) => (
                  <div key={item.label} className="mb-4.5 last:mb-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-cyan-switch">{item.label}</span>
                    <p className="text-[14.5px] leading-relaxed text-[#2b3542] dark:text-slate-300">{item.text}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
}
