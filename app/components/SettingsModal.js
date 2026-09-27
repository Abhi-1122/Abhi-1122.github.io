"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { SKILLS, ADDITIONAL_INFO, SITE } from "../data/portfolioData";
import { ACHIEVEMENTS } from "../hooks/useAchievements";
import { PALETTES, PALETTE_ORDER, SHELLS, SHELL_ORDER } from "../lib/palettes";
import { groupSwatch, tilesForSkill } from "../lib/skills";
import { useGfx } from "../lib/gfx";
import { TrophyIcon } from "./icons";

const SkillConstellation = dynamic(() => import("./three/SkillConstellation"), { ssr: false });
const SkillToyBox = dynamic(() => import("./three/SkillToyBox"), { ssr: false });

const TABS = ["OPTIONS", "BAG", "TRAINER", "BADGES"];
const stepped = (n) => (t) => Math.round(t * n) / n;

// A row in the OPTIONS list: ◀ value ▶, cycled with ←/→ when selected (or by clicking).
function OptionRow({ label, values, value, onChange, selected, onSelect, render = (v) => v }) {
  const i = Math.max(0, values.indexOf(value));
  const cycle = (d) => onChange(values[(i + d + values.length) % values.length]);
  return (
    <div
      onMouseEnter={onSelect}
      className={`flex items-center gap-3 px-2 py-2.5 font-display text-[9px] sm:text-[10px] ${selected ? "bg-gb-1" : ""}`}
    >
      <span className={`w-3 ${selected ? "caret-blink" : "invisible"}`}>▶</span>
      <span className="flex-1">{label}</span>
      <button type="button" onClick={() => cycle(-1)} aria-label={`Previous ${label}`} className="px-1">
        ◀
      </button>
      <span className="min-w-[110px] text-center">{render(value)}</span>
      <button type="button" onClick={() => cycle(1)} aria-label={`Next ${label}`} className="px-1">
        ▶
      </button>
    </div>
  );
}

function Options({ settings, onChange, onPalette, secretUnlocked, muted, onToggleMute, sound }) {
  const [sel, setSel] = useState(0);
  const palettes = PALETTE_ORDER.concat(secretUnlocked ? ["vb"] : []);
  const rows = [
    { label: "PALETTE", values: palettes, key: "palette", render: (v) => PALETTES[v]?.name ?? v, set: (v) => onPalette(v) },
    { label: "SHELL", values: SHELL_ORDER, key: "shell", render: (v) => SHELLS[v].name },
    { label: "SOUND", values: ["ON", "OFF"], value: muted ? "OFF" : "ON", set: () => onToggleMute() },
    { label: "MUSIC", values: [true, false], key: "ambient", render: (v) => (v ? "ON" : "OFF") },
    { label: "TEXT SPEED", values: ["slow", "mid", "fast", "instant"], key: "textSpeed", render: (v) => v.toUpperCase() },
    { label: "LCD GRID", values: ["hd", "fine", "chunky"], key: "lcd", render: (v) => v.toUpperCase() },
    { label: "GRAPHICS", values: ["auto", "full", "lite"], key: "perfMode", render: (v) => ({ auto: "AUTO", full: "3D", lite: "2D" })[v] },
    { label: "SCREENSAVER", values: ["random", "logo", "starfield", "pipes"], key: "screensaver", render: (v) => v.toUpperCase() },
  ];
  const apply = (row, v) => {
    sound?.playToggle?.();
    if (row.set) row.set(v);
    else onChange({ [row.key]: v });
  };

  // Stable listener reading the latest state through a ref: a listener re-subscribed
  // mid-dispatch (other keydown handlers trigger a sync re-render) would miss the event.
  const onKeyRef = useRef();
  onKeyRef.current = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
      sound?.playHover?.();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      const row = rows[sel];
      const value = row.value ?? settings[row.key];
      const i = Math.max(0, row.values.indexOf(value));
      apply(row, row.values[(i + (e.key === "ArrowLeft" ? -1 : 1) + row.values.length) % row.values.length]);
    }
  };
  useEffect(() => {
    const onKey = (e) => onKeyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pixel-box">
      {rows.map((row, i) => (
        <OptionRow
          key={row.label}
          label={row.label}
          values={row.values}
          value={row.value ?? settings[row.key]}
          render={row.render}
          selected={sel === i}
          onSelect={() => setSel(i)}
          onChange={(v) => apply(row, v)}
        />
      ))}
      <p className="mt-3 px-2 font-mono text-[18px] leading-tight opacity-80">▲▼ choose · ◀▶ change · this browser remembers your choices</p>
    </div>
  );
}

