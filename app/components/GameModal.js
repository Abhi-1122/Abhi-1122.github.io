"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { SITE } from "../data/portfolioData";
import { TILE_ICONS, GithubIcon, ExternalLinkIcon } from "./icons";
import { useGithubRepo } from "../hooks/useGithubRepo";
import { useCountUp } from "../hooks/useCountUp";
import { useGfx } from "../lib/gfx";
import { DEMOS } from "./demos";
import BlockDropGame from "./games/BlockDropGame";
import PixelJumperGame from "./games/PixelJumperGame";
import SnakeGame from "./games/SnakeGame";

const HeroScene = dynamic(() => import("./three/HeroScene"), { ssr: false });

const GAMES = {
  blockdrop: BlockDropGame,
  pixeljumper: PixelJumperGame,
  bytesnake: SnakeGame,
};
const PAGES = ["INFO", "LINKS"];
const TYPE = { project: "PROJECT", experience: "WORK", undefined: "PLAYER" };
const CHAR_MS = { slow: 32, mid: 16, fast: 6, instant: 0 };
const stepped = (n) => (t) => Math.round(t * n) / n;

// Title decodes from noise, in steps.
function ScrambleText({ text }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    const glyphs = "#%&*+=?@<>/\\[]";
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const done = Math.floor(frame * 1.6);
      setOut(text.split("").map((c, i) => (i < done || c === " " ? c : glyphs[(i * 7 + frame) % glyphs.length])).join(""));
      if (done >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text]);
  return <span aria-label={text}>{out}</span>;
}

// Dialogue-box typewriter: reveals paragraphs one after another. Click to finish instantly.
function Typewriter({ lines, speed }) {
  const total = useMemo(() => lines.reduce((n, l) => n + l.length, 0), [lines]);
  const [shown, setShown] = useState(speed === "instant" ? total : 0);
  useEffect(() => {
    if (speed === "instant") return setShown(total);
    setShown(0);
    const step = Math.max(1, Math.round(16 / CHAR_MS[speed]));
    const id = setInterval(() => setShown((n) => (n >= total ? n : n + step)), Math.max(CHAR_MS[speed], 16));
    return () => clearInterval(id);
  }, [lines, total, speed]);
  let left = shown;
  return (
    <div onClick={() => setShown(total)} className="cursor-pointer">
      {lines.map((l, i) => {
        const vis = Math.max(0, Math.min(l.length, left));
        left -= l.length;
        return (
          <p key={i} className={`relative mb-3 pl-5 font-sans text-[16px] leading-relaxed last:mb-0 sm:text-[18px] ${vis === 0 ? "invisible" : ""}`}>
            <span className="absolute left-0 top-0 font-display text-[10px] leading-[1.9]">▶</span>
            {l.slice(0, vis)}
            <span className="invisible">{l.slice(vis)}</span>
          </p>
        );
      })}
      {shown >= total && <span className="caret-blink float-right font-display text-[10px]">▼</span>}
    </div>
  );
}

function StatBar({ stat, max, i }) {
  const v = useCountUp(stat.value, 900 + i * 150, stat.decimals || 0);
  // stats with their own scale (e.g. CGPA out of 10) fill linearly; others compare on a log scale
  const fill = stat.max ? stat.value / stat.max : Math.max(0.18, Math.log10(stat.value + 1) / Math.log10(max + 1));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[8px] leading-relaxed sm:text-[9px]">{stat.label.toUpperCase()}</span>
        <span className="whitespace-nowrap font-display text-[13px] leading-none sm:text-[15px]">
          {stat.prefix}
          {(stat.decimals ? v.toFixed(stat.decimals) : v.toLocaleString())}
          {stat.suffix}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="font-display text-[7px] text-gb-hi">HP</span>
        <div className="h-[9px] flex-1 border-2 border-gb-3 bg-gb-0 p-[1px]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fill * 100}%` }}
            transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: stepped(12) }}
            className="h-full bg-gb-2"
          />
        </div>
      </div>
    </div>
  );
}

// Non-GitHub link for a tile (e.g. research lab / advisor page).
function ExternalLink({ link }) {
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className="pixel-btn inline-flex w-fit items-center gap-2 px-4 py-3 font-display text-[11px]">
      <ExternalLinkIcon className="h-4 w-4" /> {link.label}
    </a>
  );
}

