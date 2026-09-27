"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { SITE } from "../data/portfolioData";
import {
  pixelPaths,
  MailIcon,
  GithubIcon,
  ControllerIcon,
  SettingsIcon,
  PowerIcon,
  SunIcon,
  SpeakerIcon,
  SpeakerMuteIcon,
} from "./icons";

const ICON_BUTTONS = [
  { action: "mail", label: "EMAIL", Icon: MailIcon },
  { action: "github", label: "GITHUB", Icon: GithubIcon },
  { action: "linkedin", label: "LINKEDIN", Icon: ControllerIcon },
  { action: "settings", label: "MENU", Icon: SettingsIcon },
  { action: "sleep", label: "SLEEP", Icon: PowerIcon },
];

const BTN = "pixel-btn flex h-6 min-w-6 items-center justify-center gap-1.5 px-[3px] lg:h-8 lg:min-w-8 lg:px-[1px]";
const ICON = "h-3 w-3 lg:h-6 lg:w-6";
const steps = (n) => (t) => Math.floor(t * n) / n;
const snap2 = (v) => Math.round(v / 2) * 2;

// Magnet + eye tracking only for a fine pointer with motion allowed.
function useFinePointer() {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  useEffect(() => setFine(!window.matchMedia("(pointer: coarse)").matches), []);
  return fine && !reduce;
}

function MagneticButton({ label, delay = 0, onClick, className = "", pressed, children }) {
  const wrapRef = useRef(null);
  const live = useFinePointer();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useTransform(useSpring(mx, { stiffness: 320, damping: 14, mass: 0.4 }), snap2);
  const y = useTransform(useSpring(my, { stiffness: 320, damping: 14, mass: 0.4 }), snap2);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    if (!live) return;
    const onMove = (e) => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // Pull fades out toward the 40px reach so neighbours don't collide.
      const f = Math.max(0, 1 - Math.hypot(dx, dy) / (Math.max(r.width, r.height) / 2 + 40));
      mx.set(dx * 0.2 * f);
      my.set(dy * 0.2 * f);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [live, mx, my]);

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: steps(3) }}
      className="relative flex-shrink-0"
    >
      <motion.div style={{ x, y }}>
        <button
          type="button"
          onPointerEnter={() => setTip(true)}
          onPointerLeave={() => setTip(false)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && setTip(true)}
          onBlur={() => setTip(false)}
          onClick={onClick}
          aria-label={label}
          aria-pressed={pressed}
          className={`${BTN} ${className}`}
        >
          {children}
        </button>
      </motion.div>
      <AnimatePresence>
        {tip && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.12, ease: steps(2) }}
            className="pointer-events-none absolute left-1/2 top-full z-[60] mt-2 flex w-0 justify-center"
          >
            <span className="pixel-box whitespace-nowrap !px-2 !py-1.5 font-display text-[8px] leading-none">{label}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 16×16 face: "#" ink, "s" skin, "w" eye white, "+" cheek. Eyes/mouth are drawn on top.
const FACE = pixelPaths([
  "....########....",
  "..############..",
  ".##############.",
  "###ssss##ssss###",
  "##ssssssssssss##",
  "#ssssssssssssss#",
  "#sswwwsssswwwss#",
  "#sswwwsssswwwss#",
  "#sswwwsssswwwss#",
  "#s++ssssssss++s#",
  "#ssssssssssssss#",
  ".#ssssssssssss#.",
  "..#ssssssssss#..",
  "...##ssssss##...",
  ".....######.....",
  "................",
]);
const FACE_FILL = { "#": "var(--gb-3)", s: "var(--gb-1)", w: "var(--gb-0)", "+": "var(--gb-2)" };

