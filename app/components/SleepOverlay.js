"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue } from "framer-motion";

const START_SPEED = 210;

function getFaces(size) {
  return [
    { transform: `rotateY(0deg) translateZ(${size / 2}px)`, background: "linear-gradient(135deg,#00C3E3,#0a8aa3)" },
    { transform: `rotateY(180deg) translateZ(${size / 2}px)`, background: "linear-gradient(135deg,#0a8aa3,#00C3E3)" },
    { transform: `rotateY(90deg) translateZ(${size / 2}px)`, background: "linear-gradient(135deg,#E60012,#ff5b5b)" },
    { transform: `rotateY(-90deg) translateZ(${size / 2}px)`, background: "linear-gradient(135deg,#ff5b5b,#E60012)" },
    { transform: `rotateX(90deg) translateZ(${size / 2}px)`, background: "#14181c" },
    { transform: `rotateX(-90deg) translateZ(${size / 2}px)`, background: "#14181c" },
  ];
}

export default function SleepOverlay({ time, onWake }) {
  const groupRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const velocity = useRef({ vx: START_SPEED, vy: START_SPEED * 0.75 });
  const sizeRef = useRef({ w: 420, h: 110 });
  const [phase, setPhase] = useState("tumble"); // "tumble" -> "bounce"
  const [flash, setFlash] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const CUBE_SIZE = isDesktop ? 92 : 48;
  const FACES = useMemo(() => getFaces(CUBE_SIZE), [CUBE_SIZE]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    x.set(window.innerWidth / 2 - sizeRef.current.w / 2);
    y.set(window.innerHeight / 2 - sizeRef.current.h / 2);
    const t = window.setTimeout(() => setPhase("bounce"), 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "bounce" && groupRef.current) {
      const r = groupRef.current.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
    }
  }, [phase]);

  useAnimationFrame((_, delta) => {
    if (phase !== "bounce") return;
    const dt = Math.min(delta, 33) / 1000;
    const { w, h } = sizeRef.current;
    let nx = x.get() + velocity.current.vx * dt;
    let ny = y.get() + velocity.current.vy * dt;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - h;
    let hitX = false;
    let hitY = false;
    if (nx <= 0) { nx = 0; velocity.current.vx *= -1; hitX = true; }
    else if (nx >= maxX) { nx = maxX; velocity.current.vx *= -1; hitX = true; }
    if (ny <= 0) { ny = 0; velocity.current.vy *= -1; hitY = true; }
    else if (ny >= maxY) { ny = maxY; velocity.current.vy *= -1; hitY = true; }
    if (hitX && hitY) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 350);
    }
    x.set(nx);
    y.set(ny);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onWake}
      className="fixed inset-0 z-[280] cursor-pointer overflow-hidden bg-black"
    >
      <motion.div ref={groupRef} style={{ position: "absolute", x, y }} className="flex items-center gap-4">
        <motion.div
          initial={{ y: -900, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 0 }}
          animate={{
            y: [-900, 0, -26, 0],
            rotateX: [0, 620, 720, 720],
            rotateY: phase === "bounce" ? [0, 380, 360, 360, 1080] : [0, 380, 360, 360],
            rotateZ: [0, -80, 0, 0],
            opacity: 1,
          }}
          transition={
            phase === "bounce"
              ? { duration: 5.4, times: [0, 0.11, 0.16, 0.19, 1], ease: ["easeOut", "easeOut", "easeOut", "linear"], repeat: Infinity }
              : { duration: 1.1, times: [0, 0.6, 0.85, 1], ease: "easeOut" }
          }
          style={{ transformStyle: "preserve-3d", perspective: 600 }}
          className="relative flex-shrink-0"
        >
          <div style={{ width: CUBE_SIZE, height: CUBE_SIZE, position: "relative", transformStyle: "preserve-3d" }}>
            {FACES.map((face, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  ...face,
                }}
              />
            ))}
          </div>
        </motion.div>

        <div className="overflow-hidden">
          <motion.span
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.5, delay: 0.9, ease: "easeOut" }}
            className="block whitespace-nowrap font-mono text-2xl font-bold tracking-wide text-white sm:text-6xl"
          >
            Abhishek
          </motion.span>
        </div>
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 bg-cyan-switch"
          />
        )}
      </AnimatePresence>

      <div className="absolute bottom-5 left-5 font-mono text-xs text-white/40">{time}</div>
      <div className="absolute bottom-5 right-5 text-[11px] tracking-wide text-white/40 sm:text-xs">
        Click anywhere or press any key to wake
      </div>
    </motion.div>
  );
}
