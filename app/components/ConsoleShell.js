"use client";
import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// The handheld itself. Landscape (GBA-like) on wide screens, portrait (DMG-like) on phones.
// Every control is a real button; `pressed` (Set of control ids) mirrors keyboard/gamepad input.

function Dpad({ pressed, onControl }) {
  const arm = (id, cls, rot) => (
    <button
      type="button"
      aria-label={`D-pad ${id}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onControl(id);
      }}
      className={`absolute flex items-center justify-center bg-dpad ${cls} ${pressed.has(id) ? "brightness-75" : ""}`}
      style={{ transform: pressed.has(id) ? "scale(0.96)" : undefined }}
    >
      <span className="block h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-black/40" style={{ transform: `rotate(${rot}deg)` }} />
    </button>
  );
  const tilt = pressed.has("left") ? "rotateY(-8deg)" : pressed.has("right") ? "rotateY(8deg)" : pressed.has("up") ? "rotateX(8deg)" : pressed.has("down") ? "rotateX(-8deg)" : "none";
  return (
    <div className="relative h-[104px] w-[104px] sm:h-[120px] sm:w-[120px]" style={{ perspective: 300 }}>
      <div className="absolute inset-0 rounded-full bg-black/10 shadow-[inset_0_3px_6px_rgba(0,0,0,0.25)]" />
      <div className="absolute inset-[6px] transition-transform duration-75" style={{ transform: tilt, transformStyle: "preserve-3d" }}>
        {arm("up", "left-1/3 top-0 h-[36%] w-1/3 rounded-t-[4px]", 0)}
        {arm("down", "left-1/3 bottom-0 h-[36%] w-1/3 rounded-b-[4px]", 180)}
        {arm("left", "left-0 top-1/3 h-1/3 w-[36%] rounded-l-[4px]", -90)}
        {arm("right", "right-0 top-1/3 h-1/3 w-[36%] rounded-r-[4px]", 90)}
        <div className="pointer-events-none absolute left-1/3 top-1/3 h-1/3 w-1/3 bg-dpad">
          <div className="absolute inset-[22%] rounded-full bg-black/25 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="pointer-events-none absolute inset-0 shadow-[0_4px_0_rgba(0,0,0,0.35)]" style={{ clipPath: "polygon(33% 0,67% 0,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0 67%,0 33%,33% 33%)" }} />
      </div>
    </div>
  );
}

function RoundButton({ id, label, pressed, onControl }) {
  const down = pressed.has(id);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={`${label} button`}
        onPointerDown={(e) => {
          e.preventDefault();
          onControl(id);
        }}
        className="relative h-[52px] w-[52px] rounded-full bg-ab transition-transform duration-75 sm:h-[58px] sm:w-[58px]"
        style={{
          transform: down ? "translateY(3px)" : "none",
          boxShadow: down
            ? "inset 0 3px 6px rgba(0,0,0,0.35), 0 1px 0 var(--btn-ab-lo)"
            : "inset 0 -5px 0 rgba(0,0,0,0.22), inset 0 3px 0 rgba(255,255,255,0.25), 0 4px 0 var(--btn-ab-lo), 0 7px 10px rgba(0,0,0,0.25)",
        }}
      >
        <span className="pointer-events-none absolute left-[22%] top-[14%] h-[26%] w-[38%] rounded-full bg-white/30 blur-[1px]" />
      </button>
      <span className="font-display text-[11px] text-shell-ink">{label}</span>
    </div>
  );
}

function PillButton({ id, label, pressed, onControl }) {
  const down = pressed.has(id);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          onControl(id);
        }}
        className="h-[14px] w-[48px] -rotate-[25deg] rounded-full bg-[#8c8b93] transition-transform duration-75"
        style={{
          transform: `rotate(-25deg) ${down ? "translateY(2px)" : ""}`,
          boxShadow: down ? "inset 0 2px 3px rgba(0,0,0,0.4)" : "inset 0 -3px 0 rgba(0,0,0,0.25), 0 3px 0 #5d5c63",
        }}
      />
      <span className="-rotate-[25deg] font-display text-[7px] tracking-wider text-shell-ink">{label}</span>
    </div>
  );
}

function Speaker() {
  return (
    <div className="flex -rotate-[30deg] gap-[7px]" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-[58px] w-[7px] rounded-full bg-black/20 shadow-[inset_0_2px_3px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.4)]" />
      ))}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-baseline gap-2 text-shell-ink" aria-hidden="true">
      <span className="rounded-full border-[2.5px] border-current px-2 py-[3px] font-display text-[9px] leading-none">Abhishek</span>
      <span className="font-display text-[15px] italic leading-none tracking-tight sm:text-[18px]" style={{ transform: "skewX(-12deg)" }}>
        GAME DECK
      </span>
      <span className="font-display text-[6px]">™</span>
    </div>
  );
}

function PowerSwitch({ powered, onControl }) {
  return (
    <button
      type="button"
      onClick={() => onControl("power")}
      aria-label={powered ? "Sleep" : "Power on"}
      className="group flex items-center gap-2 font-display text-[7px] text-shell-ink"
    >
      <span>◀OFF</span>
      <span className="relative h-[10px] w-[34px] rounded-[3px] bg-black/25 shadow-[inset_0_2px_2px_rgba(0,0,0,0.4)]">
        <motion.span
          animate={{ x: powered ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className="absolute top-[1px] block h-[8px] w-[12px] rounded-[2px] bg-shell-hi shadow-[0_1px_0_rgba(0,0,0,0.3)]"
        />
      </span>
      <span>ON▶</span>
    </button>
  );
}

function Bezel({ children, ledOn }) {
  return (
    <div className="relative rounded-[12px] rounded-br-[44px] bg-bezel p-3 pt-7 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)] sm:rounded-br-[60px] sm:p-5 sm:pt-8">
      <div className="absolute left-4 right-4 top-3 flex items-center gap-2 sm:left-6 sm:right-6" aria-hidden="true">
        <span className="h-[2px] flex-1 bg-[#a3195b]" />
        <span className="font-sans text-[9px] italic tracking-[0.12em] text-[#d4d4de] sm:text-[10px]">DOT MATRIX WITH STEREO SOUND</span>
        <span className="h-[2px] w-8 bg-[#2c2f7a] sm:w-14" />
      </div>
      <div className="flex gap-3 sm:gap-5">
        <div className="hidden flex-col items-center gap-1.5 pt-10 sm:flex" aria-hidden="true">
          <span
            className="h-[9px] w-[9px] rounded-full transition-colors duration-300"
            style={{ background: ledOn ? "#ff2a3d" : "#4a1f25", boxShadow: ledOn ? "0 0 8px 2px rgba(255,42,61,0.7)" : "none" }}
          />
          <span className="font-sans text-[7px] tracking-wider text-[#d4d4de]">BATTERY</span>
        </div>
        <div className="lcd pixel-corners relative min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
      {/* screen-cover glare */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[60] rounded-[inherit]"
        style={{ background: "linear-gradient(118deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0) 30.5%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.05) 62.5%, rgba(255,255,255,0) 75%)" }}
      />
    </div>
  );
}

// Green circuit board — only visible through the translucent "Atomic" shell.
function Pcb() {
  return (
    <div className="pcb pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <pattern id="pcb-traces" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M0 12h22l10 10h32M12 0v16l16 16v32M44 0v22h20M0 48h14l8-8h18l10 10v14" stroke="#c9a94a" strokeWidth="2" fill="none" opacity=".75" />
            <circle cx="32" cy="22" r="2.6" fill="#e0c878" />
            <circle cx="22" cy="40" r="2.6" fill="#e0c878" />
            <circle cx="50" cy="50" r="2" fill="#e0c878" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#1c4a34" />
        <rect width="100%" height="100%" fill="url(#pcb-traces)" />
      </svg>
      {[
        ["left-[4%] top-[54%] h-[16%] w-[9%]", "DMG-CPU"],
        ["right-[5%] top-[18%] h-[11%] w-[8%]", "SRAM"],
        ["left-[30%] bottom-[4%] h-[6%] w-[14%]", "LR35902"],
        ["right-[20%] bottom-[5%] h-[5%] w-[9%]", "AMP"],
      ].map(([pos, label]) => (
        <div key={label} className={`absolute ${pos} flex items-center justify-center rounded-[2px] bg-[#16161a] font-display text-[6px] text-white/50 shadow-[0_0_0_3px_#9c9c9c55,0_2px_4px_rgba(0,0,0,0.5)]`}>
          {label}
        </div>
      ))}
    </div>
  );
}

