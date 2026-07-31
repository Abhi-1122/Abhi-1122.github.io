"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TILE_ICONS } from "./icons";

export default function Tile({ tile, isActive, onSelect, onHoverSound, size }) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 300, damping: 20 });

  const Icon = TILE_ICONS[tile.icon];

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function handleMouseLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={tile.title}
      onMouseEnter={onHoverSound}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" ? onSelect() : null)}
      whileHover={!isActive ? { filter: "brightness(1.08)" } : undefined}
      style={{
        width: size,
        height: size,
        rotateX: isActive ? rotateX : 0,
        rotateY: isActive ? rotateY : 0,
        transformPerspective: 600,
      }}
      className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 bg-gradient-to-br ${tile.theme} ${
        isActive ? "tile-matte-active border-cyan-switch" : "tile-matte border-black/10"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 32% 0%, rgba(255,255,255,.4), rgba(255,255,255,0) 55%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.28), rgba(0,0,0,0) 42%)" }}
      />
      {isActive && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{ boxShadow: ["0 0 0px 0px rgba(0,195,227,.5)", "0 0 22px 4px rgba(0,195,227,.55)", "0 0 0px 0px rgba(0,195,227,.5)"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="relative z-[2] h-[38%] w-[38%] text-white/95 drop-shadow-md">
        {Icon ? <Icon className="h-full w-full" /> : null}
      </div>
    </motion.div>
  );
}
