"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Graphics capability + visual-mode flags shared by every 3D/animated component.
//   use3D   — render WebGL scenes (otherwise the original 2D components are used)
//   effects — postprocessing (bloom etc.); off on touch devices or after an FPS drop
//   lite    — cut particle counts / geometry detail
//   retro   — Konami-code chiptune mode
//   palette — current screen palette id (see lib/palettes.js)
//   pixel   — LCD cell size in CSS px for every <Stage> (user setting)
const GfxContext = createContext({
  use3D: false,
  effects: false,
  lite: true,
  reducedMotion: false,
  retro: false,
  dark: false,
  reportLowFps: () => {},
});

export const useGfx = () => useContext(GfxContext);

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// perfMode: "auto" | "full" | "lite" (user setting)
// LCD cell size (CSS px) per setting; small screens get finer cells so text on the tiny carts stays legible.
const LCD_PIXEL = { hd: 1, fine: 2, chunky: 3 };
const LCD_PIXEL_SMALL = { hd: 0.5, fine: 1, chunky: 2 };

export function GfxProvider({ perfMode, retro, dark, palette = "gbc", lcd = "hd", children }) {
  const [env, setEnv] = useState({ webgl: false, reducedMotion: false, coarse: false, ready: false });
  const [lowFps, setLowFps] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const small = window.matchMedia("(max-width: 639px)");
    const update = () => setEnv({ webgl: hasWebGL(), reducedMotion: rm.matches, coarse: coarse.matches, small: small.matches, ready: true });
    update();
    rm.addEventListener("change", update);
    small.addEventListener("change", update);
    return () => {
      rm.removeEventListener("change", update);
      small.removeEventListener("change", update);
    };
  }, []);

  const value = useMemo(() => {
    const use3D = env.ready && env.webgl && perfMode !== "lite" && (!env.reducedMotion || perfMode === "full");
    return {
      ready: env.ready,
      use3D,
      effects: use3D && (perfMode === "full" || (!env.coarse && !lowFps)),
      lite: !use3D || env.coarse || lowFps,
      reducedMotion: env.reducedMotion,
      coarse: env.coarse,
      retro,
      dark,
      palette,
      pixel: (env.small ? LCD_PIXEL_SMALL : LCD_PIXEL)[lcd] ?? 2,
      reportLowFps: () => perfMode === "auto" && setLowFps(true),
    };
  }, [env, perfMode, lowFps, retro, dark, palette, lcd]);

  return <GfxContext.Provider value={value}>{children}</GfxContext.Provider>;
}
