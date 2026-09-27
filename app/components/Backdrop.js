"use client";
import { useEffect, useRef } from "react";
import { StarIcon, SparkleIcon, TrophyIcon, GamepadIcon, SnakeIcon, ZapIcon, GridIcon, TerminalIcon } from "./icons";

// The "room" behind the console, styled like a 90s handheld ad: bold colour field,
// giant marquee type sliding in alternating directions, pixel sprites drifting up with
// mouse parallax, and (at night) the backlit screen's glow spilling onto the wall.
// Phones get just the plain colour: the console covers the screen there anyway.
const ROWS = [
  "G SAI ABHISHEK ★ SOFTWARE ENGINEER ★ ",
  "SYSTEMS ENTHUSIAST ★ DISTRIBUTED SYSTEMS ★ RAFT & KAFKA ★ ",
  "ML RESEARCHER ★ GNNs FOR GENE NETWORKS ★ ",
  "LOW-LATENCY C++ ★ QUANT CURIOUS ★ LLM ROUTING ★ ",
  "IIIT HYDERABAD ★ DEAN'S LIST ★ FEST ORGANIZER ★ TA ★ ",
  "GO ★ C / C++ ★ PYTHON ★ BUILT FROM SCRATCH ★ ",
];
const SPRITES = [StarIcon, SparkleIcon, TrophyIcon, GamepadIcon, SnakeIcon, ZapIcon, GridIcon, TerminalIcon];

// deterministic pseudo-random so server and client render the same layout
const rand = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export default function Backdrop({ paused = false }) {
  const ref = useRef(null);

  useEffect(() => {
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        ref.current?.style.setProperty("--px", ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
        ref.current?.style.setProperty("--py", ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-20 overflow-hidden ${paused ? "anim-paused" : ""}`} style={{ background: "var(--stage-bg)" }}>
      {/* marquee type */}
      <div
        className="absolute inset-[-25%] hidden flex-col justify-center gap-[2vh] sm:flex"
        style={{ transform: "rotate(-9deg) translate(calc(var(--px, 0) * -24px), calc(var(--py, 0) * -16px))" }}
      >
        {ROWS.map((row, i) => (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`marquee-row inline-block font-display text-[9vh] leading-none ${i % 2 ? "reverse" : ""} ${i % 3 === 1 ? "outline-type" : ""}`}
              style={{ "--dur": `${70 + i * 14}s`, color: i % 3 === 1 ? undefined : "var(--stage-ink)" }}
            >
              {row.repeat(3)}
              {row.repeat(3)}
            </div>
          </div>
        ))}
      </div>

      {/* drifting pixel sprites, two depth layers */}
      {[0, 1].map((layer) => (
        <div
          key={layer}
          className="absolute inset-0 hidden sm:block"
          style={{ transform: `translate(calc(var(--px, 0) * ${layer ? -60 : -28}px), calc(var(--py, 0) * ${layer ? -40 : -18}px))` }}
        >
          {Array.from({ length: 9 }, (_, j) => {
            const i = layer * 9 + j;
            const Icon = SPRITES[i % SPRITES.length];
            const size = Math.round(layer ? 44 + rand(i, 1) * 36 : 22 + rand(i, 1) * 18);
            return (
              <div
                key={i}
                className="float-sprite absolute"
                style={{
                  left: `${Math.round(rand(i, 2) * 96)}%`,
                  top: "105%",
                  width: size,
                  height: size,
                  color: i % 2 ? "var(--stage-a)" : "var(--stage-b)",
                  opacity: layer ? 0.9 : 0.55,
                  "--dur": `${Math.round((layer ? 26 : 40) + rand(i, 3) * 20)}s`,
                  "--delay": `${-Math.round(rand(i, 4) * 60)}s`,
                  "--spin": `${(rand(i, 5) > 0.5 ? 1 : -1) * 180}deg`,
                }}
              >
                <Icon className="h-full w-full" />
              </div>
            );
          })}
        </div>
      ))}

      {/* backlit screen glow at night */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: "radial-gradient(ellipse 55% 45% at 50% 48%, color-mix(in srgb, var(--gb-2) 38%, transparent), transparent 70%)" }}
      />
      {/* vignette keeps the console the hero */}
      <div className="absolute inset-0 hidden sm:block" style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.28) 100%)" }} />
    </div>
  );
}
