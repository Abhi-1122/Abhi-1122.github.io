"use client";
import { motion, AnimatePresence } from "framer-motion";
import { SITE } from "../data/portfolioData";
import {
  MailIcon,
  AlbumIcon,
  ControllerIcon,
  SettingsIcon,
  PowerIcon,
  SunIcon,
  MoonIcon,
  SpeakerIcon,
  SpeakerMuteIcon,
} from "./icons";

const ICON_BUTTONS = [
  { action: "mail", label: "Email me", Icon: MailIcon },
  { action: "github", label: "GitHub", Icon: AlbumIcon },
  { action: "linkedin", label: "LinkedIn", Icon: ControllerIcon },
  { action: "settings", label: "Settings", Icon: SettingsIcon },
  { action: "sleep", label: "Sleep mode", Icon: PowerIcon },
];

export default function Header({ greeting, onAction, dark, onToggleTheme, muted, onToggleMute }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: "spring", stiffness: 350, damping: 15 }}
          className="avatar-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-red-switch bg-gradient-to-br from-[#ff5b5b] to-red-switch text-sm font-extrabold tracking-wide text-white sm:h-[52px] sm:w-[52px] sm:text-base"
        >
          {SITE.handle}
        </motion.div>
        <div className="flex min-w-0 flex-col">
          <span className="whitespace-nowrap text-[15px] font-bold text-[#14181c] dark:text-white sm:text-[17px]">{SITE.shortName}</span>
          <span className="hidden whitespace-nowrap text-[11px] text-[#4b5563] dark:text-slate-400 sm:block sm:text-xs">
            {greeting} · Software Engineer
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1.5 sm:gap-2.5" aria-label="Quick links">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleTheme}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border transition-colors sm:h-[38px] sm:w-[38px] ${
            dark ? "border-cyan-switch/40 bg-[#0a1419] text-cyan-switch" : "border-black/5 bg-[#eef1f4] text-[#6b7280]"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {dark ? (
              <motion.span
                key="moon"
                initial={{ opacity: 0, rotate: -60, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 60, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                className="flex"
              >
                <MoonIcon className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
              </motion.span>
            ) : (
              <motion.span
                key="sun"
                initial={{ opacity: 0, rotate: -60, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 60, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                className="flex"
              >
                <SunIcon className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 20 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleMute}
          title={muted ? "Unmute sound" : "Mute sound"}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          className="group relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-[#eef1f4] text-[#6b7280] transition-colors hover:bg-[#e2e8f0] dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 sm:h-[38px] sm:w-[38px]"
        >
          {muted ? (
            <SpeakerMuteIcon className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
          ) : (
            <SpeakerIcon className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
          )}
        </motion.button>

        {ICON_BUTTONS.map(({ action, label, Icon }, i) => (
          <motion.button
            key={action}
            type="button"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onAction(action)}
            title={label}
            aria-label={label}
            className="group relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-[#eef1f4] text-[#6b7280] transition-colors hover:bg-[#e2e8f0] dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 sm:h-[38px] sm:w-[38px]"
          >
            <Icon className={`h-3.5 w-3.5 sm:h-[18px] sm:w-[18px] ${action === "settings" ? "group-hover:animate-spin-slow" : ""}`} />
          </motion.button>
        ))}
      </nav>
    </header>
  );
}