function Px({ x, y, w = 1, h = 1, fill = "var(--gb-3)" }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

function LiveAvatar() {
  const ref = useRef(null);
  const live = useFinePointer();
  const reduce = useReducedMotion();
  const [look, setLook] = useState({ dx: 0, dy: 0 });
  const [blink, setBlink] = useState(false);
  const [hover, setHover] = useState(false);
  const [joy, setJoy] = useState(false);

  useEffect(() => {
    if (!live) return;
    const onMove = (e) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const ex = e.clientX - (r.left + r.width / 2);
      const ey = e.clientY - (r.top + r.height * 0.45);
      const dx = Math.abs(ex) < 24 ? 0 : Math.sign(ex);
      const dy = ey > 12 ? 1 : 0;
      setLook((l) => (l.dx === dx && l.dy === dy ? l : { dx, dy }));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [live]);

  useEffect(() => {
    if (reduce) return;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => (setBlink(false), loop()), 140);
      }, 2200 + Math.random() * 4000);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!joy) return;
    const t = setTimeout(() => setJoy(false), 700);
    return () => clearTimeout(t);
  }, [joy]);

  const happy = hover || joy;
  const skin = "var(--gb-1)";

  return (
    <svg
      ref={ref}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${SITE.shortName} avatar`}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={() => setJoy(true)}
      className="h-8 w-8 flex-shrink-0 cursor-pointer"
    >
      {Object.entries(FACE).map(([c, d]) => (
        <path key={c} d={d} fill={FACE_FILL[c]} />
      ))}
      {[3, 10].map((ex) =>
        happy ? (
          <g key={ex}>
            <Px x={ex} y={6} w={3} h={3} fill={skin} />
            <Px x={ex} y={8} />
            <Px x={ex + 1} y={7} />
            <Px x={ex + 2} y={8} />
          </g>
        ) : blink ? (
          <g key={ex}>
            <Px x={ex} y={6} w={3} h={3} fill={skin} />
            <Px x={ex} y={7} w={3} />
          </g>
        ) : (
          <Px key={ex} x={ex + 1 + look.dx} y={6 + look.dy} h={2} />
        )
      )}
      {happy ? (
        <>
          <Px x={6} y={11} w={4} />
          <Px x={7} y={12} w={2} fill="var(--gb-hi)" />
        </>
      ) : (
        <>
          <Px x={6} y={11} />
          <Px x={9} y={11} />
          <Px x={7} y={12} w={2} />
        </>
      )}
    </svg>
  );
}

export default function Header({ greeting, onAction, dark, onToggleTheme, muted, onToggleMute }) {
  return (
    <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b-[3px] border-gb-3 bg-gb-0 px-2 py-1.5 text-gb-3 sm:px-3 lg:min-h-12">
      <div className="flex min-w-0 items-center gap-2">
        <LiveAvatar />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="whitespace-nowrap font-display text-[10px] leading-none">{SITE.shortName.toUpperCase()}</span>
          <span className="hidden whitespace-nowrap font-sans text-[13px] leading-none text-gb-2 sm:block">{greeting} · Software Engineer</span>
        </div>
      </div>

      <nav className="flex items-center gap-1.5 pb-1 lg:gap-2" aria-label="Quick links">
        <MagneticButton
          label={dark ? "LIGHT: ON" : "LIGHT: OFF"}
          delay={0.04}
          pressed={dark}
          onClick={(e) => onToggleTheme(e)}
          className={dark ? "!bg-gb-3 !text-gb-0" : ""}
        >
          <SunIcon className={ICON} />
          <span className="hidden pr-1 font-display text-[8px] sm:inline">LIGHT</span>
        </MagneticButton>

        <MagneticButton label={muted ? "SOUND: OFF" : "SOUND: ON"} delay={0.08} onClick={onToggleMute}>
          {muted ? <SpeakerMuteIcon className={ICON} /> : <SpeakerIcon className={ICON} />}
        </MagneticButton>

        {ICON_BUTTONS.map(({ action, label, Icon }, i) => (
          <MagneticButton key={action} label={label} delay={0.12 + 0.04 * i} onClick={() => onAction(action)}>
            <Icon className={ICON} />
          </MagneticButton>
        ))}
      </nav>
    </header>
  );
}
