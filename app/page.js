"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { TILES, SITE } from "./data/portfolioData";
import { useClock } from "./hooks/useClock";
import { useBattery } from "./hooks/useBattery";
import { useToasts } from "./hooks/useToasts";
import { useSoundEngine } from "./hooks/useSoundEngine";
import { useIdle } from "./hooks/useIdle";
import { useKonami } from "./hooks/useKonami";
import { useGamepad } from "./hooks/useGamepad";
import { useAchievements } from "./hooks/useAchievements";
import { GfxProvider } from "./lib/gfx";
import { applyTheme, PALETTE_ORDER } from "./lib/palettes";
import { tilesForSkill } from "./lib/skills";
import ConsoleShell from "./components/ConsoleShell";
import Backdrop from "./components/Backdrop";
import GbBoot from "./components/GbBoot";
import Header from "./components/Header";
import TileCarousel from "./components/TileCarousel";
import Footer from "./components/Footer";
import GameModal from "./components/GameModal";
import SettingsModal from "./components/SettingsModal";
import ToastStack from "./components/ToastStack";
import HintBar from "./components/HintBar";
import CursorCompanion from "./components/CursorCompanion";
import CartridgeTransition from "./components/CartridgeTransition";

const SleepOverlay = dynamic(() => import("./components/SleepOverlay"), { ssr: false });

const DEFAULT_SETTINGS = {
  palette: "gbc",
  shell: "classic",
  perfMode: "full",
  screensaver: "random",
  ambient: true,
  textSpeed: "fast",
  lcd: "hd",
};
const PULL_SCALE = 0.72;
const PULL_Y = 40;
const SETTINGS_KEY = "gamedeck-settings";
const KEY_TO_CONTROL = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", A: "left", d: "right", D: "right",
  Enter: "a", " ": "a", Escape: "b", Backspace: "b",
};
const EXPLORE_IDS = TILES.filter((t) => t.category).map((t) => t.id);
const GAME_IDS = TILES.filter((t) => t.game).map((t) => t.game);

