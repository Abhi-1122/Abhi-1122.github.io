"use client";
import { motion } from "framer-motion";
import { SITE } from "../data/portfolioData";
import { TILE_ICONS, GithubIcon, StarIcon, CloseIcon } from "./icons";
import { useGithubRepo } from "../hooks/useGithubRepo";
import { useCountUp } from "../hooks/useCountUp";
import BlockDropGame from "./games/BlockDropGame";
import PixelJumperGame from "./games/PixelJumperGame";

const GAMES = {
  blockdrop: BlockDropGame,
  pixeljumper: PixelJumperGame,
};

function RepoBadge({ repo }) {
  const { meta } = useGithubRepo(repo);
  const stars = useCountUp(meta?.stars ?? 0);
  if (!repo) return null;
  return (
    <span className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs">
      <StarIcon className="h-3 w-3" />
      {meta ? stars : "…"}
    </span>
  );
}

function SubEntry({ entry }) {
  const { meta } = useGithubRepo(entry.repo);
  return (
    <div className="mb-6 border-b border-[#f0f2f4] pb-5.5 last:mb-0 last:border-none last:pb-0 dark:border-white/10">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2.5">
        <div>
          <h3 className="text-base font-bold">{entry.role}</h3>
          <div className="text-[13px] italic text-[#4b5563] dark:text-slate-400">{entry.org}</div>
        </div>
        <div className="whitespace-nowrap text-xs text-[#4b5563] dark:text-slate-400">{entry.date}</div>
      </div>
      <ul className="mb-0 list-none pl-0">
        {entry.bullets.map((b, i) => (
          <li key={i} className="relative mb-3 pl-[22px] text-[14.5px] leading-relaxed text-[#2b3542] dark:text-slate-300 last:mb-0">
            <span className="bullet-dot" />
            {b}
          </li>
        ))}
      </ul>
      {entry.repo && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <a
            href={`https://github.com/${SITE.githubUser}/${entry.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#14181c] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 dark:bg-white dark:text-[#14181c]"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            View Repo
          </a>
          {meta?.description && <span className="text-xs text-[#4b5563] dark:text-slate-400">{meta.description}</span>}
        </div>
      )}
    </div>
  );
}

export default function GameModal({ tile, onClose, sound }) {
  const { meta } = useGithubRepo(tile.repo);
  const Icon = TILE_ICONS[tile.icon];
  const Game = tile.game ? GAMES[tile.game] : null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 10, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl dark:bg-[#161a20]"
    >
      <div className={`relative flex-shrink-0 bg-gradient-to-br px-6 py-8 text-white sm:px-10 sm:py-9 ${tile.theme}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 sm:right-[18px] sm:top-[18px]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.95 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
          className="mb-3.5 h-10 w-10 drop-shadow sm:h-11 sm:w-11"
        >
          {Icon ? <Icon className="h-full w-full" /> : null}
        </motion.div>
        <h2 className="mb-1.5 text-2xl font-extrabold sm:text-[32px]">{tile.title}</h2>
        <div className="text-[15px] font-medium opacity-90">{tile.label}</div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[13px] opacity-90">
          <span className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1">
            {tile.period}
          </span>
          <RepoBadge repo={tile.repo} />
        </div>
      </div>

      <div className="overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
        {tile.intro && (
          <p className="mb-6 text-[15px] leading-relaxed text-[#2b3542] dark:text-slate-300">{tile.intro}</p>
        )}

        {Game && (
          <div className="mb-6 flex justify-center rounded-2xl bg-[#0b1220] p-2.5 sm:p-5">
            <Game sound={sound} />
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {tile.stack.map((s) => (
            <span key={s} className="rounded-full border border-black/5 bg-[#eef1f4] px-3 py-1.5 text-xs font-semibold text-[#4b5563] dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
              {s}
            </span>
          ))}
        </div>

        {tile.entries && tile.entries.map((entry, i) => <SubEntry key={i} entry={entry} />)}

        {tile.bullets && (
          <ul className="mb-5 list-none pl-0">
            {tile.bullets.map((b, i) => (
              <li key={i} className="relative mb-3 pl-[22px] text-[14.5px] leading-relaxed text-[#2b3542] dark:text-slate-300">
                <span className="bullet-dot" />
                {b}
              </li>
            ))}
          </ul>
        )}

        {tile.repo && (
          <div className="mt-2">
            <a
              href={`https://github.com/${SITE.githubUser}/${tile.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#14181c] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 dark:bg-white dark:text-[#14181c]"
            >
              <GithubIcon className="h-[15px] w-[15px]" />
              View on GitHub
            </a>
            {meta?.description && <p className="mt-2.5 text-[13px] text-[#4b5563] dark:text-slate-400">{meta.description}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