function RepoLink({ repo, big }) {
  const { meta } = useGithubRepo(repo);
  return (
    <div className="flex flex-col gap-2">
      <a
        href={`https://github.com/${SITE.githubUser}/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`pixel-btn inline-flex w-fit items-center gap-2 font-display ${big ? "px-4 py-3 text-[11px]" : "px-3 py-2 text-[9px]"}`}
      >
        <GithubIcon className="h-4 w-4" /> VIEW ON GITHUB
      </a>
      {meta?.description && <p className="font-sans text-[15px]">{meta.description}</p>}
    </div>
  );
}

// Pokémon-style level from the latest year in the period ("Mar – Apr 2026" → Lv.26).
const levelOf = (tile) => {
  const years = `${tile.period} ${tile.entries?.map((e) => e.date).join(" ") ?? ""}`.match(/20\d\d/g);
  return years ? `Lv${years[years.length - 1].slice(2)}` : "Lv99";
};

// Battle-screen hero: big 3D stage with an enemy-style HUD.
function BattleHero({ tile }) {
  const gfx = useGfx();
  const Icon = TILE_ICONS[tile.icon];
  return (
    <div className="pixel-box pixel-raised relative h-[clamp(380px,60vh,720px)] overflow-hidden p-0">
      {gfx.use3D ? (
        <HeroScene id={tile.id} tile={tile} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="h-32 w-32">{Icon ? <Icon className="h-full w-full" /> : null}</div>
        </div>
      )}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3, ease: stepped(6) }}
        className="pixel-box pixel-raised absolute left-4 top-4 z-[60] w-[min(340px,70%)] px-4 py-3"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-display text-[11px] sm:text-[13px]">{tile.title.toUpperCase()}</span>
          <span className="font-display text-[9px]">{levelOf(tile)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-[8px] text-gb-hi">HP</span>
          <div className="h-[10px] flex-1 border-2 border-gb-3 p-[1px]">
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.5, duration: 0.8, ease: stepped(16) }} className="h-full bg-gb-2" />
          </div>
        </div>
      </motion.div>
      {gfx.use3D && <span className="absolute bottom-4 right-4 z-[60] bg-gb-0 px-2 py-1 font-display text-[7px] sm:bottom-auto sm:top-4">◀ DRAG TO SPIN ▶</span>}
    </div>
  );
}

function Panel({ title, children, i = 0, className = "" }) {
  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 + i * 0.08, duration: 0.24, ease: stepped(6) }}
      className={`pixel-box pixel-raised ${className}`}
    >
      {title && <h3 className="mb-4 border-b-[3px] border-gb-3 pb-2 font-display text-[11px] sm:text-[12px]">{title}</h3>}
      {children}
    </motion.section>
  );
}

function InfoPage({ tile, sound, textSpeed, onGameEvent }) {
  const Game = tile.game ? GAMES[tile.game] : null;
  const Demo = DEMOS[tile.id];
  const lines = useMemo(() => [tile.intro, ...(tile.bullets || [])].filter(Boolean), [tile]);
  const maxStat = Math.max(1, ...(tile.stats || []).map((s) => s.value));

  return (
    <div className="flex flex-col gap-7">
      {Game ? (
        <div className="pixel-box pixel-raised flex justify-center py-5">
          <Game sound={sound} onEvent={onGameEvent} />
        </div>
      ) : (
        <BattleHero tile={tile} />
      )}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-7">
          <Panel title="DEX ENTRY" i={0}>
            <Typewriter key={tile.id} lines={lines} speed={textSpeed} />
          </Panel>
          {tile.entries?.map((entry, i) => (
            <Panel key={i} title="SCHOOL" i={1}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-[10px] leading-relaxed">{entry.role}</h4>
                <span className="font-display text-[10px]">{entry.date}</span>
              </div>
              <p className="mb-3 font-sans text-[16px] italic">{entry.org}</p>
              {entry.bullets.map((b, j) => (
                <p key={j} className="relative mb-2 pl-5 font-sans text-[16px] leading-relaxed sm:text-[17px]">
                  <span className="absolute left-0 font-display text-[9px] leading-[2.2]">▶</span>
                  {b}
                </p>
              ))}
            </Panel>
          ))}
        </div>
        <div className="flex flex-col gap-7">
          {tile.stats && (
            <Panel title="STATS" i={1}>
              <div className="flex flex-col gap-4">
                {tile.stats.map((s, i) => (
                  <StatBar key={s.label} stat={s} max={maxStat} i={i} />
                ))}
              </div>
            </Panel>
          )}
          <Panel title="TECH STACK" i={2}>
            <div className="flex flex-wrap gap-2 font-display text-[8px] sm:text-[9px]">
              {tile.stack.map((m) => (
                <span key={m} className="border-2 border-gb-3 px-2 py-1.5">
                  {m.toUpperCase()}
                </span>
              ))}
            </div>
          </Panel>
          {tile.repo && (
            <Panel i={3}>
              <RepoLink repo={tile.repo} big />
            </Panel>
          )}
          {tile.link && (
            <Panel i={3}>
              <ExternalLink link={tile.link} />
            </Panel>
          )}
        </div>
      </div>

      {Demo && (
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.24, ease: stepped(6) }}>
          <Demo sound={sound} />
        </motion.div>
      )}
    </div>
  );
}

function LinksPage({ tile }) {
  const links = [
    { href: `mailto:${SITE.email}`, label: "SEND MAIL", sub: SITE.email },
    { href: SITE.github, label: "GITHUB", sub: "@" + SITE.githubUser },
    { href: SITE.linkedin, label: "LINKEDIN", sub: "g-sai-abhishek" },
  ];
  return (
    <div className="flex flex-col gap-4">
      {tile.repo && (
        <div className="pixel-box pixel-raised">
          <p className="mb-3 font-display text-[10px]">SOURCE CODE</p>
          <RepoLink repo={tile.repo} big />
        </div>
      )}
      {tile.link && (
        <div className="pixel-box pixel-raised">
          <p className="mb-3 font-display text-[10px]">LAB & ADVISOR</p>
          <ExternalLink link={tile.link} />
        </div>
      )}
      <div className="pixel-box pixel-raised">
        <p className="mb-3 font-display text-[10px]">CONTACT THE TRAINER</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="pixel-btn flex flex-col gap-1 px-3 py-2.5">
              <span className="font-display text-[10px]">▶ {l.label}</span>
              <span className="font-sans text-[15px] leading-none">{l.sub}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameModal({ tile, index, total, onClose, onStep, sound, textSpeed = "fast", onGameEvent }) {
  const [page, setPage] = useState(0);
  const prevIndex = useRef(index);
  const dir = index === prevIndex.current ? 0 : index > prevIndex.current ? 1 : -1;
  useEffect(() => {
    prevIndex.current = index;
  }, [index]);

  // ←/→ flip pages (not inside games, inputs or sliders)
  useEffect(() => {
    if (tile.game) return;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.matches("input, textarea, [role=slider]")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setPage((p) => (p + (e.key === "ArrowRight" ? 1 : PAGES.length - 1)) % PAGES.length);
        sound?.playHover?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tile.game, sound]);

  const type = tile.game ? "ARCADE" : TYPE[tile.category];

  return (
    <div role="dialog" aria-modal="true" aria-label={tile.title} className="relative z-[1] flex h-full w-full flex-col">
      {/* summary header */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b-[3px] border-gb-3 bg-gb-0 px-[max(16px,calc((100%-1440px)/2+24px))] py-3">
        <button type="button" onClick={() => onStep(-1)} aria-label="Previous" className="pixel-btn h-8 w-8 font-display text-[10px]">
          ▲
        </button>
        <span className="font-display text-[9px] sm:text-[10px]">No.{String(index + 1).padStart(3, "0")}</span>
        <button type="button" onClick={() => onStep(1)} aria-label="Next" className="pixel-btn h-8 w-8 font-display text-[10px]">
          ▼
        </button>
        <nav className="ml-auto flex gap-1.5" aria-label="Pages">
          {PAGES.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(i)}
              className={`px-2 py-1.5 font-display text-[8px] sm:px-3 sm:text-[9px] ${page === i ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}
            >
              {page === i ? "▶" : ""}
              {p}
            </button>
          ))}
        </nav>
        <button type="button" onClick={onClose} aria-label="Close" className="pixel-btn ml-2 flex items-center gap-1.5 px-2.5 py-1.5 font-display text-[9px]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ab text-[7px] text-white">B</span>
          BACK
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[max(16px,calc((100%-1440px)/2+32px))] pb-28 pt-6">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tile.id}
            custom={dir}
            initial={{ opacity: 0, y: dir * 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir * -40 }}
            transition={{ duration: 0.18, ease: stepped(6) }}
          >
            {/* name plate */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 font-display text-[8px]">
                  <span className="bg-gb-3 px-2 py-1 text-gb-0">{type}</span>
                  <span className="border-2 border-gb-3 px-2 py-0.5">{tile.period.toUpperCase()}</span>
                </div>
                <h2 className="font-display text-[22px] leading-tight sm:text-[40px]">
                  <ScrambleText text={tile.title.toUpperCase()} />
                </h2>
                <p className="mt-3 font-sans text-[18px] sm:text-[22px]">{tile.label}</p>
              </div>
              <span className="font-display text-[12px]">
                {index + 1}/{total}
              </span>
            </div>

            {page === 0 && <InfoPage tile={tile} sound={sound} textSpeed={textSpeed} onGameEvent={onGameEvent} />}
            {page === 1 && <LinksPage tile={tile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