function Shoulder({ id, label, pressed, onControl, className }) {
  const down = pressed.has(id);
  return (
    <button
      type="button"
      aria-label={`${label} shoulder button`}
      onPointerDown={(e) => {
        e.preventDefault();
        onControl(id);
      }}
      className={`absolute -top-[13px] hidden h-[20px] w-[130px] items-start justify-center rounded-t-[18px] bg-shell-lo pt-[2px] font-display text-[7px] text-shell-ink transition-transform duration-75 lg:flex ${className}`}
      style={{ transform: down ? "translateY(4px)" : "none", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.35)" }}
    >
      {label}
    </button>
  );
}

function VolumeWheel({ onControl, muted }) {
  return (
    <button
      type="button"
      onClick={() => onControl("vol")}
      aria-label={muted ? "Volume up" : "Volume off"}
      className="absolute -right-[7px] top-[30%] hidden flex-col items-center gap-1 lg:flex"
    >
      <span
        className="block h-[64px] w-[10px] rounded-[4px] shadow-[inset_-2px_0_2px_rgba(0,0,0,0.3)] transition-[background-position] duration-300"
        style={{
          background: "repeating-linear-gradient(0deg, var(--shell-lo) 0 3px, var(--shell-hi) 3px 5px)",
          backgroundPosition: muted ? "0 0" : "0 12px",
        }}
      />
    </button>
  );
}

// Floating hint beside the R shoulder; goes away for good once L/R has been used.
function ThemeHint({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: [0, -4, 0] }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ opacity: { delay: 1.2, duration: 0.2 }, y: { duration: 1.6, repeat: Infinity, ease: (t) => Math.round(t * 4) / 4 } }}
          className="pixel-box pointer-events-none absolute -top-[14px] right-[236px] z-20 hidden items-center gap-2 px-3 py-1.5 font-display text-[8px] lg:flex"
          role="note"
        >
          CLICK TO CYCLE THEMES
          <span className="caret-blink">▶</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ConsoleShell = forwardRef(function ConsoleShell({ children, pressed, onControl, powered, muted, className = "", style }, ref) {
  const localRef = useRef(null);
  const [hint, setHint] = useState(false);
  useEffect(() => setHint(window.localStorage.getItem("gamedeck-theme-hint") !== "seen"), []);
  const onShoulder = (id) => {
    if (hint) {
      setHint(false);
      window.localStorage.setItem("gamedeck-theme-hint", "seen");
    }
    onControl(id);
  };
  const setRefs = (el) => {
    localRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  // light sheen + floor shadow follow the cursor
  useEffect(() => {
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = localRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        el.style.setProperty("--sx", `${Math.round(((e.clientX / window.innerWidth) - 0.5) * -30)}px`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={setRefs}
      className={`relative w-full select-none rounded-[22px] rounded-br-[70px] px-4 pb-8 pt-7 sm:rounded-[28px] sm:rounded-br-[96px] sm:px-6 lg:w-[min(1640px,95vw)] lg:px-7 lg:pb-6 ${className}`}
      style={style}
    >
      {/* floor shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-[8%] right-[8%] -z-10 h-20 rounded-[50%] bg-black/35 blur-2xl"
        style={{ transform: "translateX(var(--sx, 0px))" }}
      />
      <Shoulder id="l" label="L" pressed={pressed} onControl={onShoulder} className="left-12" />
      <Shoulder id="r" label="R" pressed={pressed} onControl={onShoulder} className="right-24" />
      <ThemeHint show={hint && powered} />
      <Pcb />
      <div aria-hidden="true" className="shell-plastic pointer-events-none absolute inset-0 rounded-[inherit]" />
      <div aria-hidden="true" className="shell-grain pointer-events-none absolute inset-0 rounded-[inherit]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-[9px] rounded-[inherit] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <div aria-hidden="true" className="shell-sheen pointer-events-none absolute inset-0 rounded-[inherit]" />
      <VolumeWheel onControl={onControl} muted={muted} />

      {/* cartridge slot on the top edge */}
      <div className="absolute left-1/2 top-0 h-[7px] w-[44%] -translate-x-1/2 rounded-b-[4px] bg-black/25 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5)]" aria-hidden="true" />
      <div className="absolute left-5 top-[10px] sm:left-8">
        <PowerSwitch powered={powered} onControl={onControl} />
      </div>

      <div className="relative mt-4 flex flex-col gap-5 lg:grid lg:grid-cols-[136px_minmax(0,1fr)_136px] lg:items-center lg:gap-6">
        {/* left: D-pad + select/start (landscape) */}
        <div className="order-2 hidden flex-col items-center gap-8 lg:order-none lg:flex">
          <Dpad pressed={pressed} onControl={onControl} />
          <div className="flex gap-3">
            <PillButton id="select" label="SELECT" pressed={pressed} onControl={onControl} />
            <PillButton id="start" label="START" pressed={pressed} onControl={onControl} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Bezel ledOn={powered}>{children}</Bezel>
          <div className="px-1">
            <Logo />
          </div>
        </div>

        {/* right: A/B + speaker (landscape) */}
        <div className="hidden flex-col items-center gap-10 lg:flex">
          <div className="flex items-end gap-3 -rotate-[25deg]">
            <div className="mt-6">
              <RoundButton id="b" label="B" pressed={pressed} onControl={onControl} />
            </div>
            <div className="-mt-6">
              <RoundButton id="a" label="A" pressed={pressed} onControl={onControl} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Speaker />
            <span className="mt-2 font-display text-[6px] tracking-widest text-shell-ink opacity-70">◖ PHONES</span>
          </div>
        </div>

        {/* portrait controls */}
        <div className="flex flex-col gap-6 lg:hidden">
          <div className="flex items-center justify-between px-1">
            <Dpad pressed={pressed} onControl={onControl} />
            <div className="flex items-end gap-2 -rotate-[25deg]">
              <div className="mt-6">
                <RoundButton id="b" label="B" pressed={pressed} onControl={onControl} />
              </div>
              <div className="-mt-6">
                <RoundButton id="a" label="A" pressed={pressed} onControl={onControl} />
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="w-16" />
            <div className="flex gap-4">
              <PillButton id="select" label="SELECT" pressed={pressed} onControl={onControl} />
              <PillButton id="start" label="START" pressed={pressed} onControl={onControl} />
            </div>
            <div className="scale-75">
              <Speaker />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ConsoleShell;