function Bag({ onPickSkill }) {
  const gfx = useGfx();
  const [view, setView] = useState(gfx.use3D ? "orbit" : "list");
  const views = gfx.use3D ? ["orbit", "toybox", "list"] : ["list"];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 font-display text-[8px] sm:text-[9px]">
        <span>POCKET:</span>
        {views.map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`px-2 py-1.5 ${view === v ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}>
            {{ orbit: "SKILL MAP", toybox: "TOY BOX", list: "ITEMS" }[v]}
          </button>
        ))}
        <span className="ml-auto hidden font-mono text-[16px] sm:inline">pick a skill to find its cartridges</span>
      </div>
      {view === "orbit" && (
        <div className="pixel-box p-0">
          <SkillConstellation onPickSkill={onPickSkill} />
        </div>
      )}
      {view === "toybox" && (
        <div className="pixel-box p-0">
          <SkillToyBox onPickSkill={onPickSkill} height="max(420px, calc(640px - 25vw))" />
        </div>
      )}
      {view === "list" && (
        <div className="pixel-box columns-1 gap-4 sm:columns-2 lg:columns-3">
          {SKILLS.map((g) => (
            <section key={g.group} className="mb-4 break-inside-avoid">
              <h4 className="mb-1.5 flex items-center gap-1.5 border-b-2 border-gb-3 pb-1.5 font-display text-[9px] leading-tight">
                <span className="h-2.5 w-2.5 flex-none border-2 border-gb-3" style={{ background: groupSwatch(g.group, gfx.palette) }} />
                <span className="flex-1">{g.group.toUpperCase()}</span>
                <span className="font-mono text-[16px] leading-none">{g.items.length}</span>
              </h4>
              {g.items.map((item) => {
                const n = tilesForSkill(item).length;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPickSkill(item)}
                    className={`group flex w-full items-center gap-2 py-0.5 text-left font-sans text-[15px] hover:bg-gb-1 ${n ? "" : "opacity-60"}`}
                  >
                    <span className="invisible font-display text-[8px] group-hover:visible">▶</span>
                    <span className="min-w-0 flex-1 truncate">{item}</span>
                    <span className="font-mono text-[18px] leading-none">×{n}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Trainer() {
  return (
    <div className="pixel-box">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-gb-3 pb-3">
        <span className="font-display text-[11px]">TRAINER CARD</span>
        <span className="font-mono text-[20px]">IDNo. 2023-2028</span>
      </div>
      <div className="mb-4 grid gap-2 font-display text-[9px] leading-relaxed sm:grid-cols-2">
        <span>NAME/ {SITE.name.toUpperCase()}</span>
        <span>HOME/ HYDERABAD</span>
        <span>SCHOOL/ IIIT HYDERABAD</span>
        <span>CLASS/ SOFTWARE ENGINEER</span>
      </div>
      {ADDITIONAL_INFO.map((item) => (
        <div key={item.label} className="mb-3 last:mb-0">
          <span className="mb-1 block font-display text-[9px] text-gb-hi">{item.label.toUpperCase()}</span>
          <p className="font-sans text-[16px] leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function Badges({ unlocked }) {
  const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  return (
    <div className="pixel-box">
      <div className="mb-4 flex items-center justify-between font-display text-[10px]">
        <span>BADGE CASE</span>
        <span>
          {got}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ACHIEVEMENTS.map((a, i) => {
          const on = !!unlocked[a.id];
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04, duration: 0 }}
              className={`flex flex-col items-center gap-2 border-[3px] p-2 text-center ${on ? "border-gb-3" : "border-dashed border-gb-2 opacity-60"}`}
            >
              <div className={`h-9 w-9 ${on ? "text-gb-3" : "text-gb-1"}`}>
                <TrophyIcon className="h-full w-full" />
              </div>
              <span className="font-display text-[7px] leading-relaxed">{on ? a.title.toUpperCase() : "???"}</span>
              <span className="font-mono text-[15px] leading-tight">{a.desc}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose, settings, onChange, onPalette, secretUnlocked, onPickSkill, unlocked = {}, muted, onToggleMute, sound }) {
  const [tab, setTab] = useState(0);

  // Q/E or [ / ] switch pages (←/→ are taken by the option rows)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "q" || e.key === "[") setTab((t) => (t + TABS.length - 1) % TABS.length);
      if (e.key === "e" || e.key === "]") setTab((t) => (t + 1) % TABS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label="Menu" className="relative z-[1] flex h-full w-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b-[3px] border-gb-3 px-[max(16px,calc((100%-1000px)/2+24px))] py-3">
        <span className="mr-2 font-display text-[12px]">MENU</span>
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(i);
              sound?.playHover?.();
            }}
            className={`px-2 py-1.5 font-display text-[8px] sm:px-3 sm:text-[9px] ${tab === i ? "bg-gb-3 text-gb-0" : "border-2 border-gb-3"}`}
          >
            {tab === i ? "▶" : ""}
            {t}
          </button>
        ))}
        <button type="button" onClick={onClose} aria-label="Close menu" className="pixel-btn ml-auto flex items-center gap-1.5 px-2.5 py-1.5 font-display text-[9px]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ab text-[7px] text-white">B</span>
          EXIT
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-[max(16px,calc((100%-1000px)/2+24px))] pb-24 pt-5">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.14, ease: stepped(4) }}>
            {tab === 0 && (
              <Options settings={settings} onChange={onChange} onPalette={onPalette} secretUnlocked={secretUnlocked} muted={muted} onToggleMute={onToggleMute} sound={sound} />
            )}
            {tab === 1 && <Bag onPickSkill={onPickSkill} />}
            {tab === 2 && <Trainer />}
            {tab === 3 && <Badges unlocked={unlocked} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
