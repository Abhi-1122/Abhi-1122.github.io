"use client";
import { motion } from "framer-motion";
import { TILE_ICONS } from "./icons";

const PIPE_GRADIENT = "linear-gradient(90deg, #0b5c22 0%, #1fa347 20%, #52d17c 42%, #7cf0a0 50%, #52d17c 58%, #1fa347 80%, #0b5c22 100%)";

export default function WarpPipeTransition({ origin, tile, dark }) {
  if (!origin) return null;

  const pipeWidth = Math.max(76, origin.width * 0.62);
  const rimWidth = pipeWidth * 1.32;
  const rimHeight = pipeWidth * 0.4;
  const pipeCenterX = origin.x + origin.width / 2;
  const pipeTopY = origin.y + origin.height * 1.65;
  const burstY = pipeTopY + rimHeight * 0.15;

  const Icon = tile ? TILE_ICONS[tile.icon] : null;
  const fallTargetX = pipeCenterX - origin.width * 0.25 - origin.x;
  const fallTargetY = burstY - origin.y;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
      {/* pipe rising from the bottom of the screen */}
      <motion.div
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.85, 0.3, 1] }}
        style={{ position: "absolute", left: pipeCenterX - rimWidth / 2, top: pipeTopY, width: rimWidth }}
      >
        <div
          className="rounded-[16px] border-b-[6px] border-[#08421a] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          style={{ width: rimWidth, height: rimHeight, background: PIPE_GRADIENT }}
        />
        <div
          style={{ width: pipeWidth, height: "100vh", marginLeft: (rimWidth - pipeWidth) / 2, background: PIPE_GRADIENT }}
        />
      </motion.div>

      {/* the launched tile tumbling down into the pipe opening */}
      {tile && (
        <motion.div
          initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
          animate={{
            x: fallTargetX,
            y: fallTargetY,
            scale: 0.3,
            rotate: 35,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.5, 0, 0.85, 0.3] }}
          style={{ position: "absolute", left: origin.x, top: origin.y, width: origin.width, height: origin.height }}
          className={`flex items-center justify-center overflow-hidden rounded-2xl border-4 border-cyan-switch bg-gradient-to-br ${tile.theme}`}
        >
          <div className="h-[38%] w-[38%] text-white/95">{Icon ? <Icon className="h-full w-full" /> : null}</div>
        </motion.div>
      )}

      {/* flash bursting outward from the pipe opening */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.64, duration: 0.5, ease: [0.3, 0.8, 0.25, 1] }}
        className={`absolute rounded-full ${dark ? "bg-[#161a20]" : "bg-white"}`}
        style={{
          left: pipeCenterX - 1500,
          top: burstY - 1500,
          width: 3000,
          height: 3000,
        }}
      />
    </div>
  );
}
