"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function AmbientBackground({ dark }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });

  const aX = useTransform(sx, (v) => v * 1);
  const aY = useTransform(sy, (v) => v * 1);
  const bX = useTransform(sx, (v) => v * -1.4);
  const bY = useTransform(sy, (v) => v * -1.4);
  const cX = useTransform(sx, (v) => v * 0.6);
  const cY = useTransform(sy, (v) => v * -0.6);

  const frame = useRef(null);

  useEffect(() => {
    function onMove(e) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 40;
      const ny = (e.clientY / window.innerHeight - 0.5) * 40;
      mx.set(nx);
      my.set(ny);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div
      ref={frame}
      className={`fixed inset-0 -z-10 overflow-hidden transition-colors duration-700 ${
        dark
          ? "bg-gradient-to-br from-[#2b1955] via-[#1a1140] to-[#0a0a18]"
          : "bg-gradient-to-br from-[#38d9c9] via-[#34c789] to-[#1f9b7a]"
      }`}
      aria-hidden="true"
    >
      <motion.div
        style={{ x: aX, y: aY }}
        className={`animate-drift absolute -top-[18vw] -left-[14vw] h-[52vw] w-[52vw] rounded-full mix-blend-screen blur-[60px] opacity-55 ${
          dark ? "bg-[#c9b6ff]" : "bg-[#a0f0d0]"
        }`}
      />
      <motion.div
        style={{ x: bX, y: bY }}
        className={`animate-drift-slow absolute top-[40vh] -right-[16vw] h-[40vw] w-[40vw] rounded-full mix-blend-screen blur-[60px] opacity-55 ${
          dark ? "bg-[#2a1b6e]" : "bg-[#0b6b52]"
        }`}
      />
      <motion.div
        style={{ x: cX, y: cY }}
        className={`animate-drift-fast absolute -bottom-[14vw] left-[20vw] h-[34vw] w-[34vw] rounded-full mix-blend-screen blur-[60px] opacity-55 ${
          dark ? "bg-[#7c5cff]" : "bg-[#bff7e6]"
        }`}
      />
    </div>
  );
}
