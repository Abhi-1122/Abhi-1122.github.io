"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TILES, SITE } from "./data/portfolioData";
import { useClock } from "./hooks/useClock";
import { useBattery } from "./hooks/useBattery";
import { useToasts } from "./hooks/useToasts";
import { useSoundEngine } from "./hooks/useSoundEngine";
import AmbientBackground from "./components/AmbientBackground";
import BootSplash from "./components/BootSplash";
import Header from "./components/Header";
import TileCarousel from "./components/TileCarousel";
import Footer from "./components/Footer";
import GameModal from "./components/GameModal";
import SettingsModal from "./components/SettingsModal";
import SleepOverlay from "./components/SleepOverlay";
import ToastStack from "./components/ToastStack";
import WarpPipeTransition from "./components/WarpPipeTransition";

export default function Home() {
  const [booting, setBooting] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const [openTileIndex, setOpenTileIndex] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [dark, setDark] = useState(false);
  const [muted, setMuted] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [bump, setBump] = useState({ dir: null, nonce: 0 });
  const [warpOrigin, setWarpOrigin] = useState(null);
  const [warpTile, setWarpTile] = useState(null);
  const [warpTileIndex, setWarpTileIndex] = useState(null);
  const carouselRef = useRef(null);

  const { time, greeting } = useClock();
  const batteryPct = useBattery();
  const { toasts, push } = useToasts();
  const sound = useSoundEngine(muted);

  const modalOpen = openTileIndex !== null || settingsOpen;

  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("switch-portfolio-theme");
    if (saved === "dark") setDark(true);
    const savedMuted = window.localStorage.getItem("switch-portfolio-muted");
    if (savedMuted !== null) setMuted(savedMuted === "true");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const focusTile = useCallback(
    (idx) => {
      const next = Math.max(0, Math.min(TILES.length - 1, idx));
      if (next === focusIndex) {
        if (idx < 0) {
          setBump({ dir: "left", nonce: Date.now() });
          sound.playBonk();
        } else if (idx > TILES.length - 1) {
          setBump({ dir: "right", nonce: Date.now() });
          sound.playBonk();
        }
        return;
      }
      sound.playHover();
      setFocusIndex(next);
    },
    [focusIndex, sound]
  );

  const launchTile = useCallback(
    (idx, rect) => {
      if (modalOpen || launching) return;
      const origin = rect || carouselRef.current?.getActiveRect() || null;
      setLaunching(true);
      setWarpOrigin(origin);
      setWarpTile(TILES[idx]);
      setWarpTileIndex(idx);
      setFlashing(true);
      sound.playLaunch();
      window.setTimeout(() => {
        setOpenTileIndex(idx);
        sound.playChime();
      }, 900);
      window.setTimeout(() => {
        setFlashing(false);
        setLaunching(false);
        setWarpOrigin(null);
        setWarpTile(null);
        setWarpTileIndex(null);
      }, 1400);
    },
    [modalOpen, launching, sound]
  );

  const closeGame = useCallback(() => {
    setOpenTileIndex(null);
    sound.playClick();
  }, [sound]);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    sound.playClick();
  }, [sound]);

  const handleAction = useCallback(
    (action) => {
      sound.playClick();
      switch (action) {
        case "mail":
          window.location.href = `mailto:${SITE.email}`;
          push("Opening your mail client…", "✉");
          break;
        case "github":
          window.open(SITE.github, "_blank");
          push("Heading to GitHub…", "★");
          break;
        case "linkedin":
          window.open(SITE.linkedin, "_blank");
          push("Heading to LinkedIn…", "in");
          break;
        case "settings":
          setSettingsOpen(true);
          sound.playChime();
          break;
        case "sleep":
          setSleeping(true);
          break;
        default:
          break;
      }
    },
    [push, sound]
  );

  const toggleTheme = useCallback(() => {
    sound.playClick();
    const next = !dark;
    window.localStorage.setItem("switch-portfolio-theme", next ? "dark" : "light");
    setDark(next);
    push(next ? "Dark mode on" : "Light mode on", next ? "●" : "○");
  }, [dark, push, sound]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    window.localStorage.setItem("switch-portfolio-muted", String(next));
    setMuted(next);
    push(next ? "Sound off" : "Sound on", next ? "🔇" : "🔊");
  }, [muted, push]);

  // keyboard navigation
  useEffect(() => {
    function onKeyDown(e) {
      // Global states take absolute priority: intercept in the capture phase
      // and stop the event so a focused tile/game canvas underneath never
      // gets a chance to react to the same keypress (e.g. Enter re-launching
      // a focused tile instead of just waking from sleep).
      if (sleeping) {
        // preventDefault too: stopPropagation alone doesn't stop the browser's
        // own default action (e.g. Enter re-clicking whichever button still
        // has focus, like the Sleep icon that opened this in the first place).
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setSleeping(false);
        return;
      }
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
        }
        return;
      }
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
          launchTile(focusIndex);
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [sleeping, settingsOpen, openTileIndex, focusIndex, focusTile, launchTile, closeGame, closeSettings]);

  return (
    <>
      <AmbientBackground dark={dark} />

      <AnimatePresence>{booting && <BootSplash key="boot" />}</AnimatePresence>

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-[4vw] sm:py-[4vh]">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={
            modalOpen
              ? { opacity: 0, y: 0, scale: 0.96, transition: { duration: 0.22 } }
              : { opacity: 1, y: 0, scale: 1, transition: { delay: 0.15, type: "spring", stiffness: 220, damping: 24 } }
          }
          className="dashboard-shadow flex w-full flex-col gap-4 rounded-[22px] bg-white/[0.97] p-5 pb-4 transition-colors duration-500 dark:bg-[#161a20]/[0.97] sm:w-[70vw] sm:max-w-[1500px] sm:min-h-[66vh] sm:max-h-[82vh] sm:gap-[22px] sm:rounded-[26px] sm:p-[28px] sm:pb-[18px]"
          style={{ pointerEvents: modalOpen ? "none" : "auto" }}
        >
          <Header
            greeting={greeting}
            onAction={handleAction}
            dark={dark}
            onToggleTheme={toggleTheme}
            muted={muted}
            onToggleMute={toggleMute}
          />

          <div className="flex flex-1 flex-col justify-center">
            <TileCarousel
              ref={carouselRef}
              tiles={TILES}
              activeIndex={focusIndex}
              onFocus={focusTile}
              onLaunch={launchTile}
              onHoverSound={sound.playHover}
              bump={bump}
              hiddenTileIndex={warpTileIndex}
            />
          </div>

          <Footer
            time={time}
            batteryPct={batteryPct}
            modalOpen={openTileIndex !== null}
            onStart={() => launchTile(focusIndex)}
            onBack={closeGame}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {sleeping && <SleepOverlay key="sleep" time={time} onWake={() => setSleeping(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {(openTileIndex !== null || settingsOpen) && (
          <motion.div
            key="modal-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-[3vw]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={openTileIndex !== null ? closeGame : closeSettings}
              className="absolute inset-0 bg-[#0a1419]/55 backdrop-blur-md"
            />
            {openTileIndex !== null && <GameModal tile={TILES[openTileIndex]} onClose={closeGame} sound={sound} />}
            {settingsOpen && <SettingsModal onClose={closeSettings} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flashing && <WarpPipeTransition key="warp" origin={warpOrigin} tile={warpTile} dark={dark} />}
      </AnimatePresence>

      <ToastStack toasts={toasts} />
    </>
  );
}
