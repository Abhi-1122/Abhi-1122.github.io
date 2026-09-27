"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const ACHIEVEMENTS = [
  { id: "first_launch", title: "Press Start", desc: "Opened your first tile" },
  { id: "explorer", title: "Explorer", desc: "Opened every project and experience tile" },
  { id: "completionist", title: "Completionist", desc: "Opened every single tile" },
  { id: "arcade", title: "Arcade Regular", desc: "Played all three arcade games" },
  { id: "high_score", title: "High Scorer", desc: "Set a personal best in any game" },
  { id: "skill_seeker", title: "Skill Seeker", desc: "Filtered projects by a skill" },
  { id: "night_owl", title: "Night Owl", desc: "Switched to dark mode" },
  { id: "sleepy", title: "Power Nap", desc: "Put the console to sleep" },
  { id: "controller", title: "Plugged In", desc: "Connected a game controller" },
  { id: "konami", title: "↑↑↓↓←→←→BA", desc: "Found the secret code" },
];

const KEY = "switch-portfolio-achievements";

function load() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) || { unlocked: {}, opened: [], played: [] };
  } catch {
    return { unlocked: {}, opened: [], played: [] };
  }
}

// Unlocks persist in localStorage; each new unlock calls onUnlock(achievement).
export function useAchievements(onUnlock) {
  const [state, setState] = useState({ unlocked: {}, opened: [], played: [] });
  const stateRef = useRef(state);
  const cb = useRef(onUnlock);
  cb.current = onUnlock;

  useEffect(() => {
    stateRef.current = load();
    setState(stateRef.current);
  }, []);

  const commit = (next) => {
    stateRef.current = next;
    setState(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  };

  const unlock = useCallback((id) => {
    const s = stateRef.current;
    if (s.unlocked[id]) return;
    commit({ ...s, unlocked: { ...s.unlocked, [id]: Date.now() } });
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) cb.current?.(a);
  }, []);

  // Track progress lists ("opened" tile ids, "played" game ids); returns the updated list.
  const track = useCallback((list, value) => {
    const s = stateRef.current;
    if (s[list].includes(value)) return s[list];
    const next = [...s[list], value];
    commit({ ...s, [list]: next });
    return next;
  }, []);

  return { unlocked: state.unlocked, unlock, track };
}
