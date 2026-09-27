"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { TILE_ICONS } from "./icons";

// Same silhouette as the 3D carousel cartridges: chamfered top-right corner, rounded bottom.
const SHAPE = "polygon(0 3%, 2% 0, 86% 0, 100% 12%, 100% 94%, 97% 100%, 3% 100%, 0 94%)";

// A game cartridge drops in from above, tilting flat as it falls, and is pushed into the slot on
// the console's top edge. It renders *under* the shell (lower z-index), so the shell hides it as it goes in.
export default function CartridgeTransition({ tile, shellRect, sound }) {
  useEffect(() => {
    const t = window.setTimeout(() => sound?.playInsert?.(), 820);
    return () => clearTimeout(t);
  }, [sound]);

  if (!shellRect || !tile) return null;
  const Icon = TILE_ICONS[tile.icon];
  const W = Math.round(Math.max(150, Math.min(260, shellRect.width * 0.17)));
  const H = Math.round(W * 1.16);
  const left = shellRect.left + shellRect.width / 2 - W / 2;
  const hover = shellRect.top - H + W * 0.22;
  const start = -H - 60 - shellRect.top;

  return (
    <div className="pointer-events-none fixed z-[5]" style={{ left, top: 0, width: W, height: H, perspective: 900 }}>
      <motion.div
        initial={{ y: start, rotateX: 38, rotateZ: -7 }}
        animate={{ y: [start, hover - 14, hover, hover, shellRect.top + 40], rotateX: [38, 6, 0, 0, 0], rotateZ: [-7, 2, 0, 0, 0] }}
        transition={{ duration: 1.0, delay: 0.1, times: [0, 0.42, 0.56, 0.7, 1], ease: ["easeOut", "easeOut", "linear", "easeIn"] }}
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* thickness: a darker copy offset behind */}
        <div className="absolute inset-0 translate-y-[7px] bg-[#7f7d78]" style={{ clipPath: SHAPE }} />
        <div
          className="absolute inset-0 flex flex-col bg-[linear-gradient(180deg,#d2d0cb,#b9b7b2_30%,#aeaca7)] shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
          style={{ clipPath: SHAPE, padding: `${W * 0.12}px ${W * 0.07}px ${W * 0.06}px` }}
        >
          {/* grip ridges */}
          <div className="absolute left-[7%] right-[26%] top-[3%] flex flex-col gap-[3px]" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-[2px] bg-black/20 shadow-[0_1px_0_rgba(255,255,255,0.5)]" />
            ))}
          </div>
          {/* recessed label */}
          <div className="flex flex-1 flex-col rounded-[3px] bg-[#8f8d88] p-[4px] shadow-[inset_0_2px_3px_rgba(0,0,0,0.35)]">
            <div className="bg-[#141414] px-1.5 py-[3px] font-display text-[6px] tracking-wider text-[#d8d8d8]">GAME DECK</div>
            <div className={`pixelated relative flex flex-1 items-center justify-center bg-gradient-to-br ${tile.theme}`}>
              <div className="h-[46%] w-[46%] text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.45)]">{Icon ? <Icon className="h-full w-full" /> : null}</div>
              <span className="absolute bottom-1 right-1 font-mono text-[11px] leading-none text-white/80">DMG-{tile.id.slice(0, 3).toUpperCase()}</span>
            </div>
            <div className="bg-[#141414] px-1.5 py-1 font-display text-[7px] leading-tight text-white">{tile.title.toUpperCase()}</div>
          </div>
          <div className="mt-[6%] flex items-center justify-center" aria-hidden="true">
            <span className="block h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-black/25" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
