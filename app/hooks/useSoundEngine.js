"use client";
import { useEffect, useMemo, useRef } from "react";

function makeNoiseBuffer(ctx, duration) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Pentatonic-ish roots so the ambient pad always sounds consonant when it glides.
const PAD_ROOTS = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63];

// All UI sounds are synthesized on the fly with the Web Audio API —
// no external audio files to source, license, or ship.
// `retro` swaps every waveform to square for a chiptune feel.
// The returned object is stable; muted/retro are read through refs.
export function useSoundEngine(muted, retro = false) {
  const ctxRef = useRef(null);
  const mutedRef = useRef(muted);
  const retroRef = useRef(retro);
  const padRef = useRef(null);
  mutedRef.current = muted;
  retroRef.current = retro;

  const engine = useMemo(() => {
    function getCtx() {
      if (typeof window === "undefined" || mutedRef.current) return null;
      try {
        if (!ctxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctxRef.current = new AC();
        }
        if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
        return ctxRef.current;
      } catch {
        return null;
      }
    }

    function tone({ freq = 880, freqEnd = null, duration = 0.08, type = "sine", gain = 0.12, delay = 0, pan = 0 }) {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = retroRef.current ? "square" : type;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
        const peak = retroRef.current ? gain * 0.45 : gain;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        let node = osc.connect(g);
        if (pan && ctx.createStereoPanner) {
          const p = ctx.createStereoPanner();
          p.pan.value = Math.max(-1, Math.min(1, pan));
          node = node.connect(p);
        }
        node.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      } catch {
        // ignore — never let a sound glitch break the UI
      }
    }

    function noise({ duration = 0.25, filterStart = 400, filterEnd = 2200, gain = 0.1, delay = 0 }) {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const t0 = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(ctx, duration);
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(filterStart, t0);
        filter.frequency.exponentialRampToValueAtTime(filterEnd, t0 + duration);
        filter.Q.value = 0.9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        src.connect(filter).connect(g).connect(ctx.destination);
        src.start(t0);
      } catch {
        // ignore
      }
    }

    const notes = (list, type = "sine", gain = 0.07) =>
      list.forEach(([freq, delay, duration = 0.18]) => tone({ freq, delay, duration, type, gain }));

    return {
      tone,
      noise,
      // pan: -1 (left) … 1 (right), used for carousel position
      playHover: (pan = 0) => tone({ freq: 1300, duration: 0.045, gain: 0.045, pan }),
      playClick: () => tone({ freq: 750, duration: 0.04, gain: 0.06 }),
      playLaunch: () => {
        noise({ duration: 0.4, filterStart: 300, filterEnd: 2600, gain: 0.09 });
        tone({ freq: 300, freqEnd: 1100, duration: 0.35, type: "triangle", gain: 0.05 });
      },
      playChime: () => notes([[659.25, 0, 0.14], [987.77, 0.07, 0.22]], "sine", 0.08),
      playBonk: () => tone({ freq: 140, freqEnd: 65, duration: 0.12, type: "square", gain: 0.11 }),
      // the handheld boot "ba-ding"
      playBoot: () => {
        tone({ freq: 1046.5, duration: 0.09, type: "square", gain: 0.05 });
        tone({ freq: 2093, duration: 0.9, type: "square", gain: 0.05, delay: 0.1 });
      },
      playWhoosh: () => noise({ duration: 0.3, filterStart: 2400, filterEnd: 500, gain: 0.07 }),
      playToggle: () => {
        tone({ freq: 1800, duration: 0.025, type: "square", gain: 0.035 });
        tone({ freq: 1100, duration: 0.03, type: "square", gain: 0.035, delay: 0.06 });
      },
      playInsert: () => {
        tone({ freq: 220, freqEnd: 90, duration: 0.08, type: "square", gain: 0.08 });
        noise({ duration: 0.08, filterStart: 3000, filterEnd: 1500, gain: 0.08, delay: 0.02 });
      },
      playPowerOn: () => tone({ freq: 60, freqEnd: 8000, duration: 0.35, type: "sawtooth", gain: 0.025 }),
      playCoin: () => notes([[987.77, 0, 0.08], [1318.51, 0.07, 0.25]], "square", 0.05),
      playCrash: () => {
        noise({ duration: 0.45, filterStart: 1200, filterEnd: 120, gain: 0.14 });
        tone({ freq: 200, freqEnd: 40, duration: 0.4, type: "sawtooth", gain: 0.06 });
      },
      // rising ladder: n = combo count (1, 2, 3…)
      playCombo: (n = 1) => tone({ freq: 440 * Math.pow(2, Math.min(n, 12) / 6), duration: 0.12, type: "square", gain: 0.05 }),
      playAchievement: () => notes([[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.12], [1046.5, 0.3, 0.4]], "triangle", 0.07),

      // Generative background pad — very quiet, glides to a root picked by `index`.
      setAmbient(on, index = 0) {
        const ctx = on ? getCtx() : ctxRef.current;
        if (!on || !ctx) {
          if (padRef.current && ctxRef.current) {
            const { master, oscs } = padRef.current;
            const t = ctxRef.current.currentTime;
            master.gain.setTargetAtTime(0, t, 0.4);
            oscs.forEach((o) => o.stop(t + 2));
            padRef.current = null;
          }
          return;
        }
        const root = PAD_ROOTS[((index % PAD_ROOTS.length) + PAD_ROOTS.length) % PAD_ROOTS.length];
        const t = ctx.currentTime;
        if (!padRef.current) {
          const master = ctx.createGain();
          master.gain.value = 0;
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 900;
          master.connect(lp).connect(ctx.destination);
          const oscs = [1, 1.5, 2.005].map((mult, i) => {
            const o = ctx.createOscillator();
            o.type = i === 1 ? "triangle" : "sine";
            o.frequency.value = root * mult;
            const g = ctx.createGain();
            g.gain.value = i === 1 ? 0.35 : 0.5;
            o.connect(g).connect(master);
            o.start();
            o.mult = mult;
            return o;
          });
          master.gain.setTargetAtTime(0.018, t, 1.2);
          padRef.current = { master, oscs };
        }
        padRef.current.oscs.forEach((o) => o.frequency.setTargetAtTime(root * o.mult, t, 0.6));
      },
    };
  }, []);

  // Stop the pad when muted.
  useEffect(() => {
    if (muted) engine.setAmbient(false);
  }, [muted, engine]);

  return engine;
}