export default function Home() {
  const [power, setPower] = useState("off"); // off → on (boot screen shows until booted)
  const [booted, setBooted] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [openTileIndex, setOpenTileIndex] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false); // false | screensaver mode
  const [muted, setMuted] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [pullBack, setPullBack] = useState(false); // console backs off so the cartridge insert is visible
  const [bump, setBump] = useState({ dir: null, nonce: 0 });
  const [transition, setTransition] = useState(null); // { tile, index, origin, shellRect }
  const [skillFilter, setSkillFilter] = useState(null); // { skill, ids:Set }
  const [pressed, setPressed] = useState(() => new Set());
  const shellRef = useRef(null);
  const launchingRef = useRef(false);

  const { time, greeting } = useClock(false);
  const batteryPct = useBattery();
  const { toasts, push } = useToasts();
  const sound = useSoundEngine(muted);
  const achievements = useAchievements((a) => {
    push(`BADGE GET! ${a.title}`, "★");
    sound.playAchievement();
  });

  const modalOpen = openTileIndex !== null || settingsOpen;
  const dark = settings.palette === "light";

  // ── persisted settings ──
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
      if (saved) setSettings((s) => ({ ...s, ...saved }));
    } catch {}
    const savedMuted = window.localStorage.getItem("gamedeck-muted");
    if (savedMuted !== null) setMuted(savedMuted === "true");
    setSecretUnlocked(window.localStorage.getItem("gamedeck-secret") === "1");
  }, []);

  useEffect(() => {
    applyTheme(settings.palette, settings.shell);
  }, [settings.palette, settings.shell]);

  const updateSettings = useCallback((patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ambient pad follows the focused tile
  useEffect(() => {
    sound.setAmbient(booted && !muted && settings.ambient && !sleeping, focusIndex);
  }, [sound, booted, muted, settings.ambient, sleeping, focusIndex]);

  // ── navigation ──
  const focusTile = useCallback(
    (idx) => {
      const next = Math.max(0, Math.min(TILES.length - 1, idx));
      if (next === focusIndex) {
        if (idx < 0 || idx > TILES.length - 1) {
          setBump({ dir: idx < 0 ? "left" : "right", nonce: Date.now() });
          sound.playBonk();
        }
        return;
      }
      sound.playHover(next > focusIndex ? 0.4 : -0.4);
      setFocusIndex(next);
    },
    [focusIndex, sound]
  );

  const openTile = useCallback(
    (idx) => {
      setOpenTileIndex(idx);
      sound.playChime();
      const tile = TILES[idx];
      achievements.unlock("first_launch");
      const opened = achievements.track("opened", tile.id);
      if (EXPLORE_IDS.every((id) => opened.includes(id))) achievements.unlock("explorer");
      if (TILES.every((t) => opened.includes(t.id))) achievements.unlock("completionist");
      if (tile.game && GAME_IDS.every((g) => achievements.track("played", tile.game).includes(g))) achievements.unlock("arcade");
    },
    [sound, achievements]
  );

  const launchTile = useCallback(
    (idx) => {
      if (modalOpen || launchingRef.current) return;
      launchingRef.current = true;
      setLaunching(true);
      const r = shellRef.current?.getBoundingClientRect() ?? null;
      // where the shell's top edge will be once pulled back (scaled about its bottom centre)
      const shellRect = r && { left: r.left + (r.width * (1 - PULL_SCALE)) / 2, top: r.top + r.height * (1 - PULL_SCALE) + PULL_Y, width: r.width * PULL_SCALE };
      setTransition({ tile: TILES[idx], index: idx, shellRect });
      setPullBack(true);
      sound.playLaunch();
      window.setTimeout(() => {
        setPullBack(false);
        setZoomed(true);
      }, 1100);
      window.setTimeout(() => openTile(idx), 1300);
      window.setTimeout(() => {
        setTransition(null);
        setLaunching(false);
        launchingRef.current = false;
      }, 1650);
    },
    [modalOpen, sound, openTile]
  );

  const closeGame = useCallback(() => {
    setOpenTileIndex(null);
    setZoomed(false);
    sound.playWhoosh();
  }, [sound]);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setZoomed(false);
    sound.playClick();
  }, [sound]);
  const openSettings = useCallback(() => {
    setZoomed(true);
    setSettingsOpen(true);
    sound.playChime();
  }, [sound]);

  const stepProject = useCallback(
    (dir) => {
      setOpenTileIndex((i) => {
        if (i === null) return i;
        const next = (i + dir + TILES.length) % TILES.length;
        setFocusIndex(next);
        return next;
      });
      sound.playHover(dir * 0.4);
    },
    [sound]
  );

  // Theme/backlight toggles run as a circular wipe from the clicked control.
  const withWipe = useCallback((e, apply) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return apply();
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = document.startViewTransition(() => flushSync(apply));
    vt.finished.catch(() => {}); // rapid toggles skip the previous transition
    vt.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 550, easing: "steps(12, end)", pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {});
  }, []);

  const setPalette = useCallback(
    (palette, e) => {
      sound.playToggle();
      withWipe(e, () => {
        updateSettings({ palette });
        applyTheme(palette, settings.shell);
      });
      if (palette === "light") achievements.unlock("night_owl");
    },
    [sound, withWipe, updateSettings, settings.shell, achievements]
  );

  const toggleBacklight = useCallback(
    (e) => {
      const next = dark ? (settings.lastPalette && settings.lastPalette !== "light" ? settings.lastPalette : "gbc") : "light";
      if (!dark) updateSettings({ lastPalette: settings.palette });
      setPalette(next, e);
      push(next === "light" ? "BACKLIGHT ON" : "BACKLIGHT OFF", "☀");
    },
    [dark, settings.lastPalette, settings.palette, updateSettings, setPalette, push]
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    window.localStorage.setItem("gamedeck-muted", String(next));
    setMuted(next);
    push(next ? "SOUND OFF" : "SOUND ON", "♪");
  }, [muted, push]);

  // Manual sleep (power switch / power button) always shows the starfield;
  // idle auto-sleep follows the Screensaver setting.
  const goToSleep = useCallback((mode = "starfield") => {
    setSleeping(mode);
    achievements.unlock("sleepy");
  }, [achievements]);

  const pickSkill = useCallback(
    (skill) => {
      const matches = tilesForSkill(skill);
      setSkillFilter({ skill, ids: new Set(matches.map((t) => t.id)) });
      setSettingsOpen(false);
      setZoomed(false);
      achievements.unlock("skill_seeker");
      if (matches.length) setFocusIndex(TILES.findIndex((t) => t.id === matches[0].id));
      push(matches.length ? `${matches.length} FOUND: ${skill}` : `NO CARTS USE ${skill}`, "▶");
    },
    [achievements, push]
  );

  const handleAction = useCallback(
    (action) => {
      sound.playClick();
      switch (action) {
        case "mail":
          window.location.href = `mailto:${SITE.email}`;
          push("OPENING MAIL…", "✉");
          break;
        case "github":
          window.open(SITE.github, "_blank");
          push("TO GITHUB…", "▶");
          break;
        case "linkedin":
          window.open(SITE.linkedin, "_blank");
          push("TO LINKEDIN…", "▶");
          break;
        case "settings":
          openSettings();
          break;
        case "sleep":
          goToSleep("starfield");
          break;
        default:
          break;
      }
    },
    [push, sound, openSettings, goToSleep]
  );

  // Physical console controls → the same key events the keyboard sends.
  const onControl = useCallback(
    (id) => {
      if (id === "power") {
        if (!booted) return window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        return sleeping ? setSleeping(false) : goToSleep("starfield");
      }
      if (id === "l" || id === "r") {
        const order = PALETTE_ORDER.concat(secretUnlocked ? ["vb"] : []);
        const i = Math.max(0, order.indexOf(settings.palette));
        const next = order[(i + (id === "r" ? 1 : -1) + order.length) % order.length];
        setPalette(next);
        return push(`PALETTE: ${next.toUpperCase()}`, "◐");
      }
      if (id === "vol") return toggleMute();
      if (id === "select") {
        if (!booted) return;
        return settingsOpen ? closeSettings() : openTileIndex === null && openSettings();
      }
      const inGame = openTileIndex !== null && TILES[openTileIndex].game;
      const key = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", a: inGame ? " " : "Enter", b: "Escape", start: inGame ? "Enter" : "Enter" }[id];
      if (!key) return;
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      window.setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true })), 120);
    },
    [booted, sleeping, goToSleep, settingsOpen, closeSettings, openSettings, openTileIndex, secretUnlocked, settings.palette, setPalette, push, toggleMute]
  );

  // Mirror key presses onto the physical buttons. Deferred to the next frame: a state update
  // flushed mid-dispatch re-subscribes other components' keydown listeners, and a listener
  // re-added during dispatch never sees the current event.
  useEffect(() => {
    const down = (e) => {
      const c = KEY_TO_CONTROL[e.key];
      if (c) requestAnimationFrame(() => setPressed((p) => (p.has(c) ? p : new Set(p).add(c))));
    };
    const up = (e) => {
      const c = KEY_TO_CONTROL[e.key];
      if (c)
        requestAnimationFrame(() =>
          setPressed((p) => {
            const n = new Set(p);
            n.delete(c);
            return n;
          })
        );
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // keyboard navigation
  useEffect(() => {
    function onKeyDown(e) {
      if (!booted) return; // GbBoot owns keys until the logo has landed
      // Global states take absolute priority: intercept in the capture phase
      // and stop the event so a focused tile/game canvas underneath never
      // gets a chance to react to the same keypress.
      if (sleeping) {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setSleeping(false);
        return;
      }
      const typing = e.target instanceof HTMLElement && e.target.matches("input, textarea, [contenteditable]");
      if (settingsOpen) {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeSettings();
        }
        return;
      }
      if (openTileIndex !== null) {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeGame();
        } else if (!typing && !TILES[openTileIndex].game && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          stepProject(e.key === "ArrowDown" ? 1 : -1);
        }
        return;
      }
      if (typing) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          focusTile(focusIndex - 1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          focusTile(focusIndex + 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          launchTile(focusIndex);
          break;
        case "Escape":
          if (skillFilter) setSkillFilter(null);
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [booted, sleeping, settingsOpen, openTileIndex, focusIndex, focusTile, launchTile, closeGame, closeSettings, stepProject, skillFilter]);

  useKonami(() => {
    window.localStorage.setItem("gamedeck-secret", "1");
    setSecretUnlocked(true);
    achievements.unlock("konami");
    setPalette("vb");
    push("SECRET PALETTE: VIRTUAL", "!");
  });
  useGamepad(() => {
    achievements.unlock("controller");
    push("CONTROLLER CONNECTED", "✚");
  });
  // Phone/browser Back closes the open project, menu or screensaver instead of leaving the site.
  // Opening one pushes a history entry; Back pops it (popstate → close). Closing it from the UI
  // pops our entry ourselves so history stays balanced.
  const overlay = openTileIndex !== null ? "project" : settingsOpen ? "menu" : sleeping ? "sleep" : null;
  const pushedRef = useRef(false);
  useEffect(() => {
    if (overlay && !pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState({ ...window.history.state, gamedeck: overlay }, "");
    } else if (!overlay && pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, [overlay]);
  useEffect(() => {
    const onPop = () => {
      if (!pushedRef.current) return; // our own history.back() after a UI close
      pushedRef.current = false;
      setOpenTileIndex(null);
      setSettingsOpen(false);
      setSleeping(false);
      setZoomed(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const idle = useIdle({ enabled: booted && !modalOpen && !sleeping, onSleep: () => goToSleep(settings.screensaver) });

  const hintContext = !booted || sleeping ? "hidden" : settingsOpen ? "settings" : openTileIndex !== null ? (TILES[openTileIndex].game ? "game" : "modal") : "home";

  return (
    <GfxProvider perfMode={settings.perfMode} retro={false} dark={dark} palette={settings.palette} lcd={settings.lcd}>
      <MotionConfig reducedMotion="user">
        <Backdrop paused={modalOpen || sleeping} />
        <main className="flex min-h-screen items-center justify-center overflow-hidden px-2 pb-8 pt-6 sm:px-4 lg:pb-12 lg:pt-7">
          <motion.div
            animate={
              zoomed
                ? { scale: 2.4, opacity: 0, transition: { duration: 0.35, ease: "easeIn" } }
                : { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 240, damping: 26 } }
            }
            className={`relative z-10 w-full max-w-[640px] lg:max-w-none lg:w-auto ${idle ? "animate-breathe" : ""}`}
            style={{ pointerEvents: modalOpen || launching ? "none" : "auto", transformOrigin: "50% 42%" }}
          >
            <motion.div
              animate={pullBack ? { scale: PULL_SCALE, y: PULL_Y } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ transformOrigin: "50% 100%" }}
            >
            <ConsoleShell ref={shellRef} pressed={pressed} onControl={onControl} powered={power === "on"} muted={muted}>
              <div className="relative flex h-[max(540px,calc(100svh-300px))] flex-col lg:h-[clamp(500px,calc(100vh-262px),940px)]">
                {/* The home screen mounts right away, invisible under the boot screen, so the 3D
                    chunk downloads and the carousel builds its textures/shaders while you read
                    "press any key". It fades in the moment boot finishes. */}
                <motion.div
                  initial={false}
                  animate={{ opacity: booted ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: (t) => Math.round(t * 4) / 4 }}
                  inert={!booted}
                  aria-hidden={!booted}
                  className="flex flex-1 flex-col"
                >
                    <Header greeting={greeting} onAction={handleAction} dark={dark} onToggleTheme={toggleBacklight} muted={muted} onToggleMute={toggleMute} />

                    <div className="relative flex min-h-0 flex-1 flex-col px-2 py-2 sm:px-4">
                      <AnimatePresence>
                        {skillFilter && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSkillFilter(null)}
                            className="pixel-btn absolute left-1/2 top-2 z-[260] -translate-x-1/2 px-2.5 py-1 font-display text-[8px]"
                          >
                            ▶ {skillFilter.skill.toUpperCase()} ✕
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <TileCarousel
                        tiles={TILES}
                        activeIndex={focusIndex}
                        onFocus={focusTile}
                        onLaunch={launchTile}
                        onHoverSound={sound.playHover}
                        bump={bump}
                        hiddenTileIndex={transition?.index ?? null}
                        filter={skillFilter?.ids ?? null}
                        dark={dark}
                        paused={modalOpen || sleeping}
                      />
                    </div>

                    <Footer time={time} batteryPct={batteryPct} modalOpen={openTileIndex !== null} onStart={() => launchTile(focusIndex)} onBack={closeGame} />
                </motion.div>
                {!booted && (
                  <div className="absolute inset-0 z-[70]">
                    <GbBoot sound={sound} onPowerOn={() => setPower("on")} onDone={() => setBooted(true)} />
                  </div>
                )}
              </div>
            </ConsoleShell>
            </motion.div>
          </motion.div>
        </main>

        <AnimatePresence>
          {transition && (
            <CartridgeTransition key="cart" tile={transition.tile} shellRect={transition.shellRect} sound={sound} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sleeping && <SleepOverlay key="sleep" time={time} mode={sleeping} onWake={() => setSleeping(false)} />}
        </AnimatePresence>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              key="modal-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: (t) => Math.round(t * 4) / 4 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="lcd fixed inset-0 z-[65] flex items-stretch justify-center overflow-hidden"
            >
              {openTileIndex !== null && (
                <GameModal
                  tile={TILES[openTileIndex]}
                  index={openTileIndex}
                  total={TILES.length}
                  onClose={closeGame}
                  onStep={stepProject}
                  sound={sound}
                  textSpeed={settings.textSpeed}
                  onGameEvent={(type, payload) => {
                    if (type === "score") achievements.unlock("high_score");
                  }}
                />
              )}
              {settingsOpen && (
                <SettingsModal
                  onClose={closeSettings}
                  settings={settings}
                  onChange={updateSettings}
                  onPalette={setPalette}
                  secretUnlocked={secretUnlocked}
                  onPickSkill={pickSkill}
                  unlocked={achievements.unlocked}
                  muted={muted}
                  onToggleMute={toggleMute}
                  sound={sound}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <ToastStack toasts={toasts} />
        <HintBar context={hintContext} />
        <CursorCompanion />
      </MotionConfig>
    </GfxProvider>
  );
}
