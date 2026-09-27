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
      style={{
        width: size,
        height: size,
        rotateX: isActive ? rotateX : 0,
        rotateY: isActive ? rotateY : 0,
        transformPerspective: 600,
      }}
      className={`pixel-corners relative flex cursor-pointer flex-col items-center justify-center gap-2 border-[3px] border-gb-3 ${isActive ? "bg-gb-0" : "bg-gb-1"}`}
    >
      {isActive && <span className="caret-blink pointer-events-none absolute inset-[5px] border-[3px] border-dashed border-gb-3" />}
      <div className="relative z-[2] h-[42%] w-[42%] text-gb-3">{Icon ? <Icon className="h-full w-full" /> : null}</div>
      <span className="relative z-[2] px-2 text-center font-display text-[7px] leading-relaxed sm:text-[8px]">{tile.title.toUpperCase()}</span>
    </motion.div>
  );
}
