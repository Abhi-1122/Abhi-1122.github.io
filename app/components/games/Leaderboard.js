"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX = 5;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Pre-leaderboard single best-score keys; seeded once and kept in sync.
const LEGACY = { blockdrop: "block-drop-best", pixeljumper: "pixel-jumper-best" };

function read(gameId) {
  try {
    const raw = window.localStorage.getItem(`arcade-lb-${gameId}`);
    if (raw) return JSON.parse(raw);
    const legacy = Number(window.localStorage.getItem(LEGACY[gameId]) || 0);
    return legacy > 0 ? [{ name: "YOU", score: legacy, date: null }] : [];
  } catch {
    return [];
  }
}

// Top-5 {name, score, date} per game. Reads go straight to localStorage so
// callbacks captured by long-lived game loops never see stale data.
export function useLeaderboard(gameId) {
  const [entries, setEntries] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  useEffect(() => setEntries(read(gameId)), [gameId]);

  // -> { qualifies: belongs on the board, personalBest: beats the current #1 }
  const check = useCallback((score) => {
    const e = read(gameId);
    return {
      qualifies: score > 0 && (e.length < MAX || score > e[MAX - 1].score),
      personalBest: score > (e[0]?.score || 0),
    };
  }, [gameId]);

  const add = useCallback((name, score) => {
    const entry = { name, score, date: new Date().toISOString().slice(0, 10) };
    const top = [...read(gameId), entry].sort((a, b) => b.score - a.score).slice(0, MAX);
    try {
      window.localStorage.setItem(`arcade-lb-${gameId}`, JSON.stringify(top));
      if (LEGACY[gameId]) window.localStorage.setItem(LEGACY[gameId], String(top[0].score));
    } catch {
      // storage full / disabled — board just won't persist
    }
    setEntries(top);
    setHighlight(top.indexOf(entry));
  }, [gameId]);

  return { entries, best: entries[0]?.score || 0, highlight, check, add };
}

const RANKS = ["1ST", "2ND", "3RD", "4TH", "5TH"];

// Pokémon/arcade-style HIGH SCORES window.
export function Leaderboard({ entries, highlight = -1, className = "" }) {
  return (
    <div className={`pixel-box w-full font-display text-[10px] leading-none ${className}`}>
      <div className="mb-3 text-center">HIGH SCORES</div>
      <ol className="flex flex-col gap-1">
        {Array.from({ length: MAX }, (_, i) => {
          const e = entries[i];
          const mine = i === highlight;
          return (
            <li key={i} className={`flex items-center gap-2 whitespace-nowrap px-1 py-1 ${mine ? "bg-gb-3 text-gb-0" : ""}`}>
              <span className={`w-2 ${mine ? "caret-blink" : "invisible"}`}>▶</span>
              <span className="w-8">{RANKS[i]}</span>
              <span className="w-8">{e ? e.name : "---"}</span>
              <span className="ml-auto">{e ? String(e.score).padStart(5, "0") : "-----"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const arrow = "pixel-btn px-2 py-0.5 font-display text-[8px] leading-none";

// Retro 3-letter initials entry. Owns ↑↓←→/Enter/letters in the window capture
// phase and stops propagation, so the game underneath never sees those keys.
export function InitialsPicker({ score, onSubmit, sound }) {
  const [chars, setChars] = useState(() => {
    try {
      const saved = window.localStorage.getItem("arcade-initials");
      if (/^[A-Z]{3}$/.test(saved)) return saved.split("");
    } catch {}
    return ["A", "A", "A"];
  });
  const [slot, setSlot] = useState(0);
  const live = useRef();
  live.current = { chars, slot, onSubmit };

  function bump(i, d) {
    setChars((c) => c.map((ch, j) => (j === i ? LETTERS[(LETTERS.indexOf(ch) + d + 26) % 26] : ch)));
    setSlot(i);
    sound?.playHover?.();
  }
  function moveSlot(d) {
    setSlot((s) => Math.max(0, Math.min(2, s + d)));
    sound?.playClick?.();
  }
  function type(ch) {
    const { slot } = live.current;
    setChars((c) => c.map((x, j) => (j === slot ? ch : x)));
    setSlot(Math.min(2, slot + 1));
    sound?.playHover?.();
  }
  function submit() {
    const name = live.current.chars.join("");
    try {
      window.localStorage.setItem("arcade-initials", name);
    } catch {}
    sound?.playCoin?.();
    live.current.onSubmit(name);
  }

  useEffect(() => {
    // Ignore keys for a moment so a held jump/turn key doesn't scribble on the name.
    const armedAt = performance.now() + 400;
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      let action = null;
      if (k === "ArrowUp") action = () => bump(live.current.slot, 1);
      else if (k === "ArrowDown") action = () => bump(live.current.slot, -1);
      else if (k === "ArrowLeft" || k === "Backspace") action = () => moveSlot(-1);
      else if (k === "ArrowRight") action = () => moveSlot(1);
      else if (k === "Enter") action = submit;
      else if (/^[a-z]$/i.test(k)) action = () => type(k.toUpperCase());
      else if (k === " ") action = () => {};
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && performance.now() > armedAt) action();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="pixel-box flex w-full flex-col items-center gap-2 font-display text-[10px] leading-none">
      <div>NEW RECORD!</div>
      <div className="text-gb-2">{String(score).padStart(5, "0")}</div>
      <div className="mt-1">ENTER NAME</div>
      <div className="flex gap-3">
        {chars.map((ch, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <button type="button" aria-label={`Next letter ${i + 1}`} className={arrow} onClick={() => bump(i, 1)}>▲</button>
            <button
              type="button"
              aria-label={`Letter ${i + 1}: ${ch}`}
              onClick={() => setSlot(i)}
              className={`h-8 w-7 border-b-[3px] border-gb-3 text-base ${i === slot ? "bg-gb-3 text-gb-0" : ""}`}
            >
              <span className={i === slot ? "caret-blink" : ""}>{ch}</span>
            </button>
            <button type="button" aria-label={`Previous letter ${i + 1}`} className={arrow} onClick={() => bump(i, -1)}>▼</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={submit} className="pixel-btn mt-1 px-4 py-2 font-display text-[10px]">
        SAVE
      </button>
      <div className="mt-1 text-center font-mono text-base leading-none text-gb-2">↑↓ LETTER · ←→ MOVE · ENTER SAVE</div>
    </div>
  );
}
